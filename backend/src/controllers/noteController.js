const mongoose = require("mongoose");
const Note = require("../models/Note");
const logger = require("../utils/logger");

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function normalizeCategory(str) {
  return str
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
function categoryGroupStage() {
  return {
    $group: {
      _id: {
        $reduce: {
          input: {
            $split: [{ $trim: { input: { $toLower: "$category" } } }, " "],
          },
          initialValue: "",
          in: {
            $cond: [
              { $eq: ["$$this", ""] },
              "$$value",
              {
                $cond: [
                  { $eq: ["$$value", ""] },
                  "$$this",
                  { $concat: ["$$value", " ", "$$this"] },
                ],
              },
            ],
          },
        },
      },
      count: { $sum: 1 },
    },
  };
}

function categoryMatchRegex(value) {
  const words = normalizeCategory(value)
    .split(" ")
    .filter(Boolean)
    .map(escapeRegex);

  const separator = String.raw`\s+`;

  return new RegExp(`^${words.join(separator)}$`, "i");
}

exports.getNotes = async (req, res) => {
  try {
    const {
      filter = "all",
      search = "",
      sort = "updated_desc",
      page = 1,
      limit = 8,
    } = req.query;

    const query = { owner: req.user.id };

    if (filter === "trash") {
      query.isDeleted = true;
    } else {
      query.isDeleted = false;

      if (filter === "favorites") {
        query.isFavorite = true;
      } else if (filter !== "all") {
        query.category = categoryMatchRegex(filter);
      }
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      query.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { content: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const sortMap = {
      updated_desc: { updatedAt: -1 },
      updated_asc: { updatedAt: 1 },
      created_desc: { createdAt: -1 },
      created_asc: { createdAt: 1 },
      title_asc: { title: 1 },
      title_desc: { title: -1 },
    };

    const sortBy = sortMap[sort] || sortMap.updated_desc;

    const pageNum = Math.max(Number.parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(Number.parseInt(limit, 10) || 8, 1), 50);
    const skip = (pageNum - 1) * limitNum;

    const [notes, total] = await Promise.all([
      Note.find(query).sort(sortBy).skip(skip).limit(limitNum),
      Note.countDocuments(query),
    ]);

    res.json({
      success: true,
      notes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.max(Math.ceil(total / limitNum), 1),
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

exports.getStats = async (req, res) => {
  try {
    const ownerId = req.user.id;

    const [totalNotes, favorites, trashItems, categoryGroups] =
      await Promise.all([
        Note.countDocuments({ owner: ownerId, isDeleted: false }),
        Note.countDocuments({
          owner: ownerId,
          isDeleted: false,
          isFavorite: true,
        }),
        Note.countDocuments({ owner: ownerId, isDeleted: true }),
        Note.aggregate([
          {
            $match: {
              owner: new mongoose.Types.ObjectId(ownerId),
              isDeleted: false,
            },
          },
          categoryGroupStage(),
        ]),
      ]);

    res.json({
      success: true,
      stats: {
        totalNotes,
        favorites,
        categories: categoryGroups.length,
        trashItems,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Note.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(req.user.id),
          isDeleted: false,
        },
      },
      categoryGroupStage(),
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      categories: categories.map((c) => ({
        name: normalizeCategory(c._id),
        count: c.count,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

exports.getNoteById = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    res.json({ success: true, note });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

exports.createNote = async (req, res) => {
  try {
    const { title, content, category } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required.",
      });
    }
    if (title.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: "Title must be 100 characters or fewer.",
      });
    }
    if (content !== undefined && typeof content !== "string") {
      return res.status(400).json({
        success: false,
        message: "Content must be text.",
      });
    }
    if (category !== undefined && typeof category !== "string") {
      return res.status(400).json({
        success: false,
        message: "Category must be text.",
      });
    }

    const note = await Note.create({
      title: title.trim(),
      content: content || "",
      category:
        category?.trim() ? normalizeCategory(category) : "General",
      owner: req.user.id,
    });

    logger.info(
      { event: "note_created", userId: req.user.id, noteId: note._id },
      "Note created",
    );

    res.status(201).json({
      success: true,
      message: "Note created",
      note,
    });
  } catch (err) {
    console.error(err);
    if (err.name === "ValidationError") {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

function validateUpdateTitle(title) {
  if (typeof title !== "string" || !title.trim()) {
    return "Title is required.";
  }

  if (title.trim().length > 100) {
    return "Title must be 100 characters or fewer.";
  }

  return null;
}

function validateUpdateContent(content) {
  if (typeof content !== "string") {
    return "Content must be text.";
  }

  return null;
}

function validateUpdateCategory(category) {
  if (typeof category !== "string") {
    return "Category must be text.";
  }

  return null;
}

exports.updateNote = async (req, res) => {
  try {
    const { title, content, category } = req.body;

    const note = await Note.findOne({ _id: req.params.id, owner: req.user.id });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    if (title !== undefined) {
      const titleError = validateUpdateTitle(title);

      if (titleError) {
        return res.status(400).json({
          success: false,
          message: titleError,
        });
      }

      note.title = title.trim();
    }

    if (content !== undefined) {
      const contentError = validateUpdateContent(content);

      if (contentError) {
        return res.status(400).json({
          success: false,
          message: contentError,
        });
      }

      note.content = content;
    }

    if (category !== undefined) {
      const categoryError = validateUpdateCategory(category);

      if (categoryError) {
        return res.status(400).json({
          success: false,
          message: categoryError,
        });
      }

      note.category = category.trim() ? normalizeCategory(category) : "General";
    }

    await note.save();

    logger.info(
      { event: "note_updated", userId: req.user.id, noteId: note._id },
      "Note updated",
    );

    res.json({
      success: true,
      message: "Note updated",
      note,
    });
  } catch (err) {
    console.error(err);

    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

exports.toggleFavorite = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, owner: req.user.id });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    note.isFavorite = !note.isFavorite;
    await note.save();

    res.json({
      success: true,
      note,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

exports.trashNote = async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { isDeleted: true, deletedAt: new Date() },
      { returnDocument: "after" },
    );

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    logger.info(
      { event: "note_trashed", userId: req.user.id, noteId: note._id },
      "Note moved to trash",
    );

    res.json({ success: true, message: "Note moved to trash", note });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

exports.restoreNote = async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { isDeleted: false, deletedAt: null },
      { returnDocument: "after" },
    );

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    logger.info(
      { event: "note_restored", userId: req.user.id, noteId: note._id },
      "Note restored",
    );

    res.json({ success: true, message: "Note restored", note });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    logger.info(
      { event: "note_deleted", userId: req.user.id, noteId: note._id },
      "Note permanently deleted",
    );

    res.json({ success: true, message: "Note permanently deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

if (process.env.NODE_ENV === "test") {
  module.exports._internal = {
    escapeRegex,
    normalizeCategory,
    categoryMatchRegex,
    categoryGroupStage,
  };
}

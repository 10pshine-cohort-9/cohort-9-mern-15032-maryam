const Note = require("../models/Note");

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
        query.category = filter;
      }
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
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

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.max(parseInt(limit, 10) || 8, 1);
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

    const [totalNotes, favorites, trashItems, categories] = await Promise.all([
      Note.countDocuments({ owner: ownerId, isDeleted: false }),
      Note.countDocuments({
        owner: ownerId,
        isDeleted: false,
        isFavorite: true,
      }),
      Note.countDocuments({ owner: ownerId, isDeleted: true }),
      Note.distinct("category", { owner: ownerId, isDeleted: false }),
    ]);

    res.json({
      success: true,
      stats: {
        totalNotes,
        favorites,
        categories: categories.length,
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
    const categories = await Note.distinct("category", {
      owner: req.user.id,
      isDeleted: false,
    });

    res.json({
      success: true,
      categories,
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

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required.",
      });
    }

    const note = await Note.create({
      title: title.trim(),
      content: content || "",
      category: category && category.trim() ? category.trim() : "General",
      owner: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Note created",
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
    if (title !== undefined && !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Title is required.",
      });
    }
    if (title !== undefined) note.title = title.trim();
    if (content !== undefined) note.content = content;
    if (category !== undefined) note.category = category.trim() || "General";

    await note.save();

    res.json({
      success: true,
      message: "Note updated",
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
      { new: true },
    );

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

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
      { new: true },
    );

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

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

    res.json({ success: true, message: "Note permanently deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

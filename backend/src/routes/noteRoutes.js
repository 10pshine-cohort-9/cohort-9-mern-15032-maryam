const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
  getNotes,
  getStats,
  getCategories,
  getNoteById,
  createNote,
  updateNote,
  toggleFavorite,
  trashNote,
  restoreNote,
  deleteNote,
} = require("../controllers/noteController");

router.use(authMiddleware);
router.param("id", (req, res, next, id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ success: false, message: "Note not found" });
  }
  next();
});

router.get("/stats", getStats);
router.get("/categories", getCategories);

router.get("/", getNotes);
router.post("/", createNote);

router.get("/:id", getNoteById);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);

router.patch("/:id/favorite", toggleFavorite);
router.patch("/:id/trash", trashNote);
router.patch("/:id/restore", restoreNote);

module.exports = router;

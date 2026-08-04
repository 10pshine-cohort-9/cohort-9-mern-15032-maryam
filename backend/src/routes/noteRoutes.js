const express = require("express");

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

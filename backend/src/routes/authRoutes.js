const express = require("express");

const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
  signup,
  login,
  getMe,
  updateAvatar,
  updateProfile,
} = require("../controllers/authController");

router.post("/signup", signup);
router.post("/login", login);

router.get("/me", authMiddleware, getMe);
router.put("/avatar", authMiddleware, updateAvatar);
router.put("/profile", authMiddleware, updateProfile);

module.exports = router;

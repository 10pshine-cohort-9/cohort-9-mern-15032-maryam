const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    content: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      trim: true,
      default: "General",
    },

    isFavorite: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

noteSchema.index({ owner: 1, isDeleted: 1, updatedAt: -1 });
noteSchema.index({ owner: 1, title: "text", content: "text" });

module.exports = mongoose.model("Note", noteSchema);

const mongoose = require("mongoose");

const PasswordResetTokenSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      index: true,
    },

    schoolCode: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },

    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "password_reset_tokens",
  }
);

// Automatically remove expired reset tokens
PasswordResetTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model(
  "PasswordResetToken",
  PasswordResetTokenSchema
);
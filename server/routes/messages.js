const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Message = require("../models/Message");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Every message route requires JWT
router.use(authMiddleware);

const containsId = (list = [], id) =>
  list.some((value) => value.toString() === id.toString());

const canCommunicate = async (senderId, receiverId) => {
  const [sender, receiver] = await Promise.all([
    User.findById(senderId).select("friends blockedUsers"),
    User.findById(receiverId).select("friends blockedUsers"),
  ]);

  if (!sender || !receiver) {
    return { allowed: false, reason: "User not found" };
  }

  const blockedEitherWay =
    containsId(sender.blockedUsers, receiverId) ||
    containsId(receiver.blockedUsers, senderId);

  if (blockedEitherWay) {
    return { allowed: false, reason: "Messaging is unavailable between these users" };
  }

  const mutualFriends =
    containsId(sender.friends, receiverId) &&
    containsId(receiver.friends, senderId);

  if (!mutualFriends) {
    return { allowed: false, reason: "Friend request must be accepted before messaging" };
  }

  return { allowed: true };
};

// =========================
// FILE UPLOAD CONFIG
// =========================

const uploadDirectory = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);

    const safeBaseName = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 60);

    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}-${safeBaseName}${extension}`;

    cb(null, uniqueName);
  },
});

const allowedMimeTypes = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",

  // PDF / text
  "application/pdf",
  "text/plain",
  "text/csv",

  // Word
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  // Excel
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  // PowerPoint
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  // ZIP
  "application/zip",
  "application/x-zip-compressed",
]);

const allowedExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".pdf",
  ".txt",
  ".csv",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".zip",
]);

const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },

  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (
      allowedMimeTypes.has(file.mimetype) &&
      allowedExtensions.has(extension)
    ) {
      return cb(null, true);
    }

    cb(
      new Error(
        "Unsupported file type. Images, PDF, DOC, DOCX, TXT, CSV, Excel, PowerPoint and ZIP files are allowed."
      )
    );
  },
});

// =========================
// SEND MESSAGE
// =========================
router.post("/", (req, res) => {
  upload.single("file")(req, res, async (uploadError) => {
    if (uploadError) {
      if (uploadError instanceof multer.MulterError) {
        if (uploadError.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            message: "File size must be 10 MB or less",
          });
        }

        return res.status(400).json({
          message: uploadError.message,
        });
      }

      return res.status(400).json({
        message: uploadError.message || "File upload failed",
      });
    }

    try {
      const {
        receiver,
        text,
        isSecret,
        replyTo,
        forwardedFrom,
      } = req.body;

      const sender = req.user.id;

      const cleanText = text?.trim() || "";
      const secretMessage = isSecret === "true" && Boolean(cleanText) && !req.file;

      if (!receiver) {
        if (req.file) {
          fs.unlink(req.file.path, () => {});
        }

        return res.status(400).json({
          message: "Receiver is required",
        });
      }

      if (!cleanText && !req.file) {
        return res.status(400).json({
          message: "Message text or file is required",
        });
      }

      const permission = await canCommunicate(sender, receiver);
      if (!permission.allowed) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(permission.reason === "User not found" ? 404 : 403).json({
          message: permission.reason,
        });
      }

      let attachment = null;

      if (req.file) {
        attachment = {
          url: `/uploads/${req.file.filename}`,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          kind: req.file.mimetype.startsWith("image/")
          ? "image"
          : "file",
        };
      }

      const newMessage = await Message.create({
        sender,
        receiver,
        text: cleanText,
        isSecret: secretMessage,
        attachment,
        replyTo: replyTo || null,
        forwardedFrom: forwardedFrom || null,
      });

      const populatedMessage = await Message.findById(newMessage._id)
        .populate("replyTo")
        .populate("forwardedFrom")
        .populate("reactions.user", "name");

      res.status(201).json(populatedMessage);
    } catch (error) {
      console.log("Send message error:", error);

      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }

      res.status(500).json({
        message: "Server error",
      });
    }
  });
});

// =========================
// GET CHAT HISTORY
// =========================
router.get("/:user1/:user2", async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const currentUserId = req.user.id;

    if (
      currentUserId !== user1 &&
      currentUserId !== user2
    ) {
      return res.status(403).json({
        message: "You cannot access this conversation",
      });
    }

    const messages = await Message.find({
      $and: [
        {
          $or: [
            {
              sender: user1,
              receiver: user2,
            },
            {
              sender: user2,
              receiver: user1,
            },
          ],
        },
        {
          deletedFor: {
            $ne: currentUserId,
          },
        },
      ],
    })
      .populate("replyTo")
      .populate("forwardedFrom")
      .populate("reactions.user", "name")
      .sort({
        createdAt: 1,
      });

    res.status(200).json(messages);
  } catch (error) {
    console.log("Chat history error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =========================
// MESSAGE STATUS
// =========================
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!["sent", "delivered", "read"].includes(status)) {
      return res.status(400).json({
        message: "Invalid message status",
      });
    }

    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    const currentUserId = req.user.id;

    if (
      message.sender.toString() !== currentUserId &&
      message.receiver.toString() !== currentUserId
    ) {
      return res.status(403).json({
        message: "Not allowed",
      });
    }

    message.status = status;

    await message.save();

    res.status(200).json(message);
  } catch (error) {
    console.log("Message status error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =========================
// EDIT MESSAGE
// =========================
router.patch("/:id/edit", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({
        message: "Message cannot be empty",
      });
    }

    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You can only edit your own message",
      });
    }

    if (message.deletedForEveryone) {
      return res.status(400).json({
        message: "Deleted message cannot be edited",
      });
    }

    message.text = text.trim();
    message.edited = true;
    message.editedAt = new Date();

    await message.save();

    res.status(200).json({
      message: "Message edited successfully",
      editedMessage: message,
    });
  } catch (error) {
    console.log("Edit message error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =========================
// REACTION
// =========================
router.patch("/:id/reaction", async (req, res) => {
  try {
    const { emoji } = req.body;
    const userId = req.user.id;

    if (!emoji) {
      return res.status(400).json({
        message: "Emoji is required",
      });
    }

    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    if (
      message.sender.toString() !== userId &&
      message.receiver.toString() !== userId
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (message.deletedForEveryone) {
      return res.status(400).json({
        message: "Cannot react to a deleted message",
      });
    }

    const existingReactionIndex = message.reactions.findIndex(
      (reaction) => reaction.user.toString() === userId
    );

    if (
      existingReactionIndex !== -1 &&
      message.reactions[existingReactionIndex].emoji === emoji
    ) {
      message.reactions.splice(existingReactionIndex, 1);
    } else if (existingReactionIndex !== -1) {
      message.reactions[existingReactionIndex].emoji = emoji;
    } else {
      message.reactions.push({
        user: userId,
        emoji,
      });
    }

    await message.save();

    const updatedMessage = await Message.findById(message._id)
      .populate("reactions.user", "name");

    res.status(200).json({
      message: "Reaction updated",
      updatedMessage,
    });
  } catch (error) {
    console.log("Reaction error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =========================
// FORWARD MESSAGE
// =========================
router.post("/:id/forward", async (req, res) => {
  try {
    const { receiver } = req.body;

    if (!receiver) {
      return res.status(400).json({
        message: "Receiver is required",
      });
    }

    const originalMessage = await Message.findById(req.params.id);

    if (!originalMessage) {
      return res.status(404).json({
        message: "Original message not found",
      });
    }

    if (
      originalMessage.sender.toString() !== req.user.id &&
      originalMessage.receiver.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (originalMessage.deletedForEveryone) {
      return res.status(400).json({
        message: "Deleted message cannot be forwarded",
      });
    }

    const permission = await canCommunicate(req.user.id, receiver);
    if (!permission.allowed) {
      return res.status(permission.reason === "User not found" ? 404 : 403).json({
        message: permission.reason,
      });
    }

    const forwardedMessage = await Message.create({
      sender: req.user.id,
      receiver,
      text: originalMessage.text || "",
      isSecret: originalMessage.isSecret || false,
      attachment: originalMessage.attachment || null,
      forwardedFrom: originalMessage._id,
    });

    const populatedMessage = await Message.findById(
      forwardedMessage._id
    )
      .populate("forwardedFrom")
      .populate("reactions.user", "name");

    res.status(201).json({
      message: "Message forwarded successfully",
      forwardedMessage: populatedMessage,
    });
  } catch (error) {
    console.log("Forward message error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =========================
// DELETE FOR ME
// =========================
router.patch("/:id/delete-for-me", async (req, res) => {
  try {
    const userId = req.user.id;

    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    if (
      message.sender.toString() !== userId &&
      message.receiver.toString() !== userId
    ) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await Message.findByIdAndUpdate(req.params.id, {
      $addToSet: { deletedFor: userId },
    });

    res.status(200).json({
      message: "Message deleted for you",
    });
  } catch (error) {
    console.log("Delete for me error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =========================
// DELETE FOR EVERYONE
// =========================
router.patch("/:id/delete-for-everyone", async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Only sender can delete for everyone",
      });
    }

    message.deletedForEveryone = true;
    message.text = "This message was deleted";
    message.isSecret = false;
    message.attachment = null;
    message.reactions = [];

    await message.save();

    res.status(200).json({
      message: "Message deleted for everyone",
      deletedMessage: message,
    });
  } catch (error) {
    console.log("Delete for everyone error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");

const User = require("../models/User");
const Message = require("../models/Message");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const uploadDirectory = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDirectory),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `profile-${req.user.id}-${Date.now()}${extension}`);
  },
});

const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

    if (
      allowedExtensions.includes(extension) &&
      allowedMimeTypes.includes(file.mimetype)
    ) {
      return cb(null, true);
    }

    cb(new Error("Only JPG, PNG and WEBP profile images are allowed"));
  },
});

const normalizeNexChatId = (value = "") =>
  String(value).trim().replace(/^@+/, "").toLowerCase();

const ensureNexChatId = async (user) => {
  if (!user) return user;

  if (!user.nexchatId) {
    user.nexchatId = `nx_${user._id.toString().slice(-10)}`.toLowerCase();
    await user.save();
  }

  return user;
};

const safePublicUser = (user) => ({
  _id: user._id,
  name: user.name,
  nexchatId: user.nexchatId,
  profileImage: user.profileImage || "",
  about: user.about || "",
});

const containsId = (list = [], id) =>
  list.some((value) => value.toString() === id.toString());

// =========================
// CONVERSATIONS
// =========================

router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUser = await User.findById(currentUserId);

    if (!currentUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    await ensureNexChatId(currentUser);

    const sentTo = await Message.distinct("receiver", {
      sender: currentUserId,
    });

    const receivedFrom = await Message.distinct("sender", {
      receiver: currentUserId,
    });

    const partnerIds = new Set([
      ...currentUser.friends.map((id) => id.toString()),
      ...sentTo.map((id) => id.toString()),
      ...receivedFrom.map((id) => id.toString()),
    ]);

    partnerIds.delete(currentUserId.toString());

    const blockedByMe = new Set(
      currentUser.blockedUsers.map((id) => id.toString())
    );

    const usersWhoBlockedMe = await User.find({
      blockedUsers: currentUserId,
    }).select("_id");

    const blockedMe = new Set(
      usersWhoBlockedMe.map((user) => user._id.toString())
    );

    const visibleIds = [...partnerIds].filter(
      (id) => !blockedByMe.has(id) && !blockedMe.has(id)
    );

    if (!visibleIds.length) {
      return res.status(200).json([]);
    }

    const users = await User.find({
      _id: { $in: visibleIds },
    }).select("name nexchatId profileImage about");

    for (const user of users) {
      await ensureNexChatId(user);
    }

    const response = users.map((user) => ({
      ...safePublicUser(user),
      isFriend: containsId(currentUser.friends, user._id),
    }));

    res.status(200).json(response);
  } catch (error) {
    console.log("Conversation users fetch error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =========================
// USERS
// =========================

router.get("/", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUser = await User.findById(currentUserId);

    if (!currentUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const sentTo = await Message.distinct("receiver", {
      sender: currentUserId,
    });

    const receivedFrom = await Message.distinct("sender", {
      receiver: currentUserId,
    });

    const partnerIds = new Set([
      ...currentUser.friends.map((id) => id.toString()),
      ...sentTo.map((id) => id.toString()),
      ...receivedFrom.map((id) => id.toString()),
    ]);

    partnerIds.delete(currentUserId.toString());

    const users = await User.find({
      _id: { $in: [...partnerIds] },
    }).select("name nexchatId profileImage about");

    for (const user of users) {
      await ensureNexChatId(user);
    }

    res.status(200).json(users);
  } catch (error) {
    console.log("Users fetch error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =========================
// CURRENT USER
// =========================

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    await ensureNexChatId(user);

    res.status(200).json(user);
  } catch (error) {
    console.log("Profile fetch error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =========================
// SEARCH USER BY NEXCHAT ID
// =========================

router.get("/search/:nexchatId", authMiddleware, async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const nexchatId = normalizeNexChatId(
      req.params.nexchatId
    );

    if (!nexchatId) {
      return res.status(400).json({
        message: "Enter a NexChat ID",
      });
    }

    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId),
      User.findOne({ nexchatId }),
    ]);

    if (!currentUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    await ensureNexChatId(currentUser);

    if (
      !targetUser ||
      targetUser._id.toString() === currentUserId
    ) {
      return res.status(404).json({
        message: "No user found with that NexChat ID",
      });
    }

    const targetId = targetUser._id.toString();

    const blockedEitherWay =
      containsId(currentUser.blockedUsers, targetId) ||
      containsId(targetUser.blockedUsers, currentUserId);

    if (blockedEitherWay) {
      return res.status(404).json({
        message: "No user found with that NexChat ID",
      });
    }

    await ensureNexChatId(targetUser);

    let requestStatus = "none";

    if (containsId(currentUser.friends, targetId)) {
      requestStatus = "friends";
    } else if (
      containsId(currentUser.friendRequestsSent, targetId)
    ) {
      requestStatus = "sent";
    } else if (
      containsId(
        currentUser.friendRequestsReceived,
        targetId
      )
    ) {
      requestStatus = "received";
    }

    res.status(200).json({
      user: safePublicUser(targetUser),
      requestStatus,
    });
  } catch (error) {
    console.log("NexChat ID search error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =========================
// FRIEND REQUESTS
// =========================

router.get(
  "/friend-requests",
  authMiddleware,
  async (req, res) => {
    try {
      const user = await User.findById(
        req.user.id
      ).populate(
        "friendRequestsReceived",
        "name nexchatId profileImage about"
      );

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const requests = [];

      for (
        const sender of user.friendRequestsReceived || []
      ) {
        await ensureNexChatId(sender);
        requests.push(safePublicUser(sender));
      }

      res.status(200).json(requests);
    } catch (error) {
      console.log(
        "Friend request fetch error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// SEND FRIEND REQUEST
// =========================

router.post(
  "/friend-request/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const currentUserId = req.user.id;
      const targetUserId = req.params.id;

      if (currentUserId === targetUserId) {
        return res.status(400).json({
          message: "You cannot add yourself",
        });
      }

      const [currentUser, targetUser] =
        await Promise.all([
          User.findById(currentUserId),
          User.findById(targetUserId),
        ]);

      if (!currentUser || !targetUser) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const blockedEitherWay =
        containsId(
          currentUser.blockedUsers,
          targetUserId
        ) ||
        containsId(
          targetUser.blockedUsers,
          currentUserId
        );

      if (blockedEitherWay) {
        return res.status(400).json({
          message: "Friend request is unavailable",
        });
      }

      if (
        containsId(
          currentUser.friends,
          targetUserId
        )
      ) {
        return res.status(200).json({
          message: "You are already friends",
          status: "friends",
        });
      }

      if (
        containsId(
          currentUser.friendRequestsReceived,
          targetUserId
        )
      ) {
        return res.status(409).json({
          message:
            "This user already sent you a request. Accept it from Friend Requests.",
        });
      }

      if (
        containsId(
          currentUser.friendRequestsSent,
          targetUserId
        )
      ) {
        return res.status(200).json({
          message: "Friend request already sent",
          status: "sent",
        });
      }

      await Promise.all([
        User.findByIdAndUpdate(currentUserId, {
          $addToSet: {
            friendRequestsSent: targetUserId,
          },
        }),

        User.findByIdAndUpdate(targetUserId, {
          $addToSet: {
            friendRequestsReceived:
              currentUserId,
          },
        }),
      ]);

      res.status(200).json({
        message: "Friend request sent",
        status: "sent",
      });
    } catch (error) {
      console.log(
        "Friend request send error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// ACCEPT FRIEND REQUEST
// =========================

router.post(
  "/friend-request/:id/accept",
  authMiddleware,
  async (req, res) => {
    try {
      const currentUserId = req.user.id;
      const senderId = req.params.id;

      const currentUser = await User.findById(
        currentUserId
      );

      if (!currentUser) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (
        !containsId(
          currentUser.friendRequestsReceived,
          senderId
        )
      ) {
        return res.status(400).json({
          message: "Friend request not found",
        });
      }

      const sender = await User.findById(senderId);

      if (!sender) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const blockedEitherWay =
        containsId(
          currentUser.blockedUsers,
          senderId
        ) ||
        containsId(
          sender.blockedUsers,
          currentUserId
        );

      if (blockedEitherWay) {
        return res.status(400).json({
          message: "Friend request is unavailable",
        });
      }

      await Promise.all([
        User.findByIdAndUpdate(currentUserId, {
          $addToSet: {
            friends: senderId,
          },

          $pull: {
            friendRequestsReceived: senderId,
            friendRequestsSent: senderId,
          },
        }),

        User.findByIdAndUpdate(senderId, {
          $addToSet: {
            friends: currentUserId,
          },

          $pull: {
            friendRequestsSent: currentUserId,
            friendRequestsReceived:
              currentUserId,
          },
        }),
      ]);

      const updatedUser =
        await User.findById(
          currentUserId
        ).select("-password");

      res.status(200).json({
        message: "Friend request accepted",
        currentUser: updatedUser,
      });
    } catch (error) {
      console.log(
        "Friend request accept error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// DECLINE FRIEND REQUEST
// =========================

router.post(
  "/friend-request/:id/decline",
  authMiddleware,
  async (req, res) => {
    try {
      const currentUserId = req.user.id;
      const senderId = req.params.id;

      await Promise.all([
        User.findByIdAndUpdate(currentUserId, {
          $pull: {
            friendRequestsReceived: senderId,
          },
        }),

        User.findByIdAndUpdate(senderId, {
          $pull: {
            friendRequestsSent: currentUserId,
          },
        }),
      ]);

      res.status(200).json({
        message: "Friend request declined",
      });
    } catch (error) {
      console.log(
        "Friend request decline error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// REMOVE FRIEND
// =========================

router.post(
  "/friends/:id/remove",
  authMiddleware,
  async (req, res) => {
    try {
      const currentUserId = req.user.id;
      const targetUserId = req.params.id;

      await Promise.all([
        User.findByIdAndUpdate(currentUserId, {
          $pull: {
            friends: targetUserId,
          },
        }),

        User.findByIdAndUpdate(targetUserId, {
          $pull: {
            friends: currentUserId,
          },
        }),
      ]);

      const updatedUser =
        await User.findById(
          currentUserId
        ).select("-password");

      res.status(200).json({
        message: "Friend removed",
        currentUser: updatedUser,
      });
    } catch (error) {
      console.log("Friend remove error:", error);

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// UPDATE PROFILE
// =========================

router.patch(
  "/profile",
  authMiddleware,
  (req, res) => {
    profileUpload.single("profileImage")(
      req,
      res,
      async (uploadError) => {
        if (uploadError) {
          if (
            uploadError instanceof
              multer.MulterError &&
            uploadError.code ===
              "LIMIT_FILE_SIZE"
          ) {
            return res.status(400).json({
              message:
                "Profile image must be 5 MB or less",
            });
          }

          return res.status(400).json({
            message:
              uploadError.message ||
              "Profile image upload failed",
          });
        }

        try {
          const name = req.body.name?.trim();
          const about =
            req.body.about?.trim() || "";

          if (!name) {
            if (req.file) {
              fs.unlink(
                req.file.path,
                () => {}
              );
            }

            return res.status(400).json({
              message: "Name is required",
            });
          }

          if (name.length > 50) {
            if (req.file) {
              fs.unlink(
                req.file.path,
                () => {}
              );
            }

            return res.status(400).json({
              message:
                "Name must be 50 characters or less",
            });
          }

          if (about.length > 160) {
            if (req.file) {
              fs.unlink(
                req.file.path,
                () => {}
              );
            }

            return res.status(400).json({
              message:
                "About must be 160 characters or less",
            });
          }

          const user = await User.findById(
            req.user.id
          );

          if (!user) {
            if (req.file) {
              fs.unlink(
                req.file.path,
                () => {}
              );
            }

            return res.status(404).json({
              message: "User not found",
            });
          }

          const oldProfileImage =
            user.profileImage;

          user.name = name;
          user.about = about;

          if (req.file) {
            user.profileImage =
              `/uploads/${req.file.filename}`;
          }

          await ensureNexChatId(user);
          await user.save();

          if (
            req.file &&
            oldProfileImage?.startsWith(
              "/uploads/profile-"
            )
          ) {
            const oldFilePath = path.join(
              __dirname,
              "..",
              oldProfileImage.replace(
                /^\//,
                ""
              )
            );

            fs.unlink(
              oldFilePath,
              () => {}
            );
          }

          const safeUser =
            await User.findById(
              user._id
            ).select("-password");

          res.status(200).json({
            message:
              "Profile updated successfully",
            user: safeUser,
          });
        } catch (error) {
          console.log(
            "Profile update error:",
            error
          );

          if (req.file) {
            fs.unlink(
              req.file.path,
              () => {}
            );
          }

          res.status(500).json({
            message: "Server error",
          });
        }
      }
    );
  }
);

// =========================
// LEGACY FRIEND ROUTE
// =========================

router.post(
  "/:id/friend",
  authMiddleware,
  async (req, res) => {
    try {
      const currentUserId = req.user.id;
      const targetUserId = req.params.id;

      const currentUser =
        await User.findById(currentUserId);

      if (!currentUser) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (
        containsId(
          currentUser.friends,
          targetUserId
        )
      ) {
        await Promise.all([
          User.findByIdAndUpdate(
            currentUserId,
            {
              $pull: {
                friends: targetUserId,
              },
            }
          ),

          User.findByIdAndUpdate(
            targetUserId,
            {
              $pull: {
                friends: currentUserId,
              },
            }
          ),
        ]);

        const updatedUser =
          await User.findById(
            currentUserId
          ).select("-password");

        return res.status(200).json({
          message: "Friend removed",
          action: "removed",
          currentUser: updatedUser,
        });
      }

      return res.status(400).json({
        message:
          "Use Add Friend to send a friend request first",
      });
    } catch (error) {
      console.log(
        "Friend update error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// BLOCK / UNBLOCK USER
// =========================

router.post(
  "/:id/block",
  authMiddleware,
  async (req, res) => {
    try {
      const currentUserId = req.user.id;
      const targetUserId = req.params.id;

      if (currentUserId === targetUserId) {
        return res.status(400).json({
          message:
            "You cannot block yourself",
        });
      }

      const [currentUser, targetUser] =
        await Promise.all([
          User.findById(currentUserId),
          User.findById(targetUserId),
        ]);

      if (!currentUser || !targetUser) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      const isBlocked = containsId(
        currentUser.blockedUsers,
        targetUserId
      );

      // =========================
      // UNBLOCK
      // =========================

      if (isBlocked) {
        await User.findByIdAndUpdate(
          currentUserId,
          {
            $pull: {
              blockedUsers: targetUserId,
            },
          }
        );
      }

      // =========================
      // BLOCK
      // =========================

      else {
        /*
          IMPORTANT:

          Blocking DOES NOT remove the
          accepted friendship.

          This means:

          Friend
          -> Block
          -> Communication stops
          -> Unblock
          -> Friendship is still there

          Therefore a new friend request
          is NOT required after unblock.
        */

        await Promise.all([
          User.findByIdAndUpdate(
            currentUserId,
            {
              $addToSet: {
                blockedUsers: targetUserId,
              },

              // Only pending requests removed.
              // Existing friends remain untouched.
              $pull: {
                friendRequestsReceived:
                  targetUserId,
                friendRequestsSent:
                  targetUserId,
              },
            }
          ),

          User.findByIdAndUpdate(
            targetUserId,
            {
              // Remove pending requests
              // from the other account too.
              // DO NOT remove friends.
              $pull: {
                friendRequestsReceived:
                  currentUserId,
                friendRequestsSent:
                  currentUserId,
              },
            }
          ),
        ]);
      }

      const updatedUser =
        await User.findById(
          currentUserId
        ).select("-password");

      res.status(200).json({
        message: isBlocked
          ? "User unblocked"
          : "User blocked",

        action: isBlocked
          ? "unblocked"
          : "blocked",

        currentUser: updatedUser,
      });
    } catch (error) {
      console.log(
        "Block update error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// CHAT LOCK
// =========================

// Get Chat Lock status.
// PIN hash is never sent to frontend.

router.get(
  "/chat-lock/status",
  authMiddleware,
  async (req, res) => {
    try {
      const user = await User.findById(
        req.user.id
      ).select(
        "+chatLockPin lockedChats"
      );

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      res.status(200).json({
        hasPin: Boolean(
          user.chatLockPin
        ),

        lockedChats: (
          user.lockedChats || []
        ).map((id) => id.toString()),
      });
    } catch (error) {
      console.log(
        "Chat lock status error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// SET / CHANGE CHAT LOCK PIN
// =========================

router.post(
  "/chat-lock/set-pin",
  authMiddleware,
  async (req, res) => {
    try {
      const pin = String(
        req.body.pin || ""
      ).trim();

      const currentPin = String(
        req.body.currentPin || ""
      ).trim();

      if (!/^\d{4}$/.test(pin)) {
        return res.status(400).json({
          message:
            "PIN must be exactly 4 digits",
        });
      }

      const user = await User.findById(
        req.user.id
      ).select("+chatLockPin");

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (user.chatLockPin) {
        if (
          !/^\d{4}$/.test(currentPin)
        ) {
          return res.status(400).json({
            message:
              "Current PIN is required",
          });
        }

        const currentPinMatches =
          await bcrypt.compare(
            currentPin,
            user.chatLockPin
          );

        if (!currentPinMatches) {
          return res.status(401).json({
            message:
              "Current PIN is incorrect",
          });
        }
      }

      user.chatLockPin =
        await bcrypt.hash(pin, 10);

      await user.save();

      res.status(200).json({
        message:
          "Chat Lock PIN saved",
        hasPin: true,
      });
    } catch (error) {
      console.log(
        "Chat lock PIN save error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// VERIFY CHAT LOCK PIN
// =========================

router.post(
  "/chat-lock/verify",
  authMiddleware,
  async (req, res) => {
    try {
      const pin = String(
        req.body.pin || ""
      ).trim();

      if (!/^\d{4}$/.test(pin)) {
        return res.status(400).json({
          message:
            "Enter your 4-digit PIN",
        });
      }

      const user = await User.findById(
        req.user.id
      ).select("+chatLockPin");

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (!user.chatLockPin) {
        return res.status(400).json({
          message:
            "Chat Lock PIN has not been set",
        });
      }

      const matches =
        await bcrypt.compare(
          pin,
          user.chatLockPin
        );

      if (!matches) {
        return res.status(401).json({
          message: "Incorrect PIN",
        });
      }

      res.status(200).json({
        verified: true,
      });
    } catch (error) {
      console.log(
        "Chat lock PIN verify error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// LOCK CONVERSATION
// =========================

router.post(
  "/chat-lock/:id/lock",
  authMiddleware,
  async (req, res) => {
    try {
      const currentUserId = req.user.id;
      const targetUserId = req.params.id;

      if (
        currentUserId === targetUserId
      ) {
        return res.status(400).json({
          message:
            "You cannot lock a chat with yourself",
        });
      }

      const [
        currentUser,
        targetUser,
      ] = await Promise.all([
        User.findById(
          currentUserId
        ).select(
          "+chatLockPin lockedChats"
        ),

        User.findById(
          targetUserId
        ).select("_id"),
      ]);

      if (
        !currentUser ||
        !targetUser
      ) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (!currentUser.chatLockPin) {
        return res.status(400).json({
          message:
            "Set a Chat Lock PIN first",
        });
      }

      if (
        !containsId(
          currentUser.lockedChats,
          targetUserId
        )
      ) {
        currentUser.lockedChats.push(
          targetUserId
        );

        await currentUser.save();
      }

      res.status(200).json({
        message: "Chat locked",

        lockedChats:
          currentUser.lockedChats.map(
            (id) => id.toString()
          ),
      });
    } catch (error) {
      console.log(
        "Chat lock error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// UNLOCK CONVERSATION
// =========================

router.post(
  "/chat-lock/:id/unlock",
  authMiddleware,
  async (req, res) => {
    try {
      const targetUserId =
        req.params.id;

      const pin = String(
        req.body.pin || ""
      ).trim();

      if (!/^\d{4}$/.test(pin)) {
        return res.status(400).json({
          message:
            "Enter your 4-digit PIN",
        });
      }

      const user = await User.findById(
        req.user.id
      ).select(
        "+chatLockPin lockedChats"
      );

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      if (!user.chatLockPin) {
        return res.status(400).json({
          message:
            "Chat Lock PIN has not been set",
        });
      }

      const matches =
        await bcrypt.compare(
          pin,
          user.chatLockPin
        );

      if (!matches) {
        return res.status(401).json({
          message: "Incorrect PIN",
        });
      }

      user.lockedChats = (
        user.lockedChats || []
      ).filter(
        (id) =>
          id.toString() !==
          targetUserId.toString()
      );

      await user.save();

      res.status(200).json({
        message: "Chat unlocked",

        lockedChats:
          user.lockedChats.map(
            (id) => id.toString()
          ),
      });
    } catch (error) {
      console.log(
        "Chat unlock error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// RESET CHAT LOCK PIN
// AFTER EMAIL OTP VERIFICATION
// =========================

router.post(
  "/chat-lock/reset-pin",
  authMiddleware,
  async (req, res) => {
    try {
      const newPin = String(
        req.body.newPin || ""
      ).trim();

      if (!/^\d{4}$/.test(newPin)) {
        return res.status(400).json({
          message:
            "PIN must be exactly 4 digits",
        });
      }

      const user = await User.findById(
        req.user.id
      ).select(
        "+chatLockPin resetPasswordVerified"
      );

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      /*
        Existing Forgot Password OTP
        verification sets
        resetPasswordVerified = true.
      */

      if (
        !user.resetPasswordVerified
      ) {
        return res.status(403).json({
          message:
            "Verify the OTP sent to your email first",
        });
      }

      user.chatLockPin =
        await bcrypt.hash(
          newPin,
          10
        );

      user.resetPasswordVerified =
        false;

      user.resetPasswordOtp = null;

      user.resetPasswordOtpExpires =
        null;

      await user.save();

      res.status(200).json({
        message:
          "Chat Lock PIN reset successfully",

        hasPin: true,
      });
    } catch (error) {
      console.log(
        "Chat Lock PIN reset error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

module.exports = router;
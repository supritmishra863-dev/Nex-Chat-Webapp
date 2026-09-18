const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const messageRoutes = require("./routes/messages");
const callRoutes = require("./routes/calls");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/calls", callRoutes);

app.get("/", (req, res) => {
  res.send("NexChat Server is running!");
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("user_online", (userId) => {
    socket.userId = userId;

    onlineUsers.set(userId, socket.id);

    io.emit(
      "online_users",
      Array.from(onlineUsers.keys())
    );
  });

  // =========================
  // MESSAGE
  // =========================
  socket.on("send_message", (data) => {
    const receiverSocketId = onlineUsers.get(
      data.receiver
    );

    if (receiverSocketId) {
      io.to(receiverSocketId).emit(
        "receive_message",
        data
      );

      socket.emit("message_delivered", {
        messageId: data.messageId,
      });
    }
  });

  // =========================
  // DELETE MESSAGE
  // =========================
  socket.on("delete_for_everyone", (data) => {
    const receiverSocketId = onlineUsers.get(
      data.receiver
    );

    if (receiverSocketId) {
      io.to(receiverSocketId).emit(
        "message_deleted_for_everyone",
        {
          messageId: data.messageId,
        }
      );
    }
  });

  // =========================
  // EDIT MESSAGE
  // =========================
  socket.on("edit_message", (data) => {
    const receiverSocketId = onlineUsers.get(
      data.receiver
    );

    if (receiverSocketId) {
      io.to(receiverSocketId).emit(
        "message_edited",
        {
          messageId: data.messageId,
          text: data.text,
          edited: true,
          editedAt: data.editedAt,
        }
      );
    }
  });

  // =========================
  // REACTION
  // =========================
  socket.on("message_reaction", (data) => {
    const receiverSocketId = onlineUsers.get(
      data.receiver
    );

    if (receiverSocketId) {
      io.to(receiverSocketId).emit(
        "message_reaction_updated",
        {
          messageId: data.messageId,
          reactions: data.reactions,
        }
      );
    }
  });

  // =========================
  // FORWARD MESSAGE
  // =========================
  socket.on("forward_message", (data) => {
    const receiverSocketId = onlineUsers.get(
      data.receiver
    );

    if (receiverSocketId) {
      io.to(receiverSocketId).emit(
        "receive_message",
        data
      );

      socket.emit("message_delivered", {
        messageId: data.messageId,
      });
    }
  });

  // =========================
  // MESSAGE READ
  // =========================
  socket.on("messages_read", (data) => {
    const senderSocketId = onlineUsers.get(
      data.sender
    );

    if (senderSocketId) {
      io.to(senderSocketId).emit(
        "messages_read",
        {
          reader: data.reader,
          messageId: data.messageId,
        }
      );
    }
  });

  // =========================
  // TYPING
  // =========================
  socket.on("typing", (data) => {
    const receiverSocketId = onlineUsers.get(
      data.receiver
    );

    if (receiverSocketId) {
      io.to(receiverSocketId).emit(
        "typing",
        data
      );
    }
  });

  socket.on("stop_typing", (data) => {
    const receiverSocketId = onlineUsers.get(
      data.receiver
    );

    if (receiverSocketId) {
      io.to(receiverSocketId).emit(
        "stop_typing",
        data
      );
    }
  });

  // =========================
  // REAL-TIME FRIEND REQUEST
  // =========================
  socket.on("friend_request_sent", (data) => {
    const receiverSocketId = onlineUsers.get(
      data.to
    );

    if (receiverSocketId) {
      io.to(receiverSocketId).emit(
        "friend_request_received",
        {
          to: data.to,
          from: data.from,
          fromName:
            data.fromName || "NexChat user",
        }
      );
    }
  });

  // =========================
  // FRIEND REQUEST RESPONSE
  // =========================
  socket.on(
    "friend_request_response",
    (data) => {
      const requesterSocketId =
        onlineUsers.get(data.to);

      if (requesterSocketId) {
        io.to(requesterSocketId).emit(
          "friend_request_response",
          {
            to: data.to,
            from: data.from,
            action: data.action,
          }
        );
      }
    }
  );

  // =========================
  // CALL USER
  // =========================
  socket.on("call_user", (data) => {
    const receiverSocketId = onlineUsers.get(
      data.to
    );

    if (!receiverSocketId) {
      socket.emit("call_unavailable", {
        userId: data.to,
      });

      return;
    }

    io.to(receiverSocketId).emit(
      "incoming_call",
      {
        from: data.from,
        fromName: data.fromName,
        callType: data.callType,
        offer: data.offer,
        callLogId:
          data.callLogId || null,
      }
    );
  });

  // =========================
  // ANSWER CALL
  // =========================
  socket.on("answer_call", (data) => {
    const callerSocketId = onlineUsers.get(
      data.to
    );

    if (callerSocketId) {
      io.to(callerSocketId).emit(
        "call_answered",
        {
          from: data.from,
          answer: data.answer,
          callLogId:
            data.callLogId || null,
        }
      );
    }
  });

  // =========================
  // ICE CANDIDATE
  // =========================
  socket.on("ice_candidate", (data) => {
    const receiverSocketId = onlineUsers.get(
      data.to
    );

    if (receiverSocketId) {
      io.to(receiverSocketId).emit(
        "ice_candidate",
        {
          from: data.from,
          candidate: data.candidate,
        }
      );
    }
  });

  // =========================
  // REJECT CALL
  // =========================
  socket.on("reject_call", (data) => {
    const callerSocketId = onlineUsers.get(
      data.to
    );

    if (callerSocketId) {
      io.to(callerSocketId).emit(
        "call_rejected",
        {
          from: data.from,
        }
      );
    }
  });

  // =========================
  // END CALL
  // =========================
  socket.on("end_call", (data) => {
    const receiverSocketId = onlineUsers.get(
      data.to
    );

    if (receiverSocketId) {
      io.to(receiverSocketId).emit(
        "call_ended",
        {
          from: data.from,
        }
      );
    }
  });

  // =========================
  // DISCONNECT
  // =========================
  socket.on("disconnect", () => {
    if (socket.userId) {
      const currentSocketId =
        onlineUsers.get(socket.userId);

      if (currentSocketId === socket.id) {
        onlineUsers.delete(socket.userId);
      }
    }

    io.emit(
      "online_users",
      Array.from(onlineUsers.keys())
    );

    console.log(
      "User disconnected:",
      socket.id
    );
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected!");
  })
  .catch((error) => {
    console.log(
      "MongoDB Connection Error:",
      error.message
    );
  });

const PORT = 5000;

server.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});
  
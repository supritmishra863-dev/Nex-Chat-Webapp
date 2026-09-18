const mongoose = require("mongoose");

const callLogSchema = new mongoose.Schema(
  {
    caller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["voice", "video"], required: true },
    status: {
      type: String,
      enum: ["ringing", "connected", "ended", "rejected", "missed"],
      default: "ringing",
    },
    duration: { type: Number, default: 0, min: 0 },
    answeredAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CallLog", callLogSchema);

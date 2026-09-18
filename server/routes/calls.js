const express = require("express");
const CallLog = require("../models/CallLog");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();
router.use(authMiddleware);

const FINAL_STATUSES = new Set(["ended", "rejected", "missed"]);
const VALID_STATUSES = new Set(["ringing", "connected", "ended", "rejected", "missed"]);

router.post("/", async (req, res) => {
  try {
    const { receiver, type } = req.body;
    if (!receiver || !["voice", "video"].includes(type)) {
      return res.status(400).json({ message: "Valid receiver and call type are required" });
    }
    if (String(receiver) === String(req.user.id)) {
      return res.status(400).json({ message: "You cannot call yourself" });
    }

    const call = await CallLog.create({ caller: req.user.id, receiver, type });
    res.status(201).json(call);
  } catch (error) {
    console.log("Create call log error:", error.message);
    res.status(500).json({ message: "Unable to create call record" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const call = await CallLog.findById(req.params.id);
    if (!call) return res.status(404).json({ message: "Call not found" });

    const me = String(req.user.id);
    if (![String(call.caller), String(call.receiver)].includes(me)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const { status } = req.body;
    if (!status || !VALID_STATUSES.has(status)) {
      return res.status(400).json({ message: "Invalid call status" });
    }

    // Final records cannot be downgraded by a late socket event.
    if (FINAL_STATUSES.has(call.status)) return res.json(call);

    if (status === "connected") {
      call.status = "connected";
      if (!call.answeredAt) call.answeredAt = new Date();
    } else if (FINAL_STATUSES.has(status)) {
      call.status = status;
      call.endedAt = new Date();
      if (call.answeredAt && status === "ended") {
        call.duration = Math.max(
          0,
          Math.floor((call.endedAt.getTime() - call.answeredAt.getTime()) / 1000)
        );
      } else {
        call.duration = 0;
      }
    }

    await call.save();
    res.json(call);
  } catch (error) {
    console.log("Update call log error:", error.message);
    res.status(500).json({ message: "Unable to update call record" });
  }
});

router.get("/with/:userId", async (req, res) => {
  try {
    const me = req.user.id;
    const other = req.params.userId;
    const calls = await CallLog.find({
      $or: [
        { caller: me, receiver: other },
        { caller: other, receiver: me },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    res.json(calls);
  } catch (error) {
    console.log("Call history error:", error.message);
    res.status(500).json({ message: "Unable to load call history" });
  }
});

module.exports = router;

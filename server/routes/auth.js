const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const User = require("../models/User");

const router = express.Router();

// =========================
// EMAIL TRANSPORTER
// =========================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

// =========================
// SIGNUP
// =========================
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.log("Signup error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =========================
// LOGIN
// =========================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.log("Login error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =========================
// FORGOT PASSWORD
// SEND OTP
// =========================
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    // Generic response prevents revealing
    // whether an account exists.
    if (!user) {
      return res.status(200).json({
        message:
          "If an account exists with this email, a reset code has been sent.",
      });
    }

    // Generate secure 6-digit OTP.
    const otp = crypto.randomInt(100000, 1000000).toString();

    // Never store the real OTP in MongoDB.
    const hashedOtp = await bcrypt.hash(otp, 10);

    user.resetPasswordOtp = hashedOtp;

    // OTP valid for 10 minutes.
    user.resetPasswordOtpExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );

    user.resetPasswordVerified = false;

    await user.save();

    try {
      await transporter.sendMail({
        from: `"NexChat" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "NexChat Password Reset Code",
        text: `Your NexChat password reset code is ${otp}. This code expires in 10 minutes. If you did not request a password reset, you can ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto;">
            <h2>NexChat Password Reset</h2>

            <p>You requested a password reset for your NexChat account.</p>

            <p>Your verification code is:</p>

            <div style="
              font-size: 30px;
              font-weight: bold;
              letter-spacing: 8px;
              margin: 24px 0;
            ">
              ${otp}
            </div>

            <p>This code will expire in <strong>10 minutes</strong>.</p>

            <p>
              If you did not request a password reset,
              you can safely ignore this email.
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      console.log("Password reset email error:", emailError);

      user.resetPasswordOtp = null;
      user.resetPasswordOtpExpires = null;
      user.resetPasswordVerified = false;

      await user.save();

      return res.status(500).json({
        message: "Unable to send reset email. Please try again.",
      });
    }

    return res.status(200).json({
      message:
        "If an account exists with this email, a reset code has been sent.",
    });
  } catch (error) {
    console.log("Forgot password error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

// =========================
// VERIFY RESET OTP
// =========================
router.post("/verify-reset-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and verification code are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (
      !user ||
      !user.resetPasswordOtp ||
      !user.resetPasswordOtpExpires
    ) {
      return res.status(400).json({
        message: "Invalid or expired verification code",
      });
    }

    if (user.resetPasswordOtpExpires.getTime() < Date.now()) {
      user.resetPasswordOtp = null;
      user.resetPasswordOtpExpires = null;
      user.resetPasswordVerified = false;

      await user.save();

      return res.status(400).json({
        message: "Verification code has expired",
      });
    }

    const otpMatches = await bcrypt.compare(
      String(otp),
      user.resetPasswordOtp
    );

    if (!otpMatches) {
      return res.status(400).json({
        message: "Invalid or expired verification code",
      });
    }

    user.resetPasswordVerified = true;

    // OTP itself cannot be used again.
    user.resetPasswordOtp = null;

    // Give the user 10 minutes to set the new password.
    user.resetPasswordOtpExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );

    await user.save();

    return res.status(200).json({
      message: "Verification successful",
    });
  } catch (error) {
    console.log("Verify OTP error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

// =========================
// RESET PASSWORD
// =========================
router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({
        message: "Email and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (
      !user ||
      !user.resetPasswordVerified ||
      !user.resetPasswordOtpExpires ||
      user.resetPasswordOtpExpires.getTime() < Date.now()
    ) {
      return res.status(400).json({
        message:
          "Password reset session is invalid or has expired",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);

    user.resetPasswordOtp = null;
    user.resetPasswordOtpExpires = null;
    user.resetPasswordVerified = false;

    await user.save();

    return res.status(200).json({
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.log("Reset password error:", error);

    return res.status(500).json({
      message: "Server error",
    });
  }
});

module.exports = router;
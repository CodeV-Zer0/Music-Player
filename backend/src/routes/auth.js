import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../db.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { validateBody } from "../middleware/validation.js";

const router = Router();

router.post(
  "/register",
  validateBody({
    email: { required: true, type: "string", maxLength: 255 },
    password: { required: true, type: "string", minLength: 8, maxLength: 128 },
  }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const existing = await query("select id from users where email = $1", [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already registered", code: "EMAIL_EXISTS" });
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await query(
      "insert into users (email, password_hash) values ($1, $2) returning id, email",
      [email.toLowerCase(), hash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: "30d" });
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({ user: { id: user.id, email: user.email }, token });
  })
);

router.post(
  "/login",
  validateBody({
    email: { required: true, type: "string" },
    password: { required: true, type: "string" },
  }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await query("select * from users where email = $1", [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: "30d" });
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({ user: { id: user.id, email: user.email }, token });
  })
);

router.post("/logout", (req, res) => {
  res.clearCookie("token", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" });
  res.json({ success: true });
});

export default router;
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import trackRoutes from "./routes/tracks.js";
import albumRoutes from "./routes/albums.js";
import artistRoutes from "./routes/artists.js";
import playlistRoutes from "./routes/playlists.js";

import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/logger.js";
import { apiRateLimit, authRateLimit } from "./middleware/rateLimit.js";

dotenv.config();

const app = express();

const corsOrigin = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()) ?? true;

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(requestLogger);
app.use(apiRateLimit());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "mymusic-backend",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV || "development",
  });
});

app.get("/", (req, res) => res.json({ status: "ok", service: "mymusic-backend" }));

app.use("/auth", authRateLimit(), authRoutes);
app.use("/tracks", trackRoutes);
app.use("/albums", albumRoutes);
app.use("/artists", artistRoutes);
app.use("/playlists", playlistRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => {
  console.log(`mymusic backend running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

export default app;
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import trackRoutes from "./routes/tracks.js";
import albumRoutes from "./routes/albums.js";
import artistRoutes from "./routes/artists.js";
import playlistRoutes from "./routes/playlists.js";

dotenv.config();

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => res.json({ status: "ok", service: "mymusic-backend" }));

app.use("/auth", authRoutes);
app.use("/tracks", trackRoutes);
app.use("/albums", albumRoutes);
app.use("/artists", artistRoutes);
app.use("/playlists", playlistRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`mymusic backend running on http://localhost:${PORT}`));

import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const result = await query("select id, name, created_at from playlists where user_id = $1 order by created_at desc", [req.userId]);
  res.json(result.rows);
});

router.post("/", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });
  const result = await query(
    "insert into playlists (user_id, name) values ($1, $2) returning id, name, created_at",
    [req.userId, name]
  );
  res.json(result.rows[0]);
});

router.get("/:id", async (req, res) => {
  const playlist = await query("select id, name from playlists where id = $1 and user_id = $2", [req.params.id, req.userId]);
  if (!playlist.rows[0]) return res.status(404).json({ error: "Playlist not found" });

  const tracks = await query(
    `select t.id, t.title, ar.name as artist_name, al.title as album_title, pt.position
     from playlist_tracks pt
     join tracks t on t.id = pt.track_id
     left join artists ar on ar.id = t.artist_id
     left join albums al on al.id = t.album_id
     where pt.playlist_id = $1
     order by pt.position`,
    [req.params.id]
  );

  res.json({ ...playlist.rows[0], tracks: tracks.rows });
});

router.post("/:id/tracks", async (req, res) => {
  const { trackId } = req.body;
  const countResult = await query("select count(*) from playlist_tracks where playlist_id = $1", [req.params.id]);
  const position = parseInt(countResult.rows[0].count);

  await query(
    "insert into playlist_tracks (playlist_id, track_id, position) values ($1, $2, $3) on conflict do nothing",
    [req.params.id, trackId, position]
  );
  res.json({ success: true });
});

router.delete("/:id/tracks/:trackId", async (req, res) => {
  await query("delete from playlist_tracks where playlist_id = $1 and track_id = $2", [req.params.id, req.params.trackId]);
  res.json({ success: true });
});

router.delete("/:id", async (req, res) => {
  await query("delete from playlists where id = $1 and user_id = $2", [req.params.id, req.userId]);
  res.json({ success: true });
});

export default router;

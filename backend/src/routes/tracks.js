import { Router } from "express";
import { query } from "../db.js";
import { getSignedStreamUrl } from "../storage.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /tracks — full library, paginated
router.get("/", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;

  const result = await query(
    `select t.id, t.title, t.duration_seconds, t.track_number,
            ar.name as artist_name, al.title as album_title, al.cover_key
     from tracks t
     left join artists ar on ar.id = t.artist_id
     left join albums al on al.id = t.album_id
     order by t.created_at desc
     limit $1 offset $2`,
    [limit, offset]
  );
  res.json(result.rows);
});

// GET /tracks/search?q=...
router.get("/search", async (req, res) => {
  const q = req.query.q || "";
  const result = await query(
    `select t.id, t.title, ar.name as artist_name, al.title as album_title, al.cover_key
     from tracks t
     left join artists ar on ar.id = t.artist_id
     left join albums al on al.id = t.album_id
     where t.title ilike $1 or ar.name ilike $1
     limit 30`,
    [`%${q}%`]
  );
  res.json(result.rows);
});

// GET /tracks/:id/stream — returns a fresh signed URL
router.get("/:id/stream", async (req, res) => {
  const result = await query("select file_key from tracks where id = $1", [req.params.id]);
  const track = result.rows[0];
  if (!track) return res.status(404).json({ error: "Track not found" });

  const url = await getSignedStreamUrl(track.file_key);

  // log play history (fire and forget)
  query("insert into play_history (user_id, track_id) values ($1, $2)", [req.userId, req.params.id]).catch(() => {});

  res.json({ url });
});

export default router;

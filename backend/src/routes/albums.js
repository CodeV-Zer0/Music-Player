import { Router } from "express";
import { query } from "../db.js";
import { getSignedStreamUrl } from "../storage.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await query(
      `select al.id, al.title, al.year, al.cover_key, ar.name as artist_name
       from albums al
       left join artists ar on ar.id = al.artist_id
       order by al.title`
    );
    res.json(result.rows);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const album = await query(
      `select al.id, al.title, al.year, al.cover_key, ar.name as artist_name
       from albums al left join artists ar on ar.id = al.artist_id
       where al.id = $1`,
      [req.params.id]
    );
    if (!album.rows[0]) {
      return res.status(404).json({ error: "Album not found", code: "ALBUM_NOT_FOUND" });
    }

    const tracks = await query(
      `select id, title, duration_seconds, track_number from tracks
       where album_id = $1 order by track_number`,
      [req.params.id]
    );

    let coverUrl = null;
    if (album.rows[0].cover_key) {
      coverUrl = await getSignedStreamUrl(album.rows[0].cover_key, 3600);
    }

    res.json({ ...album.rows[0], cover_url: coverUrl, tracks: tracks.rows });
  })
);

export default router;
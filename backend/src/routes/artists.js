import { Router } from "express";
import { query } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const result = await query("select id, name from artists order by name");
    res.json(result.rows);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const artist = await query("select id, name from artists where id = $1", [req.params.id]);
    if (!artist.rows[0]) {
      return res.status(404).json({ error: "Artist not found", code: "ARTIST_NOT_FOUND" });
    }

    const albums = await query(
      "select id, title, year, cover_key from albums where artist_id = $1 order by year desc",
      [req.params.id]
    );

    res.json({ ...artist.rows[0], albums: albums.rows });
  })
);

export default router;
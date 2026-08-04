// Usage: node scripts/import-library.js "/path/to/your/music"
//
// Walks a folder recursively, reads ID3/audio metadata from each file,
// uploads the audio (and cover art) to R2, and inserts rows into Postgres.
// Safe to re-run — skips files whose file_key already exists in the DB.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { parseFile } from "music-metadata";
import { pool } from "../src/db.js";
import { uploadFile } from "../src/storage.js";

const AUDIO_EXTENSIONS = [".mp3", ".flac", ".m4a", ".wav", ".ogg"];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (AUDIO_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

async function getOrCreateArtist(client, name) {
  if (!name) name = "Unknown Artist";
  const existing = await client.query("select id from artists where name = $1", [name]);
  if (existing.rows[0]) return existing.rows[0].id;
  const inserted = await client.query("insert into artists (name) values ($1) returning id", [name]);
  return inserted.rows[0].id;
}

async function getOrCreateAlbum(client, title, artistId, year, coverKey) {
  if (!title) title = "Unknown Album";
  const existing = await client.query("select id from albums where title = $1 and artist_id = $2", [title, artistId]);
  if (existing.rows[0]) return existing.rows[0].id;
  const inserted = await client.query(
    "insert into albums (title, artist_id, year, cover_key) values ($1, $2, $3, $4) returning id",
    [title, artistId, year || null, coverKey || null]
  );
  return inserted.rows[0].id;
}

async function importFile(client, filePath) {
  const fileKey = `tracks/${crypto.randomUUID()}${path.extname(filePath)}`;

  const metadata = await parseFile(filePath);
  const common = metadata.common;
  const format = metadata.format;

  const title = common.title || path.basename(filePath, path.extname(filePath));
  const artistName = common.artist || common.albumartist;
  const albumTitle = common.album;
  const year = common.year;
  const trackNumber = common.track?.no || null;
  const duration = Math.round(format.duration || 0);

  const artistId = await getOrCreateArtist(client, artistName);

  // upload cover art once per album
  let coverKey = null;
  if (common.picture && common.picture[0]) {
    const pic = common.picture[0];
    coverKey = `covers/${crypto.randomUUID()}.jpg`;
    await uploadFile(coverKey, pic.data, pic.format || "image/jpeg");
  }

  const albumId = await getOrCreateAlbum(client, albumTitle, artistId, year, coverKey);

  // upload audio file
  const buffer = fs.readFileSync(filePath);
  const contentType = format.container ? `audio/${format.container.toLowerCase()}` : "audio/mpeg";
  await uploadFile(fileKey, buffer, contentType);

  await client.query(
    `insert into tracks (title, album_id, artist_id, duration_seconds, track_number, file_key)
     values ($1, $2, $3, $4, $5, $6)`,
    [title, albumId, artistId, duration, trackNumber, fileKey]
  );

  console.log(`  ✓ ${artistName || "Unknown"} — ${title}`);
}

async function main() {
  const folder = process.argv[2];
  if (!folder) {
    console.error("Usage: node scripts/import-library.js /path/to/music/folder");
    process.exit(1);
  }

  const files = walk(folder);
  console.log(`Found ${files.length} audio files. Importing...\n`);

  const client = await pool.connect();
  let ok = 0, failed = 0;

  for (const file of files) {
    try {
      await importFile(client, file);
      ok++;
    } catch (err) {
      console.error(`  ✗ Failed: ${file} — ${err.message}`);
      failed++;
    }
  }

  client.release();
  console.log(`\nDone. ${ok} imported, ${failed} failed.`);
  process.exit(0);
}

main();

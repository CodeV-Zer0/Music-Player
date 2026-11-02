import { Platform } from "react-native";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import { Buffer } from "buffer";

export type LocalTrack = {
  id: string;
  title: string;
  artist_name?: string;
  album_title?: string;
  albumId?: string;
  uri: string;
  duration?: number;
  filename?: string;
  thumbnail?: string;
  modificationTime?: number;
};

const ARTWORK_HEADER_BYTES = 768 * 1024;
const MAX_ID3_TAG_BYTES = 8 * 1024 * 1024;
const MAX_ARTWORK_FILE_BYTES = 40 * 1024 * 1024;
const MAX_EMBEDDED_ARTWORK_BYTES = 12 * 1024 * 1024;
const MAX_LYRICS_FILE_BYTES = 64 * 1024 * 1024;
const MAX_FOLDER_TRACKS = 20000;
const ARTWORK_CONCURRENCY = 1;
const MAX_ARTWORK_CACHE_ENTRIES = 256;
const artworkCache = new Map<string, string | null>();
const artworkRequests = new Map<string, Promise<string | undefined>>();
let artworkActive = 0;
const artworkWaiters: Array<() => void> = [];
let scanInFlight: Promise<LocalTrack[]> | null = null;
let memoryLibrary: LocalTrack[] | null = null;
let mediaPermissionRequest: Promise<boolean> | null = null;
const lyricsCache = new Map<string, string | null>();
const lyricsRequests = new Map<string, Promise<string | undefined>>();

export async function requestMediaPermission(): Promise<boolean> {
  if (mediaPermissionRequest) return mediaPermissionRequest;

  const pendingRequest = (async () => {
    const current = await MediaLibrary.getPermissionsAsync(false, ["audio"]);
    if (current.status === "granted") return true;
    const { status } = await MediaLibrary.requestPermissionsAsync(false, ["audio"]);
    return status === "granted";
  })();
  mediaPermissionRequest = pendingRequest;
  try {
    return await pendingRequest;
  } finally {
    if (mediaPermissionRequest === pendingRequest) mediaPermissionRequest = null;
  }
}

export async function requestMusicFolder(): Promise<string | undefined> {
  const result = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  return result.granted ? result.directoryUri : undefined;
}

const cleanString = (str?: string): string | undefined => {
  if (!str) return undefined;
  let cleaned = str.replace(/\[.*?\]|\(.*?\)/g, "").trim();
  if (
    !cleaned ||
    cleaned.toLowerCase() === "unknown" ||
    cleaned.toLowerCase() === "unknown artist" ||
    /^\d+$/.test(cleaned)
  ) {
    return undefined;
  }
  return cleaned;
};

const getCacheUri = (id: string, ext = "jpg") => {
  const safeId = encodeURIComponent(id);
  const cacheKey = safeId.length <= 96 ? safeId : hashCacheKey(id);
  return `${FileSystem.cacheDirectory}art_${cacheKey}.${ext}`;
};

function hashCacheKey(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x01000193;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ (code + index), 0x811c9dc5);
  }
  return `${(first >>> 0).toString(16)}${(second >>> 0).toString(16)}`;
}

export function peekArtwork(id?: string): string | undefined {
  if (!id) return undefined;
  const cached = artworkCache.get(id);
  if (cached !== undefined) {
    artworkCache.delete(id);
    artworkCache.set(id, cached);
  }
  return cached ?? undefined;
}

export function getSystemArtworkUri(track?: {
  id?: string;
  albumId?: string;
  thumbnail?: string;
}): string | undefined {
  if (!track) return undefined;
  if (track.thumbnail) return track.thumbnail;
  if (Platform.OS !== "android") return undefined;
  if (track.albumId && /^\d+$/.test(track.albumId)) {
    return `content://media/external/audio/albumart/${track.albumId}`;
  }
  const mediaId = String(track.id).split("/").pop();
  if (mediaId && /^\d+$/.test(mediaId)) {
    return `content://media/external/audio/media/${mediaId}/albumart`;
  }
  return undefined;
}

async function withArtworkSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (artworkActive >= ARTWORK_CONCURRENCY) {
    await new Promise<void>((resolve) => artworkWaiters.push(resolve));
  }
  artworkActive += 1;
  try {
    return await fn();
  } finally {
    artworkActive -= 1;
    artworkWaiters.shift()?.();
  }
}

export async function getLocalLibrary(options?: { force?: boolean }): Promise<LocalTrack[]> {
  if (!options?.force && memoryLibrary) return memoryLibrary;
  if (scanInFlight) return scanInFlight;

  scanInFlight = scanLocalAudio()
    .then((tracks) => {
      memoryLibrary = tracks;
      return tracks;
    })
    .finally(() => {
      scanInFlight = null;
    });

  return scanInFlight;
}

export function getCachedLibrary(): LocalTrack[] | null {
  return memoryLibrary;
}

export async function scanLocalAudio(): Promise<LocalTrack[]> {
  const allTracks: LocalTrack[] = [];
  let hasNextPage = true;
  let after: MediaLibrary.AssetRef | undefined = undefined;

  while (hasNextPage) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: 300,
      after,
    });

    for (const asset of page.assets) {
      const nameWithoutExt = asset.filename.replace(/\.[^/.]+$/, "");
      const parts = nameWithoutExt.split(" - ");
      const artist = parts.length > 1 ? cleanString(parts[parts.length - 1]) : undefined;
      const title = parts.length > 1
        ? cleanString(parts.slice(0, -1).join(" - ")) || parts.slice(0, -1).join(" - ").trim()
        : cleanString(nameWithoutExt) || nameWithoutExt;
      const systemArt = getSystemArtworkUri({
        id: asset.id,
        albumId: asset.albumId,
      });

      allTracks.push({
        id: asset.id,
        title,
        artist_name: artist,
        albumId: asset.albumId,
        uri: asset.uri,
        duration: asset.duration,
        filename: asset.filename,
        modificationTime: asset.modificationTime,
        thumbnail: peekArtwork(asset.id) || systemArt,
      });
    }

    hasNextPage = page.hasNextPage;
    after = page.endCursor;
  }

  memoryLibrary = allTracks;
  return allTracks;
}

export async function scanMusicFolder(directoryUri: string): Promise<LocalTrack[]> {
  const audioFiles: string[] = [];
  const pendingDirectories = [
    await FileSystem.StorageAccessFramework.readDirectoryAsync(directoryUri),
  ];
  const visitedDirectories = new Set([getSafTreeUri(directoryUri)]);

  while (pendingDirectories.length > 0) {
    const children = pendingDirectories.pop();
    if (!children) continue;
    for (const uri of children) {
      const filename = getSafFilename(uri);
      if (/\.(3gp|aac|ac3|aif|aiff|alac|amr|ape|dff|dsf|flac|m4a|m4b|m4p|mka|mp3|mp4|oga|ogg|opus|wav|webm|wma|wv)$/i.test(filename)) {
        audioFiles.push(uri);
        if (audioFiles.length > MAX_FOLDER_TRACKS) {
          throw new Error(`Selected folder contains more than ${MAX_FOLDER_TRACKS} audio files.`);
        }
        continue;
      }

      const childDirectoryUri = getSafTreeUri(uri);
      if (visitedDirectories.has(childDirectoryUri)) continue;
      try {
        pendingDirectories.push(
          await FileSystem.StorageAccessFramework.readDirectoryAsync(childDirectoryUri)
        );
        visitedDirectories.add(childDirectoryUri);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/doesn't exist or isn't a directory/i.test(message)) {
          throw error;
        }
      }
    }
  }

  return audioFiles.map((uri) => {
    const filename = getSafFilename(uri);
    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
    const parts = nameWithoutExt.split(" - ");
    const artist = parts.length > 1 ? cleanString(parts[parts.length - 1]) : undefined;
    const title = parts.length > 1
      ? cleanString(parts.slice(0, -1).join(" - ")) || parts.slice(0, -1).join(" - ").trim()
      : cleanString(nameWithoutExt) || nameWithoutExt;

    return {
      id: uri,
      title,
      artist_name: artist,
      uri,
      filename,
      modificationTime: undefined,
    };
  });
}

function getSafTreeUri(uri: string): string {
  const treeMarker = uri.indexOf("/tree/");
  const documentMarker = uri.indexOf("/document/");
  if (treeMarker < 0 || documentMarker < 0 || documentMarker <= treeMarker) return uri;

  const documentId = uri.slice(documentMarker + "/document/".length);
  return `${uri.slice(0, treeMarker)}/tree/${documentId}/document/${documentId}`;
}

function getSafFilename(uri: string): string {
  const documentId = uri.split("/document/").pop() ?? uri;
  let decoded = documentId;
  try {
    decoded = decodeURIComponent(documentId);
  } catch {
    // Keep the original document ID when it contains malformed escapes.
  }
  return decoded.split("/").pop()?.split(":").pop() || "Unknown track";
}

export async function getEmbeddedLyrics(track: LocalTrack): Promise<string | undefined> {
  const cached = lyricsCache.get(track.id);
  if (cached !== undefined) return cached ?? undefined;

  const pending = lyricsRequests.get(track.id);
  if (pending) return pending;

  const request = readEmbeddedLyrics(track);
  lyricsRequests.set(track.id, request);
  try {
    const lyrics = await request;
    lyricsCache.set(track.id, lyrics ?? null);
    if (lyricsCache.size > MAX_ARTWORK_CACHE_ENTRIES) {
      const oldestKey = lyricsCache.keys().next().value;
      if (oldestKey !== undefined) lyricsCache.delete(oldestKey);
    }
    return lyrics;
  } finally {
    lyricsRequests.delete(track.id);
  }
}

async function readEmbeddedLyrics(track: LocalTrack): Promise<string | undefined> {
  try {
    const uri = await resolveReadableUri(track);
    if (!uri) return undefined;
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      return undefined;
    }

    const id3Lyrics = await readId3Lyrics(uri);
    if (id3Lyrics) return id3Lyrics;

    if (fileInfo.size != null && fileInfo.size > MAX_LYRICS_FILE_BYTES) {
      console.warn("Skipping embedded lyrics metadata for an audio file larger than 64 MB", track.filename ?? track.id);
      return undefined;
    }

    const encodedAudio = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const metadataParser = await import("music-metadata-browser");
    const metadata = await metadataParser.parseBuffer(
      Buffer.from(encodedAudio, "base64"),
      track.filename ?? ""
    );
    const lyrics = metadata.common.lyrics
      ?.map((entry) => entry.trim())
      .filter(Boolean)
      .join("\n\n");
    return lyrics || undefined;
  } catch (error) {
    console.warn("Could not read embedded lyrics", error);
    return undefined;
  }
}

async function readId3Lyrics(uri: string): Promise<string | undefined> {
  const header = await readFilePrefix(uri, 10);
  if (!header || header.length < 10 || latin1(header, 0, 3) !== "ID3") return undefined;

  const major = header[3] ?? 0;
  if (major < 2 || major > 4) return undefined;
  const tagSize = synchsafe(header, 6);
  if (tagSize <= 0 || tagSize > MAX_ID3_TAG_BYTES) return undefined;

  const tag = await readFilePrefix(uri, 10 + tagSize);
  if (!tag || tag.length < 10) return undefined;
  return parseId3Lyrics(tag);
}

function parseId3Lyrics(bytes: Uint8Array): string | undefined {
  const major = bytes[3] ?? 0;
  const end = Math.min(bytes.length, 10 + synchsafe(bytes, 6));
  let offset = 10;

  if ((bytes[5] ?? 0) & 0x40) {
    const extendedSize = major >= 4 ? synchsafe(bytes, offset) : readUInt32BE(bytes, offset);
    offset += major >= 4 ? extendedSize : 4 + extendedSize;
  }

  while (offset < end) {
    const headerLength = major === 2 ? 6 : 10;
    if (offset + headerLength > end) break;

    const idLength = major === 2 ? 3 : 4;
    const id = latin1(bytes, offset, idLength);
    if (!id.trim() || id.charCodeAt(0) === 0) break;

    const size = major === 2
      ? ((bytes[offset + 3] ?? 0) << 16) | ((bytes[offset + 4] ?? 0) << 8) | (bytes[offset + 5] ?? 0)
      : major >= 4
        ? synchsafe(bytes, offset + 4)
        : readUInt32BE(bytes, offset + 4);
    const frameStart = offset + headerLength;
    const frameEnd = frameStart + size;
    if (size <= 0 || frameEnd > end) break;

    if (id === "USLT" || id === "ULT" || id === "SYLT" || id === "TXXX" || id === "TXX") {
      const frameFlags = major === 2 ? 0 : bytes[offset + 9] ?? 0;
      const compressedOrEncrypted = major >= 4 ? (frameFlags & 0x0c) !== 0 : (frameFlags & 0xc0) !== 0;
      if (compressedOrEncrypted) {
        offset = frameEnd;
        continue;
      }
      let frame = bytes.subarray(frameStart, frameEnd);
      if (((bytes[5] ?? 0) & 0x80) !== 0 || (major >= 4 && (frameFlags & 0x02) !== 0)) {
        frame = removeId3Unsynchronization(frame);
      }
      const lyrics = id === "USLT" || id === "ULT"
        ? parseUnsynchronizedLyricsFrame(frame)
        : id === "SYLT"
          ? parseSynchronizedLyricsFrame(frame)
          : parseUserTextLyricsFrame(frame);
      if (lyrics) return lyrics;
    }
    offset = frameEnd;
  }
  return undefined;
}

function removeId3Unsynchronization(bytes: Uint8Array): Uint8Array {
  const result = new Uint8Array(bytes.length);
  let writeIndex = 0;
  for (let index = 0; index < bytes.length; index += 1) {
    result[writeIndex] = bytes[index] ?? 0;
    writeIndex += 1;
    if (bytes[index] === 0xff && bytes[index + 1] === 0x00) index += 1;
  }
  return result.subarray(0, writeIndex);
}

function parseUnsynchronizedLyricsFrame(frame: Uint8Array): string | undefined {
  if (frame.length < 5) return undefined;
  const encoding = frame[0] ?? 0;
  const lyricsStart = skipEncodedString(frame, 4, encoding);
  if (lyricsStart < 0) return undefined;
  return decodeId3Text(frame.subarray(lyricsStart), encoding);
}

function parseSynchronizedLyricsFrame(frame: Uint8Array): string | undefined {
  if (frame.length < 7) return undefined;
  const encoding = frame[0] ?? 0;
  const descriptionEnd = skipEncodedString(frame, 6, encoding);
  if (descriptionEnd < 0) return undefined;

  const terminatorLength = encoding === 1 || encoding === 2 ? 2 : 1;
  const lines: string[] = [];
  let offset = descriptionEnd;
  while (offset < frame.length) {
    const textEnd = skipEncodedString(frame, offset, encoding);
    if (textEnd < 0 || textEnd + 4 > frame.length) break;
    const text = decodeId3Text(frame.subarray(offset, textEnd - terminatorLength), encoding);
    if (text) lines.push(text);
    offset = textEnd + 4;
  }
  return lines.length > 0 ? lines.join("\n") : undefined;
}

function parseUserTextLyricsFrame(frame: Uint8Array): string | undefined {
  if (frame.length < 3) return undefined;
  const encoding = frame[0] ?? 0;
  const descriptionEnd = skipEncodedString(frame, 1, encoding);
  if (descriptionEnd < 0) return undefined;

  const terminatorLength = encoding === 1 || encoding === 2 ? 2 : 1;
  const description = decodeId3Text(frame.subarray(1, descriptionEnd - terminatorLength), encoding);
  if (!description || !/lyric/i.test(description)) return undefined;
  return decodeId3Text(frame.subarray(descriptionEnd), encoding);
}

function decodeId3Text(bytes: Uint8Array, encoding: number): string | undefined {
  let textBytes = bytes;
  if (encoding === 1 || encoding === 2) {
    const littleEndian = encoding === 1 && (textBytes[0] === 0xff && textBytes[1] === 0xfe);
    const bigEndian = encoding === 2 || (encoding === 1 && textBytes[0] === 0xfe && textBytes[1] === 0xff);
    if (bigEndian) {
      const bytes = new Uint8Array(textBytes.length - (encoding === 1 ? 2 : 0));
      const sourceOffset = encoding === 1 ? 2 : 0;
      for (let index = 0; index + 1 < bytes.length; index += 2) {
        bytes[index] = textBytes[sourceOffset + index + 1] ?? 0;
        bytes[index + 1] = textBytes[sourceOffset + index] ?? 0;
      }
      textBytes = bytes;
    } else if (littleEndian) {
      textBytes = textBytes.subarray(2);
    }
  }

  const encodingName = encoding === 0 ? "latin1" : encoding === 3 ? "utf8" : "utf16le";
  const lyrics = Buffer.from(textBytes).toString(encodingName).replace(/\0/g, "").trim();
  return lyrics || undefined;
}

export async function extractArtwork(track: LocalTrack): Promise<string | undefined> {
  const key = track.id;
  const cached = artworkCache.get(key);
  if (cached !== undefined) return cached ?? undefined;

  const pending = artworkRequests.get(key);
  if (pending) return pending;

  const request = withArtworkSlot(() => extractArtworkUncached(track, key));
  artworkRequests.set(key, request);
  try {
    const uri = await request;
    artworkCache.delete(key);
    artworkCache.set(key, uri ?? null);
    if (artworkCache.size > MAX_ARTWORK_CACHE_ENTRIES) {
      const oldestKey = artworkCache.keys().next().value;
      if (oldestKey !== undefined) artworkCache.delete(oldestKey);
    }
    return uri;
  } finally {
    artworkRequests.delete(key);
  }
}

async function extractArtworkUncached(track: LocalTrack, key: string): Promise<string | undefined> {
  try {
    const jpgUri = getCacheUri(key, "jpg");
    const pngUri = getCacheUri(key, "png");
    const jpgInfo = await FileSystem.getInfoAsync(jpgUri);
    if (jpgInfo.exists) return jpgUri;
    const pngInfo = await FileSystem.getInfoAsync(pngUri);
    if (pngInfo.exists) return pngUri;

    const readableUri = await resolveReadableUri(track);
    if (!readableUri) return undefined;

    const header = await readArtworkHeader(readableUri);
    let picture = header && header.length >= 16 ? extractEmbeddedPicture(header) : undefined;
    if (!picture) {
      const fileInfo = await FileSystem.getInfoAsync(readableUri);
      if (!fileInfo.exists || (fileInfo.size != null && fileInfo.size > MAX_ARTWORK_FILE_BYTES)) {
        return undefined;
      }

      const encodedAudio = await FileSystem.readAsStringAsync(readableUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const metadataParser = await import("music-metadata-browser");
      const metadata = await metadataParser.parseBuffer(
        Buffer.from(encodedAudio, "base64"),
        track.filename ?? ""
      );
      const embeddedPicture = metadata.common.picture?.[0];
      if (
        embeddedPicture &&
        embeddedPicture.data.length > 0 &&
        embeddedPicture.data.length <= MAX_EMBEDDED_ARTWORK_BYTES
      ) {
        picture = {
          mime: embeddedPicture.format,
          data: Uint8Array.from(embeddedPicture.data),
        };
      }
    }
    if (!picture) return undefined;
    if (picture.data.length > MAX_EMBEDDED_ARTWORK_BYTES) return undefined;

    const ext = picture.mime.includes("png") ? "png" : "jpg";
    const cacheUri = getCacheUri(key, ext);
    await FileSystem.writeAsStringAsync(cacheUri, Buffer.from(picture.data).toString("base64"), {
      encoding: FileSystem.EncodingType.Base64,
    });
    return cacheUri;
  } catch {
    return undefined;
  }
}

async function resolveReadableUri(track: LocalTrack): Promise<string | undefined> {
  if (track.uri?.startsWith("file://") || track.uri?.startsWith("content://")) return track.uri;

  try {
    const info = await MediaLibrary.getAssetInfoAsync(track.id);
    if (info.localUri?.startsWith("file://")) return info.localUri;
    if (info.uri?.startsWith("file://")) return info.uri;
    if (info.localUri?.startsWith("content://")) return info.localUri;
    if (info.uri?.startsWith("content://")) return info.uri;
  } catch {
    return undefined;
  }

  return undefined;
}

async function readFilePrefix(uri: string, length: number): Promise<Uint8Array | undefined> {
  if (!uri.startsWith("file://") && !uri.startsWith("content://")) return undefined;

  try {
    const encoded = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
      position: 0,
      length,
    });
    if (encoded) return Uint8Array.from(Buffer.from(encoded, "base64"));
  } catch {
    return undefined;
  }
  return undefined;
}

async function readArtworkHeader(uri: string): Promise<Uint8Array | undefined> {
  const prefix = await readFilePrefix(uri, 10);
  if (
    prefix &&
    prefix.length >= 10 &&
    prefix[0] === 0x49 &&
    prefix[1] === 0x44 &&
    prefix[2] === 0x33
  ) {
    const tagSize = synchsafe(prefix, 6);
    const tagLength = 10 + tagSize;
    if (tagSize > 0 && tagLength <= MAX_ID3_TAG_BYTES) {
      return readFilePrefix(uri, tagLength);
    }
  }
  return readFilePrefix(uri, ARTWORK_HEADER_BYTES);
}

function extractEmbeddedPicture(bytes: Uint8Array): { mime: string; data: Uint8Array } | undefined {
  if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return parseId3Picture(bytes);
  }
  if (bytes.length >= 4 && bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) {
    return parseFlacPicture(bytes);
  }
  return parseMp4Cover(bytes);
}

function parseId3Picture(bytes: Uint8Array): { mime: string; data: Uint8Array } | undefined {
  const major = bytes[3] ?? 0;
  const tagSize = synchsafe(bytes, 6);
  const end = Math.min(bytes.length, 10 + tagSize);
  let offset = 10;
  if ((bytes[5] ?? 0) & 0x40) {
    const extSize = major >= 4 ? synchsafe(bytes, 10) : readUInt32BE(bytes, 10);
    offset += 10 + extSize;
  }

  while (offset + 10 < end) {
    if (major === 2) {
      const id = latin1(bytes, offset, 3);
      const size = ((bytes[offset + 3] ?? 0) << 16) | ((bytes[offset + 4] ?? 0) << 8) | (bytes[offset + 5] ?? 0);
      if (!id.trim() || size <= 0) break;
      if (id === "PIC") {
        const frame = bytes.subarray(offset + 6, offset + 6 + size);
        return parsePicFrame(frame);
      }
      offset += 6 + size;
      continue;
    }

    const id = latin1(bytes, offset, 4);
    if (!id.trim() || id.charCodeAt(0) === 0) break;
    const size = major >= 4 ? synchsafe(bytes, offset + 4) : readUInt32BE(bytes, offset + 4);
    if (size <= 0 || offset + 10 + size > bytes.length) break;
    if (id === "APIC") {
      return parseApicFrame(bytes.subarray(offset + 10, offset + 10 + size));
    }
    offset += 10 + size;
  }
  return undefined;
}

function parseApicFrame(frame: Uint8Array): { mime: string; data: Uint8Array } | undefined {
  if (frame.length < 4) return undefined;
  const encoding = frame[0] ?? 0;
  let cursor = 1;
  const mimeEnd = indexOfByte(frame, 0, cursor);
  if (mimeEnd < 0) return undefined;
  const mime = latin1(frame, cursor, mimeEnd - cursor) || mimeFromMagic(frame.subarray(mimeEnd + 2));
  cursor = mimeEnd + 1 + 1;
  cursor = skipEncodedString(frame, cursor, encoding);
  if (cursor < 0 || cursor >= frame.length) return undefined;
  const data = frame.subarray(cursor);
  if (data.length < 32) return undefined;
  return { mime: mime || mimeFromMagic(data), data };
}

function parsePicFrame(frame: Uint8Array): { mime: string; data: Uint8Array } | undefined {
  if (frame.length < 6) return undefined;
  const encoding = frame[0] ?? 0;
  const format = latin1(frame, 1, 3).toLowerCase();
  const mime = format === "png" ? "image/png" : "image/jpeg";
  let cursor = skipEncodedString(frame, 5, encoding);
  if (cursor < 0) return undefined;
  const data = frame.subarray(cursor);
  if (data.length < 32) return undefined;
  return { mime, data };
}

function parseFlacPicture(bytes: Uint8Array): { mime: string; data: Uint8Array } | undefined {
  let offset = 4;
  while (offset + 4 < bytes.length) {
    const blockHeader = bytes[offset] ?? 0;
    const type = blockHeader & 0x7f;
    const last = (blockHeader & 0x80) !== 0;
    const size = ((bytes[offset + 1] ?? 0) << 16) | ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0);
    const start = offset + 4;
    if (start + size > bytes.length) break;
    if (type === 6) {
      const block = bytes.subarray(start, start + size);
      if (block.length < 32) return undefined;
      const mimeLen = readUInt32BE(block, 4);
      const mime = latin1(block, 8, mimeLen);
      const descLen = readUInt32BE(block, 8 + mimeLen);
      const dataLenOffset = 8 + mimeLen + 4 + descLen + 16;
      const dataLen = readUInt32BE(block, dataLenOffset);
      const dataStart = dataLenOffset + 4;
      if (dataStart + dataLen > block.length) return undefined;
      return { mime: mime || "image/jpeg", data: block.subarray(dataStart, dataStart + dataLen) };
    }
    offset = start + size;
    if (last) break;
  }
  return undefined;
}

function parseMp4Cover(bytes: Uint8Array): { mime: string; data: Uint8Array } | undefined {
  const marker = indexOfSequence(bytes, [0x63, 0x6f, 0x76, 0x72]); // covr
  if (marker < 4) return undefined;
  const dataMarker = indexOfSequence(bytes.subarray(marker), [0x64, 0x61, 0x74, 0x61]);
  if (dataMarker < 0) return undefined;
  const dataOffset = marker + dataMarker;
  if (dataOffset < 4 || dataOffset + 12 > bytes.length) return undefined;
  const boxStart = dataOffset - 4;
  const boxSize = readUInt32BE(bytes, boxStart);
  const imageStart = dataOffset + 12;
  const boxEnd = boxStart + boxSize;
  if (boxSize < 16 || boxEnd > bytes.length || imageStart >= boxEnd) return undefined;
  const data = bytes.subarray(imageStart, boxEnd);
  if (data.length < 32) return undefined;
  const type = readUInt32BE(bytes, dataOffset + 4);
  const mime = type === 14 ? "image/png" : "image/jpeg";
  return { mime, data };
}

function skipEncodedString(bytes: Uint8Array, start: number, encoding: number): number {
  if (encoding === 1 || encoding === 2) {
    for (let i = start; i + 1 < bytes.length; i += 2) {
      if (bytes[i] === 0 && bytes[i + 1] === 0) return i + 2;
    }
    return -1;
  }
  const end = indexOfByte(bytes, 0, start);
  return end < 0 ? -1 : end + 1;
}

function indexOfByte(bytes: Uint8Array, value: number, start = 0): number {
  for (let i = start; i < bytes.length; i += 1) {
    if (bytes[i] === value) return i;
  }
  return -1;
}

function indexOfSequence(bytes: Uint8Array, sequence: number[]): number {
  outer: for (let i = 0; i <= bytes.length - sequence.length; i += 1) {
    for (let j = 0; j < sequence.length; j += 1) {
      if (bytes[i + j] !== sequence[j]) continue outer;
    }
    return i;
  }
  return -1;
}

function latin1(bytes: Uint8Array, start: number, length: number): string {
  return Buffer.from(bytes.subarray(start, start + length)).toString("latin1");
}

function synchsafe(bytes: Uint8Array, offset: number): number {
  return (
    (((bytes[offset] ?? 0) & 0x7f) << 21) |
    (((bytes[offset + 1] ?? 0) & 0x7f) << 14) |
    (((bytes[offset + 2] ?? 0) & 0x7f) << 7) |
    ((bytes[offset + 3] ?? 0) & 0x7f)
  );
}

function readUInt32BE(bytes: Uint8Array, offset: number): number {
  return (
    (((bytes[offset] ?? 0) << 24) |
      ((bytes[offset + 1] ?? 0) << 16) |
      ((bytes[offset + 2] ?? 0) << 8) |
      (bytes[offset + 3] ?? 0)) >>> 0
  );
}

function mimeFromMagic(bytes: Uint8Array): string {
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  return "image/jpeg";
}

export function groupByArtist(tracks: LocalTrack[]): Record<string, LocalTrack[]> {
  const groups: Record<string, LocalTrack[]> = {};
  for (const track of tracks) {
    const key = track.artist_name || "Unknown Artist";
    if (!groups[key]) groups[key] = [];
    groups[key].push(track);
  }
  return groups;
}

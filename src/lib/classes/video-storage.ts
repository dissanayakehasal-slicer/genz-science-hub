import { put, del, head } from "@vercel/blob";
import type { VideoStorageProvider } from "./types";

const VIDEO_FOLDER = "class-videos";

export function getStorageProvider(): VideoStorageProvider {
  if (process.env.R2_PUBLIC_URL && process.env.R2_UPLOAD_ENDPOINT) return "r2";
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  throw new Error("No video storage configured. Set BLOB_READ_WRITE_TOKEN or R2 env vars.");
}

async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
  const endpoint = process.env.R2_UPLOAD_ENDPOINT;
  const publicBase = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!endpoint || !publicBase) {
    throw new Error("R2_UPLOAD_ENDPOINT and R2_PUBLIC_URL are required for R2 uploads");
  }

  const res = await fetch(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      "X-Storage-Key": key,
      Authorization: `Bearer ${process.env.R2_UPLOAD_SECRET ?? ""}`,
    },
    body: new Uint8Array(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`R2 upload failed (${res.status}): ${text || res.statusText}`);
  }

  return `${publicBase}/${key}`;
}

export async function uploadClassVideo(
  filename: string,
  body: Buffer,
  contentType: string
): Promise<{ provider: VideoStorageProvider; storage_key: string; video_url: string }> {
  const safeName = filename.replace(/[^\w.-]+/g, "_");
  const key = `${VIDEO_FOLDER}/${Date.now()}-${safeName}`;
  const provider = getStorageProvider();

  if (provider === "r2") {
    const video_url = await uploadToR2(key, body, contentType);
    return { provider, storage_key: key, video_url };
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN!;
  const blob = await put(key, body, { access: "public", token, contentType });
  return { provider: "blob", storage_key: key, video_url: blob.url };
}

export async function deleteClassVideo(provider: VideoStorageProvider, _storageKey: string | null, videoUrl: string | null) {
  if (provider === "blob" && videoUrl?.includes("blob.vercel-storage.com")) {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (token) await del(videoUrl, { token });
  }
}

export async function verifyVideoExists(
  provider: VideoStorageProvider,
  _storageKey: string | null,
  videoUrl: string | null,
  youtubeVideoId: string | null
): Promise<boolean> {
  if (provider === "youtube") return !!youtubeVideoId;
  if (!videoUrl) return false;
  try {
    if (provider === "blob") {
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      if (!token) return false;
      await head(videoUrl, { token });
      return true;
    }
    const res = await fetch(videoUrl, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getStreamableUrl(
  provider: VideoStorageProvider,
  videoUrl: string | null,
  youtubeVideoId: string | null
): Promise<string | null> {
  if (provider === "youtube" && youtubeVideoId) {
    return `https://www.youtube.com/embed/${youtubeVideoId}`;
  }
  return videoUrl;
}

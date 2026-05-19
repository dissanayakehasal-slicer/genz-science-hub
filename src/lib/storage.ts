import { put, del } from "@vercel/blob";

export type StorageFolder =
  | "logos"
  | "banners"
  | "teacher-photos"
  | "notes"
  | "notice-attachments"
  | "gallery";

export async function uploadPublicFile(folder: StorageFolder, filename: string, body: Blob | Buffer) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set. Enable Vercel Blob on your project.");
  }
  const pathname = `${folder}/${Date.now()}-${filename.replace(/[^\w.-]+/g, "_")}`;
  const blob = await put(pathname, body, { access: "public", token });
  return blob.url;
}

export async function deleteBlobByUrl(url: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token || !url.includes("blob.vercel-storage.com")) return;
  await del(url, { token });
}

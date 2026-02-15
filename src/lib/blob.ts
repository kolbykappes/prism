import { put, del } from "@vercel/blob";

export async function uploadBlob(
  filename: string,
  data: Buffer | string,
  contentType?: string
) {
  const blob = await put(filename, data, {
    access: "public",
    contentType,
  });
  return blob.url;
}

export async function deleteBlobs(urls: string[]) {
  if (urls.length === 0) return;
  await del(urls);
}

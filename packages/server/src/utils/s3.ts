import { s3 } from "bun";
import { BadRequestException } from "@/errors";

const DEFAULT_PRESIGNED_EXPIRES_SECONDS = 300;
const MAX_IMAGE_DIMENSION = 1600;
const WEBP_QUALITY = 80;

export function buildMediaUrl(path: string): string;
export function buildMediaUrl(path: null | undefined): null;
export function buildMediaUrl(path: string | null | undefined): string | null;
export function buildMediaUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null;
  }

  const base = process.env.CDN_BASE_URL;
  if (!base) {
    throw new Error("Missing CDN_BASE_URL configuration");
  }

  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  // biome-ignore lint/performance/useTopLevelRegex: <i dont care>
  const normalizedPath = path.replace(/^\/+/, "");
  return new URL(normalizedPath, normalizedBase).toString();
}

interface CreatePresignedUploadInput {
  contentType: string;
  key: string;
}

export function createPresignedUploadUrl({
  contentType,
  key,
}: CreatePresignedUploadInput) {
  const uploadUrl = s3.presign(key, {
    expiresIn: DEFAULT_PRESIGNED_EXPIRES_SECONDS,
    type: contentType,
    method: "PUT",
  });

  return {
    upload_url: uploadUrl,
    key,
    expires_in_seconds: DEFAULT_PRESIGNED_EXPIRES_SECONDS,
  };
}

export async function optimizeUploadedImage(key: string): Promise<void> {
  const file = s3.file(key);

  let optimized: Uint8Array;
  try {
    optimized = await file
      .image()
      .resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .bytes();
  } catch (error) {
    // Format Bun can't decode on this platform (e.g. HEIC) — keep the original.
    if ((error as { code?: string }).code === "ERR_IMAGE_FORMAT_UNSUPPORTED") {
      return;
    }
    throw new BadRequestException("Uploaded file is missing or not an image");
  }

  await file.write(optimized, { type: "image/webp" });
}

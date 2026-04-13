import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

export interface StoredFile {
  url: string;
  key: string;
  mimeType: string;
  size: number;
}

export interface StorageProvider {
  upload(file: File, folder: string): Promise<StoredFile>;
  delete(key: string): Promise<void>;
}

class LocalStorageProvider implements StorageProvider {
  async upload(file: File, folder: string): Promise<StoredFile> {
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || ".bin";
    const key = `${folder}/${randomUUID()}${ext}`;
    const targetPath = path.join(process.cwd(), "public", "uploads", key);

    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, bytes);

    return {
      key,
      url: `/uploads/${key}`,
      mimeType: file.type || "application/octet-stream",
      size: bytes.length,
    };
  }

  async delete(key: string): Promise<void> {
    // Local provider keeps a simple no-throw delete contract to remain
    // compatible with external providers (S3/Cloudinary/Supabase) later.
    const fullPath = path.join(process.cwd(), "public", "uploads", key);
    try {
      const { unlink } = await import("node:fs/promises");
      await unlink(fullPath);
    } catch {
      // Ignore missing file errors to keep idempotent behavior.
    }
  }
}

let provider: StorageProvider = new LocalStorageProvider();

// Auto-select R2 when env vars are present
if (process.env.STORAGE_PROVIDER === "r2") {
  const accountId = process.env.R2_ACCOUNT_ID!;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
  const bucket = process.env.R2_BUCKET!;
  const publicUrl = process.env.R2_PUBLIC_URL!;

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  class R2StorageProvider implements StorageProvider {
    async upload(file: File, folder: string): Promise<StoredFile> {
      const bytes = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name) || ".bin";
      const key = `${folder}/${randomUUID()}${ext}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: bytes,
          ContentType: file.type || "application/octet-stream",
          ContentLength: bytes.length,
        })
      );

      return {
        key,
        url: `${publicUrl.replace(/\/$/, "")}/${key}`,
        mimeType: file.type || "application/octet-stream",
        size: bytes.length,
      };
    }

    async delete(deleteKey: string): Promise<void> {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: deleteKey }));
    }
  }

  provider = new R2StorageProvider();
}

export function getStorageProvider(): StorageProvider {
  return provider;
}

export function setStorageProvider(nextProvider: StorageProvider) {
  provider = nextProvider;
}

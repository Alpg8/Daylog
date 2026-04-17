import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

// Proxy R2 objects through the website server.
// The browser CANNOT access pub-XXXX.r2.dev directly (R2 public access not fully
// open to all origins), so all image requests are proxied here.
//
// Usage: GET /api/r2-image?key=driver-events/UUID/UUID.jpg

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");
  if (!key) {
    return new NextResponse("key is required", { status: 400 });
  }

  // Prevent path traversal
  const normalized = key.replace(/\.\.\//g, "").replace(/^\/+/, "");
  if (normalized !== key) {
    return new NextResponse("invalid key", { status: 400 });
  }

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return new NextResponse("Storage not configured", { status: 503 });
  }

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const contentType = obj.ContentType ?? "application/octet-stream";
    const body = obj.Body;

    if (!body) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Stream the body bytes back to the browser
    const bytes = await (body as { transformToByteArray(): Promise<Uint8Array> }).transformToByteArray();

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "Content-Length": String(bytes.byteLength),
      },
    });
  } catch (err: unknown) {
    const code = (err as { name?: string })?.name;
    if (code === "NoSuchKey" || code === "NotFound") {
      return new NextResponse("Not found", { status: 404 });
    }
    console.error("[r2-image proxy]", err);
    return new NextResponse("Error fetching image", { status: 502 });
  }
}

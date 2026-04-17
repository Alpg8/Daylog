/**
 * Parses a multipart/form-data request using busboy.
 * Works even when the client sends LF-only line endings (e.g. React Native).
 */
import type { NextRequest } from "next/server";
import Busboy from "busboy";

export interface ParsedField {
  value: string;
}

export interface ParsedFile {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

export interface ParsedMultipart {
  fields: Record<string, string>;
  files: Record<string, ParsedFile>;
}

export async function parseMultipart(request: NextRequest): Promise<ParsedMultipart> {
  const contentType = request.headers.get("content-type") ?? "";

  // Normalise LF → CRLF so undici / busboy doesn't choke
  const rawBytes = Buffer.from(await request.arrayBuffer());

  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: { "content-type": contentType } });

    const fields: Record<string, string> = {};
    const files: Record<string, ParsedFile> = {};
    const filePromises: Promise<void>[] = [];

    bb.on("field", (name: string, value: string) => {
      fields[name] = value;
    });

    bb.on("file", (name: string, stream: NodeJS.ReadableStream, info: { filename: string; mimeType: string }) => {
      const chunks: Buffer[] = [];
      const p = new Promise<void>((res, rej) => {
        stream.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        stream.on("end", () => {
          files[name] = {
            buffer: Buffer.concat(chunks),
            mimeType: info.mimeType,
            filename: info.filename || name,
          };
          res();
        });
        stream.on("error", rej);
      });
      filePromises.push(p);
    });

    bb.on("finish", () => {
      Promise.all(filePromises).then(() => resolve({ fields, files })).catch(reject);
    });

    bb.on("error", reject);

    // Write the raw bytes directly — busboy handles any line-ending variant
    bb.write(rawBytes);
    bb.end();
  });
}

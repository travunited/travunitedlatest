import { NextResponse } from "next/server";
import { getDocumentObject } from "@/lib/minio";
import { Readable } from "stream";
export const dynamic = "force-dynamic";


function readableToWebStream(stream: Readable): ReadableStream<Uint8Array> {
  const reader = stream;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      reader.on("data", (chunk) => {
        controller.enqueue(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      });

      reader.on("end", () => {
        controller.close();
      });

      reader.on("error", (error) => {
        controller.error(error);
      });
    },
    cancel() {
      reader.destroy();
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: { key: string[] } }
) {
  const keyPath = params.key?.join("/");

  if (!keyPath) {
    return NextResponse.json({ error: "Missing media path" }, { status: 400 });
  }

  try {
    const object = await getDocumentObject(keyPath);

    if (!object) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    const webStream = readableToWebStream(object.stream);
    const headers = new Headers();

    headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=60");
    headers.set("Content-Type", object.contentType || "application/octet-stream");

    if (object.contentLength) {
      headers.set("Content-Length", object.contentLength.toString());
    }

    if (object.lastModified) {
      headers.set("Last-Modified", object.lastModified.toUTCString());
    }

    return new NextResponse(webStream, { headers });
  } catch (error) {
    console.error("Media proxy error:", error);
    return NextResponse.json({ error: "Media unavailable" }, { status: 404 });
  }
}


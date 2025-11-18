// lib/minio.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
  forcePathStyle: true,
});

export async function uploadVisaDocument(
  key: string,
  body: Buffer,
  contentType: string
) {
  const command = new PutObjectCommand({
    Bucket: process.env.MINIO_BUCKET!,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await s3.send(command);
  return key;
}

export async function getSignedDocumentUrl(key: string, expiresInSeconds = 60) {
  const command = new GetObjectCommand({
    Bucket: process.env.MINIO_BUCKET!,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

export async function getDocumentObject(key: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.MINIO_BUCKET!,
    Key: key,
  });

  const response = await s3.send(command);
  const streamBody = response.Body;

  if (!streamBody) {
    return null;
  }

  let readable: Readable;

  if (streamBody instanceof Readable) {
    readable = streamBody;
  } else if (typeof (streamBody as any).transformToWebStream === "function") {
    const webStream = (streamBody as any).transformToWebStream();
    readable = Readable.fromWeb(webStream);
  } else {
    readable = Readable.from(streamBody as unknown as AsyncIterable<Uint8Array>);
  }

  return {
    stream: readable,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    cacheControl: response.CacheControl,
    lastModified: response.LastModified,
  };
}


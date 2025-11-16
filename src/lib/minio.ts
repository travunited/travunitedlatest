// lib/minio.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
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


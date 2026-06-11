import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCESS_KEY = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!;
const R2_SECRET_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!;
const R2_ENDPOINT = process.env.CLOUDFLARE_R2_ENDPOINT!;
const R2_PUBLIC_DOMAIN = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN!;
export const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

let _client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
      forcePathStyle: true,
    });
  }
  return _client;
}

export async function generatePresignedPutUrl(
  objectKey: string,
  contentType: string,
  expiresIn = 300
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: objectKey,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn });
  const publicUrl = `${R2_PUBLIC_DOMAIN}/${objectKey}`;
  return { uploadUrl, publicUrl };
}

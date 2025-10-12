import "server-only";

import { S3Client } from "@aws-sdk/client-s3";
import type { AwsCredentialIdentity } from "@aws-sdk/types";
const credentials: AwsCredentialIdentity = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
};

export const S3 = new S3Client({
  region: process.env.AWS_REGION ?? "auto",
  endpoint: process.env.AWS_ENDPOINT,
  forcePathStyle: false,
  credentials,
});

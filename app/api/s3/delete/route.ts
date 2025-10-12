import { type NextRequest, NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function DELETE(request: NextRequest) {
  try {
    const { key } = await request.json();

    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET || "",
      Key: key,
    });

    await s3Client.send(command);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[v0] S3 delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}

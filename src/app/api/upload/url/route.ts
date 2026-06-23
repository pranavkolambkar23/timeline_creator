import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME } from "@/lib/r2";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // You might need to update this path if auth options are located elsewhere
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filename, contentType, size } = await req.json();

    if (!filename || !contentType || !size) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Security: Validate size
    // Max 25MB overall, 5MB for audio
    const MAX_OVERALL_SIZE = 25 * 1024 * 1024;
    const MAX_AUDIO_SIZE = 5 * 1024 * 1024;

    if (size > MAX_OVERALL_SIZE) {
      return NextResponse.json({ error: "File exceeds 25MB maximum limit." }, { status: 400 });
    }

    if (contentType.startsWith("audio/") && size > MAX_AUDIO_SIZE) {
      return NextResponse.json({ error: "Audio files must be under 5MB." }, { status: 400 });
    }

    // Generate unique key to prevent overwrites
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const extension = filename.split('.').pop() || '';
    const safeFilename = `${uniqueId}-${Date.now()}.${extension}`;
    const key = `uploads/${session.user.id}/${safeFilename}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    });

    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

    // Build the permanent public URL (requires R2_PUBLIC_URL env var to be set)
    const publicUrl = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`
      : signedUrl.split("?")[0]; // fallback to raw R2 URL (will only work if bucket is public)

    return NextResponse.json({ url: signedUrl, publicUrl, key });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

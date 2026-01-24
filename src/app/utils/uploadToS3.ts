import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import config from "../config";

import status from "http-status";
import AppError from "../errors/AppError";

// Create S3 client
export const s3 = new S3Client({
  region: config.s3_bucket.aws_bucket_region,
  credentials: {
    accessKeyId: config.s3_bucket.aws_bucket_accesskey,
    secretAccessKey: config.s3_bucket.aws_bucket_secret_key,
  },
  ACL: "public-read",
} as any);

export const uploadToS3 = async (
  file: Express.Multer.File,
  folder: string = config.file_path || "uploads",
): Promise<string> => {
  if (!file || !file.path) {
    throw new AppError(status.NOT_FOUND, "No file provided");
  }
  if (!fs.existsSync(file?.path?.replace(/\\/g, "/"))) {
    throw new Error("File not found on server");
  }

  // ✅ ONLY FIX ADDED: remove leading + trailing slashes in folder
  folder = folder.replace(/^\/+|\/+$/g, "");

  const fileStream = fs.createReadStream(file?.path?.replace(/\\/g, "/"));
  const fileName = `${folder}/${Date.now()}-${file.originalname
    .replace(/\s+/g, "-")
    .toLowerCase()}`;

  const params = {
    Bucket: config.s3_bucket.aws_bucket_name,
    Key: fileName,
    Body: fileStream,
    ContentType: file.mimetype,
  };

  try {
    // Upload
    await s3.send(new PutObjectCommand(params));

    // Remove local file
    fs.unlinkSync(file?.path?.replace(/\\/g, "/"));

    // Return correct S3 link
    const url = `https://${config.s3_bucket.aws_bucket_name}.s3.${config.s3_bucket.aws_bucket_region}.amazonaws.com/${fileName}`;

    return url;
  } catch (error) {
    console.error("S3 Upload Error:", error);
    throw new AppError(
      status.INTERNAL_SERVER_ERROR,
      "Failed to upload file to S3",
    );
  }
};

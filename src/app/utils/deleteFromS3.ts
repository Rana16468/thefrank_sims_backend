import config from "../config";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "./uploadToS3";

export const deleteFromS3 = async (fileUrl: string): Promise<boolean> => {
  try {
    if (!fileUrl) return false;

    // Extract S3 key from URL
    const bucketName = config.s3_bucket.aws_bucket_name;
    const region = config.s3_bucket.aws_bucket_region;

    // URL format:
    // https://bucket-name.s3.region.amazonaws.com/folder/filename.jpg

    const prefix = `https://${bucketName}.s3.${region}.amazonaws.com/`;
    const key = fileUrl.replace(prefix, "");

    if (!key) return false;

    const params = {
      Bucket: bucketName,
      Key: key,
    };

    await s3.send(new DeleteObjectCommand(params));

    return true;
  } catch (err) {
    console.error("S3 Delete Error:", err);
    return false;
  }
};

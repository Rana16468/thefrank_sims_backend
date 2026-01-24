import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  port: process.env.PORT || 5000,
  database_url: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  send_email: {
    nodemailer_email: process.env.NODEMAILER_EMAIL,
    nodemailer_password: process.env.NODEMAILER_PASSWORD,
  },
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  expires_in: process.env.EXPIRES_IN,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  refresh_expires_in: process.env.REFRESH_EXPIRES_IN,
  file_path: process.env.FILE_PATH,
  host: process.env.HOST,
    s3_bucket: {
    aws_bucket_accesskey: process.env.AWS_BUCKET_ACCESS_KEY,
    aws_bucket_secret_key: process.env.AWS_BUCKET_SECRET_KEY,
    aws_bucket_region: process.env.AWS_BUCKET_REGION,
    aws_bucket_name: process.env.AWS_BUCKET_NAME,
  },
};
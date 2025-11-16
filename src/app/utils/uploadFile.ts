import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import status from "http-status";
import fs from "fs";
import AppError from "../errors/AppError";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folderPath = "./src/public";

    if (file.mimetype.startsWith("image")) {
      folderPath = "./src/public/images";
    } else if (file.mimetype === "application/pdf") {
      folderPath = "./src/public/pdf";
    } else if (file.mimetype.startsWith("video")) {
      folderPath = "./src/public/videos";
    } else {
      cb(
        new AppError(
          status.BAD_REQUEST,
          "Only images, PDFs, and videos are allowed",
          ""
        ),
        "./src/public"
      );
      return;
    }

    // Ensure folder exists
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    cb(null, folderPath);
  },

  filename(_req, file, cb) {
    const fileExt = path.extname(file.originalname);
    const fileName = `${file.originalname
      .replace(fileExt, "")
      .toLowerCase()
      .split(" ")
      .join("-")}-${uuidv4()}`;

    cb(null, fileName + fileExt);
  },
});

// Multer limits
const upload = multer({
  storage,
  limits: {
    fileSize: 300 * 1024 * 1024, // 250 MB in bytes
  },
  fileFilter: (req, file, cb) => {
   const allowedMimeTypes = [
  "image/jpeg",        // .jpeg, .jpg
  "image/png",         // .png
  "image/gif",         // .gif
  "image/webp",        // .webp
  "image/bmp",         // .bmp
  "image/tiff",        // .tif, .tiff
  "image/svg+xml",     // .svg
  "image/heic", 
  "image/HEIC",       // .heic (iPhone photos)
  "image/heif",        // .heif
  "image/x-icon",      // .ico
  "image/vnd.microsoft.icon", // .ico alternative
];


    // Allow images/PDFs
    if (allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    }

    // Allow videos
    if (file.mimetype.startsWith("video")) {
      return cb(null, true);
    }

    return cb(
      new AppError(
        status.BAD_REQUEST,
        "Only images, PDFs, and videos are allowed"
      )
    );
  },
});

export default upload;

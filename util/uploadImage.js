import multer from "multer";
import sharp from "sharp";
import { uploadToCloudinary } from "../utils/Cloudinary.js";
const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) cb(null, true);
  else cb("Incorrect file format uploaded", false);
};
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
export const uploadMiddleware = upload.single("image");
export function resizeImage(req, _, next) {
  req.filename = req.file.originalname;
  // req.filename = `user-${req.user.id}-${Date.now()}.jpg`;
  if (!req.file) return next();
  sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 });
  next();
}

export async function uploadImage(req) {
  try {
    const result = await uploadToCloudinary(req.file.buffer);
    return result.secure_url;
  } catch (err) {
    throw new Error("Error Uploading", err.message);
  }
}

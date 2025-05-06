import multer from "multer";
import sharp from "sharp";
import { uploadToCloudinary } from "./../util/cloudinary.js";
import catchAsync from "../util/catchAsync.js";
const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) cb(null, true);
  else cb("Incorrect file format uploaded", false);
};
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
export const coverImageMiddleware = (name) => upload.single(name);
export const uploadMiddleware = upload.single("image");
export function resizeImage(req, res, next) {
  if (!req.file) return next();
  req.filename = `user-${req.user._id}-${Date.now()}.jpg`;
  sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 });
  next();
}
export const uploadImage = catchAsync(async (req, res, next) => {
  if (req.file && req.file.buffer) {
    const result = await uploadToCloudinary(req.file.buffer);
    req.image_url = result;
  }
  next();
});
export const uploadAvatarImage = (Model) => async (req, res) => {
  const result = await uploadToCloudinary(req.file.buffer);
  const newAvatar = await Model.findByIdAndUpdate(
    req.user._id,
    { avatar: result.secure_url },
    { new: true }
  ).select("avatar");
  res.status(201).json({
    status: "success",
    newAvatar,
    message: "Image uploaded successfully!",
  });
};

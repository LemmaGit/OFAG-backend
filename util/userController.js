import multer from "multer";
import sharp from "sharp";
import User from "../model/userModel.js";
import { uploadToCloudinary } from "../utils/Cloudinary.js";
import { catchAsync } from "../utils/errorHandler.js";
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
export function resizeImage(req, res, next) {
  req.filename = `user-${req.user.id}-${Date.now()}.jpg`;
  if (!req.file) return next();
  sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 });
  // .toFile(`public/img/users/${req.filename}`);
  next();
}
export const uploadAvatarImage = catchAsync(async (req, res, next) => {
  const result = await uploadToCloudinary(req.file.buffer);
  const newAvatar = await User.findByIdAndUpdate(
    req.user.id,
    { avatar: result.secure_url },
    { new: true }
  ).select("avatar");
  res.status(201).json({
    status: "success",
    newAvatar,
    message: "Image uploaded successfully!",
  });
});
export const getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find({ role: "user" });
  res.status(200).json({ status: "success", result: users.length, users });
});
export const getUser = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const user = await User.findById(userId).select("fullName email age avatar");
  res.status(200).json({ status: "success", user });
});
export const updateSubscription = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(
    req.user.userId,
    { hasSubscribed: req.body.isSubscribed },
    { new: true, runValidators: true }
  );
});

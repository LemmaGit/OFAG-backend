import multer from "multer";
import catchAsync from "../util/catchAsync.js";
import { uploadPDFToCloudinary } from "../util/cloudinary.js";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

const upload = multer({ storage, fileFilter });

export const uploadPDFMiddleware = upload.single("pdf");

export const uploadPDF = catchAsync(async (req, res, next) => {
  if (req.file && req.file.buffer) {
    console.log(req.file);
    const result = await uploadPDFToCloudinary(
      req.file.buffer,
      "application/pdf"
    );
    req.pdf_url = result;
  }
  next();
});

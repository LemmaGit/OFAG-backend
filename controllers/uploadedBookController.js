import AppError from "../error/appError.js";
import UploadedPDF from "../model/uploadedPDF.js";
import { validateAddNewPDF } from "../schema/uploadedPDF.js";
import catchAsync from "../util/catchAsync.js";

export const registerUploadedPDF = catchAsync(async (req, res, next) => {
  const data = {
    ...req.body,
    URL: req.pdf_url.secure_url,
    author: JSON.parse(req.body.author),
  };
  console.log(data);
  const { error, value } = validateAddNewPDF(data);
  if (error) return AppError.fromValidationError(error);
  const PDF = await UploadedPDF.create(data);
  console.log(PDF);
  res.status(201).json(value);
});
export const getAllUploadedPDFs = catchAsync(async (req, res, next) => {
  const PDFS = await UploadedPDF.find();
  res.status(200).json({ status: "success", pdfs: PDFS });
});

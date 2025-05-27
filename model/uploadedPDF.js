import mongoose from "mongoose";
import { nameFormatter } from "../helpers.js";

const uploadedPDFSchema = new mongoose.Schema({
  title: { type: String, required: true, set: (v) => nameFormatter(v) },
  author: {
    firstName: { type: String, required: true, set: (v) => nameFormatter(v) },
    lastName: { type: String, required: true, set: (v) => nameFormatter(v) },
  },
  description: { type: String, requied: true },
  coverImage: {
    type: String,
    default:
      "https://res.cloudinary.com/dggqm5svg/image/upload/v1748026736/OIP_1_qmtc3u.jpg",
  },
  URL: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ["fiction", "nonfiction", "periodical", "textbook"],
    required: true,
  },
  addedAt: {
    type: Date,
    default: () => Date.now(),
  },
});

const UploadedPDF = mongoose.model("UploadedPDF", uploadedPDFSchema);
export default UploadedPDF;

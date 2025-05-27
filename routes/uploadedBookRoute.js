import { Router } from "express";
import {
  getAllUploadedPDFs,
  registerUploadedPDF,
} from "../controllers/uploadedBookController.js";

import { uploadPDF, uploadPDFMiddleware } from "../controllers/uploadPdf.js";
import { protect } from "../helpers.js";
import Librarian from "../model/librarian.js";

const uploadedPDFRouter = Router();
uploadedPDFRouter.get("/pdfs", getAllUploadedPDFs);
uploadedPDFRouter.post(
  "/upload",
  protect(Librarian, ["librarian"]),
  uploadPDFMiddleware,
  uploadPDF,
  registerUploadedPDF
);
export default uploadedPDFRouter;

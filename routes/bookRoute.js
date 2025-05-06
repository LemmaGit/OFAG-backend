import { Router } from "express";
import {
  addNewBook,
  checkBookUniqueness,
  checkChangesInAvailableCopies,
  editBookDetail,
  editMiddleware,
  getBookDetail,
  getBookList,
  removeBook,
} from "../controllers/bookController.js";
import {
  resizeImage,
  uploadImage,
  uploadMiddleware,
} from "../controllers/uploadController.js";
import { protect } from "../helpers.js";
import Librarian from "../model/librarian.js";

const bookRouter = Router();

// Routes
bookRouter.post(
  "/",
  protect(Librarian, ["librarian"]),
  uploadMiddleware,
  // coverImageMiddleware("coverImage"),
  checkBookUniqueness,
  resizeImage,
  uploadImage,
  // prepareData,
  addNewBook
);
bookRouter.get("/book-list", getBookList);
//! NOt delete delete just move it to store
bookRouter.delete("/remove-book", removeBook);
bookRouter.patch(
  "/edit-book",
  protect(Librarian, ["librarian"]),
  uploadMiddleware,
  resizeImage,
  uploadImage,
  editMiddleware,
  checkChangesInAvailableCopies,
  editBookDetail
);
bookRouter.get("/:id", getBookDetail);
export default bookRouter;

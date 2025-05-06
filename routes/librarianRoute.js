import { Router } from "express";
import {
  changePassword,
  getAll,
  getRecentAll,
  protect,
  removeEntity,
  updateProfile,
} from "../helpers.js";
import Patron from "../model/Patron.js";
import Book from "../model/book.js";
import {
  AcceptOrRejectRequest,
  checkin,
  checkinMiddleware,
  checkout,
  checkoutMiddleware,
  confirmSignUp,
  editLibrarianDetail,
  getCheckedInBooks,
  getMostCirculatedBooks,
  getPatrons,
  getRequests,
  register,
  renew,
  renewMiddleware,
  searchBook,
  searchPatron,
  signUp,
} from "../controllers/librarianController.js";
import Librarian from "../model/librarian.js";
import {
  getCheckedOutBooks,
  getHolds,
} from "../controllers/librarianController.js";
import {
  resizeImage,
  uploadImage,
  uploadMiddleware,
} from "../controllers/uploadController.js";

const librarianRouter = Router();

// Routes
librarianRouter.get(
  "/checkedout-books",
  protect(Librarian),
  getCheckedOutBooks
);
librarianRouter.get("/search-books", protect(Librarian), searchBook);
librarianRouter.get("/search-patrons", protect(Librarian), searchPatron);
librarianRouter.get("/checkedin-books", protect(Librarian), getCheckedInBooks);
librarianRouter.get("/holds", protect(Librarian), getHolds);
librarianRouter.get(
  "/newly-registered-patrons",
  protect(Librarian, []),
  getRecentAll(Patron, undefined, "registeredAt")
);
librarianRouter.get(
  "/newly-acquired-books",
  protect(Librarian, []),
  getRecentAll(Book, undefined, "addedAt")
);
librarianRouter.get(
  "/most-circulated-books",
  protect(Librarian, []),
  getMostCirculatedBooks
);
librarianRouter.get("/all-books", protect(Librarian), getAll(Book));
librarianRouter.get("/all-patrons", protect(Librarian), getPatrons);
librarianRouter.get("/requests", protect(Librarian, [], true), getRequests);
librarianRouter.get(
  "/all-librarian",
  protect(Librarian, [], true),
  getAll(Librarian, { isManager: false, status: "verified" })
);
librarianRouter.post("/add-librarian", protect(Librarian, [], true), signUp);
librarianRouter.post(
  "/add-patron",
  protect(Librarian, ["librarian"]),
  register
);
librarianRouter.post("/create-admin", signUp);
// librarianRouter.post("/signin-admin", loginUser(Librarian, "manager"));
// librarianRouter.post("/signin", loginUser(Librarian, "librarian"));
librarianRouter.patch(
  "/change-password",
  protect(Librarian),
  changePassword("librarian")
);
librarianRouter.patch(
  "/edit-librarian-detail",
  protect(Librarian, [], true),
  editLibrarianDetail
);
librarianRouter.patch(
  "/remove-patron",
  protect(Librarian),
  removeEntity(Patron)
);
librarianRouter.patch(
  "/remove-librarian",
  protect(Librarian, [], true),
  removeEntity(Librarian)
);
librarianRouter.patch(
  "/checkin",
  protect(Librarian, ["librarian"]),
  checkinMiddleware,
  checkin
);
librarianRouter.patch(
  "/checkout",
  protect(Librarian, ["librarian"]),
  checkoutMiddleware,
  checkout
);
librarianRouter.patch(
  "/renew",
  protect(Librarian, ["librarian"]),
  renewMiddleware,
  renew
);
librarianRouter.patch(
  "/update-profile",
  protect(Librarian, ["librarian", "manager"]),
  uploadMiddleware,
  resizeImage,
  uploadImage,
  updateProfile(Librarian)
);
librarianRouter.patch(
  "/requests/:id",
  protect(Librarian, [], true),
  AcceptOrRejectRequest
);

librarianRouter.patch("/signup/:token", confirmSignUp);
export default librarianRouter;

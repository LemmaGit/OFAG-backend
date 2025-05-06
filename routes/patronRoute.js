import { Router } from "express";
import {
  confirmSignUp,
  getBookIdsInReservationOrCheckoutByPatron,
  getCheckedOutBooks,
  getGoogleBook,
  getGoogleBooks,
  getOverDueBooks,
  getRequests,
  getReservations,
  limitPatronToTwoRequestPerDay,
  placeReservation,
  removeReservation,
  reservationCheck,
  submitRequest,
} from "../controllers/patronController.js";
import {
  protect,
  changePassword,
  getOne,
  getAll,
  updateProfile,
} from "../helpers.js";
import Patron from "../model/patron.js";
import {
  resizeImage,
  uploadImage,
  uploadMiddleware,
} from "../controllers/uploadController.js";
const patronRouter = Router();

patronRouter.get(
  "/",
  protect(Patron, ["manager", "librarian"]),
  getAll(Patron)
);
patronRouter.post(
  "/reservation",
  protect(Patron, ["patron"]),
  reservationCheck,
  placeReservation
);
patronRouter.get(
  "/check-for-books",
  protect(Patron),
  getBookIdsInReservationOrCheckoutByPatron
);
patronRouter.get("/reservation", protect(Patron), getReservations);
patronRouter.post("/online-books-list", protect(Patron), getGoogleBooks);
patronRouter.post(
  "/submit-request",
  protect(Patron),
  limitPatronToTwoRequestPerDay,
  submitRequest
);
patronRouter.get("/requests", protect(Patron), getRequests);
patronRouter.get("/online-book/:id", protect(Patron), getGoogleBook);
patronRouter.patch(
  "/reservation/:bookId",
  protect(Patron, ["patron"]),
  removeReservation
);
patronRouter.get("/checkedout-books", protect(Patron), getCheckedOutBooks);
patronRouter.get("/overdues", protect(Patron), getOverDueBooks);
patronRouter.patch(
  "/change-password",
  protect(Patron),
  changePassword("patron")
);

patronRouter.patch("/signup/:token", confirmSignUp);
patronRouter.patch(
  "/update-profile",
  protect(Patron),
  uploadMiddleware,
  resizeImage,
  uploadImage,
  updateProfile(Patron)
);
patronRouter.get(
  "/:id",
  protect(Patron, ["manager", "librarian"]),
  getOne(Patron)
);
export default patronRouter;

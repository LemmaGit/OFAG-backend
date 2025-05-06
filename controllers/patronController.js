import Patron from "../model/patron.js";
import Request from "../model/request.js";
import fetch from "node-fetch";
import {
  assignBookForApatronInWaitlist,
  confirmSuccessfulSignup,
  getAvailableCopies,
  getBookCondition,
} from "../helpers.js";
import { validateReservation } from "../schema/bookReservation.js";
import BookReservation from "../model/bookReservation.js";
import BookIssue from "../model/bookIssue.js";
import AppError from "../error/appError.js";
import catchAsync from "../util/catchAsync.js";
import { URL } from "../util/googleBookController.js";
import Book from "../model/book.js";
import { validateRequest } from "../schema/request.js";
import Setting from "../model/settings.js";
// ✅
export const confirmSignUp = confirmSuccessfulSignup(Patron);
// ✅
export const reservationCheck = catchAsync(async (req, _, next) => {
  const activeReservationsCount = await BookReservation.countDocuments({
    patronId: req.user._id,
    status: "active",
  });
  if (activeReservationsCount >= 2)
    return next(
      new AppError(
        "You already have 2 active reservations. Cannot place a new one."
      )
    );
  const patronIssue = await BookIssue.findOne({
    patronId: req.user._id,
    bookId: req.body.bookId,
    checkinDate: { $exists: false },
  });
  const patronReservation = await BookReservation.findOne({
    patronId: req.user._id,
    bookId: req.body.bookId,
    status: "active",
  });
  if (patronIssue)
    return next(new AppError("You have already checked out this book"));
  if (patronReservation)
    return next(new AppError("You have placed reservation this book"));
  const { holdPeriodDays } = await Setting.findOne();
  let expirationDate = new Date(
    new Date().getTime() + holdPeriodDays * 24 * 60 * 60 * 1000
  );
  const data = {
    ...req.body,
    patronId: req.user._id.toString(),
    expirationDate,
  };
  const { error, value } = validateReservation(data);
  if (error) return next(AppError.fromValidationError(error));
  req.value = value;
  next();
});
// ✅
export const placeReservation = catchAsync(async (req, res, next) => {
  const { value } = req;
  const bookForReservation = await Book.findOne({
    _id: value.bookId,
    status: "available",
  });
  if (!bookForReservation || bookForReservation.type === "reference")
    return next(new AppError("Can't place hold"));

  if (!bookForReservation.isAvailable) {
    const reservation = await BookReservation.create({
      ...value,
      bookCondition: "unknown",
      reservationType: "waitlist",
    });
    return res.status(201).json({ status: "success", reservation });
  }
  // checking if the patron already placed a hold on the book
  const holdExist = await BookReservation.find({
    bookId: value.bookId,
    patronId: value.patronId,
    status: "active",
    // reservationType: "hold",
  });
  if (holdExist.length) return next(new AppError("Reservation already exist"));
  // placing the hold
  let bookCondition = getBookCondition(bookForReservation);

  const placedHold = await BookReservation.create({ ...value, bookCondition });
  //! watch out for this one
  bookForReservation.books[bookCondition].availableCopies -= 1;
  if (!getAvailableCopies(bookForReservation))
    bookForReservation.isAvailable = false;
  await bookForReservation.save();
  return res.status(201).json({ status: "success", placedHold });
});
// ✅
export const getReservations = catchAsync(async (req, res) => {
  const reservations = await BookReservation.find({
    patronId: req.user._id,
    status: "active",
  })
    .populate({ path: "bookId", select: "_id title" })
    .exec();
  res.status(200).json({ reservations });
});

export const removeReservation = catchAsync(async (req, res, next) => {
  const bookId = req.params.bookId;
  const reservation = await BookReservation.findOne({
    bookId,
    patronId: req.user._id,
    status: "active",
  });
  if (!reservation) return next(new AppError("Reservation doesn't exist"));
  reservation.status = "cancelled";
  const removedReservation = await reservation.save();
  if (reservation.reservationType === "hold") {
    const book = await Book.findById(bookId);
    await assignBookForApatronInWaitlist(
      book,
      removedReservation.bookCondition
    );
  }

  res.status(200).json({ status: "success", removedReservation });
});
export const getCheckedOutBooks = catchAsync(async (req, res) => {
  const result = await BookIssue.find({
    patronId: req.user._id,
    $or: [{ checkinDate: null }, { checkinDate: { $exists: false } }],
  })
    .populate({
      path: "bookId",
      select: "title",
    })
    .populate({
      path: "checkedoutBy",
      select: "firstName lastName",
    })
    .lean();
  const checkedoutBooksByPatron = result.map(
    ({ checkedoutBy, bookId, overdueDays, overdueFinePerDay, ...rest }) => ({
      ...rest,
      librarianFullName: `${checkedoutBy.firstName} ${checkedoutBy.lastName}`,
      bookTitle: bookId.title,
      status: overdueDays > 0 ? "overdue" : "not overdue",
      overduefee: overdueDays ? overdueFinePerDay * overdueDays : 0,
    })
  );
  return res.status(200).json({ books: checkedoutBooksByPatron });
});
export const getOverDueBooks = catchAsync(async (req, res) => {
  const result = await BookIssue.find({
    patronId: req.user._id,
    $or: [{ checkinDate: null }, { checkinDate: { $exists: false } }],
  })
    .populate({
      path: "bookId",
      select: "title",
    })
    .populate({
      path: "checkedoutBy",
      select: "firstName lastName",
    })
    .lean();
  const overdueBooksByPatron = result
    .map(({ checkedoutBy, bookId, overdueDays, fineAmount, ...rest }) => ({
      ...rest,
      librarianFullName: `${checkedoutBy.firstName} ${checkedoutBy.lastName}`,
      bookTitle: bookId.title,
      overduefee: overdueDays ? fineAmount * overdueDays : 0,
    }))
    .filter((book) => book.overduefee > 0);
  return res.status(200).json({ books: overdueBooksByPatron });
});

export const getGoogleBooks = catchAsync(async (req, res, next) => {
  const { q = "*", inauthor } = req.body;

  // Start building query
  let query = "";

  if (q) query += `${encodeURIComponent(q)}`;
  if (inauthor) query += `+inauthor:${encodeURIComponent(inauthor)}`;

  // If query is empty, return early
  if (!query) return next(new AppError("No query provided", 400));

  const fetchURL = `${URL}?q=${query}&${
    inauthor && `inauthor:${inauthor}`
  }startIndex=1&maxResults=40&key=${process.env.GOOGLE_BOOK_API_KEY}`;

  const response = await fetch(fetchURL);
  if (!response.ok) return next(new AppError("Failed to fetch books"));

  const data = await response.json();
  if (!data || !data.items)
    return res.status(200).json({ total: 0, books: [] });

  const books = data.items.filter(
    (book) =>
      book.accessInfo.viewability === "ALL_PAGES" &&
      book.accessInfo.embeddable === true
  );

  return res.status(200).json({ total: books.length, books });
});
export const getGoogleBook = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const fetchURL = `${URL}/${id}?key=${process.env.GOOGLE_BOOK_API_KEY}`;

  const response = await fetch(fetchURL);
  if (!response.ok) return next(new AppError("Failed to fetch"));
  const data = await response.json();
  return res.status(200).json({ book: data });
});
export const getBookIdsInReservationOrCheckoutByPatron = catchAsync(
  async (req, res, next) => {
    const booksInReservation = await BookReservation.find({
      patronId: req.user._id,
      status: "active",
    }).select("bookId");
    const booksInCheckout = await BookIssue.find({
      patronId: req.user._id,
      checkinDate: { $exists: false },
    }).select("bookId");
    return res.status(200).json({
      status: "success",
      booksInReservationOrCheckout: [...booksInReservation, ...booksInCheckout],
    });
  }
);
export const limitPatronToTwoRequestPerDay = catchAsync(
  async (req, res, next) => {
    const today = new Date().setHours(0, 0, 0, 0);
    const tomorrow = new Date().setHours(23, 59, 59, 999);
    const requests = await Request.find({
      patronId: req.user._id,
      requestDate: { $gte: today, $lte: tomorrow },
    });
    if (requests.length >= 2)
      return next(new AppError("You have already made two requests today"));
    next();
  }
);
export const submitRequest = catchAsync(async (req, res, next) => {
  const { error, value } = validateRequest({
    ...req.body,
    patronId: req.user._id.toHexString(),
  });
  if (error) return next(AppError.fromValidationError(error));
  const request = await Request.create(value);
  return res.status(201).json({ status: "success", request });
});
export const getRequests = catchAsync(async (req, res) => {
  const requests = await Request.find({ patronId: req.user._id })
    .populate({ path: "patronId", select: "_id firstName lastName" })
    .exec();
  return res.status(200).json({ status: "success", requests });
});

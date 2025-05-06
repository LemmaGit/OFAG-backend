import { validateAddNewBook, validateEditBook } from "../schema/book.js";
import Book from "../model/Book.js";
import catchAsync from "../util/catchAsync.js";
import AppError from "../error/appError.js";
import { validateId } from "../schema/ID.js";
import BookReservation from "../model/bookReservation.js";
import { getAvailableCopies, getBookCondition, getCopies } from "../helpers.js";
import BookIssue from "../model/bookIssue.js";

export const checkBookUniqueness = catchAsync(async (req, res, next) => {
  const book = await Book.findOne({
    ISBN: req.body.ISBN,
  });
  if (book) return next(new AppError("ISBN is not unique"));
  next();
});
function prepareBookData(newBooks, fairBooks, poorBooks) {
  if (!newBooks) newBooks = 0;
  if (!fairBooks) fairBooks = 0;
  if (!poorBooks) poorBooks = 0;
  if (isNaN(+newBooks) || isNaN(+fairBooks) || isNaN(+poorBooks)) {
    throw new AppError("Copies must be a number", 400);
  }
  if (newBooks <= 0 || fairBooks <= 0 || poorBooks <= 0) {
    throw new AppError("Copies must be greater than or equal to 0", 400);
  }
  if (newBooks === 0 && fairBooks === 0 && poorBooks === 0) {
    throw new AppError("At least one copy must be available", 400);
  }
  return {
    new: {
      copies: newBooks,
      availableCopies: newBooks,
    },
    fair: {
      copies: fairBooks,
      availableCopies: fairBooks,
    },
    poor: {
      copies: poorBooks,
      availableCopies: poorBooks,
    },
  };
}
export function prepareData(req, _, next) {
  req.body.coverImage = req.image_url?.secure_url;
  const books = prepareBookData(
    req.body.newBooks,
    req.body.fairBooks,
    req.body.poorBooks
  );
  // req.body.author = { ...req.body.author };
  req.body.books = books;
  delete req.body.newBooks;
  delete req.body.fairBooks;
  delete req.body.poorBooks;
  next();
}
export const addNewBook = catchAsync(async (req, res, next) => {
  // return res.status(200).json({ status: "error", message: "error" });

  req.body.coverImage = req.image_url?.secure_url;
  delete req.body.image;
  req.body.author = JSON.parse(req.body.author);
  req.body.books = JSON.parse(req.body.books);

  const { error, value } = validateAddNewBook(req.body);
  if (error) return next(AppError.fromValidationError(error));
  const newBook = await Book.create(value);
  res.status(201).json({
    status: "success",
    data: {
      book: newBook,
    },
  });
});
export const getBookDetail = catchAsync(async (req, res, next) => {
  const bookId = req.params.id;
  const { error, value } = validateId({ id: bookId });
  if (error) return next(AppError.fromValidationError(error));
  const book = await Book.findById(value.id);
  // .lean({ virtuals: true });
  return res.status(200).json({ book });
});
export const getBookList = catchAsync(async (req, res) => {
  const books = await Book.find({ status: "available" });
  res.status(200).json({
    books,
  });
});
export const editMiddleware = catchAsync(async (req, res, next) => {
  req.body.author = JSON.parse(req.body.author);
  req.body.books = JSON.parse(req.body.books);
  if (req.image_url) req.body.coverImage = req.image_url.secure_url;
  const { bookId } = req.body;
  const {
    error: idError,
    value: { id },
  } = validateId({ id: bookId });
  if (idError) return next(AppError.fromValidationError(idError));
  req.bookId = id;
  next();
});
export const checkChangesInAvailableCopies = catchAsync(
  async (req, res, next) => {
    const book = await Book.findById(req.bookId);
    const {
      new: { copies: prevNewCopies, availableCopies: prevNewAvailableCopies },
      fair: {
        copies: prevFairCopies,
        availableCopies: prevFairAvailableCopies,
      },
      poor: {
        copies: prevPoorCopies,
        availableCopies: prevPoorAvailableCopies,
      },
    } = book.books;

    const { new: newBooks, fair: fairBooks, poor: poorBooks } = req.body.books;
    let modifiedavailableCopies;
    if (prevNewAvailableCopies < prevNewCopies) {
      modifiedavailableCopies =
        newBooks.copies - prevNewCopies + prevNewAvailableCopies;

      // newBooks.copies === prevNewAvailableCopies ||
      if (modifiedavailableCopies < 0)
        return next(
          new AppError(
            "This book is currently reserved or checked out and cannot be removed."
          )
        );
      newBooks.availableCopies = modifiedavailableCopies;
    }
    if (prevFairAvailableCopies < prevFairCopies) {
      modifiedavailableCopies =
        fairBooks.copies - prevFairCopies + prevFairAvailableCopies;

      // fairBooks.copies === prevFairAvailableCopies ||
      if (modifiedavailableCopies < 0)
        return next(
          new AppError(
            "This book is currently reserved or checked out and cannot be removed."
          )
        );
      fairBooks.availableCopies = modifiedavailableCopies;
    }
    if (prevPoorAvailableCopies < prevPoorCopies) {
      modifiedavailableCopies =
        poorBooks.copies - prevPoorCopies + prevPoorAvailableCopies;

      // poorBooks.copies === prevPoorAvailableCopies ||
      if (modifiedavailableCopies < 0)
        return next(
          new AppError(
            "This book is currently reserved or checked out and cannot be removed."
          )
        );
      poorBooks.availableCopies = modifiedavailableCopies;
    }

    const { bookId, ...data } = req.body;
    const { error, value } = validateEditBook(data);
    if (error) return next(AppError.fromValidationError(error));

    req.bookData = value;
    next();
  }
);
async function checkIFWaitlistExistAndAssign(bookId, book) {
  const patronsInWaitlist = await BookReservation.find({
    bookId,
    reservationType: "waitlist",
    status: "active",
  });
  if (patronsInWaitlist.length) {
    let patronToHold = patronsInWaitlist[0];
    patronsInWaitlist.forEach((reservation) => {
      if (reservation.holdDate > patronToHold.holdDate)
        patronToHold = reservation;
    });
    patronToHold.reservationType = "hold";
    const bookCondition = getBookCondition(book);
    patronToHold.bookCondition = bookCondition;
    book.books[bookCondition].availableCopies -= 1;
    await patronToHold.save();
  }
  book.isAvailable = getAvailableCopies(book) > 0;
  await book.save();
}
export const editBookDetail = catchAsync(async (req, res, next) => {
  const { bookId, bookData } = req;
  const updated = await Book.findByIdAndUpdate(bookId, bookData, { new: true });

  if (getAvailableCopies(updated) > 0)
    await checkIFWaitlistExistAndAssign(bookId, updated);
  else {
    updated.isAvailable = false;
    if (!getCopies(updated)) updated.status = "not available";
    await updated.save();
  }

  return res
    .status(200)
    .json({ status: "success", message: "Successfully Updated", updated });
});
export const removeBook = catchAsync(async (req, res, next) => {
  const {
    error,
    value: { id },
  } = validateId({ id: req.body.id });
  if (error) return next(AppError.fromValidationError(error));
  const bookReservationCount = await BookReservation.countDocuments({
    bookId: id,
    status: "active",
  });
  const bookIssueCount = await BookIssue.countDocuments({
    bookId: id,
    checkinDate: { $exists: false },
  });
  if (bookReservationCount || bookIssueCount)
    return next(
      new AppError(
        "Unable to remove the book. It is currently reserved or checked out."
      )
    );
  const bookToBeRemoved = await Book.findOne({ _id: id, status: "available" });
  if (!bookToBeRemoved) return next(new AppError("The book does not exist"));
  bookToBeRemoved.status = "not available";
  await bookToBeRemoved.save();
  return res.status(201).json({
    status: "success",
    message: "Successfully Removed",
  });
});

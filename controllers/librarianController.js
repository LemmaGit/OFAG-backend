import {
  confirmSuccessfulSignup,
  getAvailableCopies,
  getBookCondition,
  getBookConditionDowngradeFee,
  assignBookForApatronInWaitlist,
  signup,
} from "../helpers.js";
import BookIssue from "../model/bookIssue.js";
import Librarian from "../model/librarian.js";
import { validateId } from "../schema/ID.js";
import { validateRegisterLibrarian } from "../schema/librarian.js";
import {
  checkinAggregation,
  checkoutAggregation,
} from "../aggregations/librarian.js";
import BookReservation from "../model/bookReservation.js";
import Book from "../model/book.js";
import {
  validateCheckinginBook,
  validateCheckingoutBook,
} from "../schema/bookIssue.js";
import catchAsync from "../util/catchAsync.js";
import AppError from "../error/appError.js";
import Patron from "../model/Patron.js";
import { validateRegisterPatron } from "../schema/patron.js";
import { validateUpdateProfile } from "../schema/common.js";
import dayjs from "dayjs";
import Request from "../model/request.js";
import Setting from "../model/settings.js";

export const signUp = signup(Librarian, validateRegisterLibrarian);
export const register = signup(Patron, validateRegisterPatron);
export const confirmSignUp = confirmSuccessfulSignup(Librarian);

// checkedin  books
export const getCheckedInBooks = catchAsync(async (req, res) => {
  const aggregationPipeline = checkinAggregation();

  const books = await BookIssue.aggregate(aggregationPipeline);

  const total = await BookIssue.countDocuments({
    $or: [{ checkinDate: null }, { checkinDate: { $exists: false } }],
  });

  return res.status(200).json({
    total,
    books,
  });
});
// checkedout books
export const getCheckedOutBooks = catchAsync(async (req, res) => {
  const aggregationPipeline = checkoutAggregation();

  const books = await BookIssue.aggregate(aggregationPipeline);

  const total = await BookIssue.countDocuments({
    $or: [{ checkinDate: null }, { checkinDate: { $exists: false } }],
  });

  return res.status(200).json({
    total,
    books,
  });
});
// holds
export const getHolds = catchAsync(async (req, res) => {
  const holds = await BookReservation.find({ status: "active" })
    .populate("bookId", "title _id")
    .populate("patronId", "firstName lastName");
  return res.status(200).json({ holds });
});

async function updateBookCondition(book, issue, conditionChanged = false) {
  if (!conditionChanged) return;
  const { bookConditionWhenCheckedout, bookConditionWhenCheckedin } = issue;
  book.books[bookConditionWhenCheckedout].copies -= 1;
  book.books[bookConditionWhenCheckedin].copies += 1;
  //^ if checkedout book type is available then decrease the checkedout book type available copies
  if (book.books[bookConditionWhenCheckedout].availableCopies) {
    book.books[bookConditionWhenCheckedout].availableCopies -= 1;
  } else if (!book.books[bookConditionWhenCheckedin].availableCopies) {
    book.books[bookConditionWhenCheckedout].availableCopies = 0;
  }
  await book.save();
}
async function takecareOfPayment(issue, feeForBookConditionDowngrade) {
  issue.totalFine =
    issue.overdueDays * issue.overdueFinePerDay + feeForBookConditionDowngrade;
  issue.paymentStatus = "paid";
  issue.bookConditionDowngradeCharge = feeForBookConditionDowngrade;
  await issue.save();
}
async function updateLostBook(book, bookConditionWhenCheckedout) {
  book.books[bookConditionWhenCheckedout].copies -= 1;
  if (book.books[bookConditionWhenCheckedout].availableCopies > 0)
    book.books[bookConditionWhenCheckedout].availableCopies -= 1;
  book.isAvailable = getAvailableCopies(book) > 0;
  await book.save();
}
export const checkinMiddleware = (req, res, next) => {
  const checkedinBy = req.user._id?.toString();
  const { error: patronError, value: patron } = validateId({
    id: req.body.patronId,
  });
  const { error: bookError, value: book } = validateId({
    id: req.body.bookId,
  });
  if (patronError) return next(AppError.fromValidationError(patronError));
  if (bookError) return next(AppError.fromValidationError(bookError));
  req.patronId = patron.id;
  req.bookId = book.id;
  req.checkedinBy = checkedinBy;
  next();
};
// checkin
export const checkin = catchAsync(
  async (req, res, next) => {
    const { checkedinBy, bookId, patronId } = req;
    const bookCondition = req.body.condition;
    let patronIssue = await BookIssue.findOne({
      patronId,
      bookId,
      checkinDate: { $exists: false },
      paymentStatus: "pending",
    });
    if (!patronIssue)
      return next(new AppError("Can not find checkout for the book"));

    const bookToBeCheckedIn = await Book.findOne({
      _id: bookId,
      status: "available",
    });
    if (!bookToBeCheckedIn) return next(new AppError("Can not find the book"));
    const { error, value } = validateCheckinginBook({
      checkedinBy,
      bookId,
      patronId,
      bookConditionWhenCheckedin: bookCondition,
    });
    if (error) return next(AppError.fromValidationError(error));
    const isBookConditionChanged =
      value.bookConditionWhenCheckedin !==
      patronIssue.bookConditionWhenCheckedout;
    let bookConditionDowngradeFee;
    if (!isBookConditionChanged) bookConditionDowngradeFee = 0;
    else {
      bookConditionDowngradeFee = await getBookConditionDowngradeFee(
        patronIssue.bookConditionWhenCheckedout,
        value.bookConditionWhenCheckedin
      );
    }
    await takecareOfPayment(patronIssue, bookConditionDowngradeFee);
    patronIssue = await BookIssue.findOneAndUpdate(
      { _id: patronIssue._id },
      value,
      { new: true }
    );

    if (bookCondition !== "lost") {
      await updateBookCondition(
        bookToBeCheckedIn,
        patronIssue,
        isBookConditionChanged
      );
      await assignBookForApatronInWaitlist(
        bookToBeCheckedIn,
        patronIssue.bookConditionWhenCheckedin
      );
    } else
      updateLostBook(
        bookToBeCheckedIn,
        patronIssue.bookConditionWhenCheckedout
      );

    return res
      .status(200)
      .json({ status: "success", message: "Successfully checkedin" });
  }
  // }
);
export const getPatrons = catchAsync(async (req, res) => {
  const patrons = await Patron.find({ status: "verified" });
  if (!patrons.length) return res.status(200).json({ patrons: [] });
  const all = await Promise.all(
    patrons.map(async (patron) => {
      const hasBorrowed = await BookIssue.findOne({
        patronId: patron._id,
        $or: [{ checkinDate: { $exists: false } }, { checkinDate: null }],
      });
      if (!hasBorrowed) return patron;

      return { ...patron.toObject(), hasBorrowedBooks: true };
    })
  );
  return res.status(200).json({ patrons: all, total: all.length });
});
export const checkoutMiddleware = catchAsync(async (req, _, next) => {
  const checkedoutBy = req.user._id.toHexString();
  const book = await Book.findOne({
    _id: req.body.bookId,
    status: "available",
  });
  if (!book) return next(new AppError("Book Doesn't exist"));
  if (book.type === "reference")
    return next(new AppError("Reference book can not be checkedout"));

  const patronHold = await BookReservation.findOne({
    patronId: req.body.patronId,
    bookId: req.body.bookId,
    status: "active",
    reservationType: "hold",
  });

  if (!book.isAvailable) {
    if (!patronHold)
      return next(new AppError("Book is not available for checkout"));
  }
  req.patronHold = patronHold;
  req.checkedoutBy = checkedoutBy;
  req.book = book;
  next();
});
async function prepareBookForCheckout(
  book,
  bookCondition,
  isBookInHold = false
) {
  //! we have to make sure that the book is available
  book.borrowCount = book.borrowCount + 1;
  if (!isBookInHold) {
    book.books[bookCondition].availableCopies -= 1;
    if (!getAvailableCopies(book)) book.isAvailable = false;
  }
  await book.save();
}
// checkout
export const checkout = catchAsync(async (req, res, next) => {
  const { checkedoutBy, book, patronHold } = req;
  const patronWithIssue = await BookIssue.find({
    patronId: req.body.patronId,
    checkinDate: { $exists: false },
  });

  //& check if the user checked out >= 2 books
  if (patronWithIssue && patronWithIssue.length >= 2)
    return next(new AppError("User has already checkedout other books"));
  //& check if the user checked out this same book
  if (patronWithIssue) {
    const hasPatronCheckedBookAlready = patronWithIssue.find(
      (issue) => issue.bookId == req.body.bookId
    );
    if (hasPatronCheckedBookAlready)
      return next(
        new AppError("Patron already have checkedout this book before")
      );
  }
  const settings = await Setting.findOne();
  const { loanPeriodDays, overdueFinePerDay } = settings;
  const dueDate = new Date().getTime() + loanPeriodDays * 24 * 60 * 60 * 1000;
  //& give the book for a patron with no hold but when the book is available
  if (!patronHold) {
    const bookConditionWhenCheckedout = getBookCondition(book);
    const data = {
      ...req.body,
      checkedoutBy,
      bookConditionWhenCheckedout,
      dueDate,
      overdueFinePerDay,
    };
    const { error, value } = validateCheckingoutBook(data);
    if (error) return next(AppError.fromValidationError(error));
    const checkoutData = await BookIssue.create(value);
    await prepareBookForCheckout(book, bookConditionWhenCheckedout);
    return res.status(201).json({
      status: "success",
      message: "Successfully checked out",
      checkoutData,
    });
  }

  const data = {
    ...req.body,
    checkedoutBy,
    bookConditionWhenCheckedout: patronHold.bookCondition,
    dueDate,
    overdueFinePerDay,
  };
  const { error, value } = validateCheckingoutBook(data);
  if (error) return next(AppError.fromValidationError(error));
  const checkoutData = await BookIssue.create(value);
  await prepareBookForCheckout(book, patronHold.bookCondition, true);
  patronHold.status = "fulfilled";
  await patronHold.save();
  return res.status(201).json({
    status: "success",
    message: "Successfully checked out",
    checkoutData,
  });
});
export const renewMiddleware = (req, _, next) => {
  const librarianId = req.user._id;
  const { error: patronIdError, value: patronValue } = validateId({
    id: req.body.patronId,
  });
  if (patronIdError) return next(AppError.fromValidationError(patronIdError));
  const { error: bookIdError, value: bookIdValue } = validateId({
    id: req.body.bookId,
  });
  if (bookIdError) return next(AppError.fromValidationError(bookIdError));

  req.librarianId = librarianId;
  req.patronId = patronValue.id;
  req.bookId = bookIdValue.id;
  next();
};
// renew
export const renew = catchAsync(async (req, res, next) => {
  const { patronId, bookId, librarianId } = req;
  const issueToRenew = await BookIssue.findOne({
    patronId,
    bookId,
    checkinDate: { $exists: false },
  });

  if (!issueToRenew) return next(new AppError("No bookIssue found"));
  if (issueToRenew.newDueDate) {
    return next(new AppError("Renew reaches the maximum limit."));
  }
  const now = dayjs().format("YYYY-MM-DD HH:mm:ss");
  const timeLeftUntilDueInHr = dayjs(issueToRenew.dueDate).diff(now, "hour");
  const { timeLeftOnDueDateForRenewal } = await Setting.findOne();
  const isValidTimeToRenew =
    timeLeftUntilDueInHr <= timeLeftOnDueDateForRenewal;

  if (issueToRenew.overdueDays) {
    return next(new AppError("Patron has an overdue, cannot renew"));
  } else if (!isValidTimeToRenew) {
    return next(new AppError("Not a valid time to renew"));
  }
  const reservationForTheBook = await BookReservation.find({
    bookId,
    status: "active",
    reservationType: "waitlist",
  });

  if (reservationForTheBook.length) {
    return next(new AppError("Other people are in line to get the book"));
  }

  issueToRenew.renewDate = Date.now();
  const { loanPeriodDays } = await Setting.findOne();
  issueToRenew.newDueDate = Date.now() + loanPeriodDays * 24 * 60 * 60 * 1000;
  issueToRenew.renewedBy = librarianId;

  const renewed = await issueToRenew.save();

  return res.status(201).json({
    status: "success",
    message: "Successfully Renewed",
    detail: {
      dueDate: new Date(renewed.newDueDate).toLocaleDateString(),
    },
  });
});
export const getMostCirculatedBooks = catchAsync(async (req, res, next) => {
  const books = await Book.find({ borrowCount: { $gt: 10 } });
  return res.status(200).json({
    books,
  });
});
const checkForExistingUser = async (id, username) => {
  let user = await Librarian.findOne({ username });
  if (!user) return false;
  if (user._id.toString() !== id.toString()) return true;
  return false;
};
export const editLibrarianDetail = catchAsync(async (req, res, next) => {
  const {
    error: IdError,
    value: { id },
  } = validateId({ id: req.body.librarianId });

  if (IdError) return next(AppError.fromValidationError(IdError));
  delete req.body.librarianId;
  const { error, value } = validateUpdateProfile(req.body);
  if (error) return next(AppError.fromValidationError(error));
  let isTaken = await checkForExistingUser(id, value.username);
  if (isTaken) return next(new AppError("Username is taken"));

  const updatedUser = await Librarian.findByIdAndUpdate(id, value, {
    new: true,
  });
  return res
    .status(201)
    .json({ status: "success", message: "Successfull Updated", updatedUser });
});

export const searchPatron = catchAsync(async (req, res, next) => {
  let { searchQuery } = req.query;
  if (!searchQuery || searchQuery.trim() === "") {
    return next(new AppError("Search query is required"));
  }

  searchQuery = searchQuery.trim();
  const patrons = await Patron.find({
    status: "verified",
    $or: [
      { firstName: { $regex: searchQuery, $options: "i" } },
      { lastName: { $regex: searchQuery, $options: "i" } },
      {
        $expr: {
          $regexMatch: {
            input: { $concat: ["$firstName", " ", "$lastName"] },
            regex: searchQuery,
            options: "i",
          },
        },
      },
    ],
  });
  return res.status(200).json({ total: patrons.length, patrons });
});
export const searchBook = catchAsync(async (req, res, next) => {
  let { searchQuery } = req.query;
  if (!searchQuery || searchQuery.trim() === "") {
    return next(new AppError("Search query is required"));
  }

  searchQuery = searchQuery.trim();
  const books = await Book.find({
    title: { $regex: searchQuery, $options: "i" },
    status: "available",
  });

  return res.status(200).json({ total: books.length, books });
});

export const getRequests = catchAsync(async (req, res) => {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const requests = await Request.find({ requestDate: { $gte: threeDaysAgo } })
    .populate({
      path: "patronId",
      select: "_id firstName lastName avatar email",
    })
    .exec();
  return res.status(200).json({ status: "success", requests });
});
export const AcceptOrRejectRequest = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;
  await Request.findByIdAndUpdate(id, { status, isSeen: true });
  res.status(201).json({ status: "success" });
});

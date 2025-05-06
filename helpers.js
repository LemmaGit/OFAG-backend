import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Joi from "joi";
import dayjs from "dayjs";
import { validateUserId } from "./schema/helper.js";
import loginSchema from "./schema/helper.js";
import { validator } from "./util/joihelperfun.js";
import sendEmail from "./email.js";
import { validateId } from "./schema/ID.js";
import AppError from "./error/appError.js";
import catchAsync from "./util/catchAsync.js";
import Patron from "./model/patron.js";
import Librarian from "./model/librarian.js";
import BookReservation from "./model/bookReservation.js";
import { validateUpdateProfile } from "./schema/common.js";
import Setting from "./model/settings.js";

const validateLogin = validator(loginSchema);

export const validateUniqueness = async (Model, data) => {
  const existingUser = await Model.findOne({
    $or: [{ email: data.email }, { username: data.username }],
  });
  if (existingUser) return true;
  return false;
};
export function generateToken(user, statusCode, res, role, isSignUp = false) {
  const userInfo = {
    userId: user._id.toHexString(),
    role,
    userPass: user.password,
  };
  const token = jwt.sign(userInfo, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
  if (!isSignUp) {
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: +process.env.COOKIE_MAX_AGE,
    });
    return res
      .status(statusCode)
      .json({ status: "success", message: "Successfully logged", role });
  }

  return token;
}

export const changedPasswordAfter = function (passwordChangedAt, JWTTimestamp) {
  if (passwordChangedAt) {
    const changedTimestamp = passwordChangedAt.getTime() / 1000;
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

export const loginUser = catchAsync(async (req, res, next) => {
  const { error, value } = validateLogin(req.body);
  if (error) return next(AppError.fromValidationError(error));
  const { email, password } = value;
  let user;
  // check if the user is a patron
  user = await login(Patron, email, password);
  if (user) {
    if (user.status !== "verified")
      return next(new AppError("You account is not verified"));
    return generateToken(user, 200, res, "patron");
  }
  // check if the user is a librarian
  user = await login(Librarian, email, password);
  if (user) {
    if (user.status !== "verified")
      return next(new AppError("You account is not verified"));
    let role;
    role = user.isManager ? "manager" : "librarian";
    return generateToken(user, 200, res, role);
  }
  if (!user) return next(new AppError("Incorrect email or password"));
});
export const login = async function (Model, email, password) {
  const user = await Model.findOne({ email });
  if (!user) return null;
  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) return null;
  return user;
};

const checkForMultipleModel = async (Models, id) => {
  let selected = "";
  if (Models[0].modelName === "Patron" || Models[0].modelName === "librarian")
    selected = "-registeredAt ";
  let user = await Models[0].findById(id).select(selected);
  if (user) return user;
  if (Models[1].modelName === "Patron" || Models[1].modelName === "librarian")
    selected = "-registeredAt ";
  user = await Models[1].findById(id).select(selected);
  return user;
};
export const protect = (
  Model,
  allowedUsers = [],
  checkForAdmin = false,
  isArrayOfModels = false
) =>
  catchAsync(async (req, res, next) => {
    let token = req.cookies.token;
    if (!token) return next(new AppError("You are not logged in"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (allowedUsers.length && !allowedUsers.includes(decoded.role))
      return next(new AppError("You are not eligible for this"));

    let user;

    if (isArrayOfModels) {
      user = await checkForMultipleModel(Model, decoded.userId);
    } else {
      let selected = "";
      if (Model.modelName === "Patron" || Model.modelName === "librarian")
        selected = "-registeredAt ";
      user = await Model.findById(decoded.userId).select(selected);
    }
    if (checkForAdmin && !user.isManager)
      return next(new AppError("User does not have admin role"));
    if (!user) return next(new AppError("User no longer exist"));

    if (user.isPasswordChanged(decoded.iat))
      return next(
        new AppError("User recently changed password. Please login again")
      );
    req.user = user;
    next();
  });
export const logout = (req, res) => {
  res.clearCookie("token");
  res.status(201).json({ status: "success", message: "user logged out" });
};
export const changePassword = (role) =>
  catchAsync(async (req, res, next) => {
    const user = req.user;
    const isMatch = bcrypt.compareSync(req.body.oldpassword, user.password);
    if (!isMatch) {
      const details = [
        {
          message: "Password is incorrect",
          path: ["oldpassword"],
          type: "any.custom",
          context: {
            label: "oldpassword",
            key: "oldpassword",
          },
        },
      ];

      const error = new Joi.ValidationError("Validation error", details, null);
      return next(AppError.fromValidationError(error));
    }

    user.password = await bcrypt.hash(req.body.newpassword, 10);
    const updatedUser = await user.save({ validateBeforeSave: false });
    generateToken(updatedUser, 200, res, role);
    // return res
    //   .status(200)
    //   .json({ status: "success", message: "Successfully updated password" });
  });
export const getAll = (Model, filter = {}) =>
  catchAsync(async (_, res) => {
    const all = await Model.find(filter);
    return res.status(200).json({
      total: all.length,
      [Model.modelName.toLowerCase() + "s"]: all,
    });
  });
export const getOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const { error, value } = validateUserId(req.params.id);
    if (error) return next(AppError.fromValidationError(error));
    const foundEntity = await Model.findOne({ id: value.id });
    return res.status(200).json({
      [Model.modelName.toLowerCase()]: foundEntity,
    });
  });
export const signup = (Model, validatorFun) =>
  catchAsync(async (req, res, next) => {
    const { error, value } = validatorFun(req.body);
    if (error) return next(AppError.fromValidationError(error));
    const otherUserExist = await validateUniqueness(Model, value);
    if (otherUserExist)
      return next(
        new AppError("User already exist with the email or username.")
      );
    const newUser = await Model.create({
      ...value,
      password: await bcrypt.hash(value.password, 10),
    });
    const modelString = `${Model.modelName}s`.toLowerCase();
    const token = generateToken(newUser, 201, res, modelString, true);
    const url = `${req.protocol}://${req.get(
      "host"
    )}/api/${modelString}/signup/${token}`;
    try {
      await sendEmail({
        email: newUser.email,
        subject: "Confirm Your OFAG Library Account",
        libraryName: "OFAG Library",
        confirmationUrl: url,
        name: newUser.firstName,
      });
    } catch (error) {
      await Model.findByIdAndDelete(newUser._id);
      return next(new AppError("Failed to send email"));
    }
    res.status(200).json({ message: "Successfuly Registered", url });
  });
export const confirmSuccessfulSignup = (Model) =>
  catchAsync(async (req, res) => {
    const { token } = req.params;
    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    let user;
    user = await Model.findById(userId).select("-password -registeredAt");
    if (!user) {
      return res.status(404).render("error", {
        message: "User not found",
        helpText: "The account associated with this link doesn't exist.",
      });
    }
    user.status = "verified";
    await user.save();
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      maxAge: +process.env.COOKIE_MAX_AGE,
    });
    res.status(200).render("email-confirmed", {
      user: {
        name: user.firstName,
        email: user.email,
      },
      libraryName: "OFAG Library",
    });
    // res.status(200).json({ user });
  });
export const getRecentAll = (Model, daysFromNow = 7, fieldToCompare) =>
  catchAsync(async (req, res) => {
    const { page = 1, pageSize = 10 } = req.query;

    const pageNum = parseInt(page, 10);
    const pageLimit = parseInt(pageSize, 10);

    if (pageNum <= 0 || pageLimit <= 0) {
      return res.status(400).json({ message: "Invalid page or page size" });
    }

    const sevenDaysAgo = dayjs().subtract(daysFromNow, "day").toDate();
    let all = await Model.find({
      [`${fieldToCompare}`]: { $gte: sevenDaysAgo },
    })
      .skip((pageNum - 1) * pageLimit)
      .limit(pageLimit);
    const total = await Model.countDocuments({
      [`${fieldToCompare}`]: { $gte: sevenDaysAgo },
    });

    return res.status(200).json({
      [Model.modelName.toLowerCase() + "s"]: all,
      total,
      totalPages: Math.ceil(total / pageLimit),
      currentPage: pageNum,
    });
  });
export const removeEntity = (Model) =>
  catchAsync(async (req, res, next) => {
    const { error, value } = validateId({ id: req.body.id });
    if (error) return next(AppError.fromValidationError(error));
    const entityToRemove = await Model.findByIdAndUpdate(
      value.id,
      { status: "removed" },
      { new: true }
    );
    return res.status(201).json({
      status: "success",
      entityToRemove,
      message: "Successfully Removed",
    });
  });
export function nameFormatter(name) {
  const nameArr = name.split(" ");
  let finalName;
  if (nameArr.length == 1) {
    finalName = nameArr.join("");
    finalName =
      finalName.charAt(0).toUpperCase() + finalName.slice(1).toLowerCase();
    return finalName;
  }
  finalName = nameArr
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
  return finalName;
}
export function getBookCondition(book) {
  const booksObject = book.books;
  if (booksObject["new"].availableCopies > 0) return "new";
  if (booksObject["fair"].availableCopies > 0) return "fair";
  return "poor";
}
export async function getBookConditionDowngradeFee(checkoutCond, checkinCond) {
  try {
    const settings = await Setting.findOne();
    if (checkoutCond == "new" && checkinCond == "fair")
      return settings.feeNewToFair;
    if (checkoutCond == "fair" && checkinCond == "poor")
      return settings.feeFairToPoor;
    if (checkoutCond == "new" && checkinCond == "poor")
      return settings.feeNewToPoor;
    if (checkinCond === "lost") return settings.feeLostBook;
  } catch (_) {
    throw new Error("Something went wrong");
  }
}
export function getAvailableCopies(book) {
  const booksObject = book.books;
  return (
    booksObject["new"].availableCopies +
    booksObject["fair"].availableCopies +
    booksObject["poor"].availableCopies
  );
}
export function getCopies(book) {
  const booksObject = book.books;
  return (
    booksObject["new"].copies +
    booksObject["fair"].copies +
    booksObject["poor"].copies
  );
}
export const updateProfile = (Model) =>
  catchAsync(async (req, res, next) => {
    const { error, value } = validateUpdateProfile(req.body);
    if (error) return next(AppError.fromValidationError(error));
    const user = await Model.findOne({ username: value.username });
    if (user && user._id.toString() !== req.user._id.toString())
      return next(
        AppError.fromValidationError(
          { username: "username is already taken" },
          "custom"
        )
      );
    let data = { ...value };
    if (req.image_url) data = { ...data, avatar: req.image_url.secure_url };
    const newProfileInfo = await Model.findByIdAndUpdate(req.user._id, data, {
      new: true,
    });

    res.status(201).json({ newProfileInfo });
  });
async function updateBook(book, bookCondition) {
  book.books[bookCondition].availableCopies += 1;
  book.isAvailable = true;
  await book.save();
}
export const assignBookForApatronInWaitlist = async (book, bookCondition) => {
  const patronsInWaitlist = await BookReservation.find({
    bookId: book._id,
    reservationType: "waitlist",
    status: "active",
  });
  if (!patronsInWaitlist.length) {
    await updateBook(book, bookCondition);
    return;
  }
  let patronToHold = patronsInWaitlist[0];
  patronsInWaitlist.forEach((reservation) => {
    if (reservation.holdDate > patronToHold.holdDate)
      patronToHold = reservation;
  });
  patronToHold.reservationType = "hold";
  patronToHold.bookCondition = bookCondition;
  book.isAvailable = getAvailableCopies(book) > 0;
  await book.save();
  await patronToHold.save();
};

import bcrypt from "bcryptjs";
import { generateToken } from "../helpers.js";
import Patron from "../model/patron.js";
import Librarian from "../model/librarian.js";
import AppError from "../error/appError.js";
import catchAsync from "../util/catchAsync.js";

// export const signUp = async (req, res, next) => {
//   if (req.body.password.length < 8)
//     return next({
//       name: "ValidationError",
//       errors: {
//         password: {
//           message: "Mininum password length should be 8",
//         },
//       },
//     });
//   const newUser = await User.create({
//     fullName: req.body["full name"],
//     age: req.body.age,
//     email: req.body.email,
//     phone: req.body.phone,
//     password: await bcrypt.hash(req.body.password, 10),
//     role: req.body.role,
//   });
//   generateToken(newUser, 200, res);
// };

// export const login = async (req, res, next) => {
//   const { email, password } = req.body;
//   if (!email || !password)
//     return next({
//       name: "RootError",
//       message: "Provide credentials",
//       path: "root",
//       value: "Provide credentials",
//     });

//   const user = await User.login(email, password);
//   if (!user)
//     return next({
//       name: "RootError",
//       message: "Incorrect email or password",
//       path: "root",
//       value: "Incorrect email or password",
//     });

//   generateToken(user, 200, res);
// };

// export const protect = async (req, res, next) => {
//   let token = req.cookies.token;
//   if (!token) throw new Error("You are not logged in");
//   const decoded = jwt.verify(token, process.env.JWT_SECRET);
//   const user = await User.findById(decoded.userId);
//   if (!user) throw new Error("User no longer exist");
//   if (user.changedPasswordAfter(decoded.iat))
//     throw new Error("User recently changed password. Please login again");
//   req.user = user;
//   next();
// };

export const changePassword = catchAsync(async (req, res, next) => {
  const user = req.user;
  const isMatch = bcrypt.compareSync(req.body.oldPassword, user.password);
  if (!isMatch) next(new AppError("Password is incorrect"));
  user.password = await bcrypt.hash(req.body.newPassword, 10);
  const updatedUser = await user.save().select("-password -registeredAt ");
  generateToken(updatedUser, 200, res);
});

export const checkAuth = catchAsync(async (req, res) => {
  let role;
  const isPatron = await Patron.findById(req.user._id);
  if (isPatron) role = "patron";
  else {
    const librarian = await Librarian.findById(req.user._id);

    if (librarian?.isManager) role = "manager";
    else role = "librarian";
  }

  res.json({ role, user: req.user });
});

export const checkToken = catchAsync(async (req, res) => {
  const token = req.cookies.token;

  if (!token)
    return res.status(401).json({ status: "error", message: "No token found" });

  return res
    .status(200)
    .json({ status: "success", message: "successfully authenicated" });
});

import mongoose from "mongoose";
import { changedPasswordAfter, nameFormatter } from "../helpers.js";

const librarianSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
    set: (v) => nameFormatter(v),
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    set: (v) => nameFormatter(v),
  },
  email: {
    type: String,
    required: true,
    unique: true,
    match: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/,
    trim: true,
  },
  contact: {
    type: String,
    required: true,
    match: /^(?:(?:\+|00)[1-9]\d{0,3}[-\s]?)?(?:\(?\d{1,4}\)?[-\s]?)?\d{6,14}$/,
  },
  username: { type: String, required: true, unique: true, trim: true },
  avatar: {
    type: String,
    default:
      "https://res.cloudinary.com/dggqm5svg/image/upload/v1735830098/uploads/qbtzmgy74k0b1dszvhla.jpg",
  },
  password: { type: String, required: true },
  passwordChangedAt: { type: Date },
  registeredAt: {
    type: Date,
    default: () => Date.now(),
  },
  isManager: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ["unverified", "verified", "removed"],
    default: "unverified",
  },
});

librarianSchema.methods.isPasswordChanged = function (JWTTimestamp) {
  return changedPasswordAfter(this.passwordChangedAt, JWTTimestamp);
};
// librarianSchema.statics.login = function ({ email, password }) {
//   return login(this, email, password);
// };
librarianSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});
const Librarian = mongoose.model("Librarian", librarianSchema);

export default Librarian;

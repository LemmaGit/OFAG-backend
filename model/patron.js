import mongoose from "mongoose";
import { changedPasswordAfter, nameFormatter } from "../helpers.js";

const patronSchema = new mongoose.Schema({
  firstName: {
    type: String,
    trim: true,
    required: true,
    set: (v) => nameFormatter(v),
  },
  lastName: {
    type: String,
    trim: true,
    required: true,
    set: (v) => nameFormatter(v),
  },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  status: {
    type: String,
    enum: ["unverified", "verified", "removed"],
    default: "unverified",
  },
  registeredAt: {
    type: Date,
    default: () => Date.now(),
  },
  avatar: {
    type: String,
    default:
      "https://res.cloudinary.com/dggqm5svg/image/upload/v1735830098/uploads/qbtzmgy74k0b1dszvhla.jpg",
  },
  passwordChangedAt: { type: Date },
});
patronSchema.methods.isPasswordChanged = function (JWTTimestamp) {
  return changedPasswordAfter(this.passwordChangedAt, JWTTimestamp);
};
patronSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});
const Patron = mongoose.models.Patron || mongoose.model("Patron", patronSchema);
export default Patron;

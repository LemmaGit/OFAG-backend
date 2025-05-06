import mongoose from "mongoose";
import { nameFormatter } from "../helpers.js";

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, set: (v) => nameFormatter(v) },
  ISBN: { type: String, unique: true, match: /^\d{13}$/, required: true },
  author: {
    firstName: { type: String, required: true, set: (v) => nameFormatter(v) },
    lastName: { type: String, required: true, set: (v) => nameFormatter(v) },
  },
  publisher: { type: String, required: true },
  publicationYear: {
    type: Number,
    required: true,
    min: 1000,
    max: new Date().getFullYear(),
  },
  edition: { type: String, required: true },
  description: { type: String, requied: true },
  isAvailable: { type: Boolean, default: true },
  coverImage: { type: String, requied: true },
  borrowCount: { type: Number, default: 0 },
  books: {
    new: {
      copies: { type: Number, default: 0, min: 0 },
      availableCopies: { type: Number, default: 0, min: 0 },
    },
    fair: {
      copies: { type: Number, default: 0, min: 0 },
      availableCopies: { type: Number, default: 0, min: 0 },
    },
    poor: {
      copies: { type: Number, default: 0, min: 0 },
      availableCopies: { type: Number, default: 0, min: 0 },
    },
  },
  type: { type: String, enum: ["circulation", "reference"], required: true },
  category: {
    type: String,
    enum: ["fiction", "nonfiction", "periodical", "textbook"],
    required: true,
  },
  addedAt: {
    type: Date,
    default: () => Date.now(),
  },
  status: {
    type: String,
    enum: ["not available", "available"],
    default: "available",
  },
});
bookSchema.virtual("availableCopies").get(function () {
  return (
    this.books.new.availableCopies +
    this.books.fair.availableCopies +
    this.books.poor.availableCopies
  );
});
bookSchema.set("toJSON", { virtuals: true });
bookSchema.set("toObject", { virtuals: true });

const Book = mongoose.models.Book || mongoose.model("Book", bookSchema);
export default Book;

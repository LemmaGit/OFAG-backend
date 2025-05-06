import mongoose from "mongoose";

const bookIssueSchema = new mongoose.Schema({
  patronId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patron",
    required: true,
  },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  bookConditionWhenCheckedout: {
    type: String,
    enum: ["new", "fair", "poor"],
    required: true,
  },
  bookConditionWhenCheckedin: {
    type: String,
    enum: ["new", "fair", "poor", "not checkedin","lost"],
    default: "not checkedin",
  },
  checkoutDate: { type: Date, default: () => Date.now() },
  checkinDate: { type: Date },
  dueDate: {
    type: Date,
    default: () => new Date().getTime() + 3 * 24 * 60 * 60 * 1000,
  },
  checkedoutBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Librarian",
    required: true,
  },
  checkedinBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Librarian",
  },
  renewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Librarian",
  },
  overdueDays: { type: Number, default: 0 },
  newDueDate: { type: Date },
  renewDate: { type: Date },
  overdueFinePerDay: { type: Number, default: 10 },
  bookConditionDowngradeCharge: {
    type: Number,
    default: 0,
  },
  totalFine: {
    type: Number,
    default: function () {
      return (
        this.overdueFinePerDay * this.overdueDays +
        this.bookConditionDowngradeCharge
      );
    },
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid"],
    default: "pending",
  },
});

const BookIssue = mongoose.model("BookIssue", bookIssueSchema);

export default BookIssue;

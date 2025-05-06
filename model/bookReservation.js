import mongoose from "mongoose";
const bookReservationSchema = new mongoose.Schema({
  patronId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patron",
    required: true,
  },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  bookCondition: {
    type: String,
    enum: ["new", "fair", "poor", "unknown"],
    required: true,
  },
  holdDate: {
    type: Date,
    default: () => Date.now(),
  },
  expirationDate: {
    type: Date,
    default: () => new Date(new Date().getTime() + 4 * 24 * 60 * 60 * 1000),
  },
  status: {
    type: String,
    enum: ["active", "expired", "fulfilled", "cancelled"],
    default: "active",
  },
  reservationType: {
    type: String,
    enum: ["hold", "waitlist"],
    default: "hold",
  },
});

const BookReservation = mongoose.model(
  "BookReservation",
  bookReservationSchema
);

export default BookReservation;

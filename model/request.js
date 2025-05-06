import mongoose from "mongoose";

const requestSchema = new mongoose.Schema({
  patronId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patron",
    required: true,
  },
  subject: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  requestDate: { type: Date, default: () => Date.now() },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  isSeen: {
    type: Boolean,
    default: false,
  },
});
const Request = mongoose.model("Request", requestSchema);
export default Request;

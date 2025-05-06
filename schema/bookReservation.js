import Joi from "joi";
import { validator } from "../util/joihelperfun.js";

const bookReservationSchema = Joi.object({
  patronId: Joi.string().hex().length(24).required().messages({
    "string.hex": "Patron ID must be a valid ObjectId.",
  }),
  bookId: Joi.string().hex().length(24).required().messages({
    "string.hex": "Book ID must be a valid ObjectId.",
  }),
  holdDate: Joi.date().default(() => Date.now()),
  expirationDate: Joi.date().default(
    () => new Date(new Date().getTime() + 4 * 24 * 60 * 60 * 1000)
  ),
  // bookCondition: Joi.string()
  //   .valid("new", "fair", "poor", "unknown")
  //   .required(),
  status: Joi.string()
    .valid("active", "expired", "fulfilled", "cancelled")
    .default("active"),
  reservationType: Joi.string().valid("hold", "waitlist").default("hold"),
});

export const validateReservation = validator(bookReservationSchema);

import Joi from "joi";
import { validator } from "../util/joihelperfun.js";

const bookIssueSchema = Joi.object({
  patronId: Joi.string().hex().length(24).required(),
  bookId: Joi.string().hex().length(24).required(),
  bookConditionWhenCheckedout: Joi.string()
    .valid("new", "fair", "poor")
    .required()
    .messages({
      "any.only": "bookCondition must be one of ['new', 'fair', 'poor'].",
    }),
  bookConditionWhenCheckedin: Joi.string()
    .valid("new", "fair", "poor", "not checkedin", "lost")
    .messages({
      "any.only":
        "bookCondition must be one of ['new', 'fair', 'poor', 'not checkedin','lost'].",
    })
    .default("not checkedin"),
  checkoutDate: Joi.date().default(() => Date.now()),
  checkinDate: Joi.date().allow(null),
  dueDate: Joi.date().default(
    () => new Date().getTime() + 3 * 24 * 60 * 60 * 1000
  ),
  checkedoutBy: Joi.string().hex().length(24).required(),
  checkedinBy: Joi.string().hex().length(24).allow(null),
  renewedBy: Joi.string().hex().length(24).allow(null),
  overdueDays: Joi.number().min(0).default(0),
  overdueFinePerDay: Joi.number().min(0).default(10),
  bookConditionDowngradeCharge: Joi.number().default(0),
  totalFine: Joi.number().default((parent) => {
    return (
      parent.overdueFinePerDay * parent.overdueDays +
      parent.bookConditionDowngradeCharge
    );
  }),
  paymentStatus: Joi.string().valid("pending", "paid").default("pending"),
  newDueDate: Joi.date().allow(null),
  renewDate: Joi.date().allow(null),
});

const bookCheckinSchema = Joi.object({
  bookId: Joi.string().hex().length(24).required(),
  patronId: Joi.string().hex().length(24).required(),
  bookConditionWhenCheckedin: Joi.string()
    .valid("new", "fair", "poor", "lost")
    .required()
    .messages({
      "any.only": "bookCondition must be one of ['new', 'fair', 'poor','lost].",
    }),
  checkinDate: Joi.date().default(() => Date.now()),
  checkedinBy: Joi.string().hex().length(24).required(),
});
export const validateCheckinginBook = validator(bookCheckinSchema);
export const validateCheckingoutBook = validator(bookIssueSchema);

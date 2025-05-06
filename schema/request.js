import Joi from "joi";
import { validator } from "../util/joihelperfun.js";

const requestSchema = Joi.object({
  patronId: Joi.string().hex().length(24).required().messages({
    "string.hex": "Patron ID must be a valid ObjectId.",
  }),
  requestDate: Joi.date().default(() => Date.now()),
  status: Joi.string()
    .valid("pending", "approved", "rejected")
    .default("pending"),
  message: Joi.string().max(500).required(),
  subject: Joi.string().max(100).required(),
  isSeen: Joi.boolean().default(false),
});

export const validateRequest = validator(requestSchema);
export default requestSchema;

import Joi from "joi";
import { validator } from "../util/joihelperfun.js";

const IdSchema = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    "string.hex": "ID must be a valid ObjectId.",
  }),
});

export const validateId = validator(IdSchema);

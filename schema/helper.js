import Joi from "joi";
import { validator } from "../util/joihelperfun.js";

export default Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).max(100).required(),
});

const objectIdValidator = (value, helpers) => {
  const regex = /^[0-9a-fA-F]{24}$/;
  if (!regex.test(value)) {
    return helpers.error("any.invalid");
  }
  return value;
};
const mongooseIdScheme = Joi.object({
  id: Joi.string().custom(objectIdValidator, "MongoDB ObjectId").required(),
});

export const validateUserId = validator(mongooseIdScheme);

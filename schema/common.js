import Joi from "joi";
import { validator } from "../util/joihelperfun.js";

const editProfile = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  username: Joi.string().min(3).max(30).required(),
});
export const validateUpdateProfile = validator(editProfile);

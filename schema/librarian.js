import Joi from "joi";
import { validator } from "../util/joihelperfun.js";

const librarianSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).required(),
  lastName: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string()
    .trim()
    .pattern(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/)
    .required(),
  contact: Joi.string().pattern(
    /^(?:(?:\+|00)[1-9]\d{0,3}[-\s]?)?(?:\(?\d{1,4}\)?[-\s]?)?\d{6,14}$/
  ),
  username: Joi.string().trim().min(3).max(30).required(),
  avatar: Joi.string().uri().optional(),
  password: Joi.string().trim().min(6).required(),
  isManager: Joi.boolean().default(false),
  status: Joi.string().default("unverified"),
});
// const editLibrarianSchema = Joi.object({
//   firstName: Joi.string().min(2).max(50).required(),
//   lastName: Joi.string().min(2).max(50).required(),
//   username: Joi.string().min(3).max(30).required(),
// });
// export const validateEditLibrarian = validator(editLibrarianSchema);
export const validateRegisterLibrarian = validator(librarianSchema);
export default librarianSchema;

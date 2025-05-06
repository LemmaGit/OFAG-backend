import Joi from "joi";
import { validator } from "../util/joihelperfun.js";

const patronSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[A-Za-z]+$/)
    .required()
    .messages({
      "string.pattern.base": "Name should only contain letters",
    }),
  lastName: Joi.string()
    .min(2)
    .max(50)
    .pattern(/^[A-Za-z]+$/)
    .required()
    .messages({
      "string.pattern.base": "Name should only contain letters",
    }),
  email: Joi.string().email().required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(8).max(100).required(),
  avatar: Joi.string().uri().optional(),
  status: Joi.string().default("unverified"),
});
// const updateProfile = Joi.object({
//   firstName: Joi.string()
//     .min(2)
//     .max(50)
//     .pattern(/^[A-Za-z]+$/)
//     .required()
//     .messages({
//       "string.pattern.base": "Name should only contain letters",
//     }),
//   lastName: Joi.string()
//     .min(2)
//     .max(50)
//     .pattern(/^[A-Za-z]+$/)
//     .required()
//     .messages({
//       "string.pattern.base": "Name should only contain letters",
//     }),
//   username: Joi.string().alphanum().min(3).max(30).required(),
// });
// export const validateUpdateProfile = validator(updateProfile);
export const validateRegisterPatron = validator(patronSchema);

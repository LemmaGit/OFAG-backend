import Joi from "joi";
import { validator } from "../util/joihelperfun.js";

const uploadedPDFSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  author: Joi.object({
    firstName: Joi.string().min(1).max(100).required(),
    lastName: Joi.string().min(1).max(100).required(),
  }).required(),
  description: Joi.string().min(1).max(1000).required(),
  URL: Joi.string().required(),
  coverImage: Joi.string()
    .uri()
    .default("https://via.placeholder.com/200x300.png?text=Book+Cover"),
  category: Joi.string()
    .valid("fiction", "nonfiction", "periodical", "textbook")
    .required(),
  addedAt: Joi.date().default(() => new Date()),
});

export const validateAddNewPDF = validator(uploadedPDFSchema);

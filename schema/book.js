import Joi from "joi";
import { validator } from "../util/joihelperfun.js";

const addNewBookSchema = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  ISBN: Joi.string()
    .pattern(/^\d{13}$/)
    .length(13)
    .messages({
      "string.pattern.base": "ISBN must be a 13-digit number.",
    })
    .required(),
  author: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
  }).required(),
  publisher: Joi.string().max(100).required(),
  publicationYear: Joi.number()
    .integer()
    .min(1000)
    .max(new Date().getFullYear())
    .required(),
  edition: Joi.string().max(50).required(),
  // callNumber: Joi.string()
  //   .pattern(/^\d+:\d+$/)
  //   .required(),
  description: Joi.string().min(1).max(500).required(),
  isAvailable: Joi.boolean().default(true),
  coverImage: Joi.string().uri().required(),
  borrowCount: Joi.number().integer().min(0).default(0),
  books: Joi.object({
    new: Joi.object({
      copies: Joi.number().integer().min(0).default(0),
      availableCopies: Joi.number().integer().min(0).default(0),
    }),
    fair: Joi.object({
      copies: Joi.number().integer().min(0).default(0),
      availableCopies: Joi.number().integer().min(0).default(0),
    }),
    poor: Joi.object({
      copies: Joi.number().integer().min(0).default(0),
      availableCopies: Joi.number().integer().min(0).default(0),
    }),
  }).required(),
  type: Joi.string().valid("circulation", "reference").required(),
  category: Joi.string()
    .valid("fiction", "nonfiction", "periodical", "textbook")
    .required(),
  status: Joi.string().valid("not available", "available").default("available"),
});

const editBookSchema = Joi.object({
  title: Joi.string().min(2).max(200),
  author: Joi.object({
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
  }),
  publisher: Joi.string().max(100),
  publicationYear: Joi.number()
    .integer()
    .min(1000)
    .max(new Date().getFullYear()),
  edition: Joi.string().max(50),
  description: Joi.string().min(1).max(500),
  coverImage: Joi.string().uri().optional(),
  type: Joi.string().valid("circulation", "reference").required(),
  category: Joi.string()
    .valid("fiction", "nonfiction", "periodical", "textbook")
    .required(),
  books: Joi.object({
    new: Joi.object({
      copies: Joi.number().integer().min(0),
      availableCopies: Joi.number().integer().min(0),
    }),
    fair: Joi.object({
      copies: Joi.number().integer().min(0),
      availableCopies: Joi.number().integer().min(0),
    }),
    poor: Joi.object({
      copies: Joi.number().integer().min(0),
      availableCopies: Joi.number().integer().min(0),
    }),
  }),
});

export const validateAddNewBook = validator(addNewBookSchema);
export const validateEditBook = validator(editBookSchema);

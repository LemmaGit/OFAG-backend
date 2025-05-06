import Joi from "joi";
import { validator } from "../util/joihelperfun.js";

const LibrarySettingSchema = Joi.object({
  loanPeriodDays: Joi.number().default(3),
  renewalPeriodDays: Joi.number().default(2),
  maxRenewals: Joi.number().default(2),
  timeLeftOnDueDateForRenewal: Joi.number().default(6),
  holdPeriodDays: Joi.number().default(4),
  feeNewToFair: Joi.number().default(100),
  feeFairToPoor: Joi.number().default(100),
  feeNewToPoor: Joi.number().default(250),
  feeLostBook: Joi.number().default(500),
  overdueFinePerDay: Joi.number().default(10),
});

export const validateEditSettings = validator(LibrarySettingSchema);

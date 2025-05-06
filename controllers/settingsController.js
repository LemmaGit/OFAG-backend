import AppError from "../error/appError.js";
import Setting from "../model/settings.js";
import { validateEditSettings } from "../schema/settings.js";
import catchAsync from "../util/catchAsync.js";

export const getSettings = catchAsync(async (req, res, next) => {
  const settings = await Setting.findOne().select("-_id -__v");
  if (!settings) {
    return next(new AppError("No settings found", 404));
  }
  res.status(200).json(settings);
});

export const editSettings = catchAsync(async (req, res, next) => {
  const { error, value } = validateEditSettings(req.body);
  if (error) return next(AppError.fromValidationError(error));

  const settings = await Setting.findOneAndUpdate({}, value, { new: true });

  if (!settings) {
    return next(new AppError("Settings not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: { settings },
  });
});

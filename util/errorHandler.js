export const catchAsync = (controller) => (req, res, next) =>
  controller(req, res, next).catch(next);

import AppError from "./appError.js";

export default (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  if (err instanceof AppError) {
    message = JSON.parse(err.message);
  } else if (err.name === "MongoServerError") {
    message = "Database operation failed";
    statusCode = 400;
  } else if (err.name === "CastError") {
    message = "Invalid ID format";
    statusCode = 400;
  }

  if (err.isOperational) {
    return res.status(statusCode).json({
      status: "error",
      message,
    });
  }

  return res.status(500).json({
    status: "error",
    message: "Something went wrong!",
  });
};

export default class AppError extends Error {
  constructor(message, statusCode = 500, name = "Error") {
    super(JSON.stringify(message));
    this.statusCode = statusCode;
    this.name = name;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static fromValidationError(error, lib = "joi") {
    if (lib === "joi" && error.details) {
      const errorDetails = error.details.reduce((acc, err) => {
        acc[err.path[0]] = err.message.replaceAll('"', "");
        return acc;
      }, {});
      return new AppError(
        JSON.stringify(errorDetails),
        400,
        "JoiValidationError"
      );
    }

    if (error.name === "ValidationError" && error.errors) {
      const errorDetails = Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {});
      return new AppError(
        JSON.stringify(errorDetails),
        400,
        "MongooseValidationError"
      );
    }

    const isObject = error instanceof Object;
    return new AppError(
      error.message ||
        (isObject && JSON.stringify(error)) ||
        "Validation error",
      400,
      "CustomValidationError"
    );
  }
}

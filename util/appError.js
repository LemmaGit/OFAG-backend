export class AppError {
  constructor(error, statusCode) {
    // super(message);
    this.message = error.message;
    // this.error = error;
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.errors = error.errors;
    this.type = error.type;
    this.isOperational = true;
  }
}

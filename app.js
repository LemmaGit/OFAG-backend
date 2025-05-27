import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import bookRouter from "./routes/bookRoute.js";
import patronRouter from "./routes/patronRoute.js";
import uploadedBookRouter from "./routes/uploadedBookRoute.js";
import librarianRouter from "./routes/librarianRoute.js";
import "./scheduler/bookHoldExpireDateChecker.js";
import "./scheduler/overdueChecker.js";
import globalErrorHandler from "./error/globalErrorHandler.js";
import { checkAuth, checkToken } from "./controllers/authController.js";
import { loginUser, logout, protect } from "./helpers.js";
import Patron from "./model/patron.js";
import Librarian from "./model/librarian.js";
import settingsRouter from "./routes/settings.js";
import AppError from "./error/appError.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(cookieParser());
app.use(
  cors({
    // origin: "http://localhost:5173",
    origin: "https://ofag-library-frontend.onrender.com",
    credentials: true,
  })
);
app.use(express.json());
app.use(helmet());
app.set("views", path.join(__dirname, "views")); // Points to /views folder
app.set("view engine", "pug");
// Mounted Routes
app.use("/api/books", bookRouter);
app.use("/api/uploaded-books", uploadedBookRouter);
app.use("/api/patrons", patronRouter);
app.use("/api/librarians", librarianRouter);
app.use("/api/settings", settingsRouter);

app.route("/api/login").post(loginUser);
app.route("/api/logout").patch(logout);
app
  .route("/api/check-auth")
  .get(protect([Patron, Librarian], undefined, undefined, true), checkAuth);
app.route("/api/me").get(checkToken);
app.all("*", (req, _, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});
app.use(globalErrorHandler);
export default app;

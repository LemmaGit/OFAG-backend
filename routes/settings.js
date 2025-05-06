import { Router } from "express";
import { protect } from "../helpers.js";
import {
  editSettings,
  getSettings,
} from "../controllers/settingsController.js";
import Librarian from "../model/librarian.js";
const settingsRouter = Router();

settingsRouter.patch(
  "/edit",
  protect(Librarian, ["manager"], true),
  editSettings
);
settingsRouter.get(
  "/",
  protect(Librarian, ["manager", "librarian"]),
  getSettings
);

export default settingsRouter;

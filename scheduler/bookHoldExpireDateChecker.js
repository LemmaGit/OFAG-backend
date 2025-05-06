import cron from "node-cron";
import BookReservation from "../model/bookReservation.js";
cron.schedule("0 0 * * *", async () => {
  try {
    await BookReservation.updateMany(
      { expirationDate: { $lt: new Date() }, status: "active" },
      { $set: { status: "expired" } }
    );
  } catch (error) {
    console.error("Error updating expired holds:", error);
  }
});

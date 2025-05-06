import cron from "node-cron";
import BookIssue from "../model/bookIssue.js";

cron.schedule("0 0 * * *", async () => {
  console.log("Running daily overdue check...");

  try {
    const activeIssues = await BookIssue.find({
      checkinDate: { $exists: false },
    });

    const today = new Date();
    let updatedCount = 0;

    for (const issue of activeIssues) {
      const dueDate = issue.newDueDate || issue.dueDate;

      if (today.getTime() > new Date(dueDate).getTime()) {
        const timeDiff = today.getTime() - new Date(dueDate).getTime();
        const diffDays = Math.floor(timeDiff / (1000 * 3600 * 24));

        issue.overdueDays = diffDays;

        await BookIssue.updateOne(
          { _id: issue._id },
          { $set: { overdueDays: issue.overdueDays } }
        );

        updatedCount++;
        console.log(
          `Updated overdueDays for Issue ID: ${issue._id} by ${diffDays} days`
        );
      }
    }

    console.log(`${updatedCount} issues updated.`);
    console.log("Overdue update completed successfully.");
  } catch (error) {
    console.error("Error running overdue update:", error);
  }
});

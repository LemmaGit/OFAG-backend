import mongoose from "mongoose";
const LibrarySettingSchema = new mongoose.Schema({
  loanPeriodDays: { type: Number, default: 3 },
  renewalPeriodDays: { type: Number, default: 2 },
  maxRenewals: { type: Number, default: 2 },
  timeLeftOnDueDateForRenewal: { type: Number, default: 6 },
  holdPeriodDays: { type: Number, default: 4 },
  feeNewToFair: { type: Number, default: 100 },
  feeFairToPoor: { type: Number, default: 100 },
  feeNewToPoor: { type: Number, default: 250 },
  feeLostBook: { type: Number, default: 500 },
  overdueFinePerDay: { type: Number, default: 10 },
});

const Setting = mongoose.model("Setting", LibrarySettingSchema);
export default Setting;

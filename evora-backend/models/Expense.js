const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    eventId:    { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
    title:      { type: String, required: true, trim: true },
    category:   { type: String, default: "Miscellaneous" },
    amount:     { type: Number, required: true },
    status:     { type: String, enum: ["Paid", "Pending", "Cancelled"], default: "Paid" },
    vendorName: { type: String, default: "" },
    notes:      { type: String, default: "" },
    date:       { type: String, default: () => new Date().toISOString().split("T")[0] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", expenseSchema);

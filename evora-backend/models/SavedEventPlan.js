const mongoose = require("mongoose");

const planServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: "" },
    reason: { type: String, default: "" },
    estimatedCost: { type: Number, default: 0 },
  },
  { _id: false }
);

const planScheduleItemSchema = new mongoose.Schema(
  {
    time: { type: String, default: "" },
    title: { type: String, required: true, trim: true },
    details: { type: String, default: "" },
  },
  { _id: false }
);

const planBudgetItemSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true },
    amount: { type: Number, default: 0 },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const savedEventPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    prompt: { type: String, required: true, trim: true },
    eventTitle: { type: String, required: true, trim: true },
    eventType: { type: String, required: true, trim: true },
    eventCategory: { type: String, default: "Other", trim: true },
    date: { type: String, default: "" },
    time: { type: String, default: "" },
    location: { type: String, default: "" },
    venue: { type: String, default: "" },
    guestCount: { type: Number, default: 0 },
    budget: { type: Number, default: 0 },
    suggestedTheme: { type: String, default: "" },
    description: { type: String, default: "" },
    suggestedServices: [planServiceSchema],
    schedule: [planScheduleItemSchema],
    budgetDistribution: [planBudgetItemSchema],
    preparationRecommendations: [{ type: String }],
    disclaimer: {
      type: String,
      default:
        "This AI-generated blueprint is an editable planning guide. No events or vendor bookings are created or confirmed automatically.",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SavedEventPlan", savedEventPlanSchema);

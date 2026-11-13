const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema(
  {
    item: { type: String, required: true, trim: true },
    servings: { type: Number, default: 0 },
    quantityEstimate: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const savedFoodMenuSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    eventType: { type: String, default: "Wedding" },
    guestCount: { type: Number, required: true },
    budget: { type: Number, default: 0 },
    foodPreference: { type: String, default: "Vegetarian" },
    mealType: { type: String, default: "Dinner" },
    dietaryRestrictions: { type: String, default: "" },
    location: { type: String, default: "" },
    welcomeDrinks: [menuItemSchema],
    starters: [menuItemSchema],
    mainCourse: [menuItemSchema],
    sideDishes: [menuItemSchema],
    desserts: [menuItemSchema],
    dietaryAlternatives: [
      {
        restrictionOrAllergy: { type: String, default: "" },
        substituteItem: { type: String, default: "" },
        notes: { type: String, default: "" },
      },
    ],
    estimatedTotalCost: { type: Number, default: 0 },
    costPerGuest: { type: Number, default: 0 },
    costAssumptions: [{ type: String }],
    wasteReductionTips: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("SavedFoodMenu", savedFoodMenuSchema);

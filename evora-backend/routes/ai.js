const express = require("express");
const router = express.Router();
const {
  chatAssistant,
  budgetAssistant,
  foodRecommendations,
  getSavedFoodMenus,
  saveFoodMenu,
  updateSavedFoodMenu,
  deleteSavedFoodMenu,
  invitationGenerator,
  checklistGenerator,
  getSavedChecklists,
  saveChecklist,
  updateSavedChecklist,
  deleteSavedChecklist,
  generatePlan,
  getSavedPlans,
  saveEventPlan,
  updateSavedEventPlan,
  deleteSavedEventPlan,
  volunteerMatch,
  scheduleGenerator,
  reviewSummary,
  postEventReport,
} = require("../controllers/aiController");
const { protect, authorize } = require("../middleware/auth");

router.use(protect);
router.use(authorize("user", "admin"));

// Core 6 EVORA AI Features
router.post("/chat", chatAssistant);
router.post("/budget", budgetAssistant);
router.post("/food", foodRecommendations);
router.get("/food", getSavedFoodMenus);
router.post("/food/save", saveFoodMenu);
router.put("/food/:id", updateSavedFoodMenu);
router.delete("/food/:id", deleteSavedFoodMenu);
router.post("/invitation", invitationGenerator);
router.post("/checklist", checklistGenerator);
router.get("/checklist", getSavedChecklists);
router.post("/checklist/save", saveChecklist);
router.put("/checklist/:id", updateSavedChecklist);
router.delete("/checklist/:id", deleteSavedChecklist);
router.post("/plan", generatePlan);
router.get("/plan", getSavedPlans);
router.post("/plan/save", saveEventPlan);
router.put("/plan/:id", updateSavedEventPlan);
router.delete("/plan/:id", deleteSavedEventPlan);

// Operational platform helpers
router.post("/volunteer-match", volunteerMatch);
router.post("/schedule", scheduleGenerator);
router.post("/review-summary", reviewSummary);
router.post("/post-event", postEventReport);

module.exports = router;

const express = require("express");
const router = express.Router();
const {
  getVolunteerDashboard,
  applyForEvent,
  withdrawApplication,
  updateTaskStatus,
  decideApplication,
} = require("../controllers/volunteerController");
const { protect, restrictTo } = require("../middleware/auth");

router.use(protect);

router.get("/dashboard", restrictTo("volunteer", "admin"), getVolunteerDashboard);
router.post("/events/:eventId/apply", restrictTo("volunteer"), applyForEvent);
router.post("/applications/:id/withdraw", restrictTo("volunteer"), withdrawApplication);
router.put("/tasks/:taskId/status", restrictTo("volunteer", "admin"), updateTaskStatus);
router.put("/applications/:id/decide", restrictTo("user", "admin"), decideApplication);

module.exports = router;

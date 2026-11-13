const express = require("express");
const router = express.Router();
const { createTask, getTasks, updateTaskStatus, deleteTask } = require("../controllers/taskController");
const { protect, authorize } = require("../middleware/auth");

router.use(protect);

router.route("/").get(getTasks).post(authorize("admin"), createTask);
router.put("/:id/status", updateTaskStatus);
router.delete("/:id", authorize("admin"), deleteTask);

module.exports = router;

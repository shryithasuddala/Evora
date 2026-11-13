const express = require("express");
const router = express.Router();
const { createService, getServices, getService, updateService, deleteService } = require("../controllers/serviceController");
const { protect, authorize } = require("../middleware/auth");

router.use(protect);

router.route("/").get(getServices).post(authorize("vendor", "admin"), createService);
router.route("/:id").get(getService).put(authorize("vendor", "admin"), updateService).delete(authorize("vendor", "admin"), deleteService);

module.exports = router;

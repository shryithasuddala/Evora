const express = require("express");
const router = express.Router();
const { createReview, getReviews } = require("../controllers/reviewController");
const { protect, authorize } = require("../middleware/auth");

router.use(protect);

router.route("/").get(getReviews).post(authorize("user", "admin"), createReview);

module.exports = router;

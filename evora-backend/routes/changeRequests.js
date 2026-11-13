const express = require("express");
const router = express.Router();
const {
  createChangeRequest,
  getMyChangeRequests,
  decideChangeRequest,
} = require("../controllers/changeRequestController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.post("/", createChangeRequest);
router.get("/", getMyChangeRequests);
router.put("/:id/decide", decideChangeRequest);

module.exports = router;

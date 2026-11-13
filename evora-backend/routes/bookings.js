const express = require("express");
const router = express.Router();
const {
  createBooking,
  getBookings,
  getBooking,
  updateStatus,
  respondToRequest,
  sendProposal,
  getProposal,
  deleteBooking,
  cancelBooking,
} = require("../controllers/bookingController");
const { protect, authorize } = require("../middleware/auth");

router.use(protect);

router.route("/")
  .get(getBookings)
  .post(authorize("user", "admin", "vendor", "volunteer"), createBooking);

router.route("/:id")
  .get(getBooking)
  .delete(authorize("user", "admin"), deleteBooking);

router.route("/:id/respond")
  .put(authorize("vendor"), respondToRequest)
  .post(authorize("vendor"), respondToRequest);
router.put("/:id/status", updateStatus);
router.put("/:id/cancel", cancelBooking);
router.route("/:id/proposal")
  .get(getProposal)
  .post(authorize("vendor", "admin"), sendProposal);

module.exports = router;

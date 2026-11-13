const express = require("express");
const router = express.Router();
const { createExpense, getExpenses, deleteExpense } = require("../controllers/expenseController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.route("/").get(getExpenses).post(createExpense);
router.delete("/:id", deleteExpense);

module.exports = router;

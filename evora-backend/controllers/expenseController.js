const Expense = require("../models/Expense");
const Event = require("../models/Event");

// @desc    Add expense to event
// @route   POST /api/expenses
// @access  Private (user)
exports.createExpense = async (req, res, next) => {
  try {
    const { eventId, title, category, amount, status, vendorName, date } = req.body;
    if (!eventId || !title || !amount) {
      return res.status(400).json({ success: false, message: "eventId, title, and amount are required." });
    }

    // Verify event ownership
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });
    if (String(event.organizerId) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const expense = await Expense.create({
      eventId, title, category: category || "Miscellaneous",
      amount: Number(amount), status: status || "Paid",
      vendorName: vendorName || "", date: date || new Date().toISOString().split("T")[0],
    });

    res.status(201).json({ success: true, expense });
  } catch (err) { next(err); }
};

// @desc    Get expenses for an event
// @route   GET /api/expenses?eventId=xxx
// @access  Private
exports.getExpenses = async (req, res, next) => {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ success: false, message: "eventId query param required." });
    const expenses = await Expense.find({ eventId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: expenses.length, expenses });
  } catch (err) { next(err); }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
exports.deleteExpense = async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id).populate("eventId");
    if (!expense) return res.status(404).json({ success: false, message: "Expense not found." });

    if (String(expense.eventId.organizerId) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }
    await expense.deleteOne();
    res.status(200).json({ success: true, message: "Expense deleted." });
  } catch (err) { next(err); }
};

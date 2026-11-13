const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const { startWhatsAppQueueWorker } = require("./services/whatsappService");
const { startReminderScheduler } = require("./services/reminderService");

// Route imports
const authRoutes          = require("./routes/auth");
const eventRoutes         = require("./routes/events");
const serviceRoutes       = require("./routes/services");
const bookingRoutes       = require("./routes/bookings");
const expenseRoutes       = require("./routes/expenses");
const taskRoutes          = require("./routes/tasks");
const reviewRoutes        = require("./routes/reviews");
const notificationRoutes  = require("./routes/notifications");
const adminRoutes         = require("./routes/admin");
const aiRoutes            = require("./routes/ai");
const charityRoutes       = require("./routes/charity");
const paymentRoutes       = require("./routes/payments");
const availabilityRoutes  = require("./routes/availability");
const volunteerRoutes     = require("./routes/volunteers");
const guestRoutes         = require("./routes/guests");
const changeRequestRoutes = require("./routes/changeRequests");

const app = express();

// Connect to MongoDB
connectDB();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: true, // Allow all origins in local dev (localhost, 127.0.0.1, any port)
  credentials: true,
}));
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  },
}));
app.use(express.urlencoded({ extended: false }));

// Static uploads directory (for documents/receipts if needed)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── API Routes ──────────────────────────────────────────────────────────────
app.use("/api/auth",            authRoutes);
app.use("/api/events",          eventRoutes);
app.use("/api/services",        serviceRoutes);
app.use("/api/bookings",        bookingRoutes);
app.use("/api/expenses",        expenseRoutes);
app.use("/api/tasks",           taskRoutes);
app.use("/api/reviews",         reviewRoutes);
app.use("/api/notifications",   notificationRoutes);
app.use("/api/admin",           adminRoutes);
app.use("/api/ai",              aiRoutes);
app.use("/api/charity",         charityRoutes);
app.use("/api/payments",        paymentRoutes);
app.use("/api/availability",    availabilityRoutes);
app.use("/api/volunteers",      volunteerRoutes);
app.use("/api/guests",          guestRoutes);
app.use("/api/change-requests", changeRequestRoutes);

// ── Health check (Supports both /api/health and Render default /healthz) ───
app.get(["/api/health", "/healthz"], (req, res) => {
  res.json({ success: true, message: "EVORA API is running 🎉", env: process.env.NODE_ENV });
});

// ── Serve Frontend Production Build (Single-Service Deployment fallback) ───
const fs = require("fs");
const frontendDist = path.join(__dirname, "../evora-frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// ── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 EVORA Backend running on http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
  startWhatsAppQueueWorker();
  startReminderScheduler();
});

module.exports = app;

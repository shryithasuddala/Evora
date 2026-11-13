const mongoose = require("mongoose");
const Event = require("../models/Event");
const Booking = require("../models/Booking");
const Task = require("../models/Task");
const { emitNotification } = require("./notificationService");

let reminderInterval = null;

/**
 * Dispatches reminders for an upcoming event to the host, confirmed vendors, and assigned volunteers.
 * Uses idempotency keys so duplicate reminders are never sent for the same event/date window.
 */
async function sendEventReminderForEvent(event, windowLabel = "upcoming") {
  if (!event || ["Cancelled", "Completed"].includes(event.status)) return 0;

  let dispatched = 0;
  const eventId = event._id;
  const dateStr = event.date || "upcoming date";
  const venueStr = event.venue || event.location || "EVORA Portal";

  // 1. Host reminder
  if (event.organizerId) {
    const organizerId = event.organizerId._id || event.organizerId;
    const res = await emitNotification({
      userId: organizerId,
      type: "info",
      title: `Event Reminder: ${event.title} ⏰`,
      message: `Reminder: Your celebration "${event.title}" is scheduled for ${dateStr}${event.time ? ` at ${event.time}` : ""} (${venueStr}). Check your checklist and vendor schedule in EVORA.`,
      link: `/user/events/${eventId}`,
      idempotencyKey: `event-reminder:${eventId}:${windowLabel}:host:${organizerId}`,
      eventId,
      eventName: event.title,
      templateKey: "EVENT_REMINDER",
    });
    if (res && !res.duplicatePrevented) dispatched++;
  }

  // 2. Confirmed/Accepted vendor reminders
  const bookings = await Booking.find({
    eventId,
    status: { $in: ["Accepted", "Accepted by Vendor", "Confirmed", "Confirmed by Admin"] },
  }).select("vendorId serviceCategory serviceName");

  const notifiedVendors = new Set();
  for (const b of bookings) {
    const vId = String(b.vendorId);
    if (notifiedVendors.has(vId)) continue;
    notifiedVendors.add(vId);

    const res = await emitNotification({
      userId: b.vendorId,
      type: "info",
      title: `Upcoming Service Reminder: ${event.title} ⏰`,
      message: `Reminder: You are scheduled for ${b.serviceCategory || b.serviceName || "service"} at "${event.title}" on ${dateStr}${event.time ? ` at ${event.time}` : ""} (${venueStr}).`,
      link: "/vendor/bookings",
      idempotencyKey: `event-reminder:${eventId}:${windowLabel}:vendor:${vId}`,
      eventId,
      eventName: event.title,
      bookingId: b._id,
      templateKey: "VENDOR_REMINDER",
    });
    if (res && !res.duplicatePrevented) dispatched++;
  }

  // 3. Assigned volunteer reminders
  const tasks = await Task.find({ eventId, status: { $ne: "Completed" } }).select("volunteerId title");
  const notifiedVolunteers = new Set();
  for (const t of tasks) {
    const volId = String(t.volunteerId);
    if (notifiedVolunteers.has(volId)) continue;
    notifiedVolunteers.add(volId);

    const res = await emitNotification({
      userId: t.volunteerId,
      type: "info",
      title: `Volunteer Duty Reminder: ${event.title} ⏰`,
      message: `Reminder: You have upcoming volunteer duties for "${event.title}" on ${dateStr}${event.time ? ` at ${event.time}` : ""} (${venueStr}).`,
      link: "/volunteer/tasks",
      idempotencyKey: `event-reminder:${eventId}:${windowLabel}:volunteer:${volId}`,
      eventId,
      eventName: event.title,
      templateKey: "VOLUNTEER_REMINDER",
    });
    if (res && !res.duplicatePrevented) dispatched++;
  }

  return dispatched;
}

/**
 * Scans events occurring within the next 48 hours and dispatches idempotent reminders.
 */
async function runUpcomingEventReminders() {
  if (mongoose.connection.readyState !== 1) return 0;

  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const todayStr = now.toISOString().split("T")[0];
  const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const dayAfterStr = in48h.toISOString().split("T")[0];

  const events = await Event.find({
    date: { $in: [todayStr, tomorrowStr, dayAfterStr] },
    status: { $nin: ["Cancelled", "Completed"] },
  });

  let total = 0;
  for (const ev of events) {
    total += await sendEventReminderForEvent(ev, ev.date);
  }
  return total;
}

function startReminderScheduler(intervalMs = 60 * 60 * 1000) {
  if (reminderInterval) return;
  reminderInterval = setInterval(() => {
    runUpcomingEventReminders().catch((err) =>
      console.warn("Reminder scheduler error:", err.message)
    );
  }, intervalMs);
  if (typeof reminderInterval.unref === "function") {
    reminderInterval.unref();
  }
}

module.exports = {
  sendEventReminderForEvent,
  runUpcomingEventReminders,
  startReminderScheduler,
};

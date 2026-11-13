const Task = require("../models/Task");
const Event = require("../models/Event");
const { emitNotification, notifyAdmins } = require("../services/notificationService");

// @desc    Create / assign task to volunteer
// @route   POST /api/tasks
// @access  Private (admin)
exports.createTask = async (req, res, next) => {
  try {
    const { volunteerId, eventId, eventName, title, description, location, date, time, priority } = req.body;
    if (!volunteerId || !title) {
      return res.status(400).json({ success: false, message: "volunteerId and title are required." });
    }
    const task = await Task.create({
      volunteerId, eventId, eventName: eventName || "", title,
      description: description || "", location: location || "",
      date: date || "", time: time || "",
      priority: priority || "Medium",
      assignedBy: req.user._id,
    });

    // Single deduplicated notification (in-app + automated WhatsApp if opted in)
    emitNotification({
      userId: volunteerId,
      type: "info",
      title: "New Duty Assignment Assigned 🤝",
      message: `You have been dispatched to duty "${title}" for celebration "${eventName || "Event Operations"}" scheduled on ${date || "upcoming date"}${time ? ` at ${time}` : ""} (${location || "assigned venue"}). Priority: ${priority || "Normal"}.`,
      link: `/volunteer/tasks`,
      idempotencyKey: `task-assigned:${task._id}:volunteer:${volunteerId}`,
      eventId: eventId || null,
      eventName: eventName || "",
      templateKey: "VOLUNTEER_DUTY_ASSIGNED",
    }).catch((err) => console.warn("Volunteer duty notification notice:", err.message));

    res.status(201).json({ success: true, task });
  } catch (err) { next(err); }
};

// @desc    Get tasks (volunteer sees own; admin sees all)
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res, next) => {
  try {
    let filter = {};
    if (req.user.role === "volunteer") filter.volunteerId = req.user._id;
    if (req.query.volunteerId) filter.volunteerId = req.query.volunteerId;
    if (req.query.eventId) filter.eventId = req.query.eventId;
    if (req.query.status) filter.status = req.query.status;

    const tasks = await Task.find(filter)
      .populate("volunteerId", "fullName email")
      .populate("eventId", "title date venue")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: tasks.length, tasks });
  } catch (err) { next(err); }
};

// @desc    Update task status (volunteer updates own task)
// @route   PUT /api/tasks/:id/status
// @access  Private
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { status, reportNote, date, time, location } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found." });

    const isOwner = String(task.volunteerId) === String(req.user._id);
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const scheduleChanged =
      (date !== undefined && date !== task.date) ||
      (time !== undefined && time !== task.time) ||
      (location !== undefined && location !== task.location);
    const statusChanged = Boolean(status && status !== task.status);

    if (status) task.status = status;
    if (reportNote !== undefined) task.reportNote = reportNote;
    if (date !== undefined) task.date = date;
    if (time !== undefined) task.time = time;
    if (location !== undefined) task.location = location;
    if (status === "Completed" || status === "Done") {
      task.completedAt = new Date();
    }
    await task.save();

    const stamp = Date.now();
    // Notify volunteer if admin updated schedule or task
    if (req.user.role === "admin" && (scheduleChanged || statusChanged)) {
      emitNotification({
        userId: task.volunteerId,
        type: "warning",
        title: scheduleChanged ? `Duty Schedule Changed: ${task.title} 📅` : `Task Status Updated: ${task.title}`,
        message: scheduleChanged
          ? `Your duty "${task.title}" (${task.eventName || "Event"}) schedule changed to ${task.date || "TBD"} ${task.time || ""} at ${task.location || "assigned venue"}.`
          : `Admin updated task "${task.title}" status to ${task.status}.`,
        link: "/volunteer/tasks",
        idempotencyKey: `task-updated:${task._id}:${stamp}:volunteer:${task.volunteerId}`,
        eventId: task.eventId || null,
        eventName: task.eventName || "",
      }).catch(() => {});
    }

    // Notify admins & organizer on important task updates from volunteer
    if (statusChanged && isOwner) {
      notifyAdmins({
        type: task.status === "Completed" ? "success" : "info",
        title: `Volunteer Task ${task.status}: ${task.title}`,
        message: `${req.user.fullName} updated task "${task.title}" (${task.eventName || "Event"}) to ${task.status}.${reportNote ? ` Note: ${reportNote}` : ""}`,
        link: "/admin/volunteers",
        idempotencyPrefix: `task-status:${task._id}:${task.status}:${stamp}`,
        eventId: task.eventId || null,
        eventName: task.eventName || "",
      }).catch(() => {});

      if (task.eventId) {
        const ev = await Event.findById(task.eventId).select("organizerId title");
        if (ev?.organizerId) {
          emitNotification({
            userId: ev.organizerId,
            type: task.status === "Completed" ? "success" : "info",
            title: `Volunteer Task Update: ${task.title}`,
            message: `Volunteer ${req.user.fullName} marked "${task.title}" for "${ev.title}" as ${task.status}.`,
            link: `/user/events/${ev._id}`,
            idempotencyKey: `task-status:${task._id}:${task.status}:${stamp}:user:${ev.organizerId}`,
            eventId: ev._id,
            eventName: ev.title,
          }).catch(() => {});
        }
      }
    }

    res.status(200).json({ success: true, task });
  } catch (err) { next(err); }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private (admin)
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found." });
    await task.deleteOne();
    res.status(200).json({ success: true, message: "Task deleted." });
  } catch (err) { next(err); }
};

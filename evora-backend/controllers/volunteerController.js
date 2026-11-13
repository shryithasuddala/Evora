const User = require("../models/User");
const Event = require("../models/Event");
const Task = require("../models/Task");
const VolunteerApplication = require("../models/VolunteerApplication");
const { emitNotification, notifyAdmins } = require("../services/notificationService");

const TASK_TEMPLATES = {
  Wedding: [
    { title: "Guest Reception & Welcome Desk", description: "Stationed at main foyer. Welcome guests and distribute floral favors.", priority: "High" },
    { title: "Stage Hospitality & Ceremony Coordination", description: "Backstage coordination for garland exchange and gift registry.", priority: "High" },
    { title: "Banquet Flow & Seating Assistance", description: "Assist elders and families to designated reserved seating areas.", priority: "Medium" },
    { title: "Surplus Food Clearance & Charity Audit", description: "Coordinate with EVORA NGO partners for post-banquet food packaging.", priority: "High" },
  ],
  Corporate: [
    { title: "Delegate Registration & RFID Badge Issuance", description: "Verify QR invitations and issue VIP delegate kits.", priority: "High" },
    { title: "Keynote Audio-Visual & Roaming Mic Runner", description: "Support panel moderators with audience Q&A cordless microphones.", priority: "Medium" },
    { title: "Breakout Room Session Timekeeping", description: "Manage speaker timing displays and workshop materials.", priority: "Medium" },
  ],
  College: [
    { title: "Security Gate Pass & Crowd Management", description: "Manage orderly student queueing and ticket verification.", priority: "High" },
    { title: "Main Stage Light & Sound Logistics", description: "Assist backstage tech crew with musical gear and cable runs.", priority: "High" },
    { title: "Green Room & Artist Hospitality", description: "Ensure performance artists have refreshments and schedule briefings.", priority: "Medium" },
  ],
  Default: [
    { title: "Guest Guidance & Station Ushering", description: "Direct arriving guests to reception lounges and seating sections.", priority: "Medium" },
    { title: "Event Material Arrangement & Setup", description: "Coordinate program cards, stage favors, and vendor access credentials.", priority: "Medium" },
    { title: "Surplus Food Audit & NGO Handover", description: "Coordinate safe packaging of surplus catering for local community partners.", priority: "High" },
  ],
};

// @desc    Get volunteer dashboard summary (Available events, applications, real tasks)
// @route   GET /api/volunteers/dashboard
// @access  Private (volunteer)
exports.getVolunteerDashboard = async (req, res, next) => {
  try {
    const volunteerId = req.user._id;

    // 1. Applications submitted by this volunteer
    const applications = await VolunteerApplication.find({ volunteerId })
      .populate("eventId", "title category date time venue location")
      .sort({ appliedAt: -1 });

    const appliedEventIds = applications.map((a) => String(a.eventId?._id || a.eventId));

    // 2. Events that need volunteers where this volunteer hasn't applied yet
    const availableEvents = await Event.find({
      volunteersNeeded: { $gt: 0 },
      _id: { $nin: appliedEventIds },
      status: { $in: ["Planning", "Confirmed"] },
    })
      .select("title category date time venue location volunteersNeeded volunteerRoles")
      .sort({ date: 1 })
      .limit(10);

    // 3. Real assigned tasks
    const tasks = await Task.find({ volunteerId }).sort({ createdAt: -1 });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "Completed" || t.status === "Done").length;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.status(200).json({
      success: true,
      volunteer: {
        id: req.user._id,
        fullName: req.user.fullName,
        volunteerId: req.user.volunteerId || "EVO-VOL-PENDING",
        verificationStatus: req.user.verificationStatus || "Pending",
        rejectionReason: req.user.rejectionReason || "",
        city: req.user.city || "",
        skills: req.user.skills || [],
      },
      availableEvents,
      applications,
      tasks,
      stats: {
        totalTasks,
        completedTasks,
        taskCompletionRate,
        appliedCount: applications.length,
        selectedCount: applications.filter((a) => a.status === "Selected").length,
      },
    });
  } catch (err) { next(err); }
};

// @desc    Apply for an event
// @route   POST /api/volunteers/apply
// @access  Private (volunteer)
exports.applyForEvent = async (req, res, next) => {
  try {
    const { eventId, message = "" } = req.body;
    if (!eventId) return res.status(400).json({ success: false, message: "eventId is required." });

    if (req.user.verificationStatus !== "Approved") {
      return res.status(403).json({
        success: false,
        message: "Your volunteer credential is currently pending administrative verification. You can apply once approved.",
      });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: "Event not found." });

    const existing = await VolunteerApplication.findOne({ eventId, volunteerId: req.user._id });
    if (existing) {
      return res.status(400).json({ success: false, message: "You have already applied for this event." });
    }

    const application = await VolunteerApplication.create({
      eventId,
      volunteerId: req.user._id,
      message,
      status: "Applied",
    });

    emitNotification({
      userId: event.organizerId,
      type: "info",
      title: "New Volunteer Application 🤝",
      message: `${req.user.fullName} (${req.user.volunteerId}) applied to support celebration "${event.title}".`,
      link: `/user/events/${event._id}`,
    });

    res.status(201).json({ success: true, application, message: "Application submitted successfully." });
  } catch (err) { next(err); }
};

// @desc    Withdraw application
// @route   DELETE /api/volunteers/applications/:id
// @access  Private (volunteer)
exports.withdrawApplication = async (req, res, next) => {
  try {
    const application = await VolunteerApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ success: false, message: "Application not found." });

    if (String(application.volunteerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    await application.deleteOne();
    res.status(200).json({ success: true, message: "Application withdrawn." });
  } catch (err) { next(err); }
};

// @desc    Update task status (Assigned -> In Progress -> Completed)
// @route   PUT /api/volunteers/tasks/:id/status
// @access  Private (volunteer)
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { status, reportNote } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found." });

    if (String(task.volunteerId) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const previousStatus = task.status;
    task.status = status;
    if (reportNote) task.reportNote = reportNote;
    if (status === "Completed" || status === "Done") {
      task.completedAt = new Date();
    }
    await task.save();

    if (status && status !== previousStatus) {
      const stamp = Date.now();
      notifyAdmins({
        type: status === "Completed" || status === "Done" ? "success" : "info",
        title: `Volunteer Task Update: ${task.title}`,
        message: `${req.user.fullName} updated task "${task.title}" (${task.eventName || "Event"}) to ${status}.`,
        link: "/admin/volunteers",
        idempotencyPrefix: `vol-task-status:${task._id}:${status}:${stamp}`,
        eventId: task.eventId || null,
        eventName: task.eventName || "",
      }).catch(() => {});

      if (task.eventId) {
        const ev = await Event.findById(task.eventId).select("organizerId title");
        if (ev?.organizerId) {
          emitNotification({
            userId: ev.organizerId,
            type: status === "Completed" || status === "Done" ? "success" : "info",
            title: `Volunteer Duty Update: ${task.title}`,
            message: `${req.user.fullName} marked duty "${task.title}" for "${ev.title}" as ${status}.`,
            link: `/user/events/${ev._id}`,
            idempotencyKey: `vol-task-status:${task._id}:${status}:${stamp}:user:${ev.organizerId}`,
            eventId: ev._id,
            eventName: ev.title,
          }).catch(() => {});
        }
      }
    }

    res.status(200).json({ success: true, task });
  } catch (err) { next(err); }
};

// @desc    Admin selects or rejects an applicant for an event
// @route   PUT /api/volunteers/applications/:id/decision
// @access  Private (admin or event organizer)
exports.decideApplication = async (req, res, next) => {
  try {
    const { decision } = req.body; // "Selected" | "Rejected"
    if (!["Selected", "Rejected"].includes(decision)) {
      return res.status(400).json({ success: false, message: "decision must be 'Selected' or 'Rejected'." });
    }

    const application = await VolunteerApplication.findById(req.params.id)
      .populate("volunteerId", "fullName email phone volunteerId")
      .populate("eventId", "title category date time venue organizerId");

    if (!application) return res.status(404).json({ success: false, message: "Application not found." });

    application.status = decision;
    application.decidedAt = new Date();
    await application.save();

    // If Selected, auto-generate dynamic tasks from category template
    if (decision === "Selected" && application.eventId) {
      const cat = application.eventId.category || "Default";
      const key = cat.includes("Wedding") ? "Wedding" : cat.includes("Corporate") ? "Corporate" : cat.includes("College") ? "College" : "Default";
      const templates = TASK_TEMPLATES[key] || TASK_TEMPLATES.Default;

      for (const tpl of templates) {
        await Task.create({
          volunteerId: application.volunteerId._id,
          eventId: application.eventId._id,
          eventName: application.eventId.title,
          title: tpl.title,
          description: tpl.description,
          location: application.eventId.venue || "Event Station",
          date: application.eventId.date,
          time: application.eventId.time || "09:00",
          priority: tpl.priority,
          status: "Assigned",
          assignedBy: req.user._id,
        });
      }
    }

    emitNotification({
      userId: application.volunteerId._id,
      type: decision === "Selected" ? "success" : "warning",
      title: decision === "Selected" ? "New Duty Assignment: Assigned to Celebration! 🎉" : "Application Status Update",
      message: decision === "Selected"
        ? `Congratulations! You have been selected for "${application.eventId.title}" on ${application.eventId.date}. Your duty task roster has been generated.`
        : `Your application for "${application.eventId.title}" was not selected. Check other celebrations looking for support!`,
      link: "/volunteer/tasks",
      idempotencyKey: `vol-app-decision:${application._id}:${decision}`,
      eventId: application.eventId?._id || null,
      eventName: application.eventId?.title || "",
      templateKey: "VOLUNTEER_DUTY_ASSIGNED",
    }).catch(() => {});

    res.status(200).json({ success: true, application, message: `Volunteer ${decision.toLowerCase()} successfully.` });
  } catch (err) { next(err); }
};

// Export template map for AI matching
exports.TASK_TEMPLATES = TASK_TEMPLATES;

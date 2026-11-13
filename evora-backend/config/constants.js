// Shared Service Categories for EVORA
const SERVICE_CATEGORIES = [
  "Venue & Halls",
  "Catering",
  "Decoration",
  "Photography & Videography",
  "Sound & DJ",
  "Transportation",
  "Security",
  "Printing",
  "Live Streaming",
  "Makeup & Styling",
  "Event Coordination",
];

// Service-level statuses in Event.requestedServices
const SERVICE_STATUSES = [
  "Requested",
  "Vendor Search in Progress",
  "Awaiting Vendor Response",
  "Accepted by Vendor",
  "Confirmed",
  "Unavailable",
  "Alternative Search Requested",
  "Cancelled by User",
];

// Event-level statuses (supporting both new coordination workflow & legacy compatibility)
const EVENT_STATUSES = [
  "Draft",
  "Submitted",
  "Coordination in Progress",
  "Partially Confirmed",
  "Confirmed",
  "Cancelled",
  "Completed",
  // Legacy status support
  "Pending Approval",
  "Approved",
  "Planning",
];

const PLAN_STATUSES = ["Draft", "Saved", "Booked"];

const BOOKING_STATUSES = [
  "Pending",
  "Proposal Sent",
  "Accepted",
  "Accepted by Vendor",
  "Declined",
  "Declined by Vendor",
  "Rejected",
  "Confirmed",
  "Confirmed by Admin",
  "Completed",
  "Cancelled",
];

module.exports = {
  SERVICE_CATEGORIES,
  SERVICE_STATUSES,
  EVENT_STATUSES,
  PLAN_STATUSES,
  BOOKING_STATUSES,
};

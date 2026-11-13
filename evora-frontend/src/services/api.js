/**
 * EVORA API Service Layer
 * All functions return resolved data (not response objects).
 * Pages import from here — no direct axios calls needed.
 */

import apiClient from "./apiClient";

// ─────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────

export const authAPI = {
  login: async (email, password, role, skipOtp = false) => {
    const { data } = await apiClient.post("/auth/login", { email, password, role, skipOtp });
    return data; // { success, requireOtp, message, email, demoOtp, token, user }
  },
  sendOtp: async (email, role) => {
    const { data } = await apiClient.post("/auth/send-otp", { email, role });
    return data; // { success, message, demoOtp }
  },
  verifyOtp: async (email, otp, role) => {
    const { data } = await apiClient.post("/auth/verify-otp", { email, otp, role });
    return data; // { success, token, user }
  },
  register: async (userData) => {
    const { data } = await apiClient.post("/auth/register", userData);
    return data; // { success, token, user }
  },
  requestRegisterOtp: async (userData) => {
    const { data } = await apiClient.post("/auth/register-otp", userData);
    return data; // { success, message, email, demoOtp }
  },
  verifyRegisterOtp: async (email, otp) => {
    const { data } = await apiClient.post("/auth/verify-register-otp", { email, otp });
    return data; // { success, token, user }
  },
  resetPassword: async (payload) => {
    const { data } = await apiClient.post("/auth/reset-password", payload);
    return data; // { success, message }
  },
  getMe: async () => {
    const { data } = await apiClient.get("/auth/me");
    return data.user;
  },
  updateMe: async (fields) => {
    const { data } = await apiClient.put("/auth/me", fields);
    return data.user;
  },
};

// ─────────────────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────────────────

export const eventsAPI = {
  getAll: async () => {
    const { data } = await apiClient.get("/events");
    return data.events;
  },
  getOne: async (id) => {
    const { data } = await apiClient.get(`/events/${id}`);
    return data.event;
  },
  create: async (eventData) => {
    const { data } = await apiClient.post("/events", eventData);
    return data.event;
  },
  update: async (id, updates) => {
    const { data } = await apiClient.put(`/events/${id}`, updates);
    return data.event;
  },
  approve: async (id, payload = {}) => {
    const { data } = await apiClient.put(`/events/${id}/approve`, payload);
    return data;
  },
  // Real-world Service Coordination APIs
  getCoordination: async (id) => {
    const { data } = await apiClient.get(`/events/${id}/coordination`);
    return data;
  },
  requestVendorForService: async (id, category, payload) => {
    const { data } = await apiClient.post(`/events/${id}/services/${encodeURIComponent(category)}/request-vendor`, payload);
    return data;
  },
  confirmAssignment: async (id, category, payload) => {
    const { data } = await apiClient.post(`/events/${id}/services/${encodeURIComponent(category)}/confirm-assignment`, payload);
    return data;
  },
  markUnavailable: async (id, category, payload = {}) => {
    const { data } = await apiClient.post(`/events/${id}/services/${encodeURIComponent(category)}/mark-unavailable`, payload);
    return data;
  },
  resolveUnavailable: async (id, category, payload) => {
    const { data } = await apiClient.post(`/events/${id}/services/${encodeURIComponent(category)}/resolve-unavailable`, payload);
    return data;
  },
  // Legacy Admin Readiness APIs (preserved)
  getVendorReadiness: async (id) => {
    const { data } = await apiClient.get(`/events/${id}/vendor-availability`);
    return data;
  },
  sendVendorRequest: async (id, payload) => {
    const { data } = await apiClient.post(`/events/${id}/send-vendor-request`, payload);
    return data;
  },
  updateFeatureExclusion: async (id, payload) => {
    const { data } = await apiClient.post(`/events/${id}/partial-feature-update`, payload);
    return data;
  },
  assignVendor: async (id, payload) => {
    const { data } = await apiClient.post(`/events/${id}/assign-vendor`, payload);
    return data;
  },
  cancel: async (id) => {
    const { data } = await apiClient.put(`/events/${id}/cancel`);
    return data;
  },
  remove: async (id) => {
    const { data } = await apiClient.delete(`/events/${id}`);
    return data;
  },
  savePlan: async (id, planData) => {
    const { data } = await apiClient.put(`/events/${id}/plan`, planData);
    return data;
  },
  suggestAlternatives: async (id, category) => {
    const { data } = await apiClient.get(`/events/${id}/alternatives/${category}`);
    return data;
  },
  updateSchedule: async (id, schedule) => {
    const { data } = await apiClient.put(`/events/${id}/schedule`, { schedule });
    return data;
  },
  updateChecklist: async (id, checklist) => {
    const { data } = await apiClient.put(`/events/${id}/checklist`, { checklist });
    return data;
  },
};

// ─────────────────────────────────────────────────────────
// SERVICES (Vendor catalogue)
// ─────────────────────────────────────────────────────────

export const servicesAPI = {
  getAll: async (params = {}) => {
    const { data } = await apiClient.get("/services", { params });
    return data.services;
  },
  getOne: async (id) => {
    const { data } = await apiClient.get(`/services/${id}`);
    return data.service;
  },
  create: async (serviceData) => {
    const { data } = await apiClient.post("/services", serviceData);
    return data.service;
  },
  update: async (id, updates) => {
    const { data } = await apiClient.put(`/services/${id}`, updates);
    return data.service;
  },
  remove: async (id) => {
    const { data } = await apiClient.delete(`/services/${id}`);
    return data;
  },
};

// ─────────────────────────────────────────────────────────
// AVAILABILITY (Vendor blocking & capacity)
// ─────────────────────────────────────────────────────────

export const availabilityAPI = {
  getVendorAvailability: async (vendorId) => {
    const { data } = await apiClient.get(`/availability/${vendorId}`);
    return data; // { blockedDates, capacityPerDay }
  },
  updateMyAvailability: async (availabilityData) => {
    const { data } = await apiClient.put("/availability", availabilityData);
    return data;
  },
};

// ─────────────────────────────────────────────────────────
// BOOKINGS
// ─────────────────────────────────────────────────────────

export const bookingsAPI = {
  getAll: async (params = {}) => {
    const { data } = await apiClient.get("/bookings", { params });
    return data.bookings;
  },
  getOne: async (id) => {
    const { data } = await apiClient.get(`/bookings/${id}`);
    return data.booking;
  },
  create: async (bookingData) => {
    const { data } = await apiClient.post("/bookings", bookingData);
    return data.booking;
  },
  updateStatus: async (id, status, bookingStatus) => {
    const { data } = await apiClient.put(`/bookings/${id}/status`, { status, bookingStatus });
    return data.booking;
  },
  respondToRequest: async (id, payload) => {
    const { data } = await apiClient.put(`/bookings/${id}/respond`, payload);
    return data;
  },
  sendProposal: async (bookingId, proposalData) => {
    const { data } = await apiClient.post(`/bookings/${bookingId}/proposal`, proposalData);
    return data;
  },
  getProposal: async (bookingId) => {
    const { data } = await apiClient.get(`/bookings/${bookingId}/proposal`);
    return data.proposal;
  },
  cancel: async (id, reason = "") => {
    const { data } = await apiClient.put(`/bookings/${id}/cancel`, { reason });
    return data;
  },
  remove: async (id) => {
    const { data } = await apiClient.delete(`/bookings/${id}`);
    return data;
  },
};

// ─────────────────────────────────────────────────────────
// PAYMENTS (Advance 50%, Full, Express)
// ─────────────────────────────────────────────────────────

export const paymentsAPI = {
  createPayment: async (paymentData) => {
    const { data } = await apiClient.post("/payments", paymentData);
    return data; // { payment, booking }
  },
  getPayments: async () => {
    const { data } = await apiClient.get("/payments");
    return data.payments;
  },
  getPaymentByBooking: async (bookingId) => {
    const { data } = await apiClient.get(`/payments/booking/${bookingId}`);
    return data;
  },
  payBalance: async (paymentId, payload = {}) => {
    const { data } = await apiClient.post(`/payments/${paymentId}/pay-balance`, payload);
    return data;
  },
  getAdminPayments: async () => {
    const { data } = await apiClient.get("/payments/admin");
    return data;
  },
};

// ─────────────────────────────────────────────────────────
// VOLUNTEERS (Workforce operations)
// ─────────────────────────────────────────────────────────

export const volunteersAPI = {
  getDashboard: async () => {
    const { data } = await apiClient.get("/volunteers/dashboard");
    return data;
  },
  apply: async (eventId, notes = "") => {
    const { data } = await apiClient.post(`/volunteers/events/${eventId}/apply`, { notes });
    return data;
  },
  withdraw: async (applicationId) => {
    const { data } = await apiClient.post(`/volunteers/applications/${applicationId}/withdraw`);
    return data;
  },
  updateTaskStatus: async (taskId, status, notes = "") => {
    const { data } = await apiClient.put(`/volunteers/tasks/${taskId}/status`, { status, notes });
    return data;
  },
  decideApplication: async (applicationId, action, notes = "") => {
    const { data } = await apiClient.put(`/volunteers/applications/${applicationId}/decide`, { action, notes });
    return data;
  },
};

// ─────────────────────────────────────────────────────────
// GUESTS & RSVP (Digital Invites & RSVP link)
// ─────────────────────────────────────────────────────────

export const guestsAPI = {
  getEventGuests: async (eventId) => {
    const { data } = await apiClient.get(`/events/${eventId}/guests`);
    return data; // { data: guests, summary }
  },
  addGuest: async (eventId, guestData) => {
    const { data } = await apiClient.post(`/events/${eventId}/guests`, guestData);
    return data.data;
  },
  importGuests: async (eventId, guestsArray) => {
    const { data } = await apiClient.post(`/events/${eventId}/guests/import`, { guests: guestsArray });
    return data;
  },
  deleteGuest: async (eventId, guestId) => {
    const { data } = await apiClient.delete(`/events/${eventId}/guests/${guestId}`);
    return data;
  },
  sendInvite: async (eventId, guestId) => {
    const { data } = await apiClient.post(`/events/${eventId}/guests/${guestId}/send-invite`);
    return data; // { rsvpLink, whatsappUrl, guest }
  },
  getPublicRsvp: async (token) => {
    const { data } = await apiClient.get(`/guests/rsvp/${token}`);
    return data.data; // { guest, event }
  },
  submitPublicRsvp: async (token, rsvpData) => {
    const { data } = await apiClient.post(`/guests/rsvp/${token}`, rsvpData);
    return data;
  },
};

// ─────────────────────────────────────────────────────────
// CHANGE REQUESTS (Cancel / Reschedule & Refund Policy)
// ─────────────────────────────────────────────────────────

export const changeRequestsAPI = {
  createRequest: async (payload) => {
    const { data } = await apiClient.post("/change-requests", payload);
    return data.data;
  },
  getMyRequests: async () => {
    const { data } = await apiClient.get("/change-requests");
    return data.data;
  },
  decideRequest: async (requestId, action) => {
    const { data } = await apiClient.put(`/change-requests/${requestId}/decide`, { action });
    return data.data;
  },
};

// ─────────────────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────────────────

export const expensesAPI = {
  getByEvent: async (eventId) => {
    const { data } = await apiClient.get("/expenses", { params: { eventId } });
    return data.expenses;
  },
  create: async (expenseData) => {
    const { data } = await apiClient.post("/expenses", expenseData);
    return data.expense;
  },
  remove: async (id) => {
    const { data } = await apiClient.delete(`/expenses/${id}`);
    return data;
  },
};

// ─────────────────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────────────────

export const tasksAPI = {
  getAll: async (params = {}) => {
    const { data } = await apiClient.get("/tasks", { params });
    return data.tasks;
  },
  create: async (taskData) => {
    const { data } = await apiClient.post("/tasks", taskData);
    return data.task;
  },
  updateStatus: async (id, status, reportNote) => {
    const { data } = await apiClient.put(`/tasks/${id}/status`, { status, reportNote });
    return data.task;
  },
  remove: async (id) => {
    const { data } = await apiClient.delete(`/tasks/${id}`);
    return data;
  },
};

// ─────────────────────────────────────────────────────────
// REVIEWS (5 Dimensions)
// ─────────────────────────────────────────────────────────

export const reviewsAPI = {
  getAll: async (params = {}) => {
    const { data } = await apiClient.get("/reviews", { params });
    return data.reviews;
  },
  create: async (reviewData) => {
    const { data } = await apiClient.post("/reviews", reviewData);
    return data.review;
  },
};

// ─────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────

export const notificationsAPI = {
  getAll: async () => {
    const { data } = await apiClient.get("/notifications");
    return data.notifications;
  },
  getWithMeta: async () => {
    const { data } = await apiClient.get("/notifications");
    return data; // { success, mode, count, notifications }
  },
  markRead: async (id) => {
    const { data } = await apiClient.put(`/notifications/${id}/read`);
    return data.notification;
  },
  markAllRead: async () => {
    const { data } = await apiClient.put("/notifications/read-all");
    return data;
  },
  getPreferences: async () => {
    const { data } = await apiClient.get("/notifications/preferences");
    return data; // { success, mode, preferences }
  },
  updatePreferences: async (prefs) => {
    const { data } = await apiClient.put("/notifications/preferences", prefs);
    return data; // { success, user, preferences }
  },
  testWhatsApp: async (phone) => {
    const { data } = await apiClient.post("/notifications/test-whatsapp", { phone });
    return data;
  },
};

// ─────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────

export const adminAPI = {
  getStats: async () => {
    const { data } = await apiClient.get("/admin/stats");
    return data.stats;
  },
  getUsers: async (params = {}) => {
    const { data } = await apiClient.get("/admin/users", { params });
    return data.users;
  },
  toggleStatus: async (id) => {
    const { data } = await apiClient.put(`/admin/users/${id}/toggle-status`);
    return data.user;
  },
  toggleVerify: async (id) => {
    const { data } = await apiClient.put(`/admin/users/${id}/toggle-verify`);
    return data.user;
  },
  deleteUser: async (id) => {
    const { data } = await apiClient.delete(`/admin/users/${id}`);
    return data;
  },
  getVolunteers: async (status = "") => {
    const { data } = await apiClient.get("/admin/volunteers", { params: status ? { status } : {} });
    return data.data;
  },
  verifyVolunteer: async (id, status, rejectionReason = "") => {
    const { data } = await apiClient.put(`/admin/volunteers/${id}/verify`, { status, rejectionReason });
    return data;
  },
  getIdProofUrl: (filename) => {
    return `${apiClient.defaults.baseURL || "http://localhost:5000/api"}/admin/idproof/${filename}`;
  },
  exportReportData: async (resource) => {
    const { data } = await apiClient.get(`/admin/reports/export/${resource}`);
    return data;
  },
  approveEvent: async (id) => {
    const { data } = await apiClient.put(`/admin/events/${id}/approve`);
    return data;
  },
};

// ─────────────────────────────────────────────────────────
// AI SUITE (6 EVORA AI Features)
// ─────────────────────────────────────────────────────────

const AI_REQ_CONFIG = { timeout: 45000 };

export const aiAPI = {
  chat: async (message, history = []) => {
    const { data } = await apiClient.post("/ai/chat", { message, history }, AI_REQ_CONFIG);
    return data;
  },
  budget: async (payload) => {
    const { data } = await apiClient.post("/ai/budget", payload, AI_REQ_CONFIG);
    return data.budgetAnalysis;
  },
  food: async (payload) => {
    const { data } = await apiClient.post("/ai/food", payload, AI_REQ_CONFIG);
    return data.menu;
  },
  getSavedMenus: async () => {
    const { data } = await apiClient.get("/ai/food");
    return data.menus;
  },
  saveMenu: async (menu) => {
    const { data } = await apiClient.post("/ai/food/save", menu);
    return data.menu;
  },
  updateSavedMenu: async (id, menu) => {
    const { data } = await apiClient.put(`/ai/food/${id}`, menu);
    return data.menu;
  },
  deleteSavedMenu: async (id) => {
    const { data } = await apiClient.delete(`/ai/food/${id}`);
    return data;
  },
  invitation: async (payload) => {
    const { data } = await apiClient.post("/ai/invitation", payload, AI_REQ_CONFIG);
    return data.invitation;
  },
  checklist: async (payload) => {
    const { data } = await apiClient.post("/ai/checklist", payload, AI_REQ_CONFIG);
    return data;
  },
  getSavedChecklists: async () => {
    const { data } = await apiClient.get("/ai/checklist", AI_REQ_CONFIG);
    return data.checklists || [];
  },
  saveChecklist: async (payload) => {
    const { data } = await apiClient.post("/ai/checklist/save", payload, AI_REQ_CONFIG);
    return data;
  },
  updateSavedChecklist: async (id, payload) => {
    const { data } = await apiClient.put(`/ai/checklist/${id}`, payload, AI_REQ_CONFIG);
    return data;
  },
  deleteSavedChecklist: async (id) => {
    const { data } = await apiClient.delete(`/ai/checklist/${id}`, AI_REQ_CONFIG);
    return data;
  },
  generatePlan: async (payload) => {
    const { data } = await apiClient.post("/ai/plan", payload, AI_REQ_CONFIG);
    return data.plan;
  },
  getSavedPlans: async () => {
    const { data } = await apiClient.get("/ai/plan", AI_REQ_CONFIG);
    return data.plans || [];
  },
  savePlan: async (payload) => {
    const { data } = await apiClient.post("/ai/plan/save", payload, AI_REQ_CONFIG);
    return data.plan;
  },
  updateSavedPlan: async (id, payload) => {
    const { data } = await apiClient.put(`/ai/plan/${id}`, payload, AI_REQ_CONFIG);
    return data.plan;
  },
  deleteSavedPlan: async (id) => {
    const { data } = await apiClient.delete(`/ai/plan/${id}`, AI_REQ_CONFIG);
    return data;
  },
};

// ─────────────────────────────────────────────────────────
// CHARITY & SURPLUS FOOD MODULE
// ─────────────────────────────────────────────────────────

export const charityAPI = {
  createDonation: async (donationData) => {
    const { data } = await apiClient.post("/charity/donations", donationData);
    return data.donation;
  },
  getDonations: async () => {
    const { data } = await apiClient.get("/charity/donations");
    return data.donations;
  },
  updateStatus: async (id, status, shelterName) => {
    const { data } = await apiClient.put(`/charity/donations/${id}/status`, { status, shelterName });
    return data.donation;
  },
};

import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  Wallet,
  Edit3,
  XCircle,
  X,
  Check,
  Tag,
  Sparkles,
  FileText,
} from "lucide-react";
import { eventsAPI, bookingsAPI, tasksAPI, expensesAPI } from "../../services/api";
import { useToast } from "../../context/ToastContext";

const CATEGORIES = ["Wedding", "Birthday", "Corporate", "Anniversary", "Festival", "Graduation", "Engagement", "Other"];

const EventDetails = () => {
  const { id } = useParams();
  const toast = useToast();
  const [event, setEvent] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit Modal State
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Service Resolution State
  const [resolvingCategory, setResolvingCategory] = useState(null);
  const [resolutionLoading, setResolutionLoading] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const [editForm, setEditForm] = useState({
    title: "",
    category: "Wedding",
    date: "",
    time: "",
    venue: "",
    location: "",
    guestCount: "",
    totalBudget: "",
    theme: "",
    description: "",
  });

  const loadData = async () => {
    try {
      const [ev, bkgs, tsks, exps] = await Promise.all([
        eventsAPI.getOne(id),
        bookingsAPI.getAll({ eventId: id }),
        tasksAPI.getAll({ eventId: id }),
        expensesAPI.getByEvent(id),
      ]);
      setEvent(ev);
      setBookings(bkgs || []);
      setTasks(tsks || []);
      setExpenses(exps || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveUnavailable = async (category, decision, customNotes = "") => {
    setResolutionLoading(true);
    try {
      await eventsAPI.resolveUnavailable(id, category, {
        decision,
        notes: customNotes,
      });
      toast.success(
        "Decision Saved! ✓",
        `Your choice to "${decision}" for ${category} has been saved. Other confirmed services continue.`
      );
      setResolvingCategory(null);
      setResolutionNotes("");
      await loadData();
    } catch (err) {
      toast.error("Resolution Failed", err.message || "Failed to submit decision.");
    } finally {
      setResolutionLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const openEditModal = () => {
    if (!event) return;
    setEditForm({
      title: event.title || "",
      category: event.category || "Wedding",
      date: event.date || "",
      time: event.time || "",
      venue: event.venue || "",
      location: event.location || "",
      guestCount: event.guestCount || "",
      totalBudget: event.totalBudget || "",
      theme: event.theme || "",
      description: event.description || "",
    });
    setIsEditing(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.title.trim() || !editForm.date) {
      toast.error("Validation Error", "Event title and date are required.");
      return;
    }
    setSaving(true);
    try {
      const updated = await eventsAPI.update(event._id, {
        ...editForm,
        guestCount: Number(editForm.guestCount) || 0,
        totalBudget: Number(editForm.totalBudget) || 0,
      });
      setEvent(updated);
      setIsEditing(false);
      toast.success("Celebration Updated! 🎉", "All event details have been successfully saved.");
    } catch (err) {
      toast.error("Update Failed", err.message || "Could not update event.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEvent = async () => {
    if (
      window.confirm(
        `Are you sure you want to cancel celebration "${event.title}"?\n\nPer EVORA policy, a 20% non-refundable fee applies to any advance payments made, and 80% is refunded.\n\nProceed with cancellation?`
      )
    ) {
      setCancelling(true);
      try {
        await eventsAPI.cancel(event._id);
        setEvent((prev) => ({ ...prev, status: "Cancelled" }));
        toast.warning(
          "Event Cancelled ⚠️",
          `"${event.title}" has been marked as cancelled (20% policy applies to paid bookings).`
        );
      } catch (err) {
        toast.error("Cancel Failed", err.message || "Failed to cancel event.");
      } finally {
        setCancelling(false);
      }
    }
  };

  if (loading) return (
    <div className="vendor-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #C9A13A", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ color: "#8B7355" }}>Loading event…</p>
      </div>
    </div>
  );

  if (error || !event) return (
    <div className="vendor-page" style={{ textAlign: "center", padding: 60 }}>
      <p style={{ color: "#CC4444" }}>{error || "Event not found."}</p>
      <Link to="/user/events" className="vendor-btn" style={{ marginTop: 16, display: "inline-block" }}>← Back to Events</Link>
    </div>
  );

  const totalBudget = Number(event.totalBudget || 0);
  const totalSpent = expenses.reduce((s, x) => s + Number(x.amount || 0), 0);
  const remaining = Math.max(0, totalBudget - totalSpent);
  const pct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0;

  const inputStyle = {
    width: "100%", padding: "9px 12px", border: "1px solid #E8DCC8", borderRadius: 8,
    fontSize: 14, fontFamily: "DM Sans, sans-serif", background: "#FFF",
    color: "#2B1D12", outline: "none", boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: "#6B5240", marginBottom: 5, display: "block" };

  return (
    <div className="vendor-page">
      <Link to="/user/events" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#C9A13A", fontSize: 14, fontWeight: 500, textDecoration: "none", marginBottom: 20 }}>
        <ArrowLeft size={16} /> Back to Events
      </Link>

      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg, #2B1D12, #4A3728)", borderRadius: 16, padding: "28px 32px", marginBottom: 24, color: "#FAF5EA" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "8px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ background: "#C9A13A33", color: "#C9A13A", fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 20, letterSpacing: 1 }}>{event.category}</span>
            {(() => {
              const servicesList = (event.requestedServices && event.requestedServices.length > 0)
                ? event.requestedServices
                : (event.requiredServices || []).map((cat) => ({ category: cat, status: "Requested" }));
              const confCount = servicesList.filter((s) => s.status === "Confirmed").length;
              
              let badgeStyle = { bg: "rgba(255,255,255,0.15)", color: "#FAF5EA", border: "rgba(255,255,255,0.2)", text: event.status };
              if (event.status === "Submitted") {
                badgeStyle = { bg: "rgba(252,211,77,0.2)", color: "#FCD34D", border: "rgba(252,211,77,0.4)", text: "⏳ Submitted — Coordination Pending" };
              } else if (event.status === "Coordination in Progress") {
                badgeStyle = { bg: "rgba(96,165,250,0.2)", color: "#93C5FD", border: "rgba(96,165,250,0.4)", text: "🔄 Coordination in Progress" };
              } else if (event.status === "Partially Confirmed") {
                badgeStyle = { bg: "rgba(201,161,58,0.25)", color: "#FDE047", border: "rgba(201,161,58,0.5)", text: `✨ Partially Confirmed (${confCount}/${servicesList.length} Services)` };
              } else if (event.status === "Confirmed" || event.status === "Approved") {
                badgeStyle = { bg: "rgba(37,211,102,0.25)", color: "#4ADE80", border: "rgba(37,211,102,0.5)", text: "✅ Confirmed & Assured" };
              } else if (event.status === "Cancelled") {
                badgeStyle = { bg: "rgba(239,68,68,0.2)", color: "#F87171", border: "rgba(239,68,68,0.4)", text: "❌ Cancelled" };
              }

              return (
                <span style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderRadius: "20px",
                  background: badgeStyle.bg,
                  color: badgeStyle.color,
                  border: `1px solid ${badgeStyle.border}`,
                }}>
                  {badgeStyle.text}
                </span>
              );
            })()}
          </div>

          {/* Action Buttons: Edit & Cancel */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={openEditModal}
              style={{
                background: "#C9A13A",
                color: "#2B1D12",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(201,161,58,0.3)",
              }}
              title="Edit event details"
            >
              <Edit3 size={14} /> Edit Celebration
            </button>

            {event.status !== "Cancelled" && (
              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelEvent}
                style={{
                  background: "rgba(255, 255, 255, 0.12)",
                  color: "#FFAAAA",
                  border: "1px solid rgba(255, 100, 100, 0.4)",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                }}
                title="Cancel this event"
              >
                <XCircle size={14} /> {cancelling ? "Cancelling…" : "Cancel Event"}
              </button>
            )}
          </div>
        </div>

        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 32, margin: "10px 0 12px" }}>{event.title}</h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, fontSize: 14, color: "#C9A13A99" }}>
          {event.date && <span><CalendarDays size={14} style={{ verticalAlign: "middle" }} /> {event.date} {event.time && `at ${event.time}`}</span>}
          {(event.venue || event.location) && (
            <span>
              <MapPin size={14} style={{ verticalAlign: "middle" }} />{" "}
              {event.venue ? `${event.venue}${event.location ? ` (${event.location})` : ""}` : event.location}
            </span>
          )}
          {event.guestCount > 0 && <span><Users size={14} style={{ verticalAlign: "middle" }} /> {event.guestCount} guests</span>}
        </div>
        {event.description && <p style={{ margin: "12px 0 0", color: "#C9A13A77", fontSize: 14 }}>{event.description}</p>}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SERVICE-WISE COORDINATION TRACKING & RESOLUTION SECTION
      ───────────────────────────────────────────────────────────── */}
      {(() => {
        const servicesList = (event.requestedServices && event.requestedServices.length > 0)
          ? event.requestedServices
          : (event.requiredServices || []).map((cat) => ({
              category: cat,
              status: event.featureExclusions?.includes(cat) ? "Unavailable" : (event.status === "Approved" || event.status === "Confirmed" ? "Confirmed" : "Requested"),
              targetBudget: 0,
              agreedPrice: 0,
              specificRequirements: "",
              userDecision: "None",
            }));

        const totalCount = servicesList.length;
        const activeCount = servicesList.filter((s) => s.status !== "Cancelled by User").length;
        const confCount = servicesList.filter((s) => s.status === "Confirmed").length;
        const unavailItems = servicesList.filter((s) => s.status === "Unavailable");
        const progressPct = activeCount > 0 ? Math.round((confCount / activeCount) * 100) : 0;

        return (
          <div style={{ marginBottom: 24 }}>
            {/* Progress Summary Card */}
            <div style={{ background: "#FFF", border: "1px solid #E8DCC8", borderRadius: 14, padding: "20px 24px", marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 10 }}>
                <div>
                  <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 19, margin: "0 0 4px", color: "#2B1D12" }}>
                    Celebration Service Coordination Hub
                  </h3>
                  <p style={{ margin: 0, fontSize: 13, color: "#8B7355" }}>
                    EVORA Admin coordinates directly with verified artisans. Track real-time acceptance and confirmation per service.
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: confCount === activeCount && activeCount > 0 ? "#1E8E46" : "#8C6435" }}>
                    {confCount} of {activeCount} Services Confirmed ({progressPct}%)
                  </span>
                  {totalCount > activeCount && (
                    <span style={{ display: "block", fontSize: 11, color: "#8A7D75" }}>
                      ({totalCount - activeCount} service cancelled by user)
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ background: "#F0E8D8", borderRadius: 8, height: 8, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${progressPct}%`,
                    height: "100%",
                    background: confCount === activeCount && activeCount > 0
                      ? "linear-gradient(90deg, #25D366, #1E8E46)"
                      : "linear-gradient(90deg, #C9A13A, #8C6435)",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>

            {/* Unavailable Service Resolution Alerts */}
            {unavailItems.map((unavail) => (
              <div
                key={unavail.category}
                style={{
                  background: "#FFF8F7",
                  border: "2px solid #FCA5A5",
                  borderRadius: 14,
                  padding: "20px 24px",
                  marginBottom: 18,
                  boxShadow: "0 4px 12px rgba(220, 38, 38, 0.08)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <XCircle size={26} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
                      <strong style={{ fontSize: 16, color: "#991B1B" }}>
                        Action Required: {unavail.category} Artisan Unavailable on Event Date
                      </strong>
                      <span style={{ fontSize: 11, fontWeight: 700, background: "#FEE2E2", color: "#DC2626", padding: "2px 8px", borderRadius: 6 }}>
                        Unavailable
                      </span>
                    </div>

                    <p style={{ margin: "0 0 12px", fontSize: 13, color: "#7F1D1D", lineHeight: 1.5 }}>
                      {unavail.assignmentNotes || `Our verified artisans for ${unavail.category} are fully booked on ${event.date}. All other confirmed services remain active and protected.`}
                    </p>

                    <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 600, color: "#450A0A" }}>
                      Please select how you would like to proceed with your celebration:
                    </p>

                    {/* Resolution Choice Buttons */}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        disabled={resolutionLoading}
                        onClick={() => handleResolveUnavailable(unavail.category, "Proceed Without", "Host selected to proceed without this service")}
                        style={{
                          background: "#2B1D12",
                          color: "#FAF5EA",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                        }}
                      >
                        ✓ Proceed Without {unavail.category}
                      </button>

                      <button
                        type="button"
                        disabled={resolutionLoading}
                        onClick={() => handleResolveUnavailable(unavail.category, "Search Alternative", "Host requested broader artisan search")}
                        style={{
                          background: "#8C6435",
                          color: "#FFF",
                          border: "none",
                          padding: "8px 16px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        🔍 Search Alternative Artisans
                      </button>

                      <button
                        type="button"
                        disabled={resolutionLoading}
                        onClick={() => handleResolveUnavailable(unavail.category, "Cancel Service", "Host opted to cancel service")}
                        style={{
                          background: "#FFF",
                          color: "#DC2626",
                          border: "1px solid #FCA5A5",
                          padding: "8px 14px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Cancel This Service
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Service-wise Tracking Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              {servicesList.map((service) => {
                const isConfirmed = service.status === "Confirmed";
                const isAccepted = service.status === "Accepted by Vendor";
                const isUnavailable = service.status === "Unavailable";
                const isCancelled = service.status === "Cancelled by User";
                const isAltSearch = service.status === "Alternative Search Requested";
                const isWaiting = service.status === "Awaiting Vendor Response" || service.status === "Vendor Search in Progress";

                let cardBorder = "#E8DCC8";
                let badgeBg = "#FAF5EA";
                let badgeColor = "#8C6435";
                let badgeText = service.status || "Requested";

                if (isConfirmed) {
                  cardBorder = "#25D366";
                  badgeBg = "#E8F9EE";
                  badgeColor = "#1E8E46";
                  badgeText = "Confirmed by Admin ✓";
                } else if (isAccepted) {
                  cardBorder = "#60A5FA";
                  badgeBg = "#EFF6FF";
                  badgeColor = "#2563EB";
                  badgeText = "Artisan Accepted (Awaiting Admin)";
                } else if (isUnavailable) {
                  cardBorder = "#FCA5A5";
                  badgeBg = "#FEE2E2";
                  badgeColor = "#DC2626";
                  badgeText = "Artisan Unavailable";
                } else if (isCancelled) {
                  cardBorder = "#D1D5DB";
                  badgeBg = "#F3F4F6";
                  badgeColor = "#6B7280";
                  badgeText = "Cancelled by User";
                } else if (isAltSearch) {
                  cardBorder = "#C4B5FD";
                  badgeBg = "#F3E8FF";
                  badgeColor = "#7C3AED";
                  badgeText = "Alternative Search Requested";
                } else if (isWaiting) {
                  cardBorder = "#FCD34D";
                  badgeBg = "#FFFBEB";
                  badgeColor = "#D97706";
                  badgeText = service.status === "Awaiting Vendor Response" ? "Awaiting Artisan Response ⏳" : "Artisan Search in Progress 🔍";
                }

                return (
                  <div
                    key={service.category}
                    style={{
                      background: "#FFF",
                      border: `1.5px solid ${cardBorder}`,
                      borderRadius: 12,
                      padding: "16px 18px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      boxShadow: isConfirmed ? "0 2px 8px rgba(37,211,102,0.1)" : "0 2px 6px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div>
                      {/* Category Header & Status Badge */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                        <strong style={{ fontSize: 15, color: "#2B1D12" }}>{service.category}</strong>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: badgeBg, color: badgeColor, textAlign: "right" }}>
                          {badgeText}
                        </span>
                      </div>

                      {/* Requirements */}
                      {service.specificRequirements && (
                        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#6B5240", lineHeight: 1.4 }}>
                          {service.specificRequirements}
                        </p>
                      )}

                      {/* Assigned Vendor Details if available */}
                      {(service.assignedVendorName || (service.assignedVendorId && service.assignedVendorId.fullName)) && (
                        <div style={{ background: "#FAF6EF", border: "1px solid #E8DCC8", borderRadius: 8, padding: "8px 10px", marginTop: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#8C6435", letterSpacing: 0.5 }}>ALLOCATED ARTISAN</span>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#2B1D12" }}>
                            {service.assignedVendorName || service.assignedVendorId?.fullName || "Assigned Artisan"}
                          </div>
                          {service.assignedVendorId?.businessName && (
                            <div style={{ fontSize: 11, color: "#8B7355" }}>
                              {service.assignedVendorId.businessName}
                            </div>
                          )}
                          {isConfirmed && service.assignedVendorId?.phone && (
                            <div style={{ fontSize: 11, color: "#25D366", marginTop: 2, fontWeight: 600 }}>
                              📞 {service.assignedVendorId.phone}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Decline Reason if any */}
                      {service.declineReason && (
                        <div style={{ fontSize: 11, color: "#B91C1C", background: "#FEF2F2", padding: "6px 8px", borderRadius: 6, marginTop: 4 }}>
                          Note: {service.declineReason}
                        </div>
                      )}

                      {/* Assignment Notes */}
                      {service.assignmentNotes && !isUnavailable && (
                        <div style={{ fontSize: 11, color: "#4B5563", background: "#F9FAFB", padding: "6px 8px", borderRadius: 6, marginTop: 4 }}>
                          Specs: {service.assignmentNotes}
                        </div>
                      )}
                    </div>

                    {/* Pricing Footer */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #F0E8D8", paddingTop: 8, marginTop: 10, fontSize: 12 }}>
                      <span style={{ color: "#8A7D75" }}>
                        Budget: ₹{(service.targetBudget || 0).toLocaleString("en-IN")}
                      </span>
                      {service.agreedPrice > 0 && (
                        <span style={{ color: "#1E8E46", fontWeight: 700 }}>
                          Agreed: ₹{service.agreedPrice.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Admin Feature Allocation Notice */}
      {event.adminNoteToHost && (
        <div style={{ background: "#FFFBF0", border: "1px solid #E8C882", borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <Sparkles size={22} color="#C9A13A" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong style={{ color: "#8C6435", fontSize: 15 }}>Concierge Service Allocation Notice</strong>
            <p style={{ margin: "4px 0 0", color: "#3B2D22", fontSize: 13, lineHeight: 1.5 }}>
              {event.adminNoteToHost}
            </p>
          </div>
        </div>
      )}

      {event.status === "Cancelled" && (
        <div style={{ background: "#FFF5F5", border: "1px solid #FFCCCC", borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <XCircle size={22} color="#CC0000" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong style={{ color: "#CC0000", fontSize: 15 }}>Celebration Cancelled</strong>
            <p style={{ margin: "3px 0 0", color: "#4A3B32", fontSize: 13, lineHeight: 1.5 }}>
              This celebration has been marked as cancelled. Per EVORA platform policy, a <strong>20% non-refundable deduction</strong> applies to any advance payments made, and <strong>80% is refunded</strong>. You can update or reschedule the details using "Edit Celebration" above.
            </p>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Budget */}
        <div style={{ background: "#fff", border: "1px solid #E8DCC8", borderRadius: 14, padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 18, margin: 0 }}><Wallet size={18} style={{ verticalAlign: "middle", marginRight: 6, color: "#C9A13A" }} />Budget</h3>
            <Link to={`/user/budget?eventId=${event._id}`} style={{ fontSize: 12, color: "#C9A13A", textDecoration: "none" }}>Manage →</Link>
          </div>
          {totalBudget > 0 ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#8B7355", marginBottom: 6 }}>
                <span>Spent: ₹{totalSpent.toLocaleString()}</span><span>{pct}%</span>
              </div>
              <div style={{ background: "#F0E8D8", borderRadius: 6, height: 8, marginBottom: 10 }}>
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 6, background: pct > 90 ? "#CC4444" : "#C9A13A" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "#304B35", fontWeight: 600 }}>Remaining: ₹{remaining.toLocaleString()}</span>
                <span style={{ color: "#8B7355" }}>/ ₹{totalBudget.toLocaleString()}</span>
              </div>
            </>
          ) : <p style={{ color: "#8B7355", fontSize: 14 }}>No budget set for this event.</p>}
        </div>

        {/* Summary */}
        <div style={{ background: "#fff", border: "1px solid #E8DCC8", borderRadius: 14, padding: 22 }}>
          <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 18, margin: "0 0 14px" }}>Summary</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Bookings", value: bookings.length, color: "#C9A13A" },
              { label: "Expenses", value: expenses.length, color: "#304B35" },
              { label: "Tasks", value: tasks.length, color: "#8B4513" },
              { label: "Status", value: event.status, color: "#2B1D12" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "#FAF5EA", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 12, color: "#8B7355" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bookings */}
      {bookings.length > 0 && (
        <div style={{ marginTop: 20, background: "#fff", border: "1px solid #E8DCC8", borderRadius: 14, padding: 22 }}>
          <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 18, margin: "0 0 14px" }}>Booked Services</h3>
          {bookings.map((b) => (
            <div key={b._id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F0E8D8" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500, fontSize: 14, color: "#2B1D12" }}>{b.serviceName || "Service"}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8B7355" }}>EVORA Assured Service</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: b.status === "Accepted" ? "#304B35" : "#C9A13A" }}>{b.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tasks */}
      {tasks.length > 0 && (
        <div style={{ marginTop: 20, background: "#fff", border: "1px solid #E8DCC8", borderRadius: 14, padding: 22 }}>
          <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 18, margin: "0 0 14px" }}>Volunteer Tasks</h3>
          {tasks.map((t) => (
            <div key={t._id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F0E8D8" }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500, fontSize: 14, color: "#2B1D12" }}>{t.title}</p>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8B7355" }}>{t.volunteerId?.fullName}</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.status === "Done" ? "#304B35" : "#C9A13A" }}>{t.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          EDIT EVENT MODAL (All options previously filled)
      ───────────────────────────────────────────────────────────── */}
      {isEditing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => !saving && setIsEditing(false)}
        >
          <div
            style={{
              background: "#FDFAF4",
              border: "1px solid #E8DCC8",
              borderRadius: 16,
              width: "100%",
              maxWidth: 640,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "28px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid #E8DCC8", paddingBottom: 14 }}>
              <div>
                <span className="vendor-welcome-label" style={{ color: "#C9A13A", fontSize: 11 }}>CELEBRATION SETTINGS</span>
                <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 24, margin: "4px 0 0", color: "#2B1D12" }}>
                  Edit Celebration Details
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={saving}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#8B7355", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Edit Form */}
            <form onSubmit={handleSaveEdit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Event Title *</label>
                  <input
                    name="title"
                    value={editForm.title}
                    onChange={handleEditChange}
                    style={inputStyle}
                    placeholder="e.g. The Sharma Grand Wedding"
                    required
                  />
                </div>

                <div>
                  <label style={labelStyle}>Category *</label>
                  <select name="category" value={editForm.category} onChange={handleEditChange} style={inputStyle}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label style={labelStyle}><CalendarDays size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />Event Date *</label>
                  <input
                    type="date"
                    name="date"
                    value={editForm.date}
                    onChange={handleEditChange}
                    style={inputStyle}
                    required
                  />
                </div>

                <div>
                  <label style={labelStyle}>Event Time</label>
                  <input
                    type="time"
                    name="time"
                    value={editForm.time}
                    onChange={handleEditChange}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}><MapPin size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />Venue</label>
                  <input
                    name="venue"
                    value={editForm.venue}
                    onChange={handleEditChange}
                    placeholder="Venue name and city"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Location / City</label>
                  <input
                    name="location"
                    value={editForm.location}
                    onChange={handleEditChange}
                    placeholder="e.g. Hyderabad, Banjara Hills"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}><Users size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />Estimated Guest Count</label>
                  <input
                    type="number"
                    name="guestCount"
                    value={editForm.guestCount}
                    onChange={handleEditChange}
                    placeholder="0"
                    min="0"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}><Wallet size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />Total Budget (₹)</label>
                  <input
                    type="number"
                    name="totalBudget"
                    value={editForm.totalBudget}
                    onChange={handleEditChange}
                    placeholder="₹ 0"
                    min="0"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}><Sparkles size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />Theme / Decor Concept</label>
                  <input
                    name="theme"
                    value={editForm.theme}
                    onChange={handleEditChange}
                    placeholder="e.g. Royal Gold, Pastel Floral"
                    style={inputStyle}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}><FileText size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />Description & Special Notes</label>
                  <textarea
                    name="description"
                    value={editForm.description}
                    onChange={handleEditChange}
                    rows={3}
                    placeholder="Share any special instructions, cultural traditions, or requirements..."
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22, borderTop: "1px solid #E8DCC8", paddingTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  style={{
                    background: "#FFF",
                    border: "1px solid #D5C7B4",
                    borderRadius: 8,
                    padding: "9px 18px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#6B5240",
                    cursor: "pointer",
                  }}
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: "#25D366",
                    border: "none",
                    borderRadius: 8,
                    padding: "9px 22px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#FFF",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 2px 6px rgba(37,211,102,0.3)",
                  }}
                >
                  <Check size={16} /> {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetails;

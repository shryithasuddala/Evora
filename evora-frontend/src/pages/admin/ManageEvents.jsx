import { useState, useEffect } from "react";
import {
  Search,
  Trash2,
  CheckCircle2,
  Clock,
  MessageCircle,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  X,
  Utensils,
  Store,
  Camera,
  Palette,
  Check,
  Building2,
  Sparkles,
} from "lucide-react";
import { eventsAPI } from "../../services/api";
import { useToast } from "../../context/ToastContext";

const STATUS_TABS = ["All", "Pending Approval", "Approved", "Confirmed", "Completed", "Cancelled"];

const getCategoryIcon = (catName = "") => {
  const c = catName.toLowerCase();
  if (c.includes("cater") || c.includes("food")) return <Utensils size={16} color="#8C6435" />;
  if (c.includes("venue")) return <Building2 size={16} color="#8C6435" />;
  if (c.includes("decor")) return <Palette size={16} color="#8C6435" />;
  if (c.includes("photo") || c.includes("video")) return <Camera size={16} color="#8C6435" />;
  return <Store size={16} color="#8C6435" />;
};

const ManageEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [approvingId, setApprovingId] = useState(null);

  // Vendor Coordination & Readiness Audit Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [coordinationData, setCoordinationData] = useState(null);
  const [readinessData, setReadinessData] = useState(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [notifyingCategory, setNotifyingCategory] = useState(null);
  const [customNotice, setCustomNotice] = useState("");

  // Modals / Popovers for Vendor Actions
  const [activeConfirmingVendor, setActiveConfirmingVendor] = useState(null);
  const [activeDispatchingVendor, setActiveDispatchingVendor] = useState(null);
  const [activeUnavailableService, setActiveUnavailableService] = useState(null);

  const toast = useToast();

  const loadEvents = async () => {
    try {
      const data = await eventsAPI.getAll();
      setEvents(data || []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const loadCoordinationData = async (evtId) => {
    setReadinessLoading(true);
    setReadinessError("");
    try {
      const coord = await eventsAPI.getCoordination(evtId);
      setCoordinationData(coord);
      // Also fetch legacy readiness for fallback compatibility
      try {
        const legacy = await eventsAPI.getVendorReadiness(evtId);
        setReadinessData(legacy);
      } catch { /* legacy fallback silent */ }
    } catch (err) {
      try {
        const legacy = await eventsAPI.getVendorReadiness(evtId);
        setReadinessData(legacy);
      } catch (legacyErr) {
        setReadinessError(err.message || "Failed to load coordination data.");
        toast.error("Failed to load coordination details", err.message);
      }
    } finally {
      setReadinessLoading(false);
    }
  };

  // Open Vendor Availability & Acceptance Review Modal
  const openVendorReviewModal = async (event) => {
    setSelectedEvent(event);
    setReviewModalOpen(true);
    setActiveConfirmingVendor(null);
    setActiveDispatchingVendor(null);
    setActiveUnavailableService(null);
    setNotifyingCategory(null);
    await loadCoordinationData(event._id || event.id);
  };

  // Send request to vendor (Step 1 in flow)
  const handleSendVendorRequest = async (vendorId, category, proposedPrice = 0, notes = "") => {
    if (!selectedEvent) return;
    setActionLoading(true);
    try {
      await eventsAPI.requestVendorForService(selectedEvent._id || selectedEvent.id, category, {
        vendorId,
        proposedPrice: Number(proposedPrice) || 0,
        notes: notes || "",
      });
      toast.success("Request Sent! 📩", `Booking inquiry transmitted to artisan. Vendor can now Accept/Decline in their portal.`);
      setActiveDispatchingVendor(null);
      await loadCoordinationData(selectedEvent._id || selectedEvent.id);
      await loadEvents();
    } catch (err) {
      toast.error("Dispatch Failed", err.message || "Failed to send request to vendor.");
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm vendor assignment (Only allowed after vendor has accepted!)
  const handleConfirmAssignment = async (vendorId, category, agreedPrice = 0, assignmentNotes = "") => {
    if (!selectedEvent) return;
    setActionLoading(true);
    try {
      await eventsAPI.confirmAssignment(selectedEvent._id || selectedEvent.id, category, {
        vendorId,
        agreedPrice: Number(agreedPrice) || 0,
        assignmentNotes: assignmentNotes || "",
      });
      toast.success("Assignment Confirmed! ✨", `${category} artisan confirmed & locked for celebration.`);
      setActiveConfirmingVendor(null);
      await loadCoordinationData(selectedEvent._id || selectedEvent.id);
      await loadEvents();
    } catch (err) {
      toast.error("Confirmation Blocked", err.message || "Failed to confirm vendor assignment.");
    } finally {
      setActionLoading(false);
    }
  };

  // Mark an individual service unavailable and notify user
  const handleMarkUnavailable = async (category, adminNotes = "") => {
    if (!selectedEvent) return;
    setActionLoading(true);
    try {
      await eventsAPI.markUnavailable(selectedEvent._id || selectedEvent.id, category, {
        adminNotes: adminNotes || "",
      });
      toast.info("Marked Unavailable ⚠️", `${category} marked unavailable. Host has been notified with resolution options.`);
      setActiveUnavailableService(null);
      setNotifyingCategory(null);
      await loadCoordinationData(selectedEvent._id || selectedEvent.id);
      await loadEvents();
    } catch (err) {
      toast.error("Action Failed", err.message || "Failed to mark service unavailable.");
    } finally {
      setActionLoading(false);
    }
  };

  // Assign and lock vendor acceptance (Legacy fallback)
  const handleAssignAndAcceptVendor = async (vendorId, category) => {
    if (!selectedEvent) return;
    setActionLoading(true);
    try {
      await eventsAPI.assignVendor(selectedEvent._id || selectedEvent.id, {
        vendorId,
        category,
        action: "accept",
      });
      toast.success("Vendor Assigned! ✓", `${category} artisan assigned & verified for celebration.`);
      await loadCoordinationData(selectedEvent._id || selectedEvent.id);
    } catch (err) {
      toast.error("Assignment Failed", err.message || "Failed to assign vendor.");
    } finally {
      setActionLoading(false);
    }
  };

  // Notify host if vendor unavailable and proceed with remaining features (Legacy fallback)
  const handleNotifyUserUnavailable = async (category, customNotice) => {
    if (!selectedEvent) return;
    await handleMarkUnavailable(category, customNotice);
  };

  // Final Admin Approval
  const handleFinalApprove = async (force = false) => {
    if (!selectedEvent) return;
    const evtId = selectedEvent._id || selectedEvent.id;
    const hostName = selectedEvent.organizerId?.fullName || "Host";

    setActionLoading(true);
    try {
      await eventsAPI.approve(evtId, { forceApprove: force });
      toast.success(
        "Celebration Approved! 🎉",
        `Event "${selectedEvent.title}" and artisan team are officially locked. Notifications queued for ${hostName}.`
      );
      setReviewModalOpen(false);
      setSelectedEvent(null);
      await loadEvents();
    } catch (err) {
      toast.error("Approval Blocked", err.message || "Vendor acceptance is required before approval.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (window.confirm(`Admin Action: Remove event record "${title}"?`)) {
      try {
        await eventsAPI.remove(id);
        toast.success("Event Deleted", `Event "${title}" removed.`);
        await loadEvents();
      } catch (err) {
        toast.error("Error", err.message || "Failed to delete event.");
      }
    }
  };

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      (e.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.venue || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.location || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.category || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.organizerId?.fullName && e.organizerId.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.organizerId?.phone && e.organizerId.phone.includes(searchTerm));

    const matchesTab =
      activeTab === "All" ||
      (activeTab === "Pending Approval" && (e.status === "Pending Approval" || e.status === "Planning")) ||
      e.status === activeTab;

    return matchesSearch && matchesTab;
  });

  if (loading) {
    return (
      <div className="vendor-page" style={{ textAlign: "center", padding: 50, color: "#8B7355" }}>
        Loading platform celebrations…
      </div>
    );
  }

  return (
    <div className="vendor-page">
      <div style={{ marginBottom: "24px" }}>
        <span className="vendor-welcome-label" style={{ color: "#8C6435" }}>
          PLATFORM OVERSIGHT & ASSURANCE
        </span>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "32px", margin: "4px 0" }}>
          Celebrations & Event Monitor
        </h1>
        <p style={{ margin: 0, color: "#766C67" }}>
          Verify vendor availability on event dates. Events can only be approved once required artisans (Catering, Venue, Decor, Photography) have accepted.
        </p>
      </div>

      {/* Tabs & Search */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {STATUS_TABS.map((tab) => {
            const count = events.filter((e) =>
              tab === "All"
                ? true
                : tab === "Pending Approval"
                ? e.status === "Pending Approval" || e.status === "Planning"
                : e.status === tab
            ).length;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: activeTab === tab ? "#25D366" : "#E7DED5",
                  background: activeTab === tab ? "#EAF8EF" : "#FFF",
                  color: activeTab === tab ? "#1E8E46" : "#6B5240",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>{tab}</span>
                <span
                  style={{
                    background: activeTab === tab ? "#25D366" : "#F0ECE6",
                    color: activeTab === tab ? "#FFF" : "#766C67",
                    borderRadius: "10px",
                    padding: "1px 6px",
                    fontSize: "10px",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="login-input-wrapper" style={{ width: "300px", background: "#FFF" }}>
          <Search size={16} />
          <input
            placeholder="Search event, host, phone, venue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="vendor-card">
        <div className="table-responsive" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", width: "100%" }}>
          <table style={{ width: "100%", minWidth: "850px", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E7DED5", textAlign: "left", color: "#766C67" }}>
                <th style={{ padding: "12px 8px" }}>EVENT & CATEGORY</th>
                <th style={{ padding: "12px 8px" }}>HOST & CONTACT</th>
                <th style={{ padding: "12px 8px" }}>DATE & SCHEDULE</th>
                <th style={{ padding: "12px 8px" }}>VENUE & LOCATION</th>
                <th style={{ padding: "12px 8px", textAlign: "right" }}>BUDGET</th>
                <th style={{ padding: "12px 8px", textAlign: "center" }}>STATUS</th>
                <th style={{ padding: "12px 8px", textAlign: "right" }}>ADMIN ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px 10px", color: "#8B7355" }}>
                    No events found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => {
                  const evtId = evt._id || evt.id;
                  const isPending = evt.status === "Pending Approval" || evt.status === "Planning";
                  const isApproved = evt.status === "Approved" || evt.status === "Confirmed";

                  return (
                    <tr key={evtId} style={{ borderBottom: "1px solid #E7DED5" }}>
                      <td style={{ padding: "12px 8px" }}>
                        <strong style={{ color: "#2B1D12", display: "block" }}>{evt.title}</strong>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            background: "#E7D9D4",
                            color: "#2E2927",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            textTransform: "uppercase",
                          }}
                        >
                          {evt.category}
                        </span>
                      </td>

                      <td style={{ padding: "12px 8px", color: "#2E2927" }}>
                        <strong>{evt.organizerId?.fullName || "Organizer"}</strong>
                        {evt.organizerId?.phone && (
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "3px",
                              fontSize: "11px",
                              color: "#1E8E46",
                              fontWeight: 600,
                              marginTop: "2px",
                            }}
                          >
                            <MessageCircle size={11} /> {evt.organizerId.phone}
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "12px 8px", color: "#766C67" }}>
                        <strong>📅 {evt.date}</strong>
                        {evt.time && <span style={{ display: "block", fontSize: "11px" }}>⏰ {evt.time}</span>}
                      </td>

                      <td style={{ padding: "12px 8px", color: "#766C67" }}>
                        <div style={{ fontWeight: 600, color: "#2B1D12" }}>{evt.venue || "Venue not set"}</div>
                        {evt.location && <span style={{ fontSize: "11px", color: "#8C6435" }}>📍 {evt.location}</span>}
                      </td>

                      <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 700, color: "#304B35" }}>
                        ₹{Number(evt.totalBudget || 0).toLocaleString("en-IN")}
                      </td>

                      <td style={{ padding: "12px 8px", textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "999px",
                            background: isApproved
                              ? "#EAF8EF"
                              : isPending
                              ? "#FFF7EB"
                              : evt.status === "Cancelled"
                              ? "#FFF5F5"
                              : evt.status === "Completed"
                              ? "#EAF0EA"
                              : "#F5F3EF",
                            color: isApproved
                              ? "#1E8E46"
                              : isPending
                              ? "#B4712A"
                              : evt.status === "Cancelled"
                              ? "#CC0000"
                              : evt.status === "Completed"
                              ? "#647665"
                              : "#6B5240",
                            border: `1px solid ${
                              isApproved
                                ? "#A3E7B8"
                                : isPending
                                ? "#FCD34D"
                                : evt.status === "Cancelled"
                                ? "#FFCCCC"
                                : "#E0D7CD"
                            }`,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {isPending && <Clock size={11} />}
                          {isApproved && <CheckCircle2 size={11} />}
                          {evt.status === "Cancelled" && <XCircle size={11} />}
                          {evt.status}
                        </span>
                      </td>

                      <td style={{ padding: "12px 8px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          {evt.status !== "Cancelled" && (
                            <button
                              type="button"
                              onClick={() => openVendorReviewModal(evt)}
                              style={{
                                background: isApproved
                                  ? "linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)"
                                  : "linear-gradient(135deg, #8C6435 0%, #6E4E28 100%)",
                                color: "#FFFFFF",
                                border: isApproved ? "1px solid #1B5E20" : "1px solid #8C6435",
                                borderRadius: "6px",
                                padding: "6px 14px",
                                fontSize: "12px",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                cursor: "pointer",
                                boxShadow: isApproved
                                  ? "0 2px 4px rgba(27, 94, 32, 0.25)"
                                  : "0 2px 4px rgba(140, 100, 53, 0.25)",
                              }}
                              title="Inspect & Coordinate Vendor Allocations"
                            >
                              <ShieldCheck size={14} color="#FFFFFF" />
                              {isApproved ? "Vendor Audit" : "Coordinate Services"}
                            </button>
                          )}

                          {isApproved && (
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#1E8E46",
                                fontWeight: 700,
                                background: "#EAF8EF",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                marginRight: "4px",
                              }}
                            >
                              <CheckCircle2 size={12} /> Assured Live
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(evtId, evt.title)}
                            style={{ background: "none", border: "none", color: "#A9655B", cursor: "pointer", padding: "4px" }}
                            title="Admin Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADMIN VENDOR READINESS & AVAILABILITY AUDIT MODAL */}
      {reviewModalOpen && selectedEvent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            background: "rgba(33, 22, 14, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#FFFDF9",
              borderRadius: 20,
              border: "1px solid #E8DCC8",
              width: "100%",
              maxWidth: 780,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #21160E 0%, #3B2414 100%)",
                padding: "20px 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #C9A13A44",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #C9A13A 0%, #E7C970 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#2B1D12",
                    fontWeight: 800,
                    fontSize: 18,
                  }}
                >
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#C9A13A", letterSpacing: "1.5px" }}>
                      EVORA ADMIN ASSURANCE GATEWAY
                    </span>
                    <span style={{ fontSize: 10, background: "#304B35", color: "#FAF5EA", padding: "1px 6px", borderRadius: 10 }}>
                      Vendor Availability Audit
                    </span>
                  </div>
                  <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 18, margin: 0, color: "#FAF5EA" }}>
                    {selectedEvent.title}
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setReviewModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "#C9A13A", cursor: "pointer", padding: 4 }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Event Summary Banner */}
            <div
              style={{
                background: "#FAF5EA",
                borderBottom: "1px solid #E8DCC8",
                padding: "12px 24px",
                display: "flex",
                gap: 20,
                flexWrap: "wrap",
                fontSize: "12px",
                color: "#6B5240",
              }}
            >
              <div><strong>Category:</strong> {selectedEvent.category}</div>
              <div><strong>Date:</strong> 📅 {selectedEvent.date}</div>
              <div><strong>Location:</strong> 📍 {selectedEvent.location || selectedEvent.venue || "Hyderabad"}</div>
              <div><strong>Guests:</strong> 👥 {selectedEvent.guestCount || "Not specified"}</div>
              <div><strong>Host:</strong> {selectedEvent.organizerId?.fullName || "Organizer"} ({selectedEvent.organizerId?.phone || "No phone"})</div>
            </div>

            {/* Modal Body: Vendor Availability Check by Service Category */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontFamily: "Playfair Display, serif", fontSize: 16, margin: "0 0 4px", color: "#2B1D12" }}>
                  Celebration Service Coordination & Verification Matrix ({selectedEvent.date})
                </h4>
                <p style={{ margin: 0, fontSize: 12, color: "#766C67" }}>
                  Inspect candidate artisans registered under each requested service. Check real-time blocked dates, daily booking capacities, and schedule conflicts. Send booking inquiries, inspect artisan responses & decline reasons, and finalize assignments.
                </p>
              </div>

              {readinessLoading ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#8B7355" }}>
                  Auditing vendor availability calendars for {selectedEvent.date}…
                </div>
              ) : coordinationData && coordinationData.requestedServices ? (
                /* Real-World Coordination Engine View */
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {coordinationData.requestedServices.map((service) => {
                    const isConfirmed = service.status === "Confirmed";
                    const isAcceptedByVendor = service.status === "Accepted by Vendor";
                    const isUnavailable = service.status === "Unavailable";
                    const isCancelled = service.status === "Cancelled by User";
                    const isAltRequested = service.status === "Alternative Search Requested";

                    let statusBg = "#FAF5EA";
                    let statusColor = "#8C6435";
                    if (isConfirmed) { statusBg = "#E8F9EE"; statusColor = "#1E8E46"; }
                    else if (isAcceptedByVendor) { statusBg = "#EFF6FF"; statusColor = "#2563EB"; }
                    else if (isUnavailable) { statusBg = "#FEE2E2"; statusColor = "#DC2626"; }
                    else if (isCancelled) { statusBg = "#F3F4F6"; statusColor = "#6B7280"; }
                    else if (isAltRequested) { statusBg = "#F3E8FF"; statusColor = "#7C3AED"; }

                    return (
                      <div
                        key={service.category}
                        style={{
                          background: isCancelled ? "#F9F8F6" : "#FFF",
                          border: isConfirmed ? "1.5px solid #25D366" : isAcceptedByVendor ? "1.5px solid #60A5FA" : isUnavailable ? "1.5px solid #FCA5A5" : "1px solid #E8DCC8",
                          borderRadius: 12,
                          padding: 18,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                        }}
                      >
                        {/* Service Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {getCategoryIcon(service.category)}
                            <strong style={{ fontSize: 15, color: isCancelled ? "#8A7D75" : "#2B1D12", textDecoration: isCancelled ? "line-through" : "none" }}>
                              {service.category}
                            </strong>
                            <span style={{ fontSize: 11, color: "#8A7D75" }}>
                              (Budget: ₹{(service.targetBudget || 0).toLocaleString("en-IN")})
                            </span>
                          </div>

                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: statusBg, color: statusColor }}>
                            {service.status}
                          </span>
                        </div>

                        {/* Specific Requirements */}
                        {service.specificRequirements && (
                          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#6B5240", fontStyle: "italic" }}>
                            Host Requirements: &quot;{service.specificRequirements}&quot;
                          </p>
                        )}

                        {/* Confirmed Artisan Banner */}
                        {isConfirmed && (
                          <div style={{ background: "#E8F9EE", border: "1px solid #A3E7B8", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                              <div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: "#1E8E46" }}>✓ CONFIRMED ARTISAN:</span>
                                <strong style={{ fontSize: 14, color: "#1B5E20", marginLeft: 6 }}>
                                  {service.assignedVendorName || "Assigned Artisan"}
                                </strong>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#1E8E46" }}>
                                Agreed Price: ₹{(service.agreedPrice || 0).toLocaleString("en-IN")}
                              </span>
                            </div>
                            {service.assignmentNotes && (
                              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#2E7D32" }}>
                                Notes: {service.assignmentNotes}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Decline Reason Banner */}
                        {service.declineReason && (
                          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
                            <strong style={{ fontSize: 12, color: "#DC2626" }}>⚠️ Artisan Decline Notice:</strong>
                            <span style={{ fontSize: 12, color: "#991B1B", marginLeft: 6 }}>
                              &quot;{service.declineReason}&quot;
                            </span>
                          </div>
                        )}

                        {/* User Decision Banner */}
                        {service.userDecision && service.userDecision !== "None" && (
                          <div style={{ background: "#F5F3EF", border: "1px dashed #D5C2A5", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
                            <strong style={{ fontSize: 12, color: "#8C6435" }}>Host Decision:</strong>
                            <span style={{ fontSize: 12, color: "#2B1D12", marginLeft: 6 }}>
                              {service.userDecision} ({service.assignmentNotes || "Recorded via User Portal"})
                            </span>
                          </div>
                        )}

                        {/* Candidate Vendors Section */}
                        {(!service.candidateVendors || service.candidateVendors.length === 0) ? (
                          <div style={{ padding: "12px", background: "#FAF5EA", borderRadius: 8, color: "#8C6435", fontSize: 12, marginBottom: 10 }}>
                            ⚠️ No registered artisans found under {service.category}. You can mark this service unavailable to notify the host.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#8C6435", letterSpacing: 0.5 }}>
                              CANDIDATE ARTISANS FOR {service.category.toUpperCase()} ({service.candidateVendors.length}):
                            </span>

                            {service.candidateVendors.map((vendor) => {
                              const existingBooking = vendor.existingBooking;
                              const bookingStatus = existingBooking?.status;
                              const isAccepted = bookingStatus === "Accepted" || bookingStatus === "Accepted by Vendor";
                              const isRequested = bookingStatus === "Pending" || bookingStatus === "Proposal Sent";
                              const isDeclined = bookingStatus === "Declined" || bookingStatus === "Rejected";
                              const isVendorConfirmed = bookingStatus === "Confirmed" || bookingStatus === "Confirmed by Admin";

                              const isDispatchingThis = activeDispatchingVendor?.category === service.category && activeDispatchingVendor?.vendorId === vendor.vendorId;
                              const isConfirmingThis = activeConfirmingVendor?.category === service.category && activeConfirmingVendor?.vendorId === vendor.vendorId;

                              return (
                                <div
                                  key={vendor.vendorId}
                                  style={{
                                    background: isVendorConfirmed ? "#F0FFF4" : isAccepted ? "#EFF6FF" : "#FAF5EA",
                                    border: isVendorConfirmed ? "1px solid #34D399" : isAccepted ? "1px solid #60A5FA" : "1px solid #E7DED5",
                                    borderRadius: 8,
                                    padding: "12px 14px",
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                                    <div>
                                      <strong style={{ fontSize: 13, color: "#2B1D12" }}>
                                        {vendor.businessName || vendor.fullName}
                                      </strong>
                                      <span style={{ fontSize: 11, color: "#766C67", marginLeft: 8 }}>
                                        📞 {vendor.phone || "No phone"} · {vendor.email}
                                      </span>
                                    </div>

                                    {/* Availability Conflict Status */}
                                    <div>
                                      {vendor.isAvailable ? (
                                        <span style={{ fontSize: 10, background: "#E8F5EC", color: "#1B5E20", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                                          🟢 Available ({vendor.activeBookingsOnDate || 0}/{vendor.capacityPerDay || 1} Bookings)
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: 10, background: "#FEE2E2", color: "#DC2626", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>
                                          🔴 {vendor.conflictReason || "Conflict on Event Date"}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Candidate Vendor Actions & Inline Prompts */}
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, borderTop: "1px dashed #E0D5C5", paddingTop: 8, marginTop: 4 }}>
                                    <div>
                                      {isVendorConfirmed ? (
                                        <span style={{ fontSize: 11, color: "#166534", fontWeight: 700 }}>
                                          ✓ Confirmed & Assigned for Celebration
                                        </span>
                                      ) : isAccepted ? (
                                        <span style={{ fontSize: 11, color: "#1D4ED8", fontWeight: 700 }}>
                                          ✓ Artisan Accepted in Portal (Ready for Admin Final Confirmation)
                                        </span>
                                      ) : isRequested ? (
                                        <span style={{ fontSize: 11, color: "#B45309", fontWeight: 600 }}>
                                          ⏳ Inquiry Sent — Awaiting Artisan Acceptance in Portal
                                        </span>
                                      ) : isDeclined ? (
                                        <span style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>
                                          ✕ Declined by Artisan: &quot;{existingBooking?.declineReason || "Unavailable"}&quot;
                                        </span>
                                      ) : (
                                        <span style={{ fontSize: 11, color: "#8A7D75" }}>
                                          No active inquiry dispatched yet
                                        </span>
                                      )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                      {/* Only allow Confirm if Vendor has genuinely accepted! (Strict business rule) */}
                                      {isAccepted && !isVendorConfirmed && (
                                        <button
                                          type="button"
                                          disabled={actionLoading}
                                          onClick={() => setActiveConfirmingVendor({
                                            category: service.category,
                                            vendorId: vendor.vendorId,
                                            vendorName: vendor.businessName || vendor.fullName,
                                            agreedPrice: existingBooking?.proposedPrice || service.targetBudget || 0,
                                            assignmentNotes: existingBooking?.assignmentNotes || "",
                                          })}
                                          style={{
                                            background: "#16A34A",
                                            color: "#FFF",
                                            border: "none",
                                            padding: "6px 14px",
                                            borderRadius: 6,
                                            fontSize: 11,
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 4,
                                          }}
                                        >
                                          ✓ Confirm Assignment
                                        </button>
                                      )}

                                      {/* Send Request button */}
                                      {!isVendorConfirmed && !isAccepted && !isRequested && (
                                        <button
                                          type="button"
                                          disabled={!vendor.isAvailable || actionLoading}
                                          onClick={() => setActiveDispatchingVendor({
                                            category: service.category,
                                            vendorId: vendor.vendorId,
                                            vendorName: vendor.businessName || vendor.fullName,
                                            proposedPrice: service.targetBudget || 0,
                                            notes: service.specificRequirements || "",
                                          })}
                                          style={{
                                            background: vendor.isAvailable ? "#8C6435" : "#D1D5DB",
                                            color: "#FFF",
                                            border: "none",
                                            padding: "6px 14px",
                                            borderRadius: 6,
                                            fontSize: 11,
                                            fontWeight: 700,
                                            cursor: vendor.isAvailable ? "pointer" : "not-allowed",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: 4,
                                          }}
                                        >
                                          📩 Send Request
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Inline Dispatch Prompt */}
                                  {isDispatchingThis && (
                                    <div style={{ marginTop: 10, padding: "12px", background: "#FFF", border: "1px solid #D5C2A5", borderRadius: 8 }}>
                                      <strong style={{ fontSize: 12, color: "#8C6435", display: "block", marginBottom: 6 }}>
                                        Dispatch Inquiry to {activeDispatchingVendor.vendorName} for {service.category}:
                                      </strong>
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginBottom: 8 }}>
                                        <div>
                                          <label style={{ fontSize: 11, fontWeight: 600, color: "#6B5240", display: "block" }}>Proposed Budget (₹):</label>
                                          <input
                                            type="number"
                                            value={activeDispatchingVendor.proposedPrice}
                                            onChange={(e) => setActiveDispatchingVendor(prev => ({ ...prev, proposedPrice: e.target.value }))}
                                            style={{ width: "100%", padding: "5px 8px", fontSize: 12, border: "1px solid #D5C2A5", borderRadius: 6, boxSizing: "border-box" }}
                                          />
                                        </div>
                                        <div>
                                          <label style={{ fontSize: 11, fontWeight: 600, color: "#6B5240", display: "block" }}>Coordination Notes:</label>
                                          <input
                                            type="text"
                                            value={activeDispatchingVendor.notes}
                                            onChange={(e) => setActiveDispatchingVendor(prev => ({ ...prev, notes: e.target.value }))}
                                            style={{ width: "100%", padding: "5px 8px", fontSize: 12, border: "1px solid #D5C2A5", borderRadius: 6, boxSizing: "border-box" }}
                                          />
                                        </div>
                                      </div>
                                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                                        <button
                                          type="button"
                                          onClick={() => setActiveDispatchingVendor(null)}
                                          style={{ padding: "4px 10px", fontSize: 11, border: "1px solid #D1D5DB", background: "#FFF", borderRadius: 4, cursor: "pointer" }}
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          disabled={actionLoading}
                                          onClick={() => handleSendVendorRequest(activeDispatchingVendor.vendorId, service.category, activeDispatchingVendor.proposedPrice, activeDispatchingVendor.notes)}
                                          style={{ padding: "5px 14px", fontSize: 11, background: "#8C6435", color: "#FFF", border: "none", borderRadius: 4, fontWeight: 700, cursor: "pointer" }}
                                        >
                                          {actionLoading ? "Transmitting…" : "Transmit Request"}
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Inline Confirm Assignment Prompt */}
                                  {isConfirmingThis && (
                                    <div style={{ marginTop: 10, padding: "12px", background: "#F0FFF4", border: "1px solid #86EFAC", borderRadius: 8 }}>
                                      <strong style={{ fontSize: 12, color: "#166534", display: "block", marginBottom: 6 }}>
                                        Confirm Final Assignment with {activeConfirmingVendor.vendorName} ({service.category}):
                                      </strong>
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginBottom: 8 }}>
                                        <div>
                                          <label style={{ fontSize: 11, fontWeight: 600, color: "#166534", display: "block" }}>Final Agreed Amount (₹):</label>
                                          <input
                                            type="number"
                                            value={activeConfirmingVendor.agreedPrice}
                                            onChange={(e) => setActiveConfirmingVendor(prev => ({ ...prev, agreedPrice: e.target.value }))}
                                            style={{ width: "100%", padding: "5px 8px", fontSize: 12, border: "1px solid #86EFAC", borderRadius: 6, boxSizing: "border-box" }}
                                          />
                                        </div>
                                        <div>
                                          <label style={{ fontSize: 11, fontWeight: 600, color: "#166534", display: "block" }}>Assignment Specifications / Notes:</label>
                                          <input
                                            type="text"
                                            value={activeConfirmingVendor.assignmentNotes}
                                            placeholder="e.g. Confirmed package includes 4K drone + candid shooters"
                                            onChange={(e) => setActiveConfirmingVendor(prev => ({ ...prev, assignmentNotes: e.target.value }))}
                                            style={{ width: "100%", padding: "5px 8px", fontSize: 12, border: "1px solid #86EFAC", borderRadius: 6, boxSizing: "border-box" }}
                                          />
                                        </div>
                                      </div>
                                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                                        <button
                                          type="button"
                                          onClick={() => setActiveConfirmingVendor(null)}
                                          style={{ padding: "4px 10px", fontSize: 11, border: "1px solid #D1D5DB", background: "#FFF", borderRadius: 4, cursor: "pointer" }}
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          disabled={actionLoading}
                                          onClick={() => handleConfirmAssignment(activeConfirmingVendor.vendorId, service.category, activeConfirmingVendor.agreedPrice, activeConfirmingVendor.assignmentNotes)}
                                          style={{ padding: "5px 14px", fontSize: 11, background: "#16A34A", color: "#FFF", border: "none", borderRadius: 4, fontWeight: 700, cursor: "pointer" }}
                                        >
                                          {actionLoading ? "Confirming…" : "Lock & Confirm Assignment"}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Service-level fallback: Mark Unavailable */}
                        {!isConfirmed && !isCancelled && (
                          <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #F0E8D8", paddingTop: 8 }}>
                            {activeUnavailableService?.category === service.category ? (
                              <div style={{ width: "100%", background: "#FFF5F5", border: "1px solid #FCA5A5", borderRadius: 8, padding: 12 }}>
                                <label style={{ fontSize: 11, fontWeight: 700, color: "#991B1B", display: "block", marginBottom: 4 }}>
                                  Note to Host Regarding {service.category} Unavailability:
                                </label>
                                <textarea
                                  rows={2}
                                  value={activeUnavailableService.adminNotes}
                                  onChange={(e) => setActiveUnavailableService(prev => ({ ...prev, adminNotes: e.target.value }))}
                                  placeholder={`No verified artisan is available for ${service.category} on ${selectedEvent.date}. Remaining features are protected. Host will be given resolution options.`}
                                  style={{ width: "100%", padding: 8, fontSize: 12, border: "1px solid #FCA5A5", borderRadius: 6, boxSizing: "border-box" }}
                                />
                                <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                                  <button
                                    type="button"
                                    onClick={() => setActiveUnavailableService(null)}
                                    style={{ padding: "4px 10px", fontSize: 11, border: "1px solid #CCC", background: "#FFF", borderRadius: 4, cursor: "pointer" }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={() => handleMarkUnavailable(service.category, activeUnavailableService.adminNotes)}
                                    style={{ padding: "5px 12px", fontSize: 11, background: "#DC2626", color: "#FFF", border: "none", borderRadius: 4, fontWeight: 700, cursor: "pointer" }}
                                  >
                                    {actionLoading ? "Notifying…" : "Mark Unavailable & Notify Host"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setActiveUnavailableService({
                                  category: service.category,
                                  adminNotes: `Our verified artisans for ${service.category} are unavailable on ${selectedEvent.date}. All remaining confirmed features are protected.`,
                                })}
                                style={{
                                  padding: "4px 12px",
                                  background: "transparent",
                                  border: "1px dashed #DC2626",
                                  color: "#DC2626",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                Artisan Unavailable? Mark Unavailable & Notify Host
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : !readinessData ? (
                <div style={{ textAlign: "center", padding: "30px", color: "#8B7355" }}>
                  <div style={{ marginBottom: 10, color: "#C62828", fontWeight: 600 }}>
                    {readinessError || "Unable to load vendor readiness data."}
                  </div>
                  <button
                    type="button"
                    onClick={() => openVendorReviewModal(selectedEvent)}
                    style={{
                      padding: "6px 14px",
                      background: "#8C6435",
                      color: "#FFF",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Retry Loading Availability
                  </button>
                </div>
              ) : (
                /* Legacy Fallback Categories list */
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {readinessData.categories?.map((cat) => (
                    <div
                      key={cat.category}
                      style={{
                        background: cat.isExcluded ? "#F9F8F6" : "#fff",
                        border: cat.isExcluded ? "1px dashed #D1C7BD" : cat.isAccepted ? "1px solid #A3E7B8" : "1px solid #E8DCC8",
                        borderRadius: 12,
                        padding: 16,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {getCategoryIcon(cat.category)}
                          <strong style={{ fontSize: 14, color: cat.isExcluded ? "#8A7D75" : "#2B1D12" }}>
                            {cat.category}
                          </strong>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: cat.isAccepted ? "#E8F5EC" : "#FFF3CD", color: cat.isAccepted ? "#1B5E20" : "#856404" }}>
                          {cat.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer with Strict Gate */}
            {(() => {
              const reqServices = coordinationData?.requestedServices || [];
              const activeReq = reqServices.filter((s) => s.status !== "Cancelled by User");
              const isCoordAllConfirmed = activeReq.length > 0 && activeReq.every((s) => s.status === "Confirmed");
              const canApprove = isCoordAllConfirmed || (readinessData && readinessData.allAccepted);

              return (
                <div
                  style={{
                    background: "#FAF5EA",
                    borderTop: "1px solid #E8DCC8",
                    padding: "16px 24px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div>
                    {canApprove ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#1B5E20", fontSize: 12, fontWeight: 700 }}>
                        <CheckCircle2 size={16} color="#1B5E20" />
                        All active celebration features have been confirmed by artisans!
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#B4712A", fontSize: 12, fontWeight: 600 }}>
                        <AlertTriangle size={16} color="#B4712A" />
                        Artisan confirmation pending for unconfirmed features
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setReviewModalOpen(false)}
                      style={{
                        padding: "8px 16px",
                        background: "#FFF",
                        border: "1px solid #E7DED5",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        color: "#6B5240",
                      }}
                    >
                      Close
                    </button>

                    <button
                      type="button"
                      disabled={!canApprove || actionLoading}
                      onClick={() => handleFinalApprove(false)}
                      style={{
                        padding: "8px 20px",
                        background: canApprove
                          ? "linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)"
                          : "#D1C7BD",
                        color: "#FFF",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: canApprove ? "pointer" : "not-allowed",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <CheckCircle2 size={15} />
                      {actionLoading ? "Approving…" : "Approve Celebration & Assure"}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageEvents;

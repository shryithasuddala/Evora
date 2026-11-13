import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  ClipboardList,
  ChevronDown,
  User,
  CalendarDays,
  MapPin,
  Package,
  Clock,
  Wallet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { bookingsAPI } from "../../services/api";
import { useToast } from "../../context/ToastContext";

const STATUS_OPTIONS = [
  "All requests",
  "Pending",
  "Accepted",
  "Confirmed",
  "Declined",
];

const EventRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("All requests");
  const [actionLoading, setActionLoading] = useState(null);

  // Decline Modal State
  const [declineTarget, setDeclineTarget] = useState(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declineSubmitting, setDeclineSubmitting] = useState(false);

  const toast = useToast();

  const loadRequests = async () => {
    try {
      const data = await bookingsAPI.getAll();
      setRequests(data || []);
    } catch (err) {
      console.error("Failed to load requests:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const eventName = request.eventName || request.serviceName || "";
      const organizer = request.organizer || request.organizerId?.fullName || "";
      const itemsText = (request.items || []).join(" ");
      const category = request.serviceCategory || "";

      const matchesSearch =
        eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        organizer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        itemsText.toLowerCase().includes(searchTerm.toLowerCase());

      const status = request.status || "Pending";
      const matchesFilter =
        filter === "All requests" ||
        status === filter ||
        (filter === "Accepted" && status === "Accepted by Vendor") ||
        (filter === "Confirmed" && status === "Confirmed by Admin") ||
        (filter === "Declined" && status === "Declined by Vendor");

      return matchesSearch && matchesFilter;
    });
  }, [requests, searchTerm, filter]);

  const totalRequests = requests.length;
  const awaitingResponse = requests.filter(
    (request) => (request.status || "Pending") === "Pending"
  ).length;
  const acceptedCount = requests.filter(
    (request) => request.status === "Accepted" || request.status === "Accepted by Vendor"
  ).length;
  const confirmedCount = requests.filter(
    (request) => request.status === "Confirmed" || request.status === "Confirmed by Admin"
  ).length;

  const handleAcceptRequest = async (id, eventName) => {
    setActionLoading(id);
    try {
      await bookingsAPI.respondToRequest(id, { action: "accept" });
      toast.success("Request Accepted! 🎉", `Accepted "${eventName}". EVORA Admin will confirm final allocation.`);
      await loadRequests();
    } catch (err) {
      toast.error("Acceptance Failed", err.message || "Failed to accept request.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineSubmit = async (e) => {
    e.preventDefault();
    if (!declineTarget) return;
    if (!declineReason.trim()) {
      toast.error("Reason Required", "Please specify why you are declining this request.");
      return;
    }
    setDeclineSubmitting(true);
    try {
      await bookingsAPI.respondToRequest(declineTarget._id, {
        action: "decline",
        declineReason: declineReason.trim(),
      });
      toast.info("Request Declined", `Inquiry for "${declineTarget.eventName}" declined.`);
      setDeclineTarget(null);
      setDeclineReason("");
      await loadRequests();
    } catch (err) {
      toast.error("Decline Failed", err.message || "Failed to decline request.");
    } finally {
      setDeclineSubmitting(false);
    }
  };

  return (
    <div className="event-requests-page">
      <section className="event-requests-header">
        <span className="event-requests-label">ARTISAN EVENT MANAGEMENT</span>
        <h1>Celebration Inquiries & Bookings</h1>
        <p>Review incoming event service requests dispatched by EVORA Admin. Accept to confirm your availability.</p>
      </section>

      {/* STATISTICS */}
      <section className="request-stats">
        <div className="request-stat-card">
          <span>Total Inquiries</span>
          <strong>{totalRequests}</strong>
        </div>
        <div className="request-stat-card">
          <span>Awaiting Your Response</span>
          <strong style={{ color: awaitingResponse > 0 ? "#C9A13A" : "inherit" }}>{awaitingResponse}</strong>
        </div>
        <div className="request-stat-card">
          <span>Accepted (Pending Admin)</span>
          <strong style={{ color: "#2563EB" }}>{acceptedCount}</strong>
        </div>
        <div className="request-stat-card">
          <span>Confirmed Celebrations</span>
          <strong style={{ color: "#16A34A" }}>{confirmedCount}</strong>
        </div>
      </section>

      {/* SEARCH AND FILTER */}
      <section className="request-filters">
        <div className="request-search">
          <Search size={19} />
          <input
            type="text"
            placeholder="Search events, organizers, or services..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="request-filter-select">
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown size={17} />
        </div>
      </section>

      {/* REQUEST LIST */}
      <section className="request-list">
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#8B7355" }}>Loading artisan inquiries…</div>
        ) : filteredRequests.length === 0 ? (
          <div className="requests-empty-state">
            <ClipboardList size={40} />
            <h2>No event requests found</h2>
            <p>
              When EVORA Admin allocates celebrations to your artisan profile,
              they will appear here immediately for your review.
            </p>
          </div>
        ) : (
          filteredRequests.map((request) => {
            const reqId = request._id || request.id;
            const status = request.status || "Pending";
            const isPending = status === "Pending";
            const isAccepted = status === "Accepted" || status === "Accepted by Vendor";
            const isConfirmed = status === "Confirmed" || status === "Confirmed by Admin";
            const isDeclined = status === "Declined" || status === "Declined by Vendor" || status === "Rejected";

            const proposedPrice = request.proposedPrice || request.totalPrice || 0;
            const eventTime = request.eventId?.time || "";
            const responseDeadline = request.responseDeadline ? new Date(request.responseDeadline).toLocaleDateString("en-IN") : "Within 48 hours";

            return (
              <div
                className="event-request-card"
                key={reqId}
                style={{
                  border: isConfirmed ? "2px solid #22C55E" : isAccepted ? "1.5px solid #60A5FA" : "1px solid #E8DCC8",
                  background: isConfirmed ? "#F0FDF4" : isAccepted ? "#F0F7FF" : "#FFF",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <h2 style={{ margin: 0, fontSize: 18, color: "#2B1D12" }}>
                    {request.eventName || request.serviceName || "Celebration Request"}
                  </h2>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 20,
                      background: isConfirmed ? "#DCFCE7" : isAccepted ? "#DBEAFE" : isDeclined ? "#FEE2E2" : "#FEF3C7",
                      color: isConfirmed ? "#166534" : isAccepted ? "#1E40AF" : isDeclined ? "#991B1B" : "#92400E",
                    }}
                  >
                    {isConfirmed ? "Confirmed ✓" : isAccepted ? "Accepted (Awaiting Admin)" : isDeclined ? "Declined ✕" : "Pending Your Action ⏳"}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, margin: "14px 0" }}>
                  <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6B5240" }}>
                    <CalendarDays size={16} color="#8C6435" />
                    <strong>Date & Time:</strong> {request.eventDate || "Date TBD"} {eventTime && `at ${eventTime}`}
                  </p>

                  <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6B5240" }}>
                    <MapPin size={16} color="#8C6435" />
                    <strong>Location:</strong> {request.eventVenue || "Venue not set"}
                  </p>

                  <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6B5240" }}>
                    <Package size={16} color="#8C6435" />
                    <strong>Requested Service:</strong> {request.serviceCategory || request.serviceName || "Service"}
                  </p>

                  <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6B5240" }}>
                    <User size={16} color="#8C6435" />
                    <strong>Organizer:</strong> {request.organizer || request.organizerId?.fullName || "EVORA Host"} ({request.guestCount || 0} Guests)
                  </p>
                </div>

                {/* Proposed Budget & Deadline Strip */}
                <div style={{ background: "#FAF6EF", border: "1px solid #E8DCC8", borderRadius: 8, padding: "10px 14px", margin: "10px 0", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 11, color: "#8A7D75", display: "block" }}>PROPOSED BUDGET</span>
                    <strong style={{ fontSize: 15, color: "#2B1D12" }}>
                      ₹{proposedPrice > 0 ? proposedPrice.toLocaleString("en-IN") : "Standard Rate"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "#8A7D75", display: "block" }}>RESPONSE DEADLINE</span>
                    <strong style={{ fontSize: 13, color: "#92400E" }}>
                      📅 {responseDeadline}
                    </strong>
                  </div>
                </div>

                {/* Special Requirements */}
                {(request.notes || request.assignmentNotes) && (
                  <div style={{ margin: "8px 0 14px", fontSize: 12, color: "#4B5563", background: "#F9FAFB", padding: "8px 12px", borderRadius: 6 }}>
                    <strong>Special Requirements & Notes:</strong> {request.notes || request.assignmentNotes}
                  </div>
                )}

                {/* Status Banners */}
                {isAccepted && !isConfirmed && (
                  <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 14px", margin: "10px 0", fontSize: 12, color: "#1E40AF", display: "flex", alignItems: "center", gap: 8 }}>
                    <Clock size={16} color="#2563EB" />
                    <span>
                      You accepted this request! Awaiting final EVORA Admin confirmation and price lock.
                    </span>
                  </div>
                )}

                {isConfirmed && (
                  <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 8, padding: "10px 14px", margin: "10px 0", fontSize: 12, color: "#065F46", display: "flex", alignItems: "center", gap: 8 }}>
                    <CheckCircle size={16} color="#16A34A" />
                    <span>
                      <strong>Assignment Confirmed!</strong> Locked agreed amount: ₹{(request.totalPrice || proposedPrice).toLocaleString("en-IN")}.
                    </span>
                  </div>
                )}

                {isDeclined && request.declineReason && (
                  <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "8px 12px", margin: "10px 0", fontSize: 12, color: "#991B1B" }}>
                    <strong>Declined:</strong> &quot;{request.declineReason}&quot;
                  </div>
                )}

                {/* ACTIONS */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #F0E8D8", paddingTop: 12, marginTop: 12, flexWrap: "wrap", gap: 8 }}>
                  <Link
                    to={`/vendor/requests/${reqId}`}
                    style={{ fontSize: 12, color: "#8C6435", fontWeight: 600, textDecoration: "none" }}
                  >
                    View Full Specifications →
                  </Link>

                  {isPending && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        disabled={actionLoading === reqId}
                        onClick={() => handleAcceptRequest(reqId, request.eventName)}
                        style={{
                          background: "#16A34A",
                          color: "#FFF",
                          border: "none",
                          borderRadius: 6,
                          padding: "8px 16px",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        ✓ Accept Request
                      </button>

                      <button
                        type="button"
                        disabled={actionLoading === reqId}
                        onClick={() => {
                          setDeclineTarget(request);
                          setDeclineReason("");
                        }}
                        style={{
                          background: "#FFF",
                          color: "#DC2626",
                          border: "1px solid #FCA5A5",
                          borderRadius: 6,
                          padding: "8px 14px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        ✕ Decline
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Decline Reason Modal */}
      {declineTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(3px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#FFF",
              borderRadius: 12,
              padding: "24px",
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
            }}
          >
            <h3 style={{ margin: "0 0 6px", fontSize: 18, color: "#2B1D12" }}>
              Decline Celebration Request
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#6B5240" }}>
              Please specify the reason for declining <strong>{declineTarget.eventName}</strong>. EVORA Admin will be notified to coordinate an alternative artisan for the host.
            </p>

            <form onSubmit={handleDeclineSubmit}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#2B1D12", display: "block", marginBottom: 6 }}>
                Decline Reason *
              </label>
              <textarea
                rows={3}
                required
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. Schedule conflict on this date, fully booked for another wedding, insufficient crew..."
                style={{
                  width: "100%",
                  padding: "10px",
                  fontSize: 13,
                  borderRadius: 8,
                  border: "1px solid #D5C2A5",
                  boxSizing: "border-box",
                  marginBottom: 16,
                }}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setDeclineTarget(null)}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #D1D5DB",
                    background: "#FFF",
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={declineSubmitting}
                  style={{
                    padding: "8px 18px",
                    background: "#DC2626",
                    color: "#FFF",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {declineSubmitting ? "Declining…" : "Confirm Decline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventRequests;

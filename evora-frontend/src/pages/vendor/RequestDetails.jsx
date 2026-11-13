import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
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

const RequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Decline Modal State
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declineSubmitting, setDeclineSubmitting] = useState(false);

  const toast = useToast();

  const fetchRequest = async () => {
    try {
      const data = await bookingsAPI.getOne(id);
      setRequest(data);
    } catch (err) {
      console.error("Error loading request:", err.message);
      toast.error("Error Loading Inquiry", err.message || "Failed to load request.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const handleAccept = async () => {
    if (!request) return;
    setActionLoading(true);
    try {
      await bookingsAPI.respondToRequest(request._id || request.id, { action: "accept" });
      toast.success("Request Accepted! 🎉", "Admin will review and confirm final booking allocation.");
      await fetchRequest();
    } catch (err) {
      toast.error("Acceptance Failed", err.message || "Failed to accept request.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineSubmit = async (e) => {
    e.preventDefault();
    if (!declineReason.trim()) {
      toast.error("Reason Required", "Please state why you are declining this celebration request.");
      return;
    }
    setDeclineSubmitting(true);
    try {
      await bookingsAPI.respondToRequest(request._id || request.id, {
        action: "decline",
        declineReason: declineReason.trim(),
      });
      toast.info("Request Declined", "EVORA Admin will be notified to assist the client.");
      setDeclineModalOpen(false);
      await fetchRequest();
    } catch (err) {
      toast.error("Decline Failed", err.message || "Failed to submit decline response.");
    } finally {
      setDeclineSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="event-requests-page" style={{ textAlign: "center", padding: 60 }}>
        <p style={{ color: "#8B7355", fontSize: 16 }}>Loading celebration inquiry details…</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="event-requests-page">
        <section className="event-requests-header">
          <span className="event-requests-label">EVENT MANAGEMENT</span>
          <h1>Request Not Found</h1>
          <p>This event inquiry is no longer active or available in the system.</p>
          <Link to="/vendor/requests" className="view-request-details">
            <ArrowLeft size={17} />
            Back to Event Requests
          </Link>
        </section>
      </div>
    );
  }

  const reqId = request._id || request.id;
  const status = request.status || "Pending";
  const isPending = status === "Pending";
  const isAccepted = status === "Accepted" || status === "Accepted by Vendor";
  const isConfirmed = status === "Confirmed" || status === "Confirmed by Admin";
  const isDeclined = status === "Declined" || status === "Declined by Vendor";

  const eventName = request.eventName || request.serviceName || "Celebration Inquiry";
  const organizerName = request.organizer || request.organizerId?.fullName || "Organizer";
  const organizerPhone = request.organizerId?.phone || "";
  const eventDate = request.eventDate || request.date || "Date to be scheduled";
  const eventVenue = request.eventVenue || request.location || "Venue to be announced";
  const serviceCategory = request.serviceCategory || (request.items && request.items[0]) || "Celebration Service";
  const guestCount = request.guestCount || (request.eventId && request.eventId.guestCount) || 0;
  const proposedBudget = request.proposedPrice || request.price || request.totalAmount || 0;
  const notes = request.assignmentNotes || request.notes || "";
  const deadline = request.responseDeadline ? new Date(request.responseDeadline).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : null;

  return (
    <div className="event-requests-page" style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>
      <Link
        to="/vendor/requests"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          color: "#8C6435",
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
          marginBottom: 20,
        }}
      >
        <ArrowLeft size={16} />
        Back to Event Requests
      </Link>

      {/* Main Request Details Card */}
      <div
        style={{
          background: "#FFFDF9",
          borderRadius: 16,
          border: isConfirmed ? "2px solid #25D366" : isAccepted ? "1.5px solid #60A5FA" : isDeclined ? "1.5px solid #FCA5A5" : "1px solid #E8DCC8",
          padding: 28,
          boxShadow: "0 8px 30px rgba(0,0,0,0.05)",
        }}
      >
        {/* Header Ribbon */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, borderBottom: "1px solid #F0E6D8", paddingBottom: 18, marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  padding: "3px 10px",
                  borderRadius: 4,
                  background: "#FAF0E1",
                  color: "#8C6435",
                  border: "1px solid #D5C2A5",
                }}
              >
                {serviceCategory}
              </span>
              <span style={{ fontSize: 12, color: "#8B7355" }}>Ref ID: #{String(reqId).slice(-6)}</span>
            </div>
            <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 24, margin: "0 0 4px", color: "#2B1D12" }}>
              {eventName}
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: "#766C67" }}>
              Inquiry dispatched by EVORA Platform Coordination
            </p>
          </div>

          {/* Status Badge */}
          <div>
            {isPending && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, background: "#FFFBEB", color: "#B45309", border: "1px solid #FDE68A", fontSize: 12, fontWeight: 700 }}>
                <Clock size={14} /> Response Awaited
              </span>
            )}
            {isAccepted && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", fontSize: 12, fontWeight: 700 }}>
                <CheckCircle size={14} /> Accepted • Awaiting Admin Confirmation
              </span>
            )}
            {isConfirmed && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, background: "#E8F9EE", color: "#166534", border: "1px solid #86EFAC", fontSize: 12, fontWeight: 700 }}>
                <CheckCircle size={14} /> Confirmed Assignment
              </span>
            )}
            {isDeclined && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA", fontSize: 12, fontWeight: 700 }}>
                <XCircle size={14} /> Declined by Artisan
              </span>
            )}
          </div>
        </div>

        {/* Notice Banners */}
        {isAccepted && (
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={18} color="#2563EB" />
            <div style={{ fontSize: 13, color: "#1E40AF" }}>
              <strong>Acceptance Recorded:</strong> You have accepted this celebration request. EVORA Admin will review your allocation and confirm the final engagement.
            </div>
          </div>
        )}

        {isConfirmed && (
          <div style={{ background: "#E8F9EE", border: "1px solid #86EFAC", borderRadius: 8, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <CheckCircle size={18} color="#166534" />
            <div style={{ fontSize: 13, color: "#166534" }}>
              <strong>Booking Officially Confirmed!</strong> EVORA Admin has locked your artisan engagement for this celebration.
            </div>
          </div>
        )}

        {isDeclined && request.declineReason && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <AlertCircle size={18} color="#DC2626" />
            <div style={{ fontSize: 13, color: "#991B1B" }}>
              <strong>Decline Reason Provided:</strong> &ldquo;{request.declineReason}&rdquo;
            </div>
          </div>
        )}

        {/* Key Event Attributes Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
          <div style={{ background: "#FAF6F0", borderRadius: 8, padding: "14px 16px", border: "1px solid #EADBCE" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8B7355", marginBottom: 4 }}>
              <CalendarDays size={14} /> Event Date
            </div>
            <strong style={{ fontSize: 14, color: "#2B1D12" }}>{eventDate}</strong>
          </div>

          <div style={{ background: "#FAF6F0", borderRadius: 8, padding: "14px 16px", border: "1px solid #EADBCE" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8B7355", marginBottom: 4 }}>
              <MapPin size={14} /> Location / Venue
            </div>
            <strong style={{ fontSize: 14, color: "#2B1D12" }}>{eventVenue}</strong>
          </div>

          <div style={{ background: "#FAF6F0", borderRadius: 8, padding: "14px 16px", border: "1px solid #EADBCE" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8B7355", marginBottom: 4 }}>
              <User size={14} /> Host / Organizer
            </div>
            <strong style={{ fontSize: 14, color: "#2B1D12" }}>{organizerName}</strong>
            {organizerPhone && <div style={{ fontSize: 12, color: "#6B5240", marginTop: 2 }}>{organizerPhone}</div>}
          </div>

          <div style={{ background: "#FAF6F0", borderRadius: 8, padding: "14px 16px", border: "1px solid #EADBCE" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8B7355", marginBottom: 4 }}>
              <Wallet size={14} /> Proposed Budget / Target
            </div>
            <strong style={{ fontSize: 15, color: "#166534" }}>
              {proposedBudget > 0 ? `₹${Number(proposedBudget).toLocaleString("en-IN")}` : "Open for Proposal"}
            </strong>
          </div>
        </div>

        {/* Detailed Service Specifications */}
        <div style={{ borderTop: "1px solid #F0E6D8", paddingTop: 18, marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, color: "#2B1D12", margin: "0 0 10px" }}>
            Inquiry & Service Specifications
          </h3>

          {guestCount > 0 && (
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "#5C4B3C" }}>
              <strong>Expected Guest Count:</strong> {guestCount} guests
            </p>
          )}

          {deadline && (
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "#B45309" }}>
              <strong>Admin Response Deadline:</strong> {deadline}
            </p>
          )}

          {notes && (
            <div style={{ background: "#FFF", border: "1px dashed #D5C2A5", borderRadius: 8, padding: "12px 14px", marginTop: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#8C6435", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                Admin Coordination Notes / Client Preferences
              </span>
              <p style={{ margin: 0, fontSize: 13, color: "#2B1D12" }}>
                {notes}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons for Pending Request */}
        {isPending && (
          <div style={{ borderTop: "1px solid #F0E6D8", paddingTop: 20, display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setDeclineModalOpen(true)}
              style={{
                padding: "10px 22px",
                borderRadius: 8,
                border: "1.5px solid #FCA5A5",
                background: "#FEF2F2",
                color: "#DC2626",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <XCircle size={15} /> Decline Inquiry
            </button>

            <button
              type="button"
              disabled={actionLoading}
              onClick={handleAccept}
              style={{
                padding: "10px 28px",
                borderRadius: 8,
                border: "none",
                background: "linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)",
                color: "#FAF5EA",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 4px 12px rgba(27, 94, 32, 0.25)",
              }}
            >
              <CheckCircle size={15} />
              {actionLoading ? "Accepting…" : "Accept Celebration Request"}
            </button>
          </div>
        )}
      </div>

      {/* Decline Reason Modal */}
      {declineModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(3px)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#FFF",
              borderRadius: 14,
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
              Please specify the reason for declining <strong>{eventName}</strong>. EVORA Admin will be notified to coordinate an alternative artisan for the host.
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
                  fontFamily: "inherit",
                }}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setDeclineModalOpen(false)}
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
                  {declineSubmitting ? "Submitting…" : "Confirm Decline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestDetails;

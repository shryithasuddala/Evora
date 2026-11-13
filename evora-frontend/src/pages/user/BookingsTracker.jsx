import { useState, useEffect } from "react";
import { bookingsAPI, reviewsAPI, paymentsAPI } from "../../services/api";
import { Star, CheckCircle, X, MessageCircle, CreditCard, XCircle, AlertTriangle } from "lucide-react";
import { useToast } from "../../context/ToastContext";

const STATUS_COLORS = {
  Pending: { bg: "#FFF8E8", color: "#C9A13A" },
  "Proposal Sent": { bg: "#E8F0FF", color: "#4A6FD4" },
  Accepted: { bg: "#E8F5EC", color: "#304B35" },
  "Accepted by Vendor": { bg: "#EFF6FF", color: "#2563EB" },
  Confirmed: { bg: "#E8F9EE", color: "#1E8E46" },
  "Confirmed by Admin": { bg: "#E8F9EE", color: "#1E8E46" },
  Completed: { bg: "#F0FFF4", color: "#1A7A3A" },
  Declined: { bg: "#FFF0F0", color: "#CC4444" },
  "Declined by Vendor": { bg: "#FFF0F0", color: "#CC4444" },
  Cancelled: { bg: "#FFF5F5", color: "#CC0000" },
};

const BookingsTracker = () => {
  const toast = useToast();
  const [bookings, setBookings] = useState([]);
  const [proposals, setProposals] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Cancellation modal state
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // Review modal state
  const [reviewBooking, setReviewBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewedBookings, setReviewedBookings] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const bkgs = await bookingsAPI.getAll();
        setBookings(bkgs || []);
        // Fetch proposals for Proposal Sent, Accepted, and Completed bookings
        const propMap = {};
        await Promise.all(
          (bkgs || [])
            .filter((b) => ["Proposal Sent", "Accepted", "Completed"].includes(b.status))
            .map(async (b) => {
              try {
                const prop = await bookingsAPI.getProposal(b._id);
                if (prop) propMap[b._id] = prop;
              } catch { /* no proposal yet */ }
            })
        );
        setProposals(propMap);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const TABS = ["All", "Pending", "Proposal Sent", "Accepted", "Confirmed", "Completed", "Declined", "Cancelled"];
  const filtered = activeTab === "All" ? bookings : bookings.filter((b) => b.status === activeTab);

  const handleAccept = async (booking) => {
    setActionLoading(booking._id);
    try {
      await bookingsAPI.updateStatus(booking._id, "Accepted");
      setBookings((prev) => prev.map((b) => b._id === booking._id ? { ...b, status: "Accepted" } : b));
      toast.success("Quote Accepted! 🎉", "Please proceed to pay the 50% advance to lock your date.");
    } catch (err) {
      toast.error("Acceptance Failed", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePayAdvance = async (booking, proposal) => {
    setActionLoading(booking._id);
    try {
      const advanceTarget = Math.round(Number(proposal?.servicePrice || booking.totalPrice || 25000) * 0.5);
      const res = await paymentsAPI.createPayment({
        bookingId: booking._id,
        mode: "advance50",
        method: "UPI",
      });
      setBookings((prev) =>
        prev.map((b) =>
          b._id === booking._id
            ? {
                ...b,
                status: "Confirmed",
                paymentStatus: "Partially Paid",
                paidAmount: res.payment?.amountPaid || advanceTarget,
              }
            : b
        )
      );
      toast.success(
        "Advance Payment Successful! 💰",
        `50% advance (₹${advanceTarget.toLocaleString("en-IN")}) received. Booking is confirmed and celebration date is locked!`
      );
    } catch (err) {
      toast.error("Payment Failed", err.message || "Could not process advance payment.");
    } finally {
      setActionLoading(null);
    }
  };

  const openCancelModal = (booking) => {
    setCancelTarget(booking);
    setCancelReason("");
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const res = await bookingsAPI.cancel(cancelTarget._id, cancelReason);
      const paid = Number(cancelTarget.paidAmount || 0);
      const fee = res.cancellationFee !== undefined ? res.cancellationFee : (paid > 0 ? Math.round(paid * 0.20) : 0);
      const refund = res.refundAmount !== undefined ? res.refundAmount : (paid > 0 ? paid - fee : 0);

      setBookings((prev) =>
        prev.map((b) =>
          b._id === cancelTarget._id
            ? {
                ...b,
                status: "Cancelled",
                paymentStatus: paid > 0 ? "Refunded" : b.paymentStatus,
                cancellationFee: fee,
                refundAmount: refund,
              }
            : b
        )
      );

      if (paid > 0) {
        toast.warning(
          "Booking Cancelled ⚠️",
          `20% non-refundable fee (₹${fee.toLocaleString("en-IN")}) retained. Refund of ₹${refund.toLocaleString("en-IN")} (80%) processed.`
        );
      } else {
        toast.info("Booking Cancelled", "The booking request has been cancelled.");
      }
      setCancelTarget(null);
    } catch (err) {
      toast.error("Cancellation Failed", err.message || "Failed to cancel booking.");
    } finally {
      setCancelling(false);
    }
  };

  const handleComplete = async (booking) => {
    setActionLoading(booking._id);
    try {
      await bookingsAPI.updateStatus(booking._id, "Completed");
      setBookings((prev) => prev.map((b) => b._id === booking._id ? { ...b, status: "Completed" } : b));
      toast.success("Service Completed! ✨", "Artisan fulfillment verified. You can now leave a review.");
    } catch (err) {
      toast.error("Status Update Failed", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (booking) => {
    if (!window.confirm("Decline this booking?")) return;
    setActionLoading(booking._id);
    try {
      await bookingsAPI.updateStatus(booking._id, "Declined");
      setBookings((prev) => prev.map((b) => b._id === booking._id ? { ...b, status: "Declined" } : b));
      toast.info("Booking Declined", "Vendor has been notified.");
    } catch (err) {
      toast.error("Action Failed", err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewBooking) return;
    setReviewSubmitting(true);
    try {
      await reviewsAPI.create({
        vendorId: reviewBooking.vendorId?._id || reviewBooking.vendorId,
        bookingId: reviewBooking._id,
        eventName: reviewBooking.eventName || "Celebration",
        rating: Number(rating),
        comment,
      });
      setReviewedBookings((prev) => ({ ...prev, [reviewBooking._id]: true }));
      setReviewBooking(null);
      setComment("");
      setRating(5);
      toast.success("Review Submitted! ⭐", "Thank you for rating this artisan vendor.");
    } catch (err) {
      toast.error("Review Failed", err.message || "Failed to submit review.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) return (
    <div className="vendor-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #C9A13A", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ color: "#8B7355" }}>Loading bookings…</p>
      </div>
    </div>
  );

  return (
    <div className="vendor-page">
      <div style={{ marginBottom: 24 }}>
        <span className="vendor-welcome-label" style={{ color: "#C9A13A" }}>CELEBRATION SERVICES</span>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 30, margin: "4px 0" }}>Services & Booking Tracker</h1>
        <p style={{ color: "#8B7355", margin: 0 }}>Track your EVORA assured celebration services and advance payment status.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              padding: "8px 18px",
              borderRadius: 20,
              border: "1px solid",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              borderColor: activeTab === t ? "#C9A13A" : "#E8DCC8",
              background: activeTab === t ? "#C9A13A" : "#fff",
              color: activeTab === t ? "#fff" : "#6B5240",
              transition: "all 0.15s ease",
            }}
          >
            {t} {t === "All" ? `(${bookings.length})` : `(${bookings.filter((b) => b.status === t).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 50, color: "#8B7355", background: "#FAF5EA", borderRadius: 12, border: "1px dashed #C9A13A55" }}>
          No bookings found in this view.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map((b) => {
            const colors = STATUS_COLORS[b.status] || STATUS_COLORS.Pending;
            const proposal = proposals[b._id];
            const isExpanded = expandedId === b._id;
            const hasReviewed = reviewedBookings[b._id];

            return (
              <div key={b._id} style={{ background: "#fff", border: "1px solid #E8DCC8", borderRadius: 14, overflow: "hidden" }}>
                <div
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    userSelect: "none"
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : b._id)}
                >
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: "#2B1D12" }}>
                      {b.serviceName || "Celebration Service"}
                    </p>
                    <p style={{ margin: "3px 0 0", fontSize: 13, color: "#8B7355" }}>
                      EVORA Assured Service · {b.eventName}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20, background: colors.bg, color: colors.color }}>
                      {b.status}
                    </span>
                    <span style={{ color: "#C9A13A", fontSize: 16 }}>{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: "1px solid #F0E8D8", padding: "18px 20px", background: "#FDFAF4" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
                      {b.eventDate && (
                        <div>
                          <span style={{ fontSize: 11, color: "#8B7355", textTransform: "uppercase" }}>Event Date</span>
                          <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 500, color: "#2B1D12" }}>{b.eventDate}</p>
                        </div>
                      )}
                      {b.eventVenue && (
                        <div>
                          <span style={{ fontSize: 11, color: "#8B7355", textTransform: "uppercase" }}>Venue</span>
                          <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 500, color: "#2B1D12" }}>{b.eventVenue}</p>
                        </div>
                      )}
                      {b.guestCount > 0 && (
                        <div>
                          <span style={{ fontSize: 11, color: "#8B7355", textTransform: "uppercase" }}>Guests</span>
                          <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 500, color: "#2B1D12" }}>{b.guestCount}</p>
                        </div>
                      )}
                    </div>

                    {/* Proposal details */}
                    {proposal && (
                      <div style={{ background: "#fff", border: "1px solid #C9A13A44", borderRadius: 10, padding: "16px", marginBottom: 16 }}>
                        <p style={{ margin: "0 0 10px", fontWeight: 600, fontSize: 14, color: "#2B1D12" }}>📋 EVORA Service Allocation & Quote</p>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, fontSize: 13 }}>
                          <div><span style={{ color: "#8B7355" }}>Service Price: </span><strong>₹{Number(proposal.servicePrice).toLocaleString()}</strong></div>
                          <div><span style={{ color: "#8B7355" }}>Advance (50%): </span><strong>₹{Number(proposal.advanceAmount || Math.round(proposal.servicePrice * 0.5)).toLocaleString()}</strong></div>
                          {proposal.serviceDuration && <div><span style={{ color: "#8B7355" }}>Duration: </span>{proposal.serviceDuration}</div>}
                          {proposal.validityDate && <div><span style={{ color: "#8B7355" }}>Valid till: </span>{proposal.validityDate}</div>}
                          {proposal.includedServices && <div style={{ gridColumn: "1/-1" }}><span style={{ color: "#8B7355" }}>Includes: </span>{proposal.includedServices}</div>}
                          {proposal.description && <div style={{ gridColumn: "1/-1" }}><span style={{ color: "#8B7355" }}>Note: </span>{proposal.description}</div>}
                        </div>
                      </div>
                    )}

                    {/* Paid details & Cancellation Breakdown */}
                    {b.paidAmount > 0 && b.status !== "Cancelled" && (
                      <div style={{ background: "#EAF8EF", border: "1px solid #A3E7B8", borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong style={{ color: "#1E8E46", fontSize: 13 }}>✓ Advance Payment Received</strong>
                          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#304B35" }}>
                            ₹{Number(b.paidAmount).toLocaleString("en-IN")} paid · Celebration date locked & confirmed
                          </p>
                        </div>
                        <span style={{ fontSize: 11, background: "#1E8E46", color: "#FFF", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
                          {b.paymentStatus || "Partially Paid"}
                        </span>
                      </div>
                    )}

                    {b.status === "Cancelled" && (
                      <div style={{ background: "#FFF5F5", border: "1px solid #FFCCCC", borderRadius: 10, padding: "14px", marginBottom: 16 }}>
                        <div style={{ display: "center", alignItems: "center", gap: 6, color: "#CC0000", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                          <XCircle size={16} /> Booking Cancelled
                        </div>
                        {b.paidAmount > 0 ? (
                          <div style={{ fontSize: 12, color: "#4A3B32", lineHeight: 1.5 }}>
                            <div>• Total Advance Paid: <strong>₹{Number(b.paidAmount).toLocaleString("en-IN")}</strong></div>
                            <div style={{ color: "#CC0000" }}>• Non-Refundable Fee (20% retained): <strong>₹{Number(b.cancellationFee || Math.round(b.paidAmount * 0.20)).toLocaleString("en-IN")}</strong></div>
                            <div style={{ color: "#1E8E46" }}>• Refund Processed (80% returned): <strong>₹{Number(b.refundAmount || (b.paidAmount - Math.round(b.paidAmount * 0.20))).toLocaleString("en-IN")}</strong></div>
                            <p style={{ margin: "6px 0 0", fontSize: 11, color: "#888" }}>
                              * Per EVORA terms, 20% of advance payment is retained for reservation costs; 80% is refunded to your original payment method.
                            </p>
                          </div>
                        ) : (
                          <p style={{ margin: 0, fontSize: 12, color: "#666" }}>
                            Inquiry cancelled with 0% penalty (no advance payment had been made).
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      {b.status === "Confirmed" && (
                        <span
                          style={{
                            padding: "6px 12px",
                            borderRadius: 8,
                            background: "#EAF8EF",
                            color: "#1E8E46",
                            fontSize: 12,
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <MessageCircle size={14} /> Confirmed (Automated alerts enabled in Notifications)
                        </span>
                      )}

                      {b.status === "Proposal Sent" && (
                        <>
                          <button
                            onClick={() => handleAccept(b)}
                            disabled={actionLoading === b._id}
                            className="vendor-btn"
                            style={{ padding: "8px 20px", fontSize: 13 }}
                          >
                            {actionLoading === b._id ? "Processing…" : "✓ Accept Quote"}
                          </button>
                          <button
                            onClick={() => handleDecline(b)}
                            disabled={actionLoading === b._id}
                            style={{ padding: "8px 20px", border: "1px solid #FFCCCC", borderRadius: 8, background: "#FFF5F5", color: "#CC4444", cursor: "pointer", fontSize: 13 }}
                          >
                            ✗ Decline
                          </button>
                        </>
                      )}

                      {b.status === "Accepted" && (
                        <>
                          <button
                            onClick={() => handlePayAdvance(b, proposal)}
                            disabled={actionLoading === b._id}
                            style={{
                              padding: "8px 18px",
                              borderRadius: 8,
                              background: "#1E8E46",
                              color: "#FFF",
                              border: "none",
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              boxShadow: "0 2px 6px rgba(30,142,70,0.3)",
                            }}
                          >
                            <CreditCard size={15} />
                            {actionLoading === b._id
                              ? "Processing…"
                              : `Pay 50% Advance (₹${Number(
                                  proposal?.advanceAmount ||
                                    Math.round(
                                      (proposal?.servicePrice || b.totalPrice || 25000) * 0.5
                                    )
                                ).toLocaleString("en-IN")})`}
                          </button>

                          <button
                            onClick={() => handleComplete(b)}
                            disabled={actionLoading === b._id}
                            style={{
                              padding: "8px 18px",
                              borderRadius: 8,
                              border: "1px solid #304B35",
                              background: "#304B35",
                              color: "#FAF5EA",
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <CheckCircle size={15} />
                            {actionLoading === b._id ? "Updating…" : "Mark Completed"}
                          </button>
                        </>
                      )}

                      {b.status === "Confirmed" && (
                        <button
                          onClick={() => handleComplete(b)}
                          disabled={actionLoading === b._id}
                          style={{
                            padding: "8px 18px",
                            borderRadius: 8,
                            border: "1px solid #304B35",
                            background: "#304B35",
                            color: "#FAF5EA",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <CheckCircle size={15} />
                          {actionLoading === b._id ? "Updating…" : "Mark Completed"}
                        </button>
                      )}

                      {/* Cancel Booking Button (Available for Pending, Proposal Sent, Accepted, Confirmed) */}
                      {["Pending", "Proposal Sent", "Accepted", "Confirmed"].includes(b.status) && (
                        <button
                          onClick={() => openCancelModal(b)}
                          disabled={actionLoading === b._id}
                          style={{
                            padding: "8px 16px",
                            borderRadius: 8,
                            border: "1px solid #FFCCCC",
                            background: "#FFF5F5",
                            color: "#CC0000",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                          title="Cancel this booking (20% fee applies on advance payments)"
                        >
                          <XCircle size={14} /> Cancel Booking
                        </button>
                      )}

                      {(b.status === "Completed" || b.status === "Accepted") && !hasReviewed && (
                        <button
                          onClick={() => setReviewBooking(b)}
                          style={{
                            padding: "8px 18px",
                            borderRadius: 8,
                            border: "1px solid #C9A13A",
                            background: "#FAF5EA",
                            color: "#8C6435",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Star size={15} fill="#C9A13A" color="#C9A13A" />
                          Write Review
                        </button>
                      )}

                      {hasReviewed && (
                        <span style={{ fontSize: 12, color: "#304B35", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle size={14} /> Review Submitted
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Write Review Modal */}
      {reviewBooking && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(33, 22, 14, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#FFFDF9",
              border: "1px solid #D5B36A",
              borderRadius: 16,
              width: "100%",
              maxWidth: 500,
              padding: 28,
              position: "relative",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            }}
          >
            <button
              onClick={() => setReviewBooking(null)}
              style={{ position: "absolute", top: 18, right: 18, background: "none", border: "none", cursor: "pointer", color: "#8B7355" }}
            >
              <X size={20} />
            </button>

            <span style={{ fontSize: 11, fontWeight: 700, color: "#C9A13A", letterSpacing: "1px" }}>CELEBRATION SERVICE RATING</span>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, margin: "4px 0 6px", color: "#2B1D12" }}>
              Review {reviewBooking.serviceName || "Celebration Service"}
            </h2>
            <p style={{ fontSize: 13, color: "#766C67", margin: "0 0 20px" }}>
              Share your celebration experience for {reviewBooking.serviceName || reviewBooking.eventName}.
            </p>

            <form onSubmit={handleSubmitReview}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4F4641", marginBottom: 8 }}>
                  Overall Rating
                </label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 2,
                        transition: "transform 0.1s ease",
                      }}
                    >
                      <Star
                        size={28}
                        color="#C9A13A"
                        fill={star <= rating ? "#C9A13A" : "transparent"}
                      />
                    </button>
                  ))}
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#8C6435", marginLeft: 8 }}>
                    {rating} out of 5
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#4F4641", marginBottom: 6 }}>
                  Your Experience Feedback
                </label>
                <textarea
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="The decoration and floral arrangements exceeded our expectations..."
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 8,
                    border: "1px solid #E7DED5",
                    background: "#FAF5EA",
                    fontSize: 14,
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                    resize: "vertical"
                  }}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setReviewBooking(null)}
                  style={{
                    padding: "10px 18px",
                    border: "1px solid #E8DCC8",
                    borderRadius: 8,
                    background: "#fff",
                    color: "#766C67",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="vendor-btn"
                  style={{ padding: "10px 22px", fontSize: 13, fontWeight: 600 }}
                >
                  {reviewSubmitting ? "Submitting…" : "Post Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancellation Policy & Refund Calculation Modal */}
      {cancelTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(33, 22, 14, 0.68)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1300,
            padding: 20,
          }}
          onClick={() => !cancelling && setCancelTarget(null)}
        >
          <div
            style={{
              background: "#FFFDF9",
              border: "1px solid #E8DCC8",
              borderRadius: 16,
              width: "100%",
              maxWidth: 520,
              padding: 26,
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, borderBottom: "1px solid #E8DCC8", paddingBottom: 10 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#CC0000", letterSpacing: "1px" }}>BOOKING ACTION</span>
                <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, margin: "2px 0 0", color: "#2B1D12" }}>
                  Cancel Booking
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#8B7355" }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: 14, color: "#4A3B32", margin: "0 0 14px", lineHeight: 1.5 }}>
              Are you sure you want to cancel the booking for <strong>"{cancelTarget.serviceName || "Service"}"</strong> with <strong>{cancelTarget.vendorId?.businessName || cancelTarget.vendorId?.fullName || "the artisan"}</strong>?
            </p>

            {/* 20% Non-Refundable Fee Policy Breakdown */}
            {cancelTarget.paidAmount > 0 ? (
              <div style={{ background: "#FFF5F5", border: "1px solid #FFCCCC", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#CC0000", fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
                  <AlertTriangle size={16} /> EVORA Cancellation & Refund Policy
                </div>
                <div style={{ fontSize: 13, color: "#4A3B32", lineHeight: 1.6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Total Advance Paid:</span>
                    <strong>₹{Number(cancelTarget.paidAmount).toLocaleString("en-IN")}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#CC0000" }}>
                    <span>Non-Refundable Fee (20% retained):</span>
                    <strong>- ₹{Math.round(cancelTarget.paidAmount * 0.20).toLocaleString("en-IN")}</strong>
                  </div>
                  <div style={{ height: 1, background: "#FFCCCC", margin: "8px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#1E8E46", fontWeight: 700, fontSize: 14 }}>
                    <span>Refund Processed (80% returned):</span>
                    <span>₹{(cancelTarget.paidAmount - Math.round(cancelTarget.paidAmount * 0.20)).toLocaleString("en-IN")}</span>
                  </div>
                </div>
                <p style={{ margin: "10px 0 0", fontSize: 11, color: "#888", lineHeight: 1.4 }}>
                  * In accordance with EVORA terms, 20% of the advance payment is non-refundable upon cancellation to cover artisan reservation costs. The remaining 80% is refunded to your original payment method.
                </p>
              </div>
            ) : (
              <div style={{ background: "#F5F8FA", border: "1px solid #E1E8ED", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 13, color: "#555" }}>
                ℹ️ No advance payment has been made for this booking inquiry. You can cancel with <strong>0% fee</strong>.
              </div>
            )}

            <form onSubmit={handleConfirmCancel}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#6B5240", marginBottom: 6 }}>
                  Reason for cancellation (optional):
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Rescheduled celebration date, change in decor concept..."
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1px solid #E8DCC8",
                    borderRadius: 8,
                    fontSize: 13,
                    background: "#FAF5EA",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setCancelTarget(null)}
                  disabled={cancelling}
                  style={{
                    padding: "9px 18px",
                    border: "1px solid #D5C7B4",
                    borderRadius: 8,
                    background: "#FFF",
                    color: "#6B5240",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  style={{
                    padding: "9px 20px",
                    border: "none",
                    borderRadius: 8,
                    background: "#CC0000",
                    color: "#FFF",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 2px 6px rgba(204,0,0,0.3)",
                  }}
                >
                  {cancelling ? "Cancelling…" : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsTracker;

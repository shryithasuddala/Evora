import React, { useState, useEffect } from "react";
import {
  HeartHandshake,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  XCircle,
  Truck,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  User,
} from "lucide-react";
import { charityAIAPI } from "../../services/api";

const IncomingDonations = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);

  // Modal / Prompt State for Accept
  const [acceptModalRequest, setAcceptModalRequest] = useState(null);
  const [pickupTimeInput, setPickupTimeInput] = useState("Within 45 minutes");
  const [acceptNote, setAcceptNote] = useState("");

  const navy = "#0D1B2A";
  const purple = "#4A154B";
  const softGold = "#C9A13A";

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await charityAIAPI.getIncoming({ status: filterStatus });
      setRequests(res.requests || []);
    } catch (err) {
      console.warn("Failed to load incoming donation requests:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [filterStatus]);

  const handleUpdateStatus = async (id, status, extra = {}) => {
    setUpdatingId(id);
    try {
      await charityAIAPI.updateStatus(id, {
        status,
        pickupTimeExpected: extra.pickupTimeExpected || "",
        note: extra.note || "",
      });
      await loadRequests();
      setAcceptModalRequest(null);
    } catch (err) {
      alert("Failed to update status: " + (err.message || "Error occurred"));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="vendor-page" style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px" }}>
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${navy}, #1E293B)`,
          borderRadius: 16,
          padding: "24px 28px",
          color: "#FAF5EA",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(201, 161, 58, 0.2)", color: softGold, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
              <HeartHandshake size={13} /> VOLUNTEER & CHARITY RESCUE DISPATCH
            </div>
            <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 26, margin: "2px 0 4px" }}>
              Incoming Surplus Food Rescue Requests
            </h1>
            <p style={{ color: "#CBD5E1", fontSize: 13, margin: 0 }}>
              Review, accept, and coordinate surplus event food collections across Hyderabad
            </p>
          </div>

          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            style={{
              background: softGold,
              color: "#2B1D12",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <RefreshCw size={14} className={loading ? "spin-animate" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { key: "all", label: "All Requests" },
          { key: "pending", label: "⏳ Pending Action" },
          { key: "accepted", label: "✓ Accepted / Ready" },
          { key: "picked_up", label: "🚚 In Transit" },
          { key: "delivered", label: "🎉 Delivered" },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilterStatus(f.key)}
            style={{
              background: filterStatus === f.key ? navy : "#FFFFFF",
              color: filterStatus === f.key ? "#FFFFFF" : "#475569",
              border: "1px solid #CBD5E1",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: `3px solid ${softGold}`,
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <p style={{ color: "#8B7355" }}>Loading incoming food rescue dispatches…</p>
        </div>
      ) : requests.length === 0 ? (
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 14,
            padding: 40,
            textAlign: "center",
            border: "1px solid #E2E8F0",
          }}
        >
          <p style={{ color: "#64748B", fontSize: 15, margin: 0 }}>
            No donation requests found in this filter category.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {requests.map((item) => {
            const charity = item.charityId || {};
            const organizer = item.organizerId || {};
            const isPending = item.status === "pending";
            const isAccepted = item.status === "accepted";
            const isPickedUp = item.status === "picked_up";
            const isDelivered = item.status === "delivered";

            const safeDate = new Date(item.safeUntil);
            const remainingMins = Math.round((safeDate.getTime() - Date.now()) / (1000 * 60));

            return (
              <div
                key={item._id}
                style={{
                  background: "#FFFFFF",
                  borderRadius: 14,
                  border: isPending
                    ? `2px solid ${softGold}`
                    : isDelivered
                    ? "1px solid #10B981"
                    : "1px solid #E2E8F0",
                  padding: "20px 24px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span
                        style={{
                          background: "#FEF3C7",
                          color: "#92400E",
                          fontWeight: 700,
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 4,
                        }}
                      >
                        {item.eventName} ({item.eventType || "Event"})
                      </span>
                      <span style={{ fontSize: 12, color: "#64748B" }}>
                        Submitted {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <h3 style={{ fontSize: 18, color: navy, fontWeight: 700, margin: 0 }}>
                      Surplus: {item.quantity} {item.unit} for {charity.name}
                    </h3>
                  </div>

                  {/* Status Badge & Urgency */}
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        background: isDelivered
                          ? "#DCFCE7"
                          : isPickedUp
                          ? "#E0E7FF"
                          : isAccepted
                          ? "#FEF3C7"
                          : isPending
                          ? "#FEE2E2"
                          : "#F1F5F9",
                        color: isDelivered
                          ? "#15803D"
                          : isPickedUp
                          ? "#3730A3"
                          : isAccepted
                          ? "#B45309"
                          : isPending
                          ? "#B91C1C"
                          : "#475569",
                        fontWeight: 800,
                        fontSize: 12,
                        textTransform: "uppercase",
                        padding: "4px 10px",
                        borderRadius: 20,
                        display: "inline-block",
                      }}
                    >
                      {item.status === "picked_up" ? "IN TRANSIT" : item.status}
                    </span>

                    {remainingMins > 0 ? (
                      <div style={{ fontSize: 12, color: remainingMins < 60 ? "#DC2626" : "#64748B", fontWeight: 600, marginTop: 4 }}>
                        ⏱ {remainingMins} mins safe window
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 700, marginTop: 4 }}>
                        ⚠️ Safe window passed
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Crafted Request Message */}
                {item.aiGeneratedMessage && (
                  <div
                    style={{
                      background: "rgba(201, 161, 58, 0.08)",
                      border: "1px solid rgba(201, 161, 58, 0.3)",
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 13,
                      color: "#3B2F1F",
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <Sparkles size={15} style={{ color: softGold, marginTop: 2, flexShrink: 0 }} />
                    <span>{item.aiGeneratedMessage}</span>
                  </div>
                )}

                {/* Details Breakdown */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 12,
                    padding: "12px 14px",
                    background: "#F8FAFC",
                    borderRadius: 8,
                    marginBottom: 14,
                    fontSize: 13,
                  }}
                >
                  <div>
                    <span style={{ color: "#64748B", display: "block", fontSize: 11 }}>📍 Pickup Location</span>
                    <strong style={{ color: navy }}>{item.pickupAddress}</strong>
                  </div>

                  <div>
                    <span style={{ color: "#64748B", display: "block", fontSize: 11 }}>👤 Coordinator Contact</span>
                    <strong style={{ color: navy }}>{item.contactName} ({item.contactPhone})</strong>
                  </div>

                  <div>
                    <span style={{ color: "#64748B", display: "block", fontSize: 11 }}>📦 Packaging & Transport</span>
                    <strong style={{ color: navy }}>
                      {item.packagingAvailable ? "Containers Available" : "Bring Vessels"} | {item.pickupType}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: "#64748B", display: "block", fontSize: 11 }}>🍲 Food Items</span>
                    <strong style={{ color: navy }}>
                      {(item.foodItems || []).map((f) => `${f.quantity} ${f.unit || "plates"} ${f.name}`).join(", ") || `${item.quantity} ${item.unit}`}
                    </strong>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  {isPending && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(item._id, "declined", { note: "Capacity full" })}
                        disabled={updatingId === item._id}
                        style={{
                          background: "#FEE2E2",
                          color: "#B91C1C",
                          border: "none",
                          padding: "8px 14px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <XCircle size={14} /> Decline
                      </button>

                      <button
                        type="button"
                        onClick={() => setAcceptModalRequest(item)}
                        disabled={updatingId === item._id}
                        style={{
                          background: "#10B981",
                          color: "#FFFFFF",
                          border: "none",
                          padding: "8px 18px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <CheckCircle2 size={14} /> Accept Pickup
                      </button>
                    </>
                  )}

                  {isAccepted && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(item._id, "picked_up", { note: "Volunteer loaded vehicle and en route" })}
                      disabled={updatingId === item._id}
                      style={{
                        background: navy,
                        color: "#FFFFFF",
                        border: `1px solid ${softGold}`,
                        padding: "8px 18px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Truck size={14} /> Mark Picked Up (In Transit)
                    </button>
                  )}

                  {isPickedUp && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(item._id, "delivered", { note: "Delivered to shelter and distributed to beneficiaries" })}
                      disabled={updatingId === item._id}
                      style={{
                        background: "#059669",
                        color: "#FFFFFF",
                        border: "none",
                        padding: "8px 18px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <HeartHandshake size={14} /> Mark Delivered & Complete
                    </button>
                  )}

                  {isDelivered && (
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#059669", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      ✓ Delivered! ~{item.estimatedPeopleServed || item.quantity} People Served
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Accept Pickup Modal */}
      {acceptModalRequest && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              padding: "24px 28px",
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ fontSize: 18, color: navy, margin: "0 0 6px", fontWeight: 700 }}>
              Confirm Surplus Food Pickup
            </h3>
            <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 16px" }}>
              Notify organizer "{acceptModalRequest.contactName}" that your vehicle is dispatched.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 6 }}>
                Estimated Pickup Arrival
              </label>
              <input
                type="text"
                value={pickupTimeInput}
                onChange={(e) => setPickupTimeInput(e.target.value)}
                placeholder="e.g. Within 30-45 minutes"
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid #CBD5E1",
                  fontSize: 14,
                }}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "block", marginBottom: 6 }}>
                Driver / Vehicle Note (Optional)
              </label>
              <textarea
                value={acceptNote}
                onChange={(e) => setAcceptNote(e.target.value)}
                placeholder="e.g. Volunteer Ramesh arriving in white Tata Ace van (TS 09 XY 1234)"
                rows={2}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid #CBD5E1",
                  fontSize: 14,
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setAcceptModalRequest(null)}
                style={{
                  background: "#F1F5F9",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  handleUpdateStatus(acceptModalRequest._id, "accepted", {
                    pickupTimeExpected: pickupTimeInput,
                    note: acceptNote,
                  })
                }
                style={{
                  background: "#10B981",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "8px 20px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Confirm & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomingDonations;

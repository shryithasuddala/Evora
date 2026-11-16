import React from "react";
import {
  CheckCircle2,
  Clock,
  Truck,
  HeartHandshake,
  AlertCircle,
  XCircle,
  Phone,
  MapPin,
  Calendar,
  Sparkles,
  RefreshCw,
} from "lucide-react";

const STEPS = [
  { key: "pending", label: "Request Sent", icon: Clock },
  { key: "accepted", label: "Pickup Confirmed", icon: CheckCircle2 },
  { key: "picked_up", label: "In Transit", icon: Truck },
  { key: "delivered", label: "Delivered", icon: HeartHandshake },
];

const DonationStatusTracker = ({
  requests = [],
  onRefresh = () => {},
  refreshing = false,
}) => {
  const navy = "#0D1B2A";
  const purple = "#4A154B";
  const softGold = "#C9A13A";

  if (!requests || requests.length === 0) {
    return (
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 14,
          padding: "40px 20px",
          textAlign: "center",
          border: "1px solid #E2E8F0",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(201, 161, 58, 0.12)",
            color: softGold,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
          }}
        >
          <HeartHandshake size={28} />
        </div>
        <h3 style={{ fontSize: 18, color: navy, margin: "0 0 6px", fontWeight: 700 }}>
          No Active Donation Requests Yet
        </h3>
        <p style={{ fontSize: 14, color: "#64748B", maxWidth: 420, margin: "0 auto" }}>
          Submit surplus food from your event to find nearby orphanages, shelters, and NGOs and track real-time pickup status here.
        </p>
      </div>
    );
  }

  const getStepIndex = (status) => {
    switch (status) {
      case "pending":
        return 0;
      case "accepted":
        return 1;
      case "picked_up":
        return 2;
      case "delivered":
        return 3;
      default:
        return 0;
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <h3 style={{ fontSize: 18, color: navy, fontWeight: 700, margin: 0 }}>
            Donation Dispatch & Rescue Status
          </h3>
          <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
            Real-time status updates from charity drivers and volunteer teams
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#F8FAFC",
            border: "1px solid #CBD5E1",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 13,
            fontWeight: 600,
            color: navy,
            cursor: refreshing ? "wait" : "pointer",
          }}
        >
          <RefreshCw size={14} className={refreshing ? "spin-animate" : ""} />
          {refreshing ? "Checking..." : "Refresh Status"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {requests.map((req) => {
          const charity = req.charityId || {};
          const isDelivered = req.status === "delivered";
          const isDeclined = req.status === "declined";
          const currentStep = getStepIndex(req.status);
          const servedCount =
            req.estimatedPeopleServed ||
            (req.unit === "kg" ? Math.round(req.quantity * 2.5) : req.quantity);

          return (
            <div
              key={req._id}
              style={{
                background: "#FFFFFF",
                borderRadius: 16,
                border: isDelivered
                  ? "2px solid #10B981"
                  : isDeclined
                  ? "1px solid #FCA5A5"
                  : "1px solid #E2E8F0",
                padding: "24px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                position: "relative",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        background: "rgba(201, 161, 58, 0.15)",
                        color: softGold,
                        fontWeight: 700,
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 4,
                      }}
                    >
                      {req.eventName || "Celebration Feast"}
                    </span>
                    <span style={{ fontSize: 12, color: "#64748B" }}>
                      Requested: {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <h4 style={{ fontSize: 18, color: navy, fontWeight: 700, margin: 0 }}>
                    {charity.name || "Charity / Shelter"}
                  </h4>
                  <p style={{ fontSize: 13, color: "#475569", margin: "2px 0 0" }}>
                    📍 {charity.address || req.pickupAddress}
                  </p>
                </div>

                {/* Status Badge */}
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      background: isDelivered
                        ? "#DCFCE7"
                        : isDeclined
                        ? "#FEE2E2"
                        : req.status === "picked_up"
                        ? "#E0E7FF"
                        : req.status === "accepted"
                        ? "#FEF3C7"
                        : "#F1F5F9",
                      color: isDelivered
                        ? "#15803D"
                        : isDeclined
                        ? "#B91C1C"
                        : req.status === "picked_up"
                        ? "#3730A3"
                        : req.status === "accepted"
                        ? "#B45309"
                        : "#475569",
                      fontWeight: 800,
                      fontSize: 12,
                      textTransform: "uppercase",
                      padding: "4px 12px",
                      borderRadius: 20,
                      letterSpacing: 0.5,
                      display: "inline-block",
                    }}
                  >
                    {req.status === "picked_up" ? "IN TRANSIT" : req.status}
                  </span>
                  {req.pickupTimeExpected && (
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>
                      Expected: {req.pickupTimeExpected}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Stepper (if not declined) */}
              {!isDeclined && (
                <div style={{ margin: "22px 0 16px" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      position: "relative",
                      gap: 8,
                    }}
                  >
                    {STEPS.map((s, idx) => {
                      const Icon = s.icon;
                      const isComplete = idx <= currentStep;
                      const isCurrent = idx === currentStep;

                      return (
                        <div key={s.key} style={{ textAlign: "center", position: "relative" }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: "50%",
                              background: isComplete ? (isDelivered ? "#10B981" : navy) : "#E2E8F0",
                              color: isComplete ? "#FFFFFF" : "#94A3B8",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              margin: "0 auto 6px",
                              transition: "all 0.2s ease",
                              border: isCurrent ? `2px solid ${softGold}` : "none",
                              boxShadow: isCurrent ? "0 0 10px rgba(201, 161, 58, 0.4)" : "none",
                            }}
                          >
                            <Icon size={16} />
                          </div>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: isComplete ? 700 : 500,
                              color: isComplete ? navy : "#94A3B8",
                              display: "block",
                            }}
                          >
                            {s.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Declined Alert */}
              {isDeclined && (
                <div
                  style={{
                    background: "#FEF2F2",
                    border: "1px solid #FCA5A5",
                    borderRadius: 8,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#991B1B",
                    fontSize: 13,
                    marginBottom: 14,
                  }}
                >
                  <XCircle size={16} />
                  <span>The charity was at full capacity or unavailable. Please select another nearby shelter.</span>
                </div>
              )}

              {/* Delivered Summary Receipt */}
              {isDelivered && (
                <div
                  style={{
                    background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(201, 161, 58, 0.1))",
                    border: "1px solid #10B981",
                    borderRadius: 12,
                    padding: "16px 20px",
                    marginTop: 14,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Sparkles size={18} style={{ color: softGold }} />
                    <h5 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#065F46" }}>
                      Donation Impact Summary — Zero Food Waste Achieved! 🎉
                    </h5>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                      gap: 12,
                      marginTop: 10,
                      fontSize: 13,
                    }}
                  >
                    <div>
                      <span style={{ color: "#047857", display: "block", fontSize: 11 }}>Food Donated</span>
                      <strong style={{ color: navy, fontSize: 14 }}>
                        {req.quantity} {req.unit}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "#047857", display: "block", fontSize: 11 }}>People Nourished</span>
                      <strong style={{ color: navy, fontSize: 14 }}>
                        ~{servedCount} individuals
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "#047857", display: "block", fontSize: 11 }}>Charity Partner</span>
                      <strong style={{ color: navy, fontSize: 14 }}>
                        {charity.name || "Community Shelter"}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "#047857", display: "block", fontSize: 11 }}>Delivered At</span>
                      <strong style={{ color: navy, fontSize: 14 }}>
                        {req.deliveredAt ? new Date(req.deliveredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today"}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Food items & details breakdown */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 16,
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: "1px solid #F1F5F9",
                  fontSize: 12,
                  color: "#475569",
                }}
              >
                <span>
                  🍲 <strong>Items:</strong>{" "}
                  {(req.foodItems || []).map((f) => `${f.quantity} ${f.unit || "plates"} ${f.name}`).join(", ") ||
                    `${req.quantity} ${req.unit} Surplus Food`}
                </span>
                <span>
                  ⏰ <strong>Safe Until:</strong>{" "}
                  {new Date(req.safeUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span>
                  📞 <strong>Coordinator:</strong> {req.contactName} ({req.contactPhone})
                </span>
                {charity.phone && (
                  <span>
                    🏢 <strong>Charity Contact:</strong> {charity.phone}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DonationStatusTracker;

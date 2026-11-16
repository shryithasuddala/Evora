import React from "react";
import {
  Sparkles,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  ShieldCheck,
  Send,
  AlertCircle,
  Phone,
} from "lucide-react";

const CharityCard = ({
  charity,
  isSelected,
  onToggleSelect,
  onRequestSingle,
  surplusQuantity = 100,
  surplusUnit = "plates",
  requesting = false,
}) => {
  const navy = "#0D1B2A";
  const purple = "#4A154B";
  const softGold = "#C9A13A";

  const isTopPick = Boolean(charity.isTopPick || charity.rank === 1);
  const score = charity.rankingScore || 85;
  const distanceKm = charity.distanceKm !== undefined ? charity.distanceKm : 3.5;
  const transitMins = charity.estimatedTransitMins || Math.round(Number(distanceKm) * 3 + 25);
  const capacity = charity.capacityPerDay || 150;

  // Category styles
  const typeBadgeColors = {
    NGO: { bg: "#EEF2FF", text: "#4338CA", border: "#C7D2FE" },
    orphanage: { bg: "#FDF2F8", text: "#BE185D", border: "#FBCFE8" },
    "old-age home": { bg: "#FEF3C7", text: "#B45309", border: "#FDE68A" },
    shelter: { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
  };
  const badge = typeBadgeColors[charity.type] || { bg: "#F1F5F9", text: "#334155", border: "#CBD5E1" };

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 14,
        border: isSelected
          ? `2px solid ${purple}`
          : isTopPick
          ? `2px solid ${softGold}`
          : "1px solid #E2E8F0",
        padding: "20px 22px",
        marginBottom: 16,
        boxShadow: isSelected
          ? "0 6px 20px rgba(74, 21, 75, 0.15)"
          : isTopPick
          ? "0 6px 20px rgba(201, 161, 58, 0.15)"
          : "0 2px 8px rgba(0,0,0,0.04)",
        transition: "all 0.2s ease",
        position: "relative",
      }}
    >
      {/* Top Header / Badges */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {isTopPick && (
            <span
              style={{
                background: `linear-gradient(135deg, ${softGold}, #DFB84E)`,
                color: "#2B1D12",
                fontWeight: 800,
                fontSize: 11,
                padding: "3px 10px",
                borderRadius: 20,
                letterSpacing: 0.5,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                boxShadow: "0 2px 6px rgba(201, 161, 58, 0.3)",
              }}
            >
              <Sparkles size={12} /> AI TOP RECOMMENDATION
            </span>
          )}

          <span
            style={{
              background: badge.bg,
              color: badge.text,
              border: `1px solid ${badge.border}`,
              fontWeight: 700,
              fontSize: 11,
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: 6,
            }}
          >
            {charity.type}
          </span>

          {charity.verified && (
            <span
              style={{
                background: "#ECFDF5",
                color: "#059669",
                border: "1px solid #A7F3D0",
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 6,
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
              title="Verified by EVORA Community Team"
            >
              <ShieldCheck size={12} /> Verified
            </span>
          )}
        </div>

        {/* AI Ranking Score Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>Match:</span>
          <span
            style={{
              background: score >= 90 ? "#DCFCE7" : "#FEF3C7",
              color: score >= 90 ? "#166534" : "#92400E",
              fontWeight: 800,
              fontSize: 12,
              padding: "3px 8px",
              borderRadius: 20,
            }}
          >
            {score}%
          </span>
        </div>
      </div>

      {/* Main Name & Address */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h4
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: navy,
              margin: "0 0 4px",
              lineHeight: 1.3,
            }}
          >
            {charity.name}
          </h4>
          <p
            style={{
              fontSize: 13,
              color: "#475569",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <MapPin size={13} style={{ color: softGold, flexShrink: 0 }} />
            <span>{charity.address || "Hyderabad"}</span>
          </p>
        </div>

        {/* Select Checkbox (Multi-select) */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            userSelect: "none",
            fontSize: 13,
            fontWeight: 600,
            color: isSelected ? purple : "#64748B",
            background: isSelected ? "rgba(74, 21, 75, 0.08)" : "#F8FAFC",
            padding: "6px 10px",
            borderRadius: 8,
            border: isSelected ? `1px solid ${purple}` : "1px solid #E2E8F0",
          }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(charity)}
            style={{ accentColor: purple, cursor: "pointer" }}
          />
          <span>{isSelected ? "Selected" : "Select"}</span>
        </label>
      </div>

      {/* Metrics Row: Distance, Cooked food, Capacity */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          margin: "14px 0",
          padding: "10px 14px",
          background: "#F8FAFC",
          borderRadius: 10,
          border: "1px solid #E2E8F0",
        }}
      >
        <div>
          <span style={{ fontSize: 11, color: "#64748B", display: "block" }}>Distance & Transit</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: navy }}>
            🚗 {distanceKm} km <span style={{ fontWeight: 500, fontSize: 12, color: "#64748B" }}>(~{transitMins}m)</span>
          </span>
        </div>

        <div>
          <span style={{ fontSize: 11, color: "#64748B", display: "block" }}>Cooked Food</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: charity.acceptsCookedFood ? "#15803D" : "#B45309",
            }}
          >
            {charity.acceptsCookedFood ? "✓ Accepts Cooked Meals" : "⚠️ Packaged Goods Only"}
          </span>
        </div>

        <div>
          <span style={{ fontSize: 11, color: "#64748B", display: "block" }}>Daily Shelter Capacity</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: navy }}>
            👥 {capacity} meals/day
          </span>
        </div>

        <div>
          <span style={{ fontSize: 11, color: "#64748B", display: "block" }}>Operating Hours</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
            🕒 {charity.operatingHours || "08:00 - 22:00"}
          </span>
        </div>
      </div>

      {/* AI Recommendation Reason */}
      {charity.aiRecommendationReason && (
        <div
          style={{
            background: "rgba(201, 161, 58, 0.08)",
            border: "1px solid rgba(201, 161, 58, 0.35)",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 14,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <Sparkles size={16} style={{ color: softGold, marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: "#3B2F1F", lineHeight: 1.4 }}>
            <strong style={{ color: softGold, fontWeight: 700 }}>AI Match Rationale: </strong>
            <span>{charity.aiRecommendationReason}</span>
          </div>
        </div>
      )}

      {/* Footer / Direct Request Action */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          borderTop: "1px solid #F1F5F9",
          paddingTop: 12,
        }}
      >
        <span style={{ fontSize: 12, color: "#64748B", display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Phone size={12} /> {charity.phone}
        </span>

        <button
          type="button"
          onClick={() => onRequestSingle(charity)}
          disabled={requesting}
          style={{
            background: isSelected
              ? `linear-gradient(135deg, ${purple}, #6B21A8)`
              : isTopPick
              ? `linear-gradient(135deg, ${navy}, #1E293B)`
              : "#F1F5F9",
            color: isSelected || isTopPick ? "#FFFFFF" : navy,
            border: isSelected || isTopPick ? "none" : "1px solid #CBD5E1",
            padding: "8px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            cursor: requesting ? "wait" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            boxShadow: isSelected || isTopPick ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <Send size={13} />
          {requesting ? "Sending Request..." : "Request Pickup"}
        </button>
      </div>
    </div>
  );
};

export default CharityCard;

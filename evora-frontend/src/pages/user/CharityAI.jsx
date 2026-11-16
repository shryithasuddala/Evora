import React, { useState, useEffect } from "react";
import { useSearchParams, useParams, Link } from "react-router-dom";
import {
  HeartHandshake,
  Sparkles,
  MapPin,
  Clock,
  ShieldCheck,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Send,
  List,
  Map as MapIcon,
  RotateCcw,
} from "lucide-react";
import SurplusFoodForm from "../../components/charity/SurplusFoodForm";
import CharityMap from "../../components/charity/CharityMap";
import CharityCard from "../../components/charity/CharityCard";
import DonationStatusTracker from "../../components/charity/DonationStatusTracker";
import { charityAIAPI } from "../../services/api";

const CharityAI = () => {
  const [searchParams] = useSearchParams();
  const routeParams = useParams();
  const eventId = routeParams.id || searchParams.get("eventId") || "";

  // Active top tab: "wizard" (Donate Surplus) or "history" (Active & Past Pickups)
  const [activeTab, setActiveTab] = useState("wizard");

  // Stepper state: 1: Surplus Details, 2: Nearby & AI Ranking, 3: Confirmation / Status
  const [step, setStep] = useState(1);

  // Data state
  const [surplusData, setSurplusData] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [rankedCharities, setRankedCharities] = useState([]);
  const [foodSafety, setFoodSafety] = useState(null);
  const [venueCoords, setVenueCoords] = useState([78.4744, 17.4123]); // [lng, lat]

  // Filter state
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchRadius, setSearchRadius] = useState(25);
  const [cookFilterOnly, setCookFilterOnly] = useState(false);

  // Selection state
  const [selectedCharities, setSelectedCharities] = useState([]);
  const [singleCharityTarget, setSingleCharityTarget] = useState(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSuccessMessage, setRequestSuccessMessage] = useState("");

  // History & Tracker state
  const [historyRequests, setHistoryRequests] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySummary, setHistorySummary] = useState(null);

  // View toggle for Step 2: Split / List / Map
  const [step2View, setStep2View] = useState("split"); // "split" | "list" | "map"

  const navy = "#0D1B2A";
  const purple = "#4A154B";
  const softGold = "#C9A13A";

  // Load donation history
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await charityAIAPI.getHistory(eventId || "all");
      setHistoryRequests(res.requests || []);
      setHistorySummary(res.summary || null);
    } catch (err) {
      console.warn("Could not load donation history:", err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [eventId]);

  // Handle Step 1 Surplus Form Submission
  const handleSurplusSubmit = async (formData) => {
    setLoadingRecommendations(true);
    setSurplusData(formData);

    try {
      // 1. Submit surplus to get geocoded coordinates & initial safety check
      const surplusRes = await charityAIAPI.submitSurplus(formData);
      const coords = surplusRes.coordinates || [78.4744, 17.4123];
      setVenueCoords(coords);

      // 2. Fetch AI-ranked recommendations
      const recRes = await charityAIAPI.getRecommendations({
        lat: coords[1],
        lng: coords[0],
        venueAddress: formData.venueAddress,
        city: formData.city,
        radius: searchRadius,
        type: typeFilter,
        quantity: formData.quantity,
        unit: formData.unit,
        preparedAt: formData.preparedAt,
        safeUntil: formData.safeUntil,
        foodItems: formData.foodItems,
        pickupType: formData.pickupType,
      });

      setRankedCharities(recRes.rankedCharities || []);
      setFoodSafety(recRes.foodSafety || null);

      // Pre-select top pick by default
      if (recRes.rankedCharities && recRes.rankedCharities.length > 0) {
        setSelectedCharities([recRes.rankedCharities[0]]);
      }

      setStep(2);
    } catch (err) {
      alert("Failed to analyze location and charities: " + (err.message || "Please check address."));
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Re-run recommendation when filter changes in Step 2
  const handleFilterChange = async (newType, newRadius, newCookOnly) => {
    if (!surplusData) return;
    setLoadingRecommendations(true);
    setTypeFilter(newType);
    setSearchRadius(newRadius);
    setCookFilterOnly(newCookOnly);

    try {
      const recRes = await charityAIAPI.getRecommendations({
        lat: venueCoords[1],
        lng: venueCoords[0],
        venueAddress: surplusData.venueAddress,
        city: surplusData.city,
        radius: newRadius,
        type: newType,
        quantity: surplusData.quantity,
        unit: surplusData.unit,
        preparedAt: surplusData.preparedAt,
        safeUntil: surplusData.safeUntil,
        foodItems: surplusData.foodItems,
        pickupType: surplusData.pickupType,
      });

      let results = recRes.rankedCharities || [];
      if (newCookOnly) {
        results = results.filter((c) => c.acceptsCookedFood);
      }
      setRankedCharities(results);
    } catch (err) {
      console.warn("Filter reload failed:", err.message);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  // Toggle charity selection
  const handleToggleSelectCharity = (charity) => {
    setSelectedCharities((prev) => {
      const exists = prev.some((c) => c._id === charity._id);
      if (exists) {
        return prev.filter((c) => c._id !== charity._id);
      } else {
        return [...prev, charity];
      }
    });
  };

  // Dispatch request to single charity
  const handleRequestSingle = async (charity) => {
    await handleSendDonationRequest([charity._id]);
  };

  // Dispatch request to selected charities
  const handleSendDonationRequest = async (overrideIds = null) => {
    const idsToSend = overrideIds || selectedCharities.map((c) => c._id);
    if (!idsToSend || idsToSend.length === 0) {
      alert("Please select at least one charity to receive your surplus donation.");
      return;
    }

    setSendingRequest(true);
    try {
      const payload = {
        charityIds: idsToSend,
        eventId: surplusData.eventId || eventId || null,
        eventName: surplusData.eventName || "Celebration Feast",
        eventType: surplusData.eventType || "Wedding",
        foodItems: surplusData.foodItems,
        quantity: surplusData.quantity,
        unit: surplusData.unit,
        preparedAt: surplusData.preparedAt,
        safeUntil: surplusData.safeUntil,
        pickupType: surplusData.pickupType,
        packagingAvailable: surplusData.packagingAvailable,
        contactName: surplusData.contactName,
        contactPhone: surplusData.contactPhone,
        pickupAddress: surplusData.venueAddress,
        pickupCity: surplusData.city,
        pickupCoordinates: venueCoords,
        notes: surplusData.notes,
      };

      const res = await charityAIAPI.sendRequest(payload);
      setRequestSuccessMessage(
        `✓ Donation request dispatched to ${idsToSend.length} charity partner(s)! Volunteers and coordinators have been notified via in-app alerts.`
      );
      setStep(3);
      await fetchHistory();
    } catch (err) {
      alert("Failed to send donation request: " + (err.message || "Please try again."));
    } finally {
      setSendingRequest(false);
    }
  };

  return (
    <div className="vendor-page" style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px" }}>
      {/* Navigation Breadcrumb */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Link
          to={eventId ? `/user/events/${eventId}` : "/user/events"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: softGold,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={16} /> Back to {eventId ? "Celebration Dashboard" : "My Events"}
        </Link>

        {historySummary && historySummary.deliveredCount > 0 && (
          <div
            style={{
              background: "#ECFDF5",
              color: "#065F46",
              border: "1px solid #A7F3D0",
              padding: "4px 12px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Sparkles size={13} style={{ color: softGold }} />
            <span>{historySummary.totalPeopleServed}+ People Nourished Across Celebrations</span>
          </div>
        )}
      </div>

      {/* Hero Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${navy} 0%, #1B263B 55%, ${purple} 100%)`,
          borderRadius: 18,
          padding: "30px 32px",
          color: "#FAF5EA",
          marginBottom: 24,
          boxShadow: "0 8px 24px rgba(13, 27, 42, 0.18)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div style={{ maxWidth: 680 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(201, 161, 58, 0.2)", color: softGold, padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 800, letterSpacing: 1, marginBottom: 8 }}>
              <HeartHandshake size={14} /> EVORA CHARITY AI
            </div>
            <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 32, margin: "4px 0 10px", lineHeight: 1.2 }}>
              Surplus Food Rescue & Donation Hub
            </h1>
            <p style={{ color: "#E2E8F0", fontSize: 14, lineHeight: 1.5, margin: 0 }}>
              Prevent post-event food wastage by connecting directly with nearby verified orphanages, old-age homes, and community shelters across Hyderabad. AI ranks the nearest matches based on food safety windows, daily capacity, and live transport distance.
            </p>
          </div>

          {/* Tab Selector */}
          <div
            style={{
              display: "flex",
              background: "rgba(255, 255, 255, 0.12)",
              padding: 4,
              borderRadius: 12,
              backdropFilter: "blur(6px)",
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("wizard")}
              style={{
                background: activeTab === "wizard" ? softGold : "transparent",
                color: activeTab === "wizard" ? "#2B1D12" : "#FAF5EA",
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
              <Sparkles size={14} /> Donate Surplus
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              style={{
                background: activeTab === "history" ? softGold : "transparent",
                color: activeTab === "history" ? "#2B1D12" : "#FAF5EA",
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
              <Clock size={14} /> Live Pickups ({historyRequests.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "history" ? (
        <DonationStatusTracker
          requests={historyRequests}
          onRefresh={fetchHistory}
          refreshing={loadingHistory}
        />
      ) : (
        <div>
          {/* Stepper Navigation Bar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginBottom: 24,
            }}
          >
            {[
              { num: 1, title: "Surplus Food Details", sub: "Dishes, safe time & venue" },
              { num: 2, title: "Nearby Charities & AI Ranking", sub: "Map, capacity & transit match" },
              { num: 3, title: "Request & Status", sub: "Confirm pickup dispatch" },
            ].map((s) => {
              const isActive = step === s.num;
              const isDone = step > s.num;

              return (
                <div
                  key={s.num}
                  onClick={() => {
                    if (isDone) setStep(s.num);
                  }}
                  style={{
                    background: isActive ? "#FFFFFF" : isDone ? "#F8FAFC" : "#FFFFFF",
                    border: isActive
                      ? `2px solid ${purple}`
                      : isDone
                      ? `1px solid ${softGold}`
                      : "1px solid #E2E8F0",
                    borderRadius: 12,
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    cursor: isDone ? "pointer" : "default",
                    boxShadow: isActive ? "0 4px 12px rgba(74, 21, 75, 0.1)" : "none",
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: isDone ? "#10B981" : isActive ? purple : "#E2E8F0",
                      color: isDone || isActive ? "#FFFFFF" : "#64748B",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    {isDone ? "✓" : s.num}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: navy }}>{s.title}</div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>{s.sub}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* STEP 1: Surplus Details Form */}
          {step === 1 && (
            <SurplusFoodForm
              initialEventId={eventId}
              initialData={surplusData}
              onSubmit={handleSurplusSubmit}
              loading={loadingRecommendations}
            />
          )}

          {/* STEP 2: Nearby Charities & AI Ranking */}
          {step === 2 && (
            <div>
              {/* Food Safety Alert Banner */}
              {foodSafety && (
                <div
                  style={{
                    background: foodSafety.isCritical ? "#FFFBEB" : "#F0FDF4",
                    border: `1px solid ${foodSafety.isCritical ? "#FCD34D" : "#86EFAC"}`,
                    borderRadius: 12,
                    padding: "14px 18px",
                    marginBottom: 20,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <AlertTriangle
                    size={20}
                    style={{
                      color: foodSafety.isCritical ? "#D97706" : "#16A34A",
                      marginTop: 2,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <strong
                      style={{
                        color: foodSafety.isCritical ? "#92400E" : "#15803D",
                        fontSize: 14,
                        display: "block",
                      }}
                    >
                      Food Safety Assessment: {foodSafety.remainingMinutes} Minutes Safe Consumption Window
                    </strong>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: "#334155" }}>
                      {foodSafety.warningMessage ||
                        "Food is safe for distribution. Nearest charities have been ranked for prompt transit turnaround."}
                    </p>
                  </div>
                </div>
              )}

              {/* Filters & View Toggle Bar */}
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 14,
                  padding: "14px 18px",
                  border: "1px solid #E2E8F0",
                  marginBottom: 20,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                {/* Category Filter Tabs */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    { id: "all", label: "All Shelters" },
                    { id: "orphanage", label: "👶 Orphanages" },
                    { id: "old-age home", label: "👴 Old-Age Homes" },
                    { id: "NGO", label: "🤝 NGOs" },
                    { id: "shelter", label: "🏠 Community Shelters" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleFilterChange(cat.id, searchRadius, cookFilterOnly)}
                      style={{
                        background: typeFilter === cat.id ? navy : "#F1F5F9",
                        color: typeFilter === cat.id ? "#FFFFFF" : "#334155",
                        border: "none",
                        borderRadius: 8,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Radius & Cooked Food Filters */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
                    Radius:
                    <select
                      value={searchRadius}
                      onChange={(e) => handleFilterChange(typeFilter, Number(e.target.value), cookFilterOnly)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 6,
                        border: "1px solid #CBD5E1",
                        fontSize: 12,
                        color: navy,
                      }}
                    >
                      <option value="5">5 km</option>
                      <option value="10">10 km</option>
                      <option value="25">25 km (Citywide)</option>
                      <option value="50">50 km</option>
                    </select>
                  </label>

                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={cookFilterOnly}
                      onChange={(e) => handleFilterChange(typeFilter, searchRadius, e.target.checked)}
                      style={{ accentColor: purple }}
                    />
                    Accepts Cooked Food Only
                  </label>

                  {/* Layout View Switcher */}
                  <div style={{ display: "flex", background: "#F1F5F9", borderRadius: 6, padding: 2 }}>
                    <button
                      type="button"
                      onClick={() => setStep2View("split")}
                      style={{
                        background: step2View === "split" ? "#FFFFFF" : "transparent",
                        border: "none",
                        borderRadius: 4,
                        padding: "4px 8px",
                        fontSize: 12,
                        cursor: "pointer",
                        color: navy,
                        fontWeight: 600,
                      }}
                      title="Split Map & List"
                    >
                      Split
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep2View("list")}
                      style={{
                        background: step2View === "list" ? "#FFFFFF" : "transparent",
                        border: "none",
                        borderRadius: 4,
                        padding: "4px 8px",
                        fontSize: 12,
                        cursor: "pointer",
                        color: navy,
                        fontWeight: 600,
                      }}
                      title="List View"
                    >
                      List
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep2View("map")}
                      style={{
                        background: step2View === "map" ? "#FFFFFF" : "transparent",
                        border: "none",
                        borderRadius: 4,
                        padding: "4px 8px",
                        fontSize: 12,
                        cursor: "pointer",
                        color: navy,
                        fontWeight: 600,
                      }}
                      title="Map View"
                    >
                      Map
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Sticky Action Bar for Selected Charities */}
              <div
                style={{
                  background: `linear-gradient(135deg, ${navy}, ${purple})`,
                  borderRadius: 12,
                  padding: "12px 20px",
                  color: "#FFFFFF",
                  marginBottom: 20,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  boxShadow: "0 4px 14px rgba(74, 21, 75, 0.2)",
                }}
              >
                <div>
                  <strong style={{ fontSize: 14 }}>
                    {selectedCharities.length} Charity Partner{selectedCharities.length === 1 ? "" : "s"} Selected
                  </strong>
                  <div style={{ fontSize: 12, color: "#E2E8F0" }}>
                    Surplus: {surplusData?.quantity} {surplusData?.unit} from "{surplusData?.eventName}"
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      color: "#FFFFFF",
                      border: "1px solid rgba(255,255,255,0.3)",
                      borderRadius: 8,
                      padding: "8px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ← Edit Surplus
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendDonationRequest()}
                    disabled={sendingRequest || selectedCharities.length === 0}
                    style={{
                      background: softGold,
                      color: "#2B1D12",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 20px",
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: sendingRequest || selectedCharities.length === 0 ? "not-allowed" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: "0 2px 8px rgba(201, 161, 58, 0.4)",
                    }}
                  >
                    <Send size={14} />
                    {sendingRequest
                      ? "Dispatching..."
                      : `Dispatch Request to ${selectedCharities.length} Charity${selectedCharities.length === 1 ? "" : "ies"}`}
                  </button>
                </div>
              </div>

              {/* Layout Container */}
              {loadingRecommendations ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      border: `3px solid ${softGold}`,
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                      margin: "0 auto 16px",
                    }}
                  />
                  <p style={{ color: "#8B7355", fontWeight: 600 }}>
                    AI is calculating transit routes, daily capacity & food safety margins…
                  </p>
                </div>
              ) : rankedCharities.length === 0 ? (
                <div
                  style={{
                    background: "#FFFFFF",
                    borderRadius: 14,
                    padding: 40,
                    textAlign: "center",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <p style={{ color: "#64748B", fontSize: 15 }}>
                    No charities found within {searchRadius} km matching the filter criteria.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleFilterChange("all", 50, false)}
                    style={{
                      background: navy,
                      color: "#FFF",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      marginTop: 8,
                    }}
                  >
                    Expand Search to 50 km
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      step2View === "split"
                        ? "1.1fr 1fr"
                        : "1fr",
                    gap: 20,
                    alignItems: "start",
                  }}
                >
                  {/* Left Column: Charity Cards List */}
                  {(step2View === "split" || step2View === "list") && (
                    <div>
                      <div style={{ marginBottom: 10, fontSize: 13, color: "#64748B", fontWeight: 600 }}>
                        Showing {rankedCharities.length} nearby shelters sorted by AI Match Score:
                      </div>
                      {rankedCharities.map((charity) => (
                        <CharityCard
                          key={charity._id}
                          charity={charity}
                          isSelected={selectedCharities.some((c) => c._id === charity._id)}
                          onToggleSelect={handleToggleSelectCharity}
                          onRequestSingle={handleRequestSingle}
                          surplusQuantity={surplusData?.quantity}
                          surplusUnit={surplusData?.unit}
                          requesting={sendingRequest}
                        />
                      ))}
                    </div>
                  )}

                  {/* Right Column: Interactive Map */}
                  {(step2View === "split" || step2View === "map") && (
                    <div style={{ position: step2View === "split" ? "sticky" : "static", top: 20 }}>
                      <CharityMap
                        venueCoordinates={venueCoords}
                        venueName={surplusData?.eventName || "Celebration Venue"}
                        charities={rankedCharities}
                        selectedCharityId={selectedCharities[0]?._id}
                        onSelectCharity={handleToggleSelectCharity}
                        height={step2View === "map" ? "560px" : "500px"}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Request Confirmation & Status Tracker */}
          {step === 3 && (
            <div>
              {requestSuccessMessage && (
                <div
                  style={{
                    background: "#ECFDF5",
                    border: "1px solid #10B981",
                    borderRadius: 14,
                    padding: "20px 24px",
                    marginBottom: 24,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                  }}
                >
                  <CheckCircle2 size={24} style={{ color: "#059669", marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <h4 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#065F46" }}>
                      Food Rescue Request Dispatched!
                    </h4>
                    <p style={{ margin: 0, fontSize: 14, color: "#047857" }}>
                      {requestSuccessMessage}
                    </p>
                    <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => {
                          setStep(1);
                          setRequestSuccessMessage("");
                        }}
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid #A7F3D0",
                          color: "#065F46",
                          padding: "6px 14px",
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        + Submit Another Surplus
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <DonationStatusTracker
                requests={historyRequests}
                onRefresh={fetchHistory}
                refreshing={loadingHistory}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CharityAI;

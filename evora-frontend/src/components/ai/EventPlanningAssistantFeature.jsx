import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Save,
  Trash2,
  Plus,
  ArrowRight,
  CheckCircle2,
  Calendar,
  MapPin,
  Users,
  Wallet,
  Palette,
} from "lucide-react";
import { aiAPI } from "../../services/api";

const EVORA_CATEGORIES = [
  "Wedding",
  "Birthday",
  "Corporate",
  "Anniversary",
  "Festival",
  "Graduation",
  "Engagement",
  "Other",
];

const EXAMPLE_PROMPT =
  "I want to organize a birthday party for 100 guests in Hyderabad with a budget of ₹1,50,000 on 15 January 2027.";

const EventPlanningAssistantFeature = ({ onAfterTransfer }) => {
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const [plan, setPlan] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [selectedServiceNames, setSelectedServiceNames] = useState([]);
  const [savedPlans, setSavedPlans] = useState([]);

  const loadSavedPlans = async () => {
    try {
      const list = await aiAPI.getSavedPlans();
      setSavedPlans(list || []);
    } catch {
      // ignore silent initial load error
    }
  };

  useEffect(() => {
    loadSavedPlans();
  }, []);

  const syncSelectedServicesFromPlan = (p) => {
    const names = (p?.suggestedServices || [])
      .map((s) => s.category || s.name)
      .filter(Boolean);
    setSelectedServiceNames(Array.from(new Set(names)));
  };

  const handleGenerate = async (e) => {
    e?.preventDefault();
    setError("");
    setStatusMessage("");
    if (prompt.trim().length < 5) {
      setError("Please describe your event in a sentence or two (at least 5 characters).");
      return;
    }

    setLoading(true);
    try {
      const generated = await aiAPI.generatePlan({ prompt: prompt.trim() });
      setPlan(generated);
      setEditingId(null);
      syncSelectedServicesFromPlan(generated);
    } catch (err) {
      setError(err.message || "Failed to generate event plan.");
    } finally {
      setLoading(false);
    }
  };

  const updatePlanField = (field, value) => {
    setPlan((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const toggleTransferService = (svcName) => {
    setSelectedServiceNames((prev) =>
      prev.includes(svcName) ? prev.filter((s) => s !== svcName) : [...prev, svcName]
    );
  };

  const handleScheduleChange = (idx, field, value) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const list = [...(prev.schedule || [])];
      list[idx] = { ...list[idx], [field]: value };
      return { ...prev, schedule: list };
    });
  };

  const handleBudgetRowChange = (idx, field, value) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const list = [...(prev.budgetDistribution || [])];
      list[idx] = {
        ...list[idx],
        [field]: field === "amount" ? Math.max(0, Number(value) || 0) : value,
      };
      return { ...prev, budgetDistribution: list };
    });
  };

  const handleRecommendationChange = (idx, value) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const list = [...(prev.preparationRecommendations || [])];
      list[idx] = value;
      return { ...prev, preparationRecommendations: list };
    });
  };

  const handleSavePlan = async () => {
    if (!plan) return;
    setError("");
    setStatusMessage("");
    setSaving(true);
    try {
      const payload = { ...plan, prompt: plan.prompt || prompt || plan.eventTitle };
      const saved = editingId
        ? await aiAPI.updateSavedPlan(editingId, payload)
        : await aiAPI.savePlan(payload);
      setPlan(saved);
      setEditingId(saved._id);
      await loadSavedPlans();
      setStatusMessage("Event plan saved privately to your account.");
    } catch (err) {
      setError(err.message || "Failed to save event plan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSavedPlan = async (id) => {
    setError("");
    setStatusMessage("");
    try {
      await aiAPI.deleteSavedPlan(id);
      setSavedPlans((prev) => prev.filter((p) => p._id !== id));
      if (editingId === id) {
        setEditingId(null);
      }
      setStatusMessage("Saved event plan deleted.");
    } catch (err) {
      setError(err.message || "Failed to delete saved plan.");
    }
  };

  const handleTransferToCreateEvent = () => {
    if (!plan) return;
    const chosenServices = (plan.suggestedServices || []).filter((s) =>
      selectedServiceNames.includes(s.category || s.name)
    );

    const aiPlanTransfer = {
      title: plan.eventTitle || "",
      category: EVORA_CATEGORIES.includes(plan.eventCategory) ? plan.eventCategory : "Other",
      date: plan.date || "",
      time: plan.time || "",
      location: plan.location || "Hyderabad",
      venue: plan.venue || "",
      guestCount: plan.guestCount ? String(plan.guestCount) : "",
      totalBudget: plan.budget ? String(plan.budget) : "",
      theme: plan.suggestedTheme || "",
      description: plan.description || "",
      selectedServices: chosenServices,
    };

    if (typeof onAfterTransfer === "function") {
      onAfterTransfer();
    }
    navigate("/user/events/create", { state: { aiPlan: aiPlanTransfer } });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Natural-Language Input */}
      <form
        onSubmit={handleGenerate}
        style={{
          background: "#F8F4E9",
          border: "1px solid #DDD2BE",
          borderRadius: 12,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 700, color: "#1F3324" }}>
            Describe your dream celebration in plain English
          </label>
          <button
            type="button"
            onClick={() => setPrompt(EXAMPLE_PROMPT)}
            style={{
              background: "#EEE7D7",
              border: "1px solid #C8BDA6",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: 11,
              fontWeight: 600,
              color: "#304B35",
              cursor: "pointer",
            }}
          >
            Fill Sample Prompt
          </button>
        </div>

        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={EXAMPLE_PROMPT}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #C8BDA6",
            background: "#FFFFFF",
            fontSize: 13,
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#718365" }}>
            AI extracts your details into an editable blueprint. Nothing is booked automatically.
          </span>
          <button
            type="submit"
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#304B35",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? "Designing Event Blueprint..." : "Generate Event Plan"}
          </button>
        </div>
      </form>

      {/* Error & Status */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#991B1B",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {statusMessage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#ECFDF5",
            border: "1px solid #A7F3D0",
            color: "#065F46",
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={15} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Saved Private Plans */}
      {savedPlans.length > 0 && (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5DEC9",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1F3324", marginBottom: 8 }}>
            Your Saved Private Event Plans ({savedPlans.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {savedPlans.map((sp) => {
              const selected = editingId === sp._id;
              return (
                <div
                  key={sp._id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: selected ? "1.5px solid #304B35" : "1px solid #DDD2BE",
                    background: selected ? "#F8F4E9" : "#FFFFFF",
                    fontSize: 12,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setPlan(sp);
                      setEditingId(sp._id);
                      setPrompt(sp.prompt || "");
                      syncSelectedServicesFromPlan(sp);
                      setStatusMessage("");
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#1F3324",
                      fontWeight: selected ? 700 : 500,
                      padding: 0,
                    }}
                  >
                    {sp.eventTitle} ({sp.guestCount || 0} guests)
                  </button>
                  <button
                    type="button"
                    title="Delete saved plan"
                    onClick={() => handleDeleteSavedPlan(sp._id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#991B1B",
                      padding: 2,
                      display: "inline-flex",
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Editable Generated Blueprint */}
      {plan && (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #DDD2BE",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Non-booking notice */}
          <div
            style={{
              background: "#FFFBEB",
              border: "1px solid #FDE68A",
              color: "#92400E",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {plan.disclaimer ||
              "Editable planning blueprint only. Transfer selected details to Create Event when you are ready — no events or bookings are created automatically."}
          </div>

          {/* Extracted & Editable Overview */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
              gap: 10,
            }}
          >
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#718365", display: "block", marginBottom: 3 }}>
                Event Title
              </label>
              <input
                type="text"
                value={plan.eventTitle || ""}
                onChange={(e) => updatePlanField("eventTitle", e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #C8BDA6", fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#718365", display: "block", marginBottom: 3 }}>
                EVORA Category
              </label>
              <select
                value={EVORA_CATEGORIES.includes(plan.eventCategory) ? plan.eventCategory : "Other"}
                onChange={(e) => updatePlanField("eventCategory", e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #C8BDA6", fontSize: 13 }}
              >
                {EVORA_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#718365", display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                <Calendar size={12} /> Event Date
              </label>
              <input
                type="date"
                value={plan.date || ""}
                onChange={(e) => updatePlanField("date", e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #C8BDA6", fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#718365", display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                <MapPin size={12} /> Location
              </label>
              <input
                type="text"
                value={plan.location || ""}
                onChange={(e) => updatePlanField("location", e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #C8BDA6", fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#718365", display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                <Users size={12} /> Guest Count
              </label>
              <input
                type="number"
                min="0"
                value={plan.guestCount ?? 0}
                onChange={(e) => updatePlanField("guestCount", Math.max(0, Number(e.target.value) || 0))}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #C8BDA6", fontSize: 13 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#718365", display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                <Wallet size={12} /> Budget (₹)
              </label>
              <input
                type="number"
                min="0"
                value={plan.budget ?? 0}
                onChange={(e) => updatePlanField("budget", Math.max(0, Number(e.target.value) || 0))}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #C8BDA6", fontSize: 13 }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#718365", display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                <Palette size={12} /> Suggested Theme
              </label>
              <input
                type="text"
                value={plan.suggestedTheme || ""}
                onChange={(e) => updatePlanField("suggestedTheme", e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #C8BDA6", fontSize: 13 }}
              />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#718365", display: "block", marginBottom: 3 }}>
                Event Description
              </label>
              <textarea
                rows={2}
                value={plan.description || ""}
                onChange={(e) => updatePlanField("description", e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #C8BDA6", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          </div>

          {/* Suggested Services (select which ones to transfer) */}
          <div style={{ background: "#F8F4E9", borderRadius: 10, padding: 12, border: "1px solid #E5DEC9" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1F3324", marginBottom: 8 }}>
              Suggested Services (checked services will transfer to Create Event)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
              {(plan.suggestedServices || []).map((svc, idx) => {
                const svcKey = svc.category || svc.name;
                const checked = selectedServiceNames.includes(svcKey);
                return (
                  <label
                    key={`${svcKey}-${idx}`}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      background: "#FFFFFF",
                      border: checked ? "1.5px solid #304B35" : "1px solid #DDD2BE",
                      borderRadius: 8,
                      padding: 10,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTransferService(svcKey)}
                      style={{ marginTop: 2, accentColor: "#304B35" }}
                    />
                    <div style={{ fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: "#1F3324" }}>
                        {svc.name}
                        {svc.estimatedCost > 0 && (
                          <span style={{ color: "#718365", fontWeight: 600 }}>
                            {" "}
                            · ~₹{Number(svc.estimatedCost).toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                      {svc.reason && <div style={{ color: "#5C6B57", marginTop: 2 }}>{svc.reason}</div>}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Suggested Schedule (editable) */}
          <div style={{ background: "#F8F4E9", borderRadius: 10, padding: 12, border: "1px solid #E5DEC9" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1F3324" }}>Suggested Event Schedule</span>
              <button
                type="button"
                onClick={() =>
                  updatePlanField("schedule", [
                    ...(plan.schedule || []),
                    { time: "", title: "New Activity", details: "" },
                  ])
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: "#FFFFFF",
                  border: "1px solid #C8BDA6",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#304B35",
                  cursor: "pointer",
                }}
              >
                <Plus size={12} /> Add Slot
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(plan.schedule || []).map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "100px 1fr 1.2fr auto",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="text"
                    value={row.time || ""}
                    placeholder="Time"
                    onChange={(e) => handleScheduleChange(idx, "time", e.target.value)}
                    style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #C8BDA6", fontSize: 12 }}
                  />
                  <input
                    type="text"
                    value={row.title || ""}
                    placeholder="Activity"
                    onChange={(e) => handleScheduleChange(idx, "title", e.target.value)}
                    style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #C8BDA6", fontSize: 12, fontWeight: 600 }}
                  />
                  <input
                    type="text"
                    value={row.details || ""}
                    placeholder="Details"
                    onChange={(e) => handleScheduleChange(idx, "details", e.target.value)}
                    style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #C8BDA6", fontSize: 12 }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updatePlanField(
                        "schedule",
                        plan.schedule.filter((_, i) => i !== idx)
                      )
                    }
                    style={{ background: "transparent", border: "none", color: "#991B1B", cursor: "pointer", padding: 4 }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Approximate Budget Distribution (editable) */}
          <div style={{ background: "#F8F4E9", borderRadius: 10, padding: 12, border: "1px solid #E5DEC9" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1F3324" }}>
                Approximate Budget Distribution (Estimates Only)
              </span>
              <button
                type="button"
                onClick={() =>
                  updatePlanField("budgetDistribution", [
                    ...(plan.budgetDistribution || []),
                    { category: "Miscellaneous", amount: 0, notes: "" },
                  ])
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: "#FFFFFF",
                  border: "1px solid #C8BDA6",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#304B35",
                  cursor: "pointer",
                }}
              >
                <Plus size={12} /> Add Line
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(plan.budgetDistribution || []).map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 120px 1.2fr auto",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="text"
                    value={row.category || ""}
                    onChange={(e) => handleBudgetRowChange(idx, "category", e.target.value)}
                    style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #C8BDA6", fontSize: 12, fontWeight: 600 }}
                  />
                  <input
                    type="number"
                    min="0"
                    value={row.amount ?? 0}
                    onChange={(e) => handleBudgetRowChange(idx, "amount", e.target.value)}
                    style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #C8BDA6", fontSize: 12 }}
                  />
                  <input
                    type="text"
                    value={row.notes || ""}
                    placeholder="Notes"
                    onChange={(e) => handleBudgetRowChange(idx, "notes", e.target.value)}
                    style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #C8BDA6", fontSize: 12 }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updatePlanField(
                        "budgetDistribution",
                        plan.budgetDistribution.filter((_, i) => i !== idx)
                      )
                    }
                    style={{ background: "transparent", border: "none", color: "#991B1B", cursor: "pointer", padding: 4 }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Preparation Recommendations (editable) */}
          <div style={{ background: "#F8F4E9", borderRadius: 10, padding: 12, border: "1px solid #E5DEC9" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#1F3324" }}>Preparation Recommendations</span>
              <button
                type="button"
                onClick={() =>
                  updatePlanField("preparationRecommendations", [
                    ...(plan.preparationRecommendations || []),
                    "",
                  ])
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: "#FFFFFF",
                  border: "1px solid #C8BDA6",
                  borderRadius: 6,
                  padding: "4px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#304B35",
                  cursor: "pointer",
                }}
              >
                <Plus size={12} /> Add Tip
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(plan.preparationRecommendations || []).map((rec, idx) => (
                <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <input
                    type="text"
                    value={rec}
                    onChange={(e) => handleRecommendationChange(idx, e.target.value)}
                    style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #C8BDA6", fontSize: 12 }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updatePlanField(
                        "preparationRecommendations",
                        plan.preparationRecommendations.filter((_, i) => i !== idx)
                      )
                    }
                    style={{ background: "transparent", border: "none", color: "#991B1B", cursor: "pointer", padding: 4 }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, paddingTop: 4 }}>
            <button
              type="button"
              onClick={handleSavePlan}
              disabled={saving}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#EEE7D7",
                color: "#1F3324",
                border: "1px solid #C8BDA6",
                borderRadius: 8,
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              <Save size={15} />
              {saving ? "Saving..." : editingId ? "Update Saved Plan" : "Save Plan Privately"}
            </button>

            <button
              type="button"
              onClick={handleTransferToCreateEvent}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "#C9A13A",
                color: "#1F3324",
                border: "none",
                borderRadius: 8,
                padding: "10px 18px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Transfer Selected Details to Create Event <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventPlanningAssistantFeature;

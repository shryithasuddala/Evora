import { useState } from "react";
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RotateCcw,
  Info,
} from "lucide-react";
import { aiAPI } from "../../services/api";

const EVENT_TYPES = [
  "Wedding",
  "Birthday",
  "Corporate",
  "Anniversary",
  "Engagement",
  "Festival",
  "Graduation",
  "Private Party",
];

const SERVICE_OPTIONS = [
  "Venue",
  "Catering",
  "Photography",
  "Decoration",
  "Music",
  "Makeup & Styling",
  "Transportation",
  "Security",
];

const BudgetAssistantFeature = () => {
  const [eventType, setEventType] = useState("Wedding");
  const [guestCount, setGuestCount] = useState("200");
  const [totalBudget, setTotalBudget] = useState("300000");
  const [location, setLocation] = useState("Hyderabad");
  const [selectedServices, setSelectedServices] = useState([
    "Venue",
    "Catering",
    "Photography",
    "Decoration",
    "Music",
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [editableAllocations, setEditableAllocations] = useState([]);

  const toggleService = (srv) => {
    setSelectedServices((prev) =>
      prev.includes(srv) ? prev.filter((s) => s !== srv) : [...prev, srv]
    );
  };

  const handleGenerate = async (e) => {
    e?.preventDefault();
    setError("");
    const guestsNum = Number(guestCount);
    const budgetNum = Number(totalBudget);

    if (!guestsNum || guestsNum <= 0) {
      setError("Please enter a valid guest count greater than 0.");
      return;
    }
    if (!budgetNum || budgetNum <= 0) {
      setError("Please enter a valid total budget greater than 0.");
      return;
    }
    if (selectedServices.length === 0) {
      setError("Please select at least one service.");
      return;
    }

    setLoading(true);
    try {
      const result = await aiAPI.budget({
        eventType,
        guestCount: guestsNum,
        totalBudget: budgetNum,
        selectedServices,
        location,
      });
      setAnalysis(result);
      setEditableAllocations(result?.allocations || []);
    } catch (err) {
      setError(err.message || "Failed to generate budget allocation.");
    } finally {
      setLoading(false);
    }
  };

  const handleAllocationChange = (index, rawVal) => {
    const val = Math.max(0, Number(rawVal) || 0);
    setEditableAllocations((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, suggestedBudget: val } : row))
    );
  };

  const handleResetAllocations = () => {
    if (analysis?.allocations) {
      setEditableAllocations(analysis.allocations);
    }
  };

  const targetBudgetNum = Number(analysis?.totalBudget || totalBudget || 0);
  const liveEstimatedTotal = editableAllocations.reduce(
    (sum, item) => sum + (Number(item.suggestedBudget) || 0),
    0
  );
  const liveRemaining = targetBudgetNum - liveEstimatedTotal;
  const liveOverBudget = liveEstimatedTotal > targetBudgetNum;
  const liveOverrunAmount = liveOverBudget ? liveEstimatedTotal - targetBudgetNum : 0;

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: "1px solid #718365",
    background: "#FFFFFF",
    color: "#1F3324",
    fontSize: 13,
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "#304B35",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Input Form */}
      <form
        onSubmit={handleGenerate}
        style={{
          background: "#F8F4E9",
          border: "1px solid #EEE7D7",
          borderRadius: 12,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <label style={labelStyle}>Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              style={inputStyle}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Guest Count</label>
            <input
              type="number"
              min="1"
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Total Budget (₹)</label>
            <input
              type="number"
              min="1000"
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
              style={inputStyle}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>City / Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Hyderabad"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Service Multi-select */}
        <div>
          <label style={labelStyle}>Selected Services ({selectedServices.length})</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SERVICE_OPTIONS.map((srv) => {
              const checked = selectedServices.includes(srv);
              return (
                <button
                  key={srv}
                  type="button"
                  onClick={() => toggleService(srv)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 18,
                    border: checked ? "1.5px solid #304B35" : "1px solid #D8CEB8",
                    background: checked ? "#304B35" : "#FFFFFF",
                    color: checked ? "#F8F4E9" : "#1F3324",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {checked ? "✓ " : "+ "}
                  {srv}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "#304B35",
              color: "#F8F4E9",
              fontSize: 13,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? (
              <>
                <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                Analyzing Budget…
              </>
            ) : (
              <>
                <Sparkles size={15} color="#C9A13A" />
                Generate AI Budget Plan
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          style={{
            background: "#FEF2F2",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Results */}
      {analysis && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Non-confirmed Price Disclaimer */}
          <div
            style={{
              background: "#EEE7D7",
              border: "1px solid #C9A13A",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 12,
              color: "#1F3324",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Info size={16} color="#C9A13A" style={{ flexShrink: 0 }} />
            <span>{analysis.disclaimer}</span>
          </div>

          {/* Overrun / Healthy Status Alert */}
          <div
            style={{
              background: liveOverBudget ? "#FEF2F2" : "#EAF0EA",
              border: `1.5px solid ${liveOverBudget ? "#DC2626" : "#304B35"}`,
              borderRadius: 10,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: liveOverBudget ? "#991B1B" : "#1F3324",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {liveOverBudget ? (
              <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
            ) : (
              <CheckCircle2 size={18} color="#304B35" style={{ flexShrink: 0 }} />
            )}
            <span>
              {liveOverBudget
                ? `Budget Exceeded: Current allocation total (₹${liveEstimatedTotal.toLocaleString("en-IN")}) exceeds your ₹${targetBudgetNum.toLocaleString("en-IN")} budget by ₹${liveOverrunAmount.toLocaleString("en-IN")}.`
                : `Within Budget: Current allocation total is ₹${liveEstimatedTotal.toLocaleString("en-IN")} with ₹${liveRemaining.toLocaleString("en-IN")} remaining.`}
            </span>
          </div>

          {/* Summary KPI Strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 10,
            }}
          >
            <div style={{ background: "#F8F4E9", borderRadius: 10, padding: 12, border: "1px solid #EEE7D7" }}>
              <div style={{ fontSize: 11, color: "#718365", fontWeight: 700 }}>TARGET BUDGET</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1F3324" }}>
                ₹{targetBudgetNum.toLocaleString("en-IN")}
              </div>
            </div>
            <div style={{ background: "#F8F4E9", borderRadius: 10, padding: 12, border: "1px solid #EEE7D7" }}>
              <div style={{ fontSize: 11, color: "#718365", fontWeight: 700 }}>ESTIMATED TOTAL</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: liveOverBudget ? "#DC2626" : "#304B35" }}>
                ₹{liveEstimatedTotal.toLocaleString("en-IN")}
              </div>
            </div>
            <div style={{ background: "#F8F4E9", borderRadius: 10, padding: 12, border: "1px solid #EEE7D7" }}>
              <div style={{ fontSize: 11, color: "#718365", fontWeight: 700 }}>
                {liveOverBudget ? "OVER BUDGET BY" : "REMAINING BALANCE"}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: liveOverBudget ? "#DC2626" : "#304B35" }}>
                ₹{Math.abs(liveRemaining).toLocaleString("en-IN")}
              </div>
            </div>
            <div style={{ background: "#F8F4E9", borderRadius: 10, padding: 12, border: "1px solid #EEE7D7" }}>
              <div style={{ fontSize: 11, color: "#718365", fontWeight: 700 }}>EST. COST / GUEST</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1F3324" }}>
                ₹{Math.round(liveEstimatedTotal / (Number(analysis.guestCount) || 1)).toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* Editable Allocation Table */}
          <div style={{ border: "1px solid #EEE7D7", borderRadius: 12, overflow: "hidden" }}>
            <div
              style={{
                background: "#EEE7D7",
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <strong style={{ fontSize: 13, color: "#1F3324" }}>
                Service-Wise Allocation (Editable Estimates)
              </strong>
              <button
                type="button"
                onClick={handleResetAllocations}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #718365",
                  color: "#304B35",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={12} /> Reset AI Values
              </button>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#F8F4E9", color: "#304B35", textAlign: "left" }}>
                    <th style={{ padding: "10px 12px" }}>Service</th>
                    <th style={{ padding: "10px 12px" }}>Suggested Budget (₹)</th>
                    <th style={{ padding: "10px 12px" }}>Share</th>
                    <th style={{ padding: "10px 12px" }}>Basis & Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {editableAllocations.map((row, idx) => {
                    const share =
                      liveEstimatedTotal > 0
                        ? Math.round((Number(row.suggestedBudget) / liveEstimatedTotal) * 100)
                        : 0;
                    return (
                      <tr key={`${row.service}-${idx}`} style={{ borderTop: "1px solid #EEE7D7" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1F3324" }}>
                          {row.service}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <input
                            type="number"
                            min="0"
                            step="500"
                            value={row.suggestedBudget}
                            onChange={(e) => handleAllocationChange(idx, e.target.value)}
                            aria-label={`Budget for ${row.service}`}
                            style={{
                              width: 130,
                              padding: "6px 10px",
                              borderRadius: 6,
                              border: "1px solid #718365",
                              fontWeight: 700,
                              color: "#1F3324",
                            }}
                          />
                        </td>
                        <td style={{ padding: "10px 12px", color: "#718365", fontWeight: 600 }}>
                          {share}%
                        </td>
                        <td style={{ padding: "10px 12px", color: "#40382F", fontSize: 12 }}>
                          <span
                            style={{
                              display: "inline-block",
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "1px 6px",
                              borderRadius: 6,
                              background: "#EEE7D7",
                              color: "#304B35",
                              marginRight: 6,
                            }}
                          >
                            {row.pricingSource}
                          </span>
                          {row.notes}
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ borderTop: "2px solid #C9A13A", background: "#F8F4E9" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "#1F3324" }}>Total</td>
                    <td style={{ padding: "10px 12px", fontWeight: 800, color: liveOverBudget ? "#DC2626" : "#304B35" }}>
                      ₹{liveEstimatedTotal.toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 700 }}>100%</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: "#718365" }}>
                      Target: ₹{targetBudgetNum.toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Cheaper Alternatives */}
          {analysis.cheaperAlternatives && analysis.cheaperAlternatives.length > 0 && (
            <div
              style={{
                background: "#F8F4E9",
                border: "1px solid #EEE7D7",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <h4 style={{ margin: "0 0 10px", fontSize: 14, color: "#1F3324", fontFamily: "Playfair Display, serif" }}>
                Cheaper Alternatives & Cost-Saving Suggestions
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                {analysis.cheaperAlternatives.map((alt, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #EEE7D7",
                      borderRadius: 8,
                      padding: 10,
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <strong style={{ color: "#304B35" }}>{alt.service}</strong>
                      {alt.potentialSavings > 0 && (
                        <span style={{ color: "#C9A13A", fontWeight: 700 }}>
                          Save ~₹{alt.potentialSavings.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, color: "#40382F", lineHeight: 1.45 }}>{alt.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BudgetAssistantFeature;

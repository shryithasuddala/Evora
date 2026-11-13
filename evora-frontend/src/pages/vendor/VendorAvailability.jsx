import { useState, useEffect } from "react";
import { ShieldCheck, Ban, Save } from "lucide-react";
import { availabilityAPI, authAPI } from "../../services/api";
import { useToast } from "../../context/ToastContext";

const VendorAvailability = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [capacityPerDay, setCapacityPerDay] = useState(1);
  const [blockedDates, setBlockedDates] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const loadAvailability = async () => {
    try {
      const user = await authAPI.getMe();
      if (user && user._id) {
        const res = await availabilityAPI.getVendorAvailability(user._id);
        setCapacityPerDay(res.capacityPerDay || 1);
        setBlockedDates(res.blockedDates || []);
      }
    } catch (err) {
      toast.error("Error", err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailability();
  }, []);

  const toggleDate = (dateStr) => {
    if (blockedDates.includes(dateStr)) {
      setBlockedDates((prev) => prev.filter((d) => d !== dateStr));
    } else {
      setBlockedDates((prev) => [...prev, dateStr]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await availabilityAPI.updateMyAvailability({
        capacityPerDay,
        blockedDates,
      });
      toast.success("Availability Saved", "Your calendar availability and daily capacity have been updated.");
    } catch (err) {
      toast.error("Save failed", err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  // Build calendar days for currentMonth
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthName = currentMonth.toLocaleString("en-US", { month: "long", year: "numeric" });

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  if (loading) {
    return (
      <div className="vendor-content" style={{ textAlign: "center", padding: "50px", color: "#8B7355" }}>
        Loading availability calendar…
      </div>
    );
  }

  return (
    <div className="vendor-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <div>
          <span style={{ fontSize: "11px", letterSpacing: "2px", color: "#C9A13A", fontWeight: 700, textTransform: "uppercase" }}>
            SCHEDULE & BOOKING CONTROLS
          </span>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "28px", color: "#2B1D12", margin: "4px 0" }}>
            Availability Calendar
          </h1>
          <p style={{ color: "#766C67", fontSize: "13px", margin: 0 }}>
            Block out holidays, booked dates, and set maximum parallel event capacities.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="vendor-btn"
          style={{ minWidth: "150px" }}
        >
          <Save size={16} /> {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
        {/* Calendar Card */}
        <div className="vendor-card" style={{ padding: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", margin: 0, fontSize: "18px", color: "#2B1D12" }}>
              {monthName}
            </h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={prevMonth}
                style={{ background: "#FAF5EA", border: "1px solid #D5B36A", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}
              >
                ‹ Prev
              </button>
              <button
                type="button"
                onClick={nextMonth}
                style={{ background: "#FAF5EA", border: "1px solid #D5B36A", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}
              >
                Next ›
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#8B7355", marginBottom: "8px" }}>
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isBlocked = blockedDates.includes(dateStr);

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => toggleDate(dateStr)}
                  title={isBlocked ? "Blocked date — click to unblock" : "Available date — click to block"}
                  style={{
                    height: "44px",
                    borderRadius: "8px",
                    border: isBlocked ? "1px solid #C62828" : "1px solid #D5B36A",
                    background: isBlocked ? "#FFEBEE" : "#FFFDF9",
                    color: isBlocked ? "#C62828" : "#2B1D12",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "2px",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{day}</span>
                  {isBlocked && <span style={{ fontSize: "8px", fontWeight: 700 }}>BLOCKED</span>}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "16px", marginTop: "20px", fontSize: "12px", color: "#766C67" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#FFFDF9", border: "1px solid #D5B36A" }} />
              Available for Bookings
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#FFEBEE", border: "1px solid #C62828" }} />
              Blocked Date
            </span>
          </div>
        </div>

        {/* Capacity & Rules Card */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="vendor-card" style={{ padding: "28px" }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", margin: "0 0 12px", fontSize: "18px", color: "#2B1D12" }}>
              Daily Service Capacity
            </h3>
            <p style={{ color: "#766C67", fontSize: "13px", margin: "0 0 16px", lineHeight: 1.5 }}>
              How many distinct events can your team serve on a single calendar day?
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
              <input
                type="number"
                min="1"
                max="10"
                value={capacityPerDay}
                onChange={(e) => setCapacityPerDay(Math.max(1, Number(e.target.value) || 1))}
                style={{ width: "80px", padding: "10px", borderRadius: "8px", border: "1px solid #D5B36A", background: "#FAF5EA", fontSize: "16px", fontWeight: 700, textAlign: "center" }}
              />
              <span style={{ fontSize: "14px", color: "#2B1D12", fontWeight: 600 }}>Event(s) per day</span>
            </div>

            <div style={{ background: "#FAF5EA", border: "1px solid #EADBBE", borderRadius: "10px", padding: "14px", fontSize: "12px", color: "#6B5240", lineHeight: 1.5 }}>
              <ShieldCheck size={16} color="#304B35" style={{ verticalAlign: "middle", marginRight: "6px" }} />
              <strong>Automated Conflict Guard:</strong> EVORA automatically prevents organizers from sending booking proposals or confirming bookings once your daily capacity threshold is reached or when a date is marked blocked.
            </div>
          </div>

          <div className="vendor-card" style={{ padding: "24px" }}>
            <h4 style={{ fontFamily: "'Playfair Display', serif", margin: "0 0 8px", color: "#2B1D12" }}>
              Blocked Dates Summary ({blockedDates.length})
            </h4>
            {blockedDates.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#8B7355", margin: 0 }}>No dates currently blocked.</p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {blockedDates.map((d) => (
                  <span
                    key={d}
                    style={{ background: "#FFEBEE", color: "#C62828", border: "1px solid #F5C2C7", padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <Ban size={11} /> {d}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorAvailability;

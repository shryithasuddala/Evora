import { useState, useEffect } from "react";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
} from "lucide-react";
import { tasksAPI } from "../../services/api";

const MySchedule = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tasksAPI.getAll()
      .then((data) => setTasks(data || []))
      .catch((err) => console.error("Schedule error:", err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="vendor-page">
      <div style={{ marginBottom: "24px" }}>
        <span className="vendor-welcome-label" style={{ color: "#647665" }}>
          EVENT TIMELINE
        </span>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "32px", margin: "4px 0" }}>
          Volunteer Shift Schedule
        </h1>
        <p style={{ margin: 0, color: "#766C67" }}>
          Calendar view of your confirmed duty slots, station arrivals, and coordination requirements.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
        {/* SCHEDULE TIMELINE */}
        <div className="vendor-card">
          <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "20px", margin: "0 0 18px" }}>
            Chronological Shift Roster
          </h2>

          {loading ? (
            <p style={{ color: "#8B7355", textAlign: "center", padding: 30 }}>Loading schedule…</p>
          ) : tasks.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#766C67" }}>
              <CalendarDays size={36} style={{ opacity: 0.3, marginBottom: "8px" }} />
              <p>No upcoming shifts assigned yet.</p>
            </div>
          ) : (
            <div style={{ position: "relative", paddingLeft: "24px", borderLeft: "2px solid #E7DED5", display: "flex", flexDirection: "column", gap: "24px" }}>
              {tasks.map((shift) => {
                const shiftId = shift._id || shift.id;
                return (
                  <div key={shiftId} style={{ position: "relative" }}>
                    {/* TIMELINE BULLET */}
                    <div
                      style={{
                        position: "absolute",
                        left: "-31px",
                        top: "2px",
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        background: shift.status === "Done" ? "#304B35" : "#C9A13A",
                        border: "3px solid #FFFDF9",
                        boxShadow: "0 0 0 1px #E7DED5",
                      }}
                    />

                    <div
                      style={{
                        padding: "16px",
                        border: "1px solid #E7DED5",
                        borderRadius: "10px",
                        background: "#FFFDF9",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <div>
                          <span style={{ fontSize: "12px", fontWeight: 700, color: "#C9A13A" }}>
                            {shift.date || "Scheduled"}
                          </span>
                          <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: "17px", margin: "2px 0 4px" }}>
                            {shift.eventName || shift.eventId?.title}
                          </h3>
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "999px",
                            background: shift.status === "Done" ? "#D4EDDA" : "#FFF3CD",
                            color: shift.status === "Done" ? "#155724" : "#856404",
                          }}
                        >
                          {shift.status}
                        </span>
                      </div>

                      <strong style={{ fontSize: "14px", color: "#2E2927", display: "block", marginBottom: "4px" }}>
                        Duty: {shift.title}
                      </strong>
                      <p style={{ fontSize: "13px", color: "#766C67", margin: "0 0 10px", lineHeight: "1.5" }}>
                        {shift.description}
                      </p>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", fontSize: "12px", color: "#766C67" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Clock size={13} color="#304B35" /> {shift.time || "Flexible"}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <MapPin size={13} color="#304B35" /> {shift.location || shift.venue || "On Site"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PROTOCOLS & GUIDELINES */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="vendor-card" style={{ background: "#F7F2EC", border: "1px solid #E7DED5" }}>
            <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: "18px", margin: "0 0 12px", color: "#2E2927" }}>
              Operational Directives
            </h3>
            <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13px", color: "#584C47", lineHeight: "1.8" }}>
              <li>Arrive 20–30 minutes before your scheduled shift start time.</li>
              <li>Present your Digital ID Badge at the coordinator registration station.</li>
              <li>Maintain EVORA's hospitality and decorum standards at all times.</li>
              <li>Submit on-ground duty notes immediately upon shift completion.</li>
            </ul>
          </div>

          <div className="vendor-card" style={{ background: "#FFFDF9", border: "1px solid #E7DED5", textAlign: "center", padding: "24px" }}>
            <Users size={32} color="#304B35" style={{ marginBottom: "8px" }} />
            <h4 style={{ fontFamily: "Playfair Display, serif", margin: "0 0 4px" }}>Coordinator Support</h4>
            <p style={{ fontSize: "13px", color: "#766C67", margin: "0 0 12px" }}>
              Need assistance on-site or shift reassignment?
            </p>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#304B35" }}>
              Helpline: +91 90000 00001 (Admin Desk)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MySchedule;

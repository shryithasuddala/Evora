import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ClipboardCheck,
  CalendarDays,
  Clock,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { tasksAPI } from "../../services/api";

const VolunteerDashboard = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = async () => {
    try {
      const data = await tasksAPI.getAll();
      setTasks(data || []);
    } catch (err) {
      console.error("Volunteer tasks load error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleQuickComplete = async (taskId) => {
    try {
      await tasksAPI.updateStatus(taskId, "Done", "Verified by volunteer on site.");
      await loadTasks();
    } catch (err) {
      alert(err.message || "Failed to update task status.");
    }
  };

  const pendingTasks = tasks.filter((t) => t.status === "Assigned");
  const inProgressTasks = tasks.filter((t) => t.status === "In Progress");
  const completedTasks = tasks.filter((t) => t.status === "Done");

  const nextTask = tasks.find((t) => t.status !== "Done") || tasks[0];

  if (loading) {
    return (
      <div className="vendor-page" style={{ textAlign: "center", padding: 50, color: "#8B7355" }}>
        Loading duty command…
      </div>
    );
  }

  return (
    <div className="vendor-page">
      {/* VOLUNTEER HERO BANNER */}
      <section
        className="vendor-welcome-card"
        style={{
          background: "linear-gradient(135deg, #1D2A20 0%, #304B35 100%)",
          color: "#FFFDF9",
        }}
      >
        <div className="vendor-welcome-content">
          <span className="vendor-welcome-label" style={{ color: "#D5B36A" }}>
            DUTY COMMAND
          </span>
          <h2 style={{ color: "#FFFDF9", fontFamily: "Playfair Display, serif" }}>
            Empowering Celebrations <br />with Service & Grace.
          </h2>
          <p style={{ color: "#E7DED5", maxWidth: "520px" }}>
            You are assigned to critical on-ground coordination duties. Your presence ensures
            unforgettable guest experiences and seamless ceremony execution.
          </p>

          <div className="vendor-welcome-actions">
            <button
              className="vendor-primary-button"
              onClick={() => navigate("/volunteer/tasks")}
              style={{ background: "#C9A13A", color: "#2E2927" }}
            >
              <ClipboardCheck size={16} />
              Review Duty Checklist
            </button>
            <button
              className="vendor-secondary-button"
              onClick={() => navigate("/volunteer/profile")}
              style={{ borderColor: "#D5B36A", color: "#FFFDF9" }}
            >
              View Digital ID Badge
            </button>
          </div>
        </div>
      </section>

      {/* KPI METRICS */}
      <section className="vendor-stats-grid">
        <div className="vendor-stat-card">
          <div className="vendor-stat-icon" style={{ background: "#EAF0EA", color: "#304B35" }}>
            <ClipboardCheck size={20} />
          </div>
          <div className="vendor-stat-details">
            <span className="vendor-stat-label">Total Assigned Duties</span>
            <h3>{tasks.length}</h3>
          </div>
        </div>

        <div className="vendor-stat-card">
          <div className="vendor-stat-icon" style={{ background: "#FFF3CD", color: "#856404" }}>
            <Clock size={20} />
          </div>
          <div className="vendor-stat-details">
            <span className="vendor-stat-label">In Progress / Pending</span>
            <h3>{pendingTasks.length + inProgressTasks.length}</h3>
          </div>
        </div>

        <div className="vendor-stat-card">
          <div className="vendor-stat-icon" style={{ background: "#D4EDDA", color: "#155724" }}>
            <CheckCircle2 size={20} />
          </div>
          <div className="vendor-stat-details">
            <span className="vendor-stat-label">Completed Duties</span>
            <h3>{completedTasks.length}</h3>
          </div>
        </div>

        <div className="vendor-stat-card">
          <div className="vendor-stat-icon" style={{ background: "#F0E1BE", color: "#8C6435" }}>
            <ShieldCheck size={20} />
          </div>
          <div className="vendor-stat-details">
            <span className="vendor-stat-label">Verification Standing</span>
            <h3 style={{ fontSize: "16px", color: "#304B35", marginTop: "4px" }}>
              Active / Tier-1
            </h3>
          </div>
        </div>
      </section>

      {/* ACTIVE SHIFT CALLOUT */}
      {nextTask && (
        <div
          className="vendor-card"
          style={{
            borderLeft: "5px solid #304B35",
            background: "#FFFDF9",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
            <div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "1px",
                  color: "#647665",
                  textTransform: "uppercase",
                }}
              >
                NEXT ASSIGNED EVENT DUTY
              </span>
              <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "22px", margin: "4px 0" }}>
                {nextTask.title}
              </h2>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#C9A13A" }}>
                {nextTask.eventName || nextTask.eventId?.title}
              </span>
            </div>

            <span
              style={{
                fontSize: "12px",
                fontWeight: 700,
                padding: "4px 12px",
                borderRadius: "999px",
                background: nextTask.status === "Done" ? "#D4EDDA" : "#FFF3CD",
                color: nextTask.status === "Done" ? "#155724" : "#856404",
              }}
            >
              {nextTask.status}
            </span>
          </div>

          <p style={{ fontSize: "14px", color: "#4F4641", lineHeight: "1.6", margin: "0 0 14px" }}>
            {nextTask.description || "General coordination and guest management support."}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "18px", fontSize: "13px", color: "#766C67", borderTop: "1px solid #E7DED5", paddingTop: "12px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <CalendarDays size={14} color="#304B35" /> Date: {nextTask.date || nextTask.shiftDate || "Scheduled"}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Clock size={14} color="#304B35" /> Shift: {nextTask.time || nextTask.shiftTime || "Flexible"}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <MapPin size={14} color="#304B35" /> Station: {nextTask.location || nextTask.venue || "Venue Main Station"}
            </span>
          </div>

          {nextTask.status !== "Done" && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px" }}>
              <button
                type="button"
                className="vendor-primary-button"
                onClick={() => handleQuickComplete(nextTask._id || nextTask.id)}
                style={{ padding: "8px 18px", fontSize: "13px", background: "#304B35" }}
              >
                <CheckCircle2 size={15} /> Mark Duty As Completed
              </button>
            </div>
          )}
        </div>
      )}

      {/* QUICK TASKS CHECKLIST */}
      <div className="vendor-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "20px", margin: 0 }}>
            Operational Duty Roster ({tasks.length})
          </h2>
          <Link
            to="/volunteer/tasks"
            style={{ fontSize: "13px", color: "#304B35", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}
          >
            Full Task Console <ArrowRight size={14} />
          </Link>
        </div>

        {tasks.length === 0 ? (
          <p style={{ color: "#8B7355", textAlign: "center", padding: 20 }}>No duties assigned yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {tasks.map((task) => {
              const tId = task._id || task.id;
              return (
                <div
                  key={tId}
                  style={{
                    padding: "14px",
                    border: "1px solid #E7DED5",
                    borderRadius: "10px",
                    background: "#FFFDF9",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "14px", display: "block", color: "#2E2927" }}>
                      {task.title}
                    </strong>
                    <span style={{ fontSize: "12px", color: "#766C67" }}>
                      {task.eventName || task.eventId?.title} • {task.time || task.shiftTime || "All Day"} • {task.location || task.venue || "On Site"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: "999px",
                        background: task.status === "Done" ? "#D4EDDA" : "#D1ECF1",
                        color: task.status === "Done" ? "#155724" : "#0C5460",
                      }}
                    >
                      {task.status}
                    </span>

                    {task.status !== "Done" && (
                      <button
                        type="button"
                        onClick={() => handleQuickComplete(tId)}
                        style={{
                          padding: "5px 12px",
                          fontSize: "11px",
                          fontWeight: 700,
                          borderRadius: "6px",
                          border: "1.5px solid #16A34A",
                          background: "#F0FDF4",
                          color: "#166534",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#16A34A";
                          e.currentTarget.style.color = "#FFF";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#F0FDF4";
                          e.currentTarget.style.color = "#166534";
                        }}
                      >
                        ✓ Done
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VolunteerDashboard;

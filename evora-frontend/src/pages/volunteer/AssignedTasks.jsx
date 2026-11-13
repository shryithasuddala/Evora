import { useState, useEffect } from "react";
import {
  ClipboardCheck,
  MapPin,
  CheckCircle2,
  Clock4,
  Search,
} from "lucide-react";
import { tasksAPI } from "../../services/api";

const TABS = ["All", "Assigned", "In Progress", "Done"];

const AssignedTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingNotesId, setEditingNotesId] = useState(null);
  const [notesText, setNotesText] = useState("");

  const refreshTasks = async () => {
    try {
      const data = await tasksAPI.getAll();
      setTasks(data || []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshTasks();
  }, []);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await tasksAPI.updateStatus(taskId, newStatus);
      await refreshTasks();
    } catch (err) {
      alert(err.message || "Failed to update status.");
    }
  };

  const handleSaveNotes = async (taskId) => {
    try {
      await tasksAPI.updateStatus(taskId, "Done", notesText);
      setEditingNotesId(null);
      setNotesText("");
      await refreshTasks();
    } catch (err) {
      alert(err.message || "Failed to record completion notes.");
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      (t.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.eventName || t.eventId?.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.location || "").toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === "All") return matchesSearch;
    return matchesSearch && t.status === activeTab;
  });

  if (loading) {
    return (
      <div className="vendor-page" style={{ textAlign: "center", padding: 50, color: "#8B7355" }}>
        Loading duties…
      </div>
    );
  }

  return (
    <div className="vendor-page">
      <div style={{ marginBottom: "24px" }}>
        <span className="vendor-welcome-label" style={{ color: "#647665" }}>
          DUTY CONSOLE
        </span>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "32px", margin: "4px 0" }}>
          Assigned Tasks & Duty Checklist
        </h1>
        <p style={{ margin: 0, color: "#766C67" }}>
          Execute and report on-site duties assigned for celebrations by event hosts and platform admins.
        </p>
      </div>

      {/* FILTER & SEARCH */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "8px 16px",
                borderRadius: "999px",
                border: "1px solid #E7DED5",
                background: activeTab === tab ? "#304B35" : "#FFFDF9",
                color: activeTab === tab ? "#FFF" : "#766C67",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {tab} (
              {tab === "All"
                ? tasks.length
                : tasks.filter((t) => t.status === tab).length}
              )
            </button>
          ))}
        </div>

        <div className="login-input-wrapper" style={{ width: "280px", background: "#FFF" }}>
          <Search size={16} />
          <input
            placeholder="Search duties, events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* TASKS LIST */}
      {filteredTasks.length === 0 ? (
        <div className="vendor-card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <ClipboardCheck size={40} style={{ opacity: 0.3, marginBottom: "12px" }} />
          <h3>No tasks in this category</h3>
          <p style={{ color: "#766C67" }}>All assigned event duties are completed or none match your filter.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {filteredTasks.map((task) => {
            const taskId = task._id || task.id;
            const statusConfig = {
              Assigned: { bg: "#FFF3CD", text: "#856404" },
              "In Progress": { bg: "#D1ECF1", text: "#0C5460" },
              Done: { bg: "#D4EDDA", text: "#155724" },
            };
            const config = statusConfig[task.status] || statusConfig.Assigned;

            return (
              <div
                key={taskId}
                className="vendor-card"
                style={{
                  border: task.status === "In Progress" ? "2px solid #304B35" : "1px solid #E7DED5",
                  background: "#FFFDF9",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          background: config.bg,
                          color: config.text,
                          padding: "3px 10px",
                          borderRadius: "999px",
                        }}
                      >
                        {task.status}
                      </span>
                      {task.priority && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: task.priority === "High" ? "#A9655B" : "#B79A69",
                          }}
                        >
                          • {task.priority} Priority
                        </span>
                      )}
                    </div>

                    <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "20px", margin: "4px 0" }}>
                      {task.title}
                    </h2>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#C9A13A" }}>
                      {task.eventName || task.eventId?.title}
                    </span>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "12px", color: "#766C67", display: "block" }}>
                      {task.date || "Scheduled"}
                    </span>
                    <strong style={{ fontSize: "13px", color: "#2E2927" }}>
                      {task.time || "Flexible"}
                    </strong>
                  </div>
                </div>

                <p style={{ fontSize: "14px", color: "#4F4641", lineHeight: "1.6", margin: "0 0 14px" }}>
                  {task.description}
                </p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "13px", color: "#766C67", background: "#F7F2EC", padding: "10px 14px", borderRadius: "8px", marginBottom: "14px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <MapPin size={14} color="#304B35" /> Venue: {task.location || task.venue || "On Site"}
                  </span>
                </div>

                {task.reportNote && (
                  <div style={{ fontSize: "12px", color: "#155724", background: "#EAF5EA", padding: "8px 12px", borderRadius: "6px", marginBottom: "14px" }}>
                    <strong>Completion Note: </strong> {task.reportNote}
                  </div>
                )}

                {/* TASK ACTION BUTTONS */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #E7DED5", paddingTop: "14px" }}>
                  {task.status === "Assigned" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(taskId, "In Progress")}
                      style={{
                        padding: "8px 18px",
                        fontSize: "13px",
                        fontWeight: 600,
                        borderRadius: "8px",
                        border: "1.5px solid #8C6435",
                        background: "#FAF7F2",
                        color: "#5C4A3A",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#8C6435";
                        e.currentTarget.style.color = "#FFF";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#FAF7F2";
                        e.currentTarget.style.color = "#5C4A3A";
                      }}
                    >
                      <Clock4 size={14} /> Start Duty (In Progress)
                    </button>
                  )}

                  {task.status !== "Done" && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNotesId(taskId);
                        setNotesText("");
                      }}
                      style={{
                        padding: "8px 18px",
                        fontSize: "13px",
                        fontWeight: 700,
                        borderRadius: "8px",
                        border: "none",
                        background: "linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)",
                        color: "#FFFFFF",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 6px rgba(27, 94, 32, 0.25)",
                        transition: "transform 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <CheckCircle2 size={14} color="#FFF" /> Submit Completion Evidence
                    </button>
                  )}
                </div>

                {/* COMPLETION MODAL INLINE */}
                {editingNotesId === taskId && (
                  <div style={{ marginTop: "14px", padding: "16px", background: "#FAF7F2", border: "1.5px solid #D5C2A5", borderRadius: "10px" }}>
                    <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#2B1D12", marginBottom: "8px" }}>
                      Duty Completion Brief & On-Ground Notes:
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. VIP guests received at foyer, garlanded, and seated; registration queue cleared smoothly."
                      value={notesText}
                      onChange={(e) => setNotesText(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #D5C2A5", borderRadius: "8px", fontSize: "13px", background: "#FFF", boxSizing: "border-box" }}
                    />
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                      <button
                        type="button"
                        onClick={() => setEditingNotesId(null)}
                        style={{
                          padding: "8px 16px",
                          fontSize: "12px",
                          fontWeight: 600,
                          borderRadius: "6px",
                          border: "1.5px solid #D5C2A5",
                          background: "#F5F0EA",
                          color: "#4A3B32",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveNotes(taskId)}
                        style={{
                          padding: "8px 18px",
                          fontSize: "12px",
                          fontWeight: 700,
                          borderRadius: "6px",
                          border: "none",
                          background: "linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)",
                          color: "#FFFFFF",
                          cursor: "pointer",
                          boxShadow: "0 2px 6px rgba(27, 94, 32, 0.25)",
                        }}
                      >
                        Confirm Duty Completed
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AssignedTasks;

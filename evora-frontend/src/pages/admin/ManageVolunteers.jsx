import { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Plus,
  X,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle2,
  User,
  Sparkles,
  ChevronDown,
  Building,
} from "lucide-react";
import { adminAPI, eventsAPI, tasksAPI } from "../../services/api";

const ManageVolunteers = () => {
  const [volunteers, setVolunteers] = useState([]);
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState("");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [taskFilter, setTaskFilter] = useState("All");

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    shiftDate: "",
    shiftTime: "09:00 AM – 02:00 PM",
    venue: "Main Foyer",
    priority: "High",
    category: "Hospitality",
  });

  // Filter events so only celebrations accepted / approved by Admin appear
  const acceptedEvents = useMemo(() => {
    return (events || []).filter((ev) => {
      const s = (ev.status || "").toLowerCase();
      return (
        s === "approved" ||
        s === "confirmed" ||
        s === "partially confirmed" ||
        Boolean(ev.approvedAt)
      );
    });
  }, [events]);

  const loadData = async () => {
    try {
      const [vols, evts, tsks] = await Promise.all([
        adminAPI.getUsers({ role: "volunteer" }),
        eventsAPI.getAll(),
        tasksAPI.getAll(),
      ]);
      setVolunteers(vols || []);
      setEvents(evts || []);
      setTasks(tsks || []);

      if (vols && vols.length > 0 && !selectedVolunteerId) {
        setSelectedVolunteerId(vols[0]._id || vols[0].id);
      }

      // Filter accepted events
      const validEvts = (evts || []).filter((ev) => {
        const s = (ev.status || "").toLowerCase();
        return (
          s === "approved" ||
          s === "confirmed" ||
          s === "partially confirmed" ||
          Boolean(ev.approvedAt)
        );
      });

      if (validEvts.length > 0 && !selectedEventId) {
        setSelectedEventId(validEvts[0]._id || validEvts[0].id);
        setTaskForm((p) => ({
          ...p,
          shiftDate: validEvts[0].date || "",
          venue: validEvts[0].venue || "Main Foyer",
        }));
      }
    } catch (err) {
      console.error("Load error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      alert("Please provide a duty title.");
      return;
    }

    if (!selectedVolunteerId) {
      alert("Please select a volunteer personnel.");
      return;
    }

    if (!selectedEventId) {
      alert("Please select an approved celebration event.");
      return;
    }

    const targetEvent = acceptedEvents.find(
      (ev) => (ev._id || ev.id) === selectedEventId
    );

    setSubmitting(true);
    try {
      await tasksAPI.create({
        volunteerId: selectedVolunteerId,
        eventId: selectedEventId,
        eventName: targetEvent?.title || "Special Event",
        title: taskForm.title.trim(),
        description:
          taskForm.description.trim() ||
          "Report to coordinator station 20 minutes prior.",
        date: taskForm.shiftDate,
        time: taskForm.shiftTime,
        location: taskForm.venue,
        priority: taskForm.priority,
      });

      await loadData();
      setShowAssignModal(false);
      setTaskForm({
        title: "",
        description: "",
        shiftDate: acceptedEvents[0]?.date || "",
        shiftTime: "09:00 AM – 02:00 PM",
        venue: acceptedEvents[0]?.venue || "Main Foyer",
        priority: "High",
        category: "Hospitality",
      });
    } catch (err) {
      alert(err.message || "Failed to dispatch volunteer duty.");
    } finally {
      setSubmitting(false);
    }
  };

  const openAssignModalForVolunteer = (vol) => {
    const vId = vol._id || vol.id;
    setSelectedVolunteerId(vId);
    if (acceptedEvents.length > 0 && !selectedEventId) {
      const firstEv = acceptedEvents[0];
      setSelectedEventId(firstEv._id || firstEv.id);
      setTaskForm((p) => ({
        ...p,
        shiftDate: firstEv.date || "",
        venue: firstEv.venue || "Main Foyer",
      }));
    }
    setShowAssignModal(true);
  };

  const handleOpenGeneralModal = () => {
    if (volunteers.length > 0 && !selectedVolunteerId) {
      setSelectedVolunteerId(volunteers[0]._id || volunteers[0].id);
    }
    if (acceptedEvents.length > 0 && !selectedEventId) {
      const firstEv = acceptedEvents[0];
      setSelectedEventId(firstEv._id || firstEv.id);
      setTaskForm((p) => ({
        ...p,
        shiftDate: firstEv.date || "",
        venue: firstEv.venue || "Main Foyer",
      }));
    }
    setShowAssignModal(true);
  };

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === "All") return true;
    if (taskFilter === "Active") return t.status !== "Done" && t.status !== "Completed";
    if (taskFilter === "Done") return t.status === "Done" || t.status === "Completed";
    return t.status === taskFilter;
  });

  if (loading) {
    return (
      <div className="vendor-page" style={{ textAlign: "center", padding: "80px 20px", color: "#8C6435" }}>
        <Sparkles size={32} style={{ animation: "spin 2s linear infinite", marginBottom: "12px", opacity: 0.8 }} />
        <p style={{ fontFamily: "Playfair Display, serif", fontSize: "18px" }}>Loading Volunteer Operations Command…</p>
      </div>
    );
  }

  return (
    <div className="vendor-page" style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px 20px" }}>
      {/* HEADER SECTION */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "28px",
          flexWrap: "wrap",
          gap: "18px",
          borderBottom: "1px solid #EBE4DA",
          paddingBottom: "20px",
        }}
      >
        <div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "1.2px",
              color: "#8C6435",
              background: "#F8F3EC",
              padding: "4px 10px",
              borderRadius: "20px",
              marginBottom: "8px",
            }}
          >
            <Sparkles size={12} /> ON-GROUND DISPATCH COMMAND
          </span>
          <h1
            style={{
              fontFamily: "Playfair Display, serif",
              fontSize: "30px",
              fontWeight: 700,
              color: "#2B1D12",
              margin: "4px 0 6px",
            }}
          >
            Volunteer Operations & Event Dispatch
          </h1>
          <p style={{ margin: 0, color: "#766C67", fontSize: "14px", maxWidth: "600px" }}>
            Assign certified volunteer staff exclusively to <strong style={{ color: "#2B1D12" }}>admin-approved celebrations</strong> for seamless on-ground coordination and reception.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenGeneralModal}
          style={{
            background: "linear-gradient(135deg, #8C6435 0%, #6E4E28 100%)",
            color: "#FFF",
            border: "none",
            borderRadius: "10px",
            padding: "11px 20px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 4px 14px rgba(140, 100, 53, 0.25)",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 18px rgba(140, 100, 53, 0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 14px rgba(140, 100, 53, 0.25)";
          }}
        >
          <Plus size={16} /> Dispatch Volunteer Task
        </button>
      </div>

      {/* QUICK SUMMARY METRICS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "14px",
          marginBottom: "28px",
        }}
      >
        <div
          style={{
            background: "#FFFDF9",
            border: "1px solid #EBE4DA",
            borderRadius: "12px",
            padding: "16px 20px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
          }}
        >
          <span style={{ fontSize: "12px", color: "#766C67", fontWeight: 500, display: "block" }}>
            Total Volunteers
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
            <span style={{ fontSize: "24px", fontWeight: 700, fontFamily: "Playfair Display, serif", color: "#2B1D12" }}>
              {volunteers.length}
            </span>
            <span style={{ fontSize: "11px", color: "#166534", fontWeight: 600 }}>Active Roster</span>
          </div>
        </div>

        <div
          style={{
            background: "#FFFDF9",
            border: "1px solid #EBE4DA",
            borderRadius: "12px",
            padding: "16px 20px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
          }}
        >
          <span style={{ fontSize: "12px", color: "#766C67", fontWeight: 500, display: "block" }}>
            Admin-Approved Events
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
            <span style={{ fontSize: "24px", fontWeight: 700, fontFamily: "Playfair Display, serif", color: "#8C6435" }}>
              {acceptedEvents.length}
            </span>
            <span style={{ fontSize: "11px", color: "#8C6435", fontWeight: 600 }}>Ready for Dispatch</span>
          </div>
        </div>

        <div
          style={{
            background: "#FFFDF9",
            border: "1px solid #EBE4DA",
            borderRadius: "12px",
            padding: "16px 20px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
          }}
        >
          <span style={{ fontSize: "12px", color: "#766C67", fontWeight: 500, display: "block" }}>
            Active Dispatched Duties
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
            <span style={{ fontSize: "24px", fontWeight: 700, fontFamily: "Playfair Display, serif", color: "#2B1D12" }}>
              {tasks.filter((t) => t.status !== "Done" && t.status !== "Completed").length}
            </span>
            <span style={{ fontSize: "11px", color: "#856404", fontWeight: 600 }}>In Progress</span>
          </div>
        </div>

        <div
          style={{
            background: "#FFFDF9",
            border: "1px solid #EBE4DA",
            borderRadius: "12px",
            padding: "16px 20px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
          }}
        >
          <span style={{ fontSize: "12px", color: "#766C67", fontWeight: 500, display: "block" }}>
            Completed Missions
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginTop: "4px" }}>
            <span style={{ fontSize: "24px", fontWeight: 700, fontFamily: "Playfair Display, serif", color: "#166534" }}>
              {tasks.filter((t) => t.status === "Done" || t.status === "Completed").length}
            </span>
            <span style={{ fontSize: "11px", color: "#166534", fontWeight: 600 }}>Verified Done</span>
          </div>
        </div>
      </div>

      {/* SECTION TITLE: VOLUNTEER PERSONNEL ROSTER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "20px", color: "#2B1D12", margin: 0 }}>
          Certified Volunteer Roster ({volunteers.length})
        </h2>
        <span style={{ fontSize: "12px", color: "#766C67" }}>
          Select any volunteer to directly dispatch a shift assignment
        </span>
      </div>

      {/* VOLUNTEER ROSTER CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
          gap: "18px",
          marginBottom: "36px",
        }}
      >
        {volunteers.length === 0 ? (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "40px 24px",
              border: "1.5px dashed #D5C2A5",
              borderRadius: "14px",
              background: "#FCFAF7",
              color: "#766C67",
            }}
          >
            <ShieldCheck size={40} style={{ color: "#8C6435", margin: "0 auto 12px", opacity: 0.8 }} />
            <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: "19px", color: "#2B1D12", margin: "0 0 6px" }}>
              No Registered Volunteers Found
            </h3>
            <p style={{ maxWidth: 480, margin: "0 auto 16px", fontSize: "13px", lineHeight: "1.5" }}>
              There are currently no active users with the Volunteer role registered. Users can register through the public Sign Up portal by selecting the <strong>Volunteer</strong> role.
            </p>
          </div>
        ) : (
          volunteers.map((vol) => {
            const vId = vol._id || vol.id;
            const assignedCount = tasks.filter(
              (t) => (t.volunteerId?._id || t.volunteerId) === vId
            ).length;

            return (
              <div
                key={vId}
                style={{
                  background: "#FFFDF9",
                  border: "1px solid #EBE4DA",
                  borderRadius: "14px",
                  padding: "20px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.06)";
                  e.currentTarget.style.borderColor = "#D5C2A5";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.03)";
                  e.currentTarget.style.borderColor = "#EBE4DA";
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "14px" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background: "linear-gradient(135deg, #E6EDDD 0%, #D1DEC3 100%)",
                        color: "#304B35",
                        display: "grid",
                        placeItems: "center",
                        fontWeight: 700,
                        fontSize: "19px",
                        fontFamily: "Playfair Display, serif",
                        boxShadow: "0 2px 6px rgba(48, 75, 53, 0.12)",
                        flexShrink: 0,
                      }}
                    >
                      {(vol.fullName || "V").charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                        <strong
                          style={{
                            fontSize: "15px",
                            color: "#2B1D12",
                            fontFamily: "Playfair Display, serif",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {vol.fullName}
                        </strong>
                        <span
                          style={{
                            fontSize: "10px",
                            color: "#166534",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            background: "#ECFDF5",
                            padding: "2px 7px",
                            borderRadius: "12px",
                            border: "1px solid #A7F3D0",
                            flexShrink: 0,
                          }}
                        >
                          <ShieldCheck size={11} /> Verified
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#766C67",
                          display: "block",
                          marginTop: "2px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {vol.email}
                      </span>
                      <span style={{ fontSize: "11px", color: "#8C6435", fontWeight: 600, display: "block", marginTop: "2px" }}>
                        ID: {vol.volunteerId || "EVO-VOL-VERIFIED"}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "#584C47",
                      background: "#F9F6F0",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      marginBottom: "12px",
                      lineHeight: "1.45",
                      border: "1px solid #EFE8DE",
                    }}
                  >
                    <strong style={{ color: "#2B1D12" }}>Specialization: </strong>
                    <span>{vol.bio || "Guest Reception, Hospitality & Ceremony Coordination"}</span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "12px",
                      color: "#766C67",
                      marginBottom: "14px",
                      padding: "0 2px",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <MapPin size={13} style={{ color: "#8C6435" }} />
                      {vol.location || vol.city || "Hyderabad, India"}
                    </span>
                    <span style={{ color: "#8C6435", fontWeight: 600 }}>
                      {assignedCount} {assignedCount === 1 ? "Duty" : "Duties"} Logged
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openAssignModalForVolunteer(vol)}
                  style={{
                    width: "100%",
                    padding: "9px 14px",
                    borderRadius: "8px",
                    border: "1.5px solid #8C6435",
                    background: "#FBF7F2",
                    color: "#8C6435",
                    fontWeight: 600,
                    fontSize: "12.5px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#8C6435";
                    e.currentTarget.style.color = "#FFF";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#FBF7F2";
                    e.currentTarget.style.color = "#8C6435";
                  }}
                >
                  <Plus size={14} /> Assign Duty to {vol.fullName.split(" ")[0]}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* DISPATCHED TASKS SECTION */}
      <div
        style={{
          background: "#FFFDF9",
          border: "1px solid #EBE4DA",
          borderRadius: "14px",
          padding: "24px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "18px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "20px", color: "#2B1D12", margin: "0 0 4px" }}>
              Active Dispatched Duties ({tasks.length})
            </h2>
            <span style={{ fontSize: "12px", color: "#766C67" }}>
              Real-time shift schedules, arrival stations, and completion tracking
            </span>
          </div>

          {/* FILTER PILLS */}
          <div style={{ display: "flex", gap: "6px", background: "#F6F1EA", padding: "4px", borderRadius: "10px" }}>
            {["All", "Active", "Done"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setTaskFilter(tab)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "7px",
                  border: "none",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: taskFilter === tab ? "#8C6435" : "transparent",
                  color: taskFilter === tab ? "#FFF" : "#766C67",
                  transition: "all 0.15s ease",
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="table-responsive" style={{ overflowX: "auto", width: "100%" }}>
          <table style={{ width: "100%", minWidth: "760px", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #EBE4DA", textAlign: "left", color: "#766C67", fontSize: "11px", letterSpacing: "0.5px" }}>
                <th style={{ padding: "12px 10px" }}>DUTY & INSTRUCTIONS</th>
                <th style={{ padding: "12px 10px" }}>VOLUNTEER</th>
                <th style={{ padding: "12px 10px" }}>ACCEPTED CELEBRATION</th>
                <th style={{ padding: "12px 10px" }}>SHIFT SCHEDULE</th>
                <th style={{ padding: "12px 10px" }}>STATION</th>
                <th style={{ padding: "12px 10px", textAlign: "center" }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "36px 12px", color: "#766C67" }}>
                    No dispatched volunteer tasks found in this view.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const tId = task._id || task.id;
                  const isDone = task.status === "Done" || task.status === "Completed";
                  return (
                    <tr key={tId} style={{ borderBottom: "1px solid #F0EAE1" }}>
                      <td style={{ padding: "14px 10px" }}>
                        <strong style={{ color: "#2B1D12", fontSize: "13.5px", display: "block" }}>
                          {task.title}
                        </strong>
                        <span style={{ fontSize: "11.5px", color: "#766C67", display: "block", marginTop: "2px" }}>
                          {task.description}
                        </span>
                      </td>

                      <td style={{ padding: "14px 10px", color: "#2B1D12" }}>
                        <strong style={{ display: "block", fontSize: "13px" }}>
                          {task.volunteerId?.fullName || "Assigned Volunteer"}
                        </strong>
                        <span style={{ fontSize: "11px", color: "#766C67" }}>
                          {task.volunteerId?.email || ""}
                        </span>
                      </td>

                      <td style={{ padding: "14px 10px" }}>
                        <span
                          style={{
                            color: "#8C6435",
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <CheckCircle2 size={13} style={{ color: "#166534" }} />
                          {task.eventName || task.eventId?.title || "Celebration"}
                        </span>
                      </td>

                      <td style={{ padding: "14px 10px", color: "#766C67" }}>
                        <span style={{ display: "block", color: "#2B1D12", fontWeight: 500 }}>
                          {task.date || "Scheduled Date"}
                        </span>
                        <span style={{ fontSize: "11px", color: "#766C67" }}>
                          {task.time || "All Day"}
                        </span>
                      </td>

                      <td style={{ padding: "14px 10px", color: "#584C47" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <MapPin size={12} style={{ color: "#8C6435" }} />
                          {task.location || "Venue Main Station"}
                        </span>
                      </td>

                      <td style={{ padding: "14px 10px", textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "4px 10px",
                            borderRadius: "20px",
                            background: isDone ? "#D1FAE5" : "#FEF3C7",
                            color: isDone ? "#065F46" : "#92400E",
                            border: `1px solid ${isDone ? "#A7F3D0" : "#FDE68A"}`,
                            display: "inline-block",
                          }}
                        >
                          {task.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISPATCH MODAL - BEAUTIFULLY STYLED & FILTERED BY ACCEPTED EVENTS */}
      {showAssignModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(35, 25, 20, 0.65)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAssignModal(false);
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #EBE4DA",
              borderRadius: "16px",
              boxShadow: "0 24px 60px rgba(46, 32, 20, 0.3)",
              width: "100%",
              maxWidth: "600px",
              maxHeight: "92vh",
              overflowY: "auto",
              position: "relative",
              padding: "28px 32px",
            }}
          >
            {/* CLOSE BUTTON */}
            <button
              type="button"
              onClick={() => setShowAssignModal(false)}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "#F5F0EA",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                color: "#5C4A3A",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#EBE4DA";
                e.currentTarget.style.color = "#2B1D12";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#F5F0EA";
                e.currentTarget.style.color = "#5C4A3A";
              }}
            >
              <X size={17} />
            </button>

            {/* MODAL HEADER */}
            <div style={{ marginBottom: "20px" }}>
              <span
                style={{
                  display: "inline-block",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "1.2px",
                  color: "#8C6435",
                  background: "#F8F3EC",
                  padding: "3px 9px",
                  borderRadius: "12px",
                  marginBottom: "6px",
                }}
              >
                TASK DEPLOYMENT
              </span>
              <h2
                style={{
                  fontFamily: "Playfair Display, serif",
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#2B1D12",
                  margin: "0 0 4px",
                }}
              >
                Assign Volunteer to Event
              </h2>
              <p style={{ margin: 0, fontSize: "13px", color: "#766C67" }}>
                Select from verified volunteers and <strong style={{ color: "#166534" }}>admin-accepted celebrations</strong>.
              </p>
            </div>

            {/* ACCEPTED CELEBRATIONS NOTICE */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: acceptedEvents.length > 0 ? "#F0FDF4" : "#FFFBEB",
                border: `1px solid ${acceptedEvents.length > 0 ? "#BBF7D0" : "#FDE68A"}`,
                borderRadius: "8px",
                padding: "8px 12px",
                marginBottom: "20px",
                fontSize: "12px",
                color: acceptedEvents.length > 0 ? "#166534" : "#92400E",
              }}
            >
              {acceptedEvents.length > 0 ? (
                <>
                  <CheckCircle2 size={15} style={{ color: "#16A34A", flexShrink: 0 }} />
                  <span>Showing <strong>{acceptedEvents.length} admin-accepted celebration(s)</strong> approved for volunteer coordination.</span>
                </>
              ) : (
                <>
                  <AlertCircle size={15} style={{ color: "#D97706", flexShrink: 0 }} />
                  <span>No celebrations have been approved yet. Please approve celebrations in <strong>Manage Events</strong> before dispatching.</span>
                </>
              )}
            </div>

            {/* FORM */}
            <form onSubmit={handleAssign} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* ROW 1: SELECT VOLUNTEER & SELECT EVENT */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#3B2F27", marginBottom: "6px" }}>
                    Select Volunteer *
                  </label>
                  <select
                    value={selectedVolunteerId}
                    onChange={(e) => setSelectedVolunteerId(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1.5px solid #D5C2A5",
                      background: "#FAF7F2",
                      color: "#2B1D12",
                      fontSize: "13px",
                      fontWeight: 500,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  >
                    {volunteers.length === 0 ? (
                      <option value="">No registered volunteers found</option>
                    ) : (
                      <>
                        <option value="">-- Choose Volunteer --</option>
                        {volunteers.map((vol) => {
                          const vId = vol._id || vol.id;
                          return (
                            <option key={vId} value={vId}>
                              {vol.fullName}
                            </option>
                          );
                        })}
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#3B2F27", marginBottom: "6px" }}>
                    Select Celebration (Accepted) *
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => {
                      const newEventId = e.target.value;
                      setSelectedEventId(newEventId);
                      const targetEv = acceptedEvents.find(
                        (ev) => (ev._id || ev.id) === newEventId
                      );
                      if (targetEv) {
                        setTaskForm((prev) => ({
                          ...prev,
                          shiftDate: targetEv.date || prev.shiftDate,
                          venue: targetEv.venue || targetEv.location || prev.venue,
                        }));
                      }
                    }}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1.5px solid #D5C2A5",
                      background: "#FAF7F2",
                      color: "#2B1D12",
                      fontSize: "13px",
                      fontWeight: 500,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  >
                    {acceptedEvents.length === 0 ? (
                      <option value="">No admin-accepted celebrations</option>
                    ) : (
                      <>
                        <option value="">-- Choose Celebration --</option>
                        {acceptedEvents.map((ev) => {
                          const eId = ev._id || ev.id;
                          return (
                            <option key={eId} value={eId}>
                              {ev.title} ({ev.date || "Date TBA"})
                            </option>
                          );
                        })}
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* ROW 2: DUTY TITLE */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#3B2F27", marginBottom: "6px" }}>
                  Duty Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIP Reception & Stage Readiness"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1.5px solid #D5C2A5",
                    background: "#FAF7F2",
                    color: "#2B1D12",
                    fontSize: "13px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* ROW 3: SHIFT DATE & SHIFT TIMING */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#3B2F27", marginBottom: "6px" }}>
                    Shift Date
                  </label>
                  <input
                    type="date"
                    value={taskForm.shiftDate}
                    onChange={(e) => setTaskForm({ ...taskForm, shiftDate: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1.5px solid #D5C2A5",
                      background: "#FAF7F2",
                      color: "#2B1D12",
                      fontSize: "13px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#3B2F27", marginBottom: "6px" }}>
                    Shift Timing
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 09:00 AM – 02:00 PM"
                    value={taskForm.shiftTime}
                    onChange={(e) => setTaskForm({ ...taskForm, shiftTime: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1.5px solid #D5C2A5",
                      background: "#FAF7F2",
                      color: "#2B1D12",
                      fontSize: "13px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              {/* ROW 4: VENUE / STATION & PRIORITY */}
              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#3B2F27", marginBottom: "6px" }}>
                    Venue / Station Area
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Taj Krishna Grand Foyer Desk"
                    value={taskForm.venue}
                    onChange={(e) => setTaskForm({ ...taskForm, venue: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1.5px solid #D5C2A5",
                      background: "#FAF7F2",
                      color: "#2B1D12",
                      fontSize: "13px",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#3B2F27", marginBottom: "6px" }}>
                    Priority
                  </label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1.5px solid #D5C2A5",
                      background: "#FAF7F2",
                      color: "#2B1D12",
                      fontSize: "13px",
                      fontWeight: 500,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              {/* ROW 5: DUTY INSTRUCTIONS */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#3B2F27", marginBottom: "6px" }}>
                  Duty Instructions & Brief
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail exact assignments, badge requirement, coordinator contact, dress code..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: "1.5px solid #D5C2A5",
                    background: "#FAF7F2",
                    color: "#2B1D12",
                    fontSize: "13px",
                    lineHeight: "1.45",
                    outline: "none",
                    boxSizing: "border-box",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* ACTION BUTTONS */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "8px",
                  paddingTop: "16px",
                  borderTop: "1px solid #EBE4DA",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    border: "1.5px solid #D5C2A5",
                    background: "#F5F0EA",
                    color: "#4A3B32",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#EBE4DA";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#F5F0EA";
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting || acceptedEvents.length === 0}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "8px",
                    border: "none",
                    background:
                      acceptedEvents.length === 0
                        ? "#C4B5A5"
                        : "linear-gradient(135deg, #8C6435 0%, #6E4E28 100%)",
                    color: "#FFF",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: acceptedEvents.length === 0 ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 14px rgba(140, 100, 53, 0.25)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {submitting ? "Dispatching..." : "Confirm & Dispatch Duty"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageVolunteers;

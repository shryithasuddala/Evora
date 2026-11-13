import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Trash2, Plus, Search, XCircle } from "lucide-react";
import { eventsAPI, expensesAPI } from "../../services/api";
import { useToast } from "../../context/ToastContext";

const TABS = ["All", "Wedding", "Birthday", "Corporate", "Anniversary", "Other"];

const MyEvents = () => {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [expenseMap, setExpenseMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All");

  useEffect(() => {
    const load = async () => {
      try {
        const evts = await eventsAPI.getAll();
        setEvents(evts || []);
        // Load expenses for all events
        const map = {};
        await Promise.all(
          (evts || []).map(async (ev) => {
            try {
              const exps = await expensesAPI.getByEvent(ev._id);
              map[ev._id] = exps || [];
            } catch {
              map[ev._id] = [];
            }
          })
        );
        setExpenseMap(map);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleCancel = async (id, title) => {
    if (window.confirm(`Are you sure you want to cancel celebration "${title}"?`)) {
      try {
        await eventsAPI.cancel(id);
        setEvents((prev) => prev.map((e) => (e._id === id ? { ...e, status: "Cancelled" } : e)));
        toast.warning("Event Cancelled ⚠️", `"${title}" has been marked as cancelled.`);
      } catch (err) {
        toast.error("Cancel Failed", err.message || "Failed to cancel event.");
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this event? This cannot be undone.")) return;
    try {
      await eventsAPI.remove(id);
      setEvents((prev) => prev.filter((e) => e._id !== id));
      toast.success("Event Removed", "Event record deleted successfully.");
    } catch (err) {
      toast.error("Delete Failed", err.message);
    }
  };

  const filtered = events.filter((e) => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase()) || (e.venue || "").toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === "All" || e.category === tab;
    return matchSearch && matchTab;
  });

  const getSpent = (id) => (expenseMap[id] || []).reduce((s, x) => s + Number(x.amount || 0), 0);

  if (loading) return (
    <div className="vendor-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #C9A13A", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ color: "#8B7355" }}>Loading events…</p>
      </div>
    </div>
  );

  return (
    <div className="vendor-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="vendor-welcome-label" style={{ color: "#C9A13A" }}>YOUR CELEBRATIONS</span>
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 30, margin: "4px 0" }}>My Events</h1>
        </div>
        <Link to="/user/events/create" className="vendor-btn" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={16} /> New Event
        </Link>
      </div>

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8B7355" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events…" style={{ width: "100%", padding: "9px 12px 9px 36px", border: "1px solid #E8DCC8", borderRadius: 8, fontSize: 14, background: "#FDFAF4", boxSizing: "border-box", outline: "none" }} />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "7px 16px", borderRadius: 20, border: "1px solid", fontSize: 13, cursor: "pointer", borderColor: tab === t ? "#C9A13A" : "#E8DCC8", background: tab === t ? "#C9A13A" : "#fff", color: tab === t ? "#fff" : "#6B5240" }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px", background: "#FAF5EA", borderRadius: 12, border: "1px dashed #C9A13A55" }}>
          <CalendarDays size={44} color="#C9A13A55" style={{ marginBottom: 12 }} />
          <p style={{ color: "#8B7355", marginBottom: 16 }}>{events.length === 0 ? "No events yet." : "No events match your search."}</p>
          <Link to="/user/events/create" className="vendor-btn">Create Your First Event</Link>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
          {filtered.map((event) => {
            const spent = getSpent(event._id);
            const budget = Number(event.totalBudget || 0);
            const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
            return (
              <div key={event._id} style={{ background: "#fff", border: "1px solid #E8DCC8", borderRadius: 14, padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ background: "#C9A13A22", color: "#C9A13A", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>{event.category}</span>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: 20,
                      background: (event.status === "Approved" || event.status === "Confirmed")
                        ? "#EAF8EF"
                        : event.status === "Pending Approval"
                        ? "#FFF7EB"
                        : event.status === "Cancelled"
                        ? "#FFF5F5"
                        : "#F0ECE6",
                      color: (event.status === "Approved" || event.status === "Confirmed")
                        ? "#1E8E46"
                        : event.status === "Pending Approval"
                        ? "#B4712A"
                        : event.status === "Cancelled"
                        ? "#CC0000"
                        : "#6B5240",
                      border: `1px solid ${
                        (event.status === "Approved" || event.status === "Confirmed")
                          ? "#A3E7B8"
                          : event.status === "Pending Approval"
                          ? "#FCD34D"
                          : event.status === "Cancelled"
                          ? "#FFCCCC"
                          : "#E7DED5"
                      }`,
                    }}>
                      {event.status === "Pending Approval"
                        ? "⏳ Pending Approval"
                        : event.status === "Approved"
                        ? "✅ Approved"
                        : event.status === "Cancelled"
                        ? "❌ Cancelled"
                        : event.status}
                    </span>
                  </div>
                  <button onClick={() => handleDelete(event._id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#CC666677", padding: 2 }}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <Link to={`/user/events/${event._id}`} style={{ textDecoration: "none" }}>
                  <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 19, margin: "0 0 6px", color: "#2B1D12" }}>{event.title}</h3>
                </Link>
                <p style={{ fontSize: 13, color: "#8B7355", margin: "0 0 4px" }}>📅 {event.date} {event.time && `at ${event.time}`}</p>
                {(event.venue || event.location) && (
                  <p style={{ fontSize: 13, color: "#8B7355", margin: "0 0 4px" }}>
                    📍 {event.venue ? `${event.venue}${event.location ? ` (${event.location})` : ""}` : event.location}
                  </p>
                )}
                <p style={{ fontSize: 13, color: "#8B7355", margin: "0 0 14px" }}>👥 {event.guestCount} guests</p>
                {budget > 0 && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#8B7355", marginBottom: 4 }}>
                      <span>Budget used</span><span>{pct}%</span>
                    </div>
                    <div style={{ background: "#F0E8D8", borderRadius: 4, height: 6 }}>
                      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: pct > 90 ? "#CC4444" : "#C9A13A" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#A09080", marginTop: 4 }}>
                      <span>Spent: ₹{spent.toLocaleString()}</span>
                      <span>Budget: ₹{budget.toLocaleString()}</span>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: "8px", marginTop: 14 }}>
                  <Link
                    to={`/user/events/${event._id}`}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "8px 0",
                      border: "1px solid #E8DCC8",
                      borderRadius: 8,
                      color: "#C9A13A",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                      background: "#FFFDF9",
                    }}
                  >
                    View / Edit →
                  </Link>
                  {event.status !== "Cancelled" && (
                    <button
                      type="button"
                      onClick={() => handleCancel(event._id, event.title)}
                      style={{
                        background: "#FFF5F5",
                        border: "1px solid #FFCCCC",
                        borderRadius: 8,
                        color: "#CC0000",
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "8px 12px",
                        cursor: "pointer",
                      }}
                      title="Cancel this celebration"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyEvents;

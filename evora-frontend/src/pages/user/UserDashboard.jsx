import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Package, Wallet, Bell, Plus, ArrowUpRight, Sparkles, MessageCircle } from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { eventsAPI, bookingsAPI } from "../../services/api";

const UserDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [evts, bkgs] = await Promise.all([
          eventsAPI.getAll(),
          bookingsAPI.getAll(),
        ]);
        setEvents(evts || []);
        setBookings(bkgs || []);
      } catch (err) {
        console.error("Dashboard load error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const activeEvents = events.filter((e) => e.status !== "Completed" && e.status !== "Cancelled");
  const pendingBookings = bookings.filter((b) => b.status === "Pending");
  const proposalsReceived = bookings.filter((b) => b.status === "Proposal Sent");
  const totalBudget = events.reduce((s, e) => s + Number(e.totalBudget || 0), 0);

  if (loading) {
    return (
      <div className="vendor-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid #C9A13A", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#8B7355" }}>Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vendor-page">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
        <div>
          <span className="vendor-welcome-label" style={{ color: "#C9A13A" }}>WELCOME BACK</span>
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 32, margin: "4px 0 6px" }}>
            {(currentUser?.fullName?.split(" ")[0] || "Your")}&apos;s Planning Hub
          </h1>
          <p style={{ color: "#8B7355", margin: 0 }}>Everything you need to celebrate beautifully.</p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => navigate("/user/ai")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              background: "linear-gradient(135deg, #304B35 0%, #1F3324 100%)",
              color: "#F8F4E9",
              border: "1px solid #C9A13A",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(31, 51, 36, 0.25)",
              transition: "transform 0.15s ease",
            }}
          >
            <Sparkles size={17} color="#C9A13A" />
            AI Planning Suite
          </button>
          <Link
            to="/user/events/create"
            className="vendor-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 18px",
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            <Plus size={16} /> New Event
          </Link>
        </div>
      </div>

      {/* Proposal Alert */}
      {proposalsReceived.length > 0 && (
        <div style={{ background: "linear-gradient(135deg, #C9A13A22, #C9A13A11)", border: "1px solid #C9A13A55", borderRadius: 12, padding: "14px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <Bell size={20} color="#C9A13A" />
          <span style={{ color: "#2B1D12", fontWeight: 500 }}>
            You have <strong>{proposalsReceived.length}</strong> service allocation{proposalsReceived.length > 1 ? "s" : ""} waiting for your confirmation.
          </span>
          <Link to="/user/bookings" style={{ marginLeft: "auto", color: "#C9A13A", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
            Review → 
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        {[
          { icon: <CalendarDays size={22} color="#C9A13A" />, label: "Active Events", value: activeEvents.length, link: "/user/events" },
          { icon: <Package size={22} color="#304B35" />, label: "Assured Services", value: bookings.length, link: "/user/bookings" },
          { icon: <Bell size={22} color="#8B4513" />, label: "Pending Assurances", value: pendingBookings.length, link: "/user/bookings" },
          { icon: <Wallet size={22} color="#2B1D12" />, label: "Total Budget", value: `₹${(totalBudget / 100000).toFixed(1)}L`, link: "/user/budget" },
        ].map((card) => (
          <Link key={card.label} to={card.link} style={{ textDecoration: "none" }}>
            <div className="vendor-stat-card" style={{ cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div className="vendor-stat-icon">{card.icon}</div>
                <ArrowUpRight size={16} color="#C9A13A" />
              </div>
              <div className="vendor-stat-value">{card.value}</div>
              <div className="vendor-stat-label">{card.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Celebration Quick-Actions Strip */}
      <div style={{ background: "#FFFDF9", border: "1px solid #E8DCC8", borderRadius: 16, padding: "20px 24px", marginBottom: 32, boxShadow: "0 4px 16px rgba(43,29,18,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "1px", color: "#C9A13A" }}>CELEBRATION SHORTCUTS</span>
          <span style={{ fontSize: "12px", color: "#8B7355" }}>Streamlined Planning Workflow</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
          {[
            { label: "Plan Celebration", desc: "Create new event", icon: Plus, link: "/user/events/create", color: "#C9A13A" },
            { label: "AI Planning Suite", desc: "6 smart AI tools", icon: Sparkles, link: "/user/ai", color: "#304B35" },
            { label: "My Celebrations", desc: "View scheduled events", icon: CalendarDays, link: "/user/events", color: "#304B35" },
            { label: "Service Assurances", desc: "Lock date & pay advance", icon: Package, link: "/user/bookings", color: "#8B4513" },
            { label: "Budget & Ledger", desc: "Monitor event spend", icon: Wallet, link: "/user/budget", color: "#2B1D12" },
            { label: "WhatsApp Alerts", desc: "Review notifications", icon: MessageCircle, link: "/user/notifications", color: "#25D366" },
          ].map((action) => {
            const ActionIcon = action.icon;
            return (
              <Link
                key={action.label}
                to={action.link}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #F0E8D8",
                  background: "#FDFAF4",
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                }}
                className="vendor-stat-card"
              >
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${action.color}15`, display: "grid", placeItems: "center", color: action.color, flexShrink: 0 }}>
                  <ActionIcon size={18} />
                </div>
                <div>
                  <strong style={{ fontSize: "13px", color: "#2B1D12", display: "block" }}>{action.label}</strong>
                  <span style={{ fontSize: "11px", color: "#8B7355" }}>{action.desc}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, margin: 0 }}>Your Celebrations</h2>
          <Link to="/user/events/create" className="vendor-btn" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 14 }}>
            <Plus size={16} /> New Event
          </Link>
        </div>
        {events.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", background: "#FAF5EA", borderRadius: 12, border: "1px dashed #C9A13A55" }}>
            <CalendarDays size={40} color="#C9A13A55" style={{ marginBottom: 12 }} />
            <p style={{ color: "#8B7355", margin: 0 }}>No events yet. Create your first celebration!</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {events.slice(0, 4).map((event) => {
              const services = event.requestedServices || [];
              const confServices = services.filter((s) => s.status === "Confirmed").length;
              return (
                <Link key={event._id} to={`/user/events/${event._id}`} style={{ textDecoration: "none" }}>
                  <div style={{ background: "#fff", border: "1px solid #E8DCC8", borderRadius: 12, padding: 20, transition: "box-shadow 0.2s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <span style={{ background: "#C9A13A22", color: "#C9A13A", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>{event.category}</span>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: event.status === "Confirmed" ? "#E8F9EE" : event.status === "Partially Confirmed" ? "#FFFBEB" : "#FAF5EA",
                        color: event.status === "Confirmed" ? "#1E8E46" : event.status === "Partially Confirmed" ? "#D97706" : "#8C6435",
                      }}>
                        {event.status}
                      </span>
                    </div>
                    <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 18, margin: "0 0 6px", color: "#2B1D12" }}>{event.title}</h3>
                    <p style={{ fontSize: 13, color: "#8B7355", margin: 0 }}>📅 {event.date} &nbsp;|&nbsp; 👥 {event.guestCount} guests</p>
                    {event.venue && <p style={{ fontSize: 13, color: "#8B7355", margin: "4px 0 0" }}>📍 {event.venue}</p>}
                    {services.length > 0 && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #F0E8D8", fontSize: 11, color: "#8C6435", display: "flex", justifyContent: "space-between" }}>
                        <span>Artisan Services:</span>
                        <strong>{confServices} of {services.length} Confirmed</strong>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Celebration Services */}
      {bookings.length > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, margin: 0 }}>Recent Celebration Services</h2>
            <Link to="/user/bookings" style={{ color: "#C9A13A", fontSize: 14, textDecoration: "none", fontWeight: 500 }}>View all →</Link>
          </div>
          <div style={{ background: "#fff", border: "1px solid #E8DCC8", borderRadius: 12, overflow: "hidden" }}>
            {bookings.slice(0, 5).map((b, i) => (
              <div key={b._id} style={{ padding: "14px 20px", borderBottom: i < Math.min(bookings.length, 5) - 1 ? "1px solid #F0E8D8" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 500, color: "#2B1D12", fontSize: 14 }}>{b.serviceName || b.eventName}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8B7355" }}>EVORA Assured Service · {b.eventName}</p>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: "3px 12px", borderRadius: 20,
                  background: b.status === "Accepted" ? "#304B3522" : b.status === "Declined" ? "#FF666622" : b.status === "Proposal Sent" ? "#C9A13A22" : "#E8DCC8",
                  color: b.status === "Accepted" ? "#304B35" : b.status === "Declined" ? "#CC0000" : b.status === "Proposal Sent" ? "#C9A13A" : "#8B7355",
                }}>{b.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default UserDashboard;

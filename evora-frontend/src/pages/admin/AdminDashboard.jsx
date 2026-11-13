import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Users,
  Store,
  CalendarDays,
  Ticket,
  ArrowUpRight,
  ShieldCheck,
  HeartHandshake,
} from "lucide-react";
import { adminAPI, eventsAPI, bookingsAPI } from "../../services/api";

// Decorative Bunting Banner Signature
function Bunting() {
  const flags = new Array(14).fill(0);
  return (
    <svg
      style={{ width: "100%", maxWidth: "560px", height: "24px", margin: "16px 0 24px", display: "block" }}
      viewBox="0 0 560 26"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d="M0,2 C140,18 420,18 560,2" fill="none" stroke="#E8DCC0" strokeWidth="1.5" />
      {flags.map((_, i) => {
        const x = 12 + i * (536 / (flags.length - 1));
        const y = 2 + Math.sin((i / (flags.length - 1)) * Math.PI) * 15;
        return (
          <polygon
            key={i}
            points={`${x - 6},${y} ${x + 6},${y} ${x},${y + 12}`}
            fill={i % 2 === 0 ? "#B4854A" : "#2B1D12"}
            opacity={i % 2 === 0 ? 0.9 : 0.6}
          />
        );
      })}
    </svg>
  );
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalVendors: 0,
    totalVolunteers: 0,
    totalEvents: 0,
    totalBookings: 0,
    pendingBookings: 0,
  });
  const [events, setEvents] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, eventsData, bookingsData] = await Promise.all([
          adminAPI.getStats(),
          eventsAPI.getAll(),
          bookingsAPI.getAll(),
        ]);
        if (statsData) setMetrics(statsData);
        setEvents(eventsData || []);
        setBookings(bookingsData || []);
      } catch (err) {
        console.error("Admin dashboard load error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pendingRequests = bookings.filter((b) => b.status === "Pending");

  if (loading) {
    return (
      <div className="vendor-page" style={{ textAlign: "center", padding: 50, color: "#8B7355" }}>
        Loading platform telemetry…
      </div>
    );
  }

  return (
    <div className="vendor-page">
      <div style={{ marginBottom: "12px" }}>
        <span className="vendor-welcome-label" style={{ color: "#8C6435" }}>
          EXECUTIVE OVERVIEW
        </span>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "32px", margin: "4px 0" }}>
          Platform Health & Operations
        </h1>
        <p style={{ margin: 0, color: "#766C67" }}>
          Real-time telemetry across organizers, vendor partners, volunteers, and celebrations.
        </p>
      </div>

      <Bunting />

      {/* KPI METRIC CARDS */}
      <section className="vendor-stats-grid" style={{ marginBottom: "28px" }}>
        <div
          className="vendor-stat-card"
          onClick={() => navigate("/admin/users")}
          style={{ cursor: "pointer" }}
        >
          <div className="vendor-stat-icon" style={{ background: "#F0E1BE", color: "#8C6435" }}>
            <Users size={20} />
          </div>
          <div className="vendor-stat-details">
            <span className="vendor-stat-label">Organizers</span>
            <h3>{metrics.totalUsers}</h3>
          </div>
        </div>

        <div
          className="vendor-stat-card"
          onClick={() => navigate("/admin/vendors")}
          style={{ cursor: "pointer" }}
        >
          <div className="vendor-stat-icon" style={{ background: "#F0E1BE", color: "#8C6435" }}>
            <Store size={20} />
          </div>
          <div className="vendor-stat-details">
            <span className="vendor-stat-label">Vendors</span>
            <h3>{metrics.totalVendors}</h3>
          </div>
        </div>

        <div
          className="vendor-stat-card"
          onClick={() => navigate("/admin/events")}
          style={{ cursor: "pointer" }}
        >
          <div className="vendor-stat-icon" style={{ background: "#F0E1BE", color: "#8C6435" }}>
            <CalendarDays size={20} />
          </div>
          <div className="vendor-stat-details">
            <span className="vendor-stat-label">Celebrations</span>
            <h3>{metrics.totalEvents}</h3>
          </div>
        </div>

        <div
          className="vendor-stat-card"
          onClick={() => navigate("/admin/bookings")}
          style={{ cursor: "pointer" }}
        >
          <div className="vendor-stat-icon" style={{ background: "#F0E1BE", color: "#8C6435" }}>
            <Ticket size={20} />
          </div>
          <div className="vendor-stat-details">
            <span className="vendor-stat-label">Total Bookings</span>
            <h3>{metrics.totalBookings}</h3>
          </div>
        </div>
      </section>

      {/* DUAL PANELS GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "24px" }}>
        {/* RECENT PLATFORM EVENTS */}
        <div className="vendor-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "18px", margin: 0 }}>
              Recent Platform Events
            </h2>
            <Link
              to="/admin/events"
              style={{ fontSize: "12px", color: "#8C6435", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}
            >
              View All <ArrowUpRight size={13} />
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {events.slice(0, 4).map((evt) => {
              const eId = evt._id || evt.id;
              return (
                <div
                  key={eId}
                  style={{
                    padding: "12px 14px",
                    border: "1px solid #E7DED5",
                    borderRadius: "10px",
                    background: "#FFFDF9",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "14px", color: "#2B1D12", display: "block" }}>
                      {evt.title}
                    </strong>
                    <span style={{ fontSize: "12px", color: "#766C67" }}>
                      {evt.category} • {evt.venue} ({evt.date})
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: "999px",
                      background: evt.status === "Completed" ? "#EAF0EA" : "#FFF7EB",
                      color: evt.status === "Completed" ? "#647665" : "#B4712A",
                    }}
                  >
                    {evt.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* PENDING OPERATIONS & ACTIONS */}
        <div className="vendor-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "18px", margin: 0 }}>
              Operational Queue
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              style={{
                padding: "14px",
                border: "1px solid #E7DED5",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#FFFDF9",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <ShieldCheck size={18} color="#8C6435" />
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Active Registered Vendors</span>
              </div>
              <strong style={{ fontSize: "15px", color: "#2B1D12" }}>{metrics.totalVendors}</strong>
            </div>

            <div
              style={{
                padding: "14px",
                border: "1px solid #E7DED5",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#FFFDF9",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Ticket size={18} color="#8C6435" />
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Inquiries Awaiting Vendor Response</span>
              </div>
              <strong style={{ fontSize: "15px", color: pendingRequests.length > 0 ? "#C9A13A" : "#2B1D12" }}>
                {pendingRequests.length}
              </strong>
            </div>

            <div
              style={{
                padding: "14px",
                border: "1px solid #E7DED5",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#FFFDF9",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <HeartHandshake size={18} color="#8C6435" />
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Deployable Volunteers</span>
              </div>
              <strong style={{ fontSize: "15px", color: "#2B1D12" }}>{metrics.totalVolunteers}</strong>
            </div>

            <div style={{ marginTop: "8px" }}>
              <Link
                to="/admin/volunteers"
                className="vendor-primary-button"
                style={{ width: "100%", justifyContent: "center", background: "#8C6435", color: "#FFF" }}
              >
                Dispatch Volunteer to Event
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

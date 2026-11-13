import { useState, useEffect } from "react";
import {
  BriefcaseBusiness,
  ClipboardList,
  CalendarDays,
  WalletCards,
  Plus,
  ArrowUpRight,
  CircleAlert,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { servicesAPI, bookingsAPI } from "../../services/api";

const VendorDashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [services, setServices] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [svcs, bkgs] = await Promise.all([
          servicesAPI.getAll(),
          bookingsAPI.getAll(),
        ]);
        setServices(svcs || []);
        setAllBookings(bkgs || []);
      } catch (err) {
        console.error("Vendor dashboard error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      await bookingsAPI.updateStatus(id, status);
      const [svcs, bkgs] = await Promise.all([
        servicesAPI.getAll(),
        bookingsAPI.getAll(),
      ]);
      setServices(svcs || []);
      setAllBookings(bkgs || []);
    } catch (err) {
      alert(err.message || "Failed to update status");
    }
  };

  const pendingRequests = allBookings.filter((b) => b.status === "Pending");
  const upcomingBookings = allBookings.filter((b) => b.status === "Accepted");
  const completedTransactions = allBookings.filter((b) => b.status === "Completed");

  const totalEarnings = completedTransactions.reduce((sum, b) => {
    return sum + (Number(b.serviceId?.price) || Number(b.amount) || 0);
  }, 0);

  const pendingEarnings = upcomingBookings.reduce((sum, b) => {
    return sum + (Number(b.serviceId?.price) || Number(b.amount) || 0);
  }, 0);

  if (loading) {
    return (
      <div className="vendor-page" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <p style={{ color: "#8B7355" }}>Loading artisan portal…</p>
      </div>
    );
  }

  return (
    <div className="vendor-page">
      {/* ================= WELCOME CARD ================= */}
      <section className="vendor-welcome-card">
        <div className="vendor-welcome-content">
          <span className="vendor-welcome-label">WELCOME TO EVORA</span>
          <h2>
            {currentUser?.businessName || "Your Artisan Vendor Space"}
            <br />
            Ready for Celebrations.
          </h2>
          <p>
            Connected as <strong>{currentUser?.fullName || "Vendor Partner"}</strong> ({currentUser?.email}).
            Publish services, respond to organizer inquiries, and deliver unforgettable experiences.
          </p>

          <div className="vendor-welcome-actions">
            <button
              className="vendor-primary-button"
              onClick={() => navigate("/vendor/services")}
            >
              <Plus size={16} />
              Manage Services
            </button>

            <button
              className="vendor-secondary-button"
              onClick={() => navigate("/vendor/profile")}
            >
              Business Profile
            </button>
          </div>
        </div>

        <div className="vendor-welcome-art">
          <div className="vendor-art-circle circle-one" />
          <div className="vendor-art-circle circle-two" />
          <div className="vendor-art-circle circle-three" />
          <span>✦</span>
        </div>
      </section>

      {/* ================= STATISTICS ================= */}
      <section className="vendor-stats">
        {/* ACTIVE SERVICES */}
        <button
          className="vendor-stat-card"
          onClick={() => navigate("/vendor/services")}
        >
          <div className="vendor-stat-icon">
            <BriefcaseBusiness size={19} />
          </div>
          <div className="vendor-stat-content">
            <span>Active Services</span>
            <strong>{services.length}</strong>
          </div>
          <ArrowUpRight size={15} />
        </button>

        {/* REQUESTS */}
        <button
          className="vendor-stat-card"
          onClick={() => navigate("/vendor/requests")}
        >
          <div className="vendor-stat-icon">
            <ClipboardList size={19} />
          </div>
          <div className="vendor-stat-content">
            <span>New Requests</span>
            <strong style={{ color: pendingRequests.length > 0 ? "#C9A13A" : "inherit" }}>
              {pendingRequests.length}
            </strong>
          </div>
          <ArrowUpRight size={15} />
        </button>

        {/* BOOKINGS */}
        <button
          className="vendor-stat-card"
          onClick={() => navigate("/vendor/bookings")}
        >
          <div className="vendor-stat-icon">
            <CalendarDays size={19} />
          </div>
          <div className="vendor-stat-content">
            <span>Confirmed Bookings</span>
            <strong>{upcomingBookings.length}</strong>
          </div>
          <ArrowUpRight size={15} />
        </button>

        {/* EARNINGS */}
        <button
          className="vendor-stat-card"
          onClick={() => navigate("/vendor/earnings")}
        >
          <div className="vendor-stat-icon">
            <WalletCards size={19} />
          </div>
          <div className="vendor-stat-content">
            <span>Total Earnings</span>
            <strong>₹{totalEarnings.toLocaleString("en-IN")}</strong>
          </div>
          <ArrowUpRight size={15} />
        </button>
      </section>

      {/* ================= LOWER DASHBOARD ================= */}
      <section className="vendor-dashboard-grid">
        {/* GET STARTED CHECKLIST */}
        <div className="vendor-panel">
          <div className="vendor-panel-header">
            <div>
              <span>QUICK SETUP</span>
              <h3>Vendor Launchpad</h3>
            </div>
            <CircleAlert size={19} />
          </div>

          <div className="vendor-onboarding-list">
            <div className="vendor-onboarding-item">
              <div className="vendor-step-number">1</div>
              <div className="vendor-onboarding-info">
                <strong>Business Profile</strong>
                <span>Set your brand identity, location, and service coverage area.</span>
              </div>
              <button onClick={() => navigate("/vendor/profile")}>Edit</button>
            </div>

            <div className="vendor-onboarding-item">
              <div className="vendor-step-number">2</div>
              <div className="vendor-onboarding-info">
                <strong>Catalogue Management</strong>
                <span>Publish packages, catering menus, and high-resolution deliverables.</span>
              </div>
              <button onClick={() => navigate("/vendor/services")}>Manage</button>
            </div>

            <div className="vendor-onboarding-item">
              <div className="vendor-step-number">3</div>
              <div className="vendor-onboarding-info">
                <strong>Proposals & Quotations</strong>
                <span>Transmit pricing breakdowns for incoming organizer event requests.</span>
              </div>
              <button onClick={() => navigate("/vendor/requests")}>View</button>
            </div>
          </div>
        </div>

        {/* FINANCIAL SUMMARY */}
        <div className="vendor-panel earnings-panel">
          <div className="vendor-panel-header">
            <div>
              <span>FINANCIAL OVERVIEW</span>
              <h3>Committed Revenue</h3>
            </div>
            <WalletCards size={19} />
          </div>

          <div className="vendor-earnings-number">
            ₹{pendingEarnings.toLocaleString("en-IN")}
          </div>

          <div style={{ fontSize: "13px", color: "#766C67", margin: "8px 0 16px" }}>
            Total upcoming contract value awaiting event completion.
          </div>

          <button
            className="vendor-secondary-button"
            onClick={() => navigate("/vendor/earnings")}
            style={{ width: "100%", justifyContent: "center" }}
          >
            Open Financial Statement
          </button>
        </div>
      </section>

      {/* ================= RECENT REQUESTS ================= */}
      <section className="vendor-panel" style={{ marginTop: "24px" }}>
        <div className="vendor-panel-header">
          <div>
            <span>RECENT INQUIRIES</span>
            <h3>Incoming Event Requests</h3>
          </div>
          <button
            className="vendor-view-button"
            onClick={() => navigate("/vendor/requests")}
          >
            View All ({allBookings.length})
          </button>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="vendor-empty-state">
            <div className="vendor-empty-icon">
              <ClipboardList size={27} />
            </div>
            <h4>No pending requests</h4>
            <p>
              When event organizers choose your services, their booking requests
              will appear here immediately.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
            {pendingRequests.map((req) => (
              <div
                key={req._id}
                style={{
                  padding: "14px 18px",
                  border: "1px solid #E7DED5",
                  borderRadius: "10px",
                  background: "#FFFDF9",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong style={{ fontSize: "15px", display: "block" }}>{req.eventName || req.serviceName}</strong>
                  <span style={{ fontSize: "12px", color: "#766C67" }}>
                    Organizer: {req.organizerId?.fullName || req.organizer || "Client"} • Date: {req.eventDate || "Upcoming"} • Venue: {req.eventVenue || "TBD"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(req._id, "Accepted")}
                    style={{
                      padding: "6px 14px",
                      background: "#1B5E20",
                      color: "#FFF",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ✓ Accept Event
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(req._id, "Declined")}
                    style={{
                      padding: "6px 12px",
                      background: "#FFF",
                      color: "#C62828",
                      border: "1px solid #FFCDD2",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    ✕ Decline
                  </button>

                  <Link
                    to={`/vendor/requests/${req._id}`}
                    className="vendor-secondary-button"
                    style={{ padding: "6px 12px", fontSize: "12px" }}
                  >
                    Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default VendorDashboard;

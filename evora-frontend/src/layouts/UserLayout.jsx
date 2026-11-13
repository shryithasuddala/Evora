import { useState, useEffect } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  PlusCircle,
  Store,
  Ticket,
  Wallet,
  UserRound,
  LogOut,
  Menu,
  X,
  Sparkles,
  Bell,
} from "lucide-react";
import { useAuth } from "../context/useAuth";
import Logo from "../components/common/Logo";
import AICopilotModal from "../components/common/AICopilotModal";
import { notificationsAPI } from "../services/api";

const UserLayout = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAISuite, setShowAISuite] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const userName = currentUser?.fullName || "Organizer";
  const userInitial = userName.charAt(0).toUpperCase();

  const loadUnreadCount = async () => {
    try {
      const data = await notificationsAPI.getAll();
      const unread = (data || []).filter((n) => !n.isRead).length;
      setUnreadCount(unread);
    } catch {
      // silent background check
    }
  };

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const navLinks = [
    { name: "Dashboard", path: "/user", icon: LayoutDashboard, end: true },
    { name: "My Events", path: "/user/events", icon: CalendarDays },
    { name: "Create Event", path: "/user/events/create", icon: PlusCircle },
    { name: "Services & Bookings", path: "/user/bookings", icon: Ticket },
    { name: "Budget & Expenses", path: "/user/budget", icon: Wallet },
    { name: "AI Planning Suite", path: "/user/ai", icon: Sparkles },
    { name: "Notifications", path: "/user/notifications", icon: Bell },
  ];

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out of EVORA?")) {
      logout();
      navigate("/");
    }
  };

  return (
    <div className="vendor-layout">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 998,
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`vendor-sidebar ${mobileOpen ? "open" : ""}`} >
        <div className="vendor-brand">
          <div className="vendor-brand-circle">
            <Logo />
          </div>
          <div className="vendor-brand-text">
            <h2>EVORA</h2>
            <span>Organizer Portal</span>
          </div>
        </div>

        <div className="vendor-sidebar-section">
          <p className="vendor-sidebar-title">EVENT MANAGEMENT</p>
          <nav className="vendor-sidebar-menu">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `vendor-nav-item ${isActive ? "active" : ""}`
                  }
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon size={17} />
                  <span>{item.name}</span>
                  {item.name === "Notifications" && unreadCount > 0 && (
                    <span
                      style={{
                        marginLeft: "auto",
                        background: "#DC2626",
                        color: "#FFF",
                        borderRadius: 999,
                        padding: "1px 7px",
                        fontSize: 10,
                        fontWeight: 700,
                        lineHeight: 1.4,
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="vendor-sidebar-section vendor-account-section">
          <p className="vendor-sidebar-title">ACCOUNT</p>
          <nav className="vendor-sidebar-menu">
            <NavLink
              to="/user/profile"
              className={({ isActive }) =>
                `vendor-nav-item ${isActive ? "active" : ""}`
              }
              onClick={() => setMobileOpen(false)}
            >
              <UserRound size={17} />
              <span>My Profile</span>
            </NavLink>
          </nav>
        </div>

        <div className="vendor-sidebar-bottom">
          <div
            className="vendor-sidebar-user"
            onClick={() => navigate("/user/profile")}
            style={{ cursor: "pointer" }}
          >
            <div className="vendor-user-avatar" style={{ background: "#C9A13A" }}>
              {userInitial}
            </div>
            <div className="vendor-user-details">
              <strong>{userName}</strong>
              <span>Event Host</span>
            </div>
          </div>

          <button
            type="button"
            className="vendor-logout"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="vendor-main">
        <header className="vendor-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              type="button"
              className="vendor-menu-button"
              onClick={() => setMobileOpen(!mobileOpen)}
              title="Toggle Menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <span className="vendor-topbar-label">ORGANIZER PORTAL</span>
              <h1 style={{ fontSize: "18px", margin: 0, color: "#2B1D12" }}>
                Event Operations <span className="vendor-star">✦</span>
              </h1>
            </div>
          </div>

          <div className="vendor-topbar-right">
            <button
              type="button"
              className="vendor-top-notification"
              onClick={() => navigate("/user/notifications")}
              title="Notifications & WhatsApp Alerts"
              style={{ position: "relative" }}
            >
              <Bell size={19} />
              {unreadCount > 0 ? (
                <span
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    background: "#DC2626",
                    color: "#FFF",
                    borderRadius: 999,
                    fontSize: 9,
                    fontWeight: 800,
                    minWidth: 16,
                    height: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 3px",
                    border: "2px solid #FAF5EA",
                  }}
                >
                  {unreadCount}
                </span>
              ) : (
                <span />
              )}
            </button>
            <button
              type="button"
              className="vendor-primary-button"
              onClick={() => navigate("/user/events/create")}
              style={{ padding: "8px 14px", fontSize: "13px" }}
            >
              <PlusCircle size={15} />
              Plan New Event
            </button>
            <div
              className="vendor-top-avatar"
              onClick={() => navigate("/user/profile")}
              style={{ background: "#C9A13A", cursor: "pointer" }}
              title="Profile"
            >
              {userInitial}
            </div>
          </div>
        </header>

        <div className="vendor-content">
          <Outlet />
        </div>

        {/* Global Floating AI Event Suite Trigger */}
        <button
          type="button"
          onClick={() => setShowAISuite(true)}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 1000,
            background: "linear-gradient(135deg, #C9A13A 0%, #D4AF37 50%, #B8860B 100%)",
            color: "#2B1D12",
            border: "none",
            borderRadius: "30px",
            padding: "12px 20px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 8px 24px rgba(201, 161, 58, 0.45)",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            transition: "transform 0.15s ease",
          }}
        >
          <Sparkles size={18} color="#2B1D12" />
          <span>AI Event Suite</span>
        </button>

        {/* Global 6-Feature AI Suite Modal */}
        <AICopilotModal isOpen={showAISuite} onClose={() => setShowAISuite(false)} />
      </main>
    </div>
  );
};

export default UserLayout;

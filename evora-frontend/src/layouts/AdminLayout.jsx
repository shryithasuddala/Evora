import { useState, useEffect } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Store,
  CalendarDays,
  Ticket,
  HeartHandshake,
  FileBarChart,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Bell,
} from "lucide-react";
import { useAuth } from "../context/useAuth";
import Logo from "../components/common/Logo";
import { notificationsAPI } from "../services/api";

const AdminLayout = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const adminName = currentUser?.fullName || "Administrator";
  const adminInitial = adminName.charAt(0).toUpperCase();

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
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard, end: true },
    { name: "Platform Users", path: "/admin/users", icon: Users },
    { name: "Vendor Partners", path: "/admin/vendors", icon: Store },
    { name: "All Events", path: "/admin/events", icon: CalendarDays },
    { name: "Booking Audits", path: "/admin/bookings", icon: Ticket },
    { name: "Platform Payments", path: "/admin/payments", icon: Ticket },
    { name: "Volunteer Dispatch", path: "/admin/volunteers", icon: HeartHandshake },
    { name: "Notifications", path: "/admin/notifications", icon: Bell },
    { name: "Platform Analytics", path: "/admin/reports", icon: FileBarChart },
  ];

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out of Admin Console?")) {
      logout();
      navigate("/");
    }
  };

  return (
    <div className="vendor-layout">
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
      <aside className={`vendor-sidebar ${mobileOpen ? "open" : ""}`} style={{ background: "#21160E" }}>
        <div className="vendor-brand">
          <div className="vendor-brand-circle" style={{ background: "#C9A13A" }}>
            <Logo />
          </div>
          <div className="vendor-brand-text">
            <h2 style={{ color: "#FFFDF9" }}>EVORA</h2>
            <span style={{ color: "#D5B36A" }}>Platform Admin</span>
          </div>
        </div>

        <div className="vendor-sidebar-section">
          <p className="vendor-sidebar-title" style={{ color: "rgba(240, 225, 190, 0.45)" }}>
            PLATFORM GOVERNANCE
          </p>
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

        <div className="vendor-sidebar-bottom" style={{ borderTop: "1px solid rgba(240, 225, 190, 0.12)" }}>
          <div className="vendor-sidebar-user">
            <div className="vendor-user-avatar" style={{ background: "#B4854A", color: "#FFF" }}>
              {adminInitial}
            </div>
            <div className="vendor-user-details">
              <strong style={{ color: "#FFF" }}>{adminName}</strong>
              <span style={{ color: "#D5B36A" }}>Super Administrator</span>
            </div>
          </div>

          <button
            type="button"
            className="vendor-logout"
            onClick={handleLogout}
            style={{ color: "#E7DED5" }}
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
              <span className="vendor-topbar-label" style={{ color: "#8C6435" }}>
                ADMINISTRATIVE DESK
              </span>
              <h1 style={{ fontSize: "18px", margin: 0, color: "#2B1D12" }}>
                Platform Control Center <span className="vendor-star">✦</span>
              </h1>
            </div>
          </div>

          <div className="vendor-topbar-right">
            <button
              type="button"
              className="vendor-top-notification"
              onClick={() => navigate("/admin/notifications")}
              title="Admin Alerts & Notifications"
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

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#F0E1BE",
                color: "#8C6435",
                padding: "6px 12px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              <ShieldCheck size={14} /> Full Privilege Mode
            </span>
            <div
              className="vendor-top-avatar"
              style={{ background: "#B4854A", color: "#FFF", cursor: "pointer" }}
            >
              {adminInitial}
            </div>
          </div>
        </header>

        <div className="vendor-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;

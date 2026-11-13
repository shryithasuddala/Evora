import { useState } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Bell,
  ClipboardCheck,
  CalendarDays,
  ShieldCheck,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/useAuth";
import Logo from "../components/common/Logo";

const VolunteerLayout = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const volunteerName = currentUser?.fullName || "Volunteer";
  const volunteerInitial = volunteerName.charAt(0).toUpperCase();

  const navLinks = [
    { name: "Duty Dashboard", path: "/volunteer", icon: LayoutDashboard, end: true },
    { name: "Assigned Tasks", path: "/volunteer/tasks", icon: ClipboardCheck },
    { name: "Shifts & Schedule", path: "/volunteer/schedule", icon: CalendarDays },
    { name: "Digital ID & Profile", path: "/volunteer/profile", icon: ShieldCheck },
    { name: "Notifications", path: "/volunteer/notifications", icon: Bell },
  ];

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out of EVORA?")) {
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
      <aside className={`vendor-sidebar ${mobileOpen ? "open" : ""}`} >
        <div className="vendor-brand">
          <div className="vendor-brand-circle">
            <Logo />
          </div>
          <div className="vendor-brand-text">
            <h2>EVORA</h2>
            <span>Volunteer Force</span>
          </div>
        </div>

        <div className="vendor-sidebar-section">
          <p className="vendor-sidebar-title">OPERATIONS</p>
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
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="vendor-sidebar-section vendor-account-section">
          <p className="vendor-sidebar-title">VERIFICATION</p>
          <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.06)", borderRadius: "10px", margin: "0 8px" }}>
            <span style={{ fontSize: "10px", letterSpacing: "1px", color: "#D5B36A", fontWeight: 700, display: "block" }}>
              CREDENTIAL ID
            </span>
            <strong style={{ fontSize: "12px", color: "#FFFDF9", display: "block", marginTop: "2px" }}>
              {currentUser?.volunteerId || "EVO-VOL-2026-4091"}
            </strong>
            <span style={{ fontSize: "11px", color: "#647665", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
              <ShieldCheck size={13} /> Government Verified
            </span>
          </div>
        </div>

        <div className="vendor-sidebar-bottom">
          <div
            className="vendor-sidebar-user"
            onClick={() => navigate("/volunteer/profile")}
            style={{ cursor: "pointer" }}
          >
            <div className="vendor-user-avatar" style={{ background: "#647665" }}>
              {volunteerInitial}
            </div>
            <div className="vendor-user-details">
              <strong>{volunteerName}</strong>
              <span>Event Specialist</span>
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
              <span className="vendor-topbar-label">VOLUNTEER OPERATIONS</span>
              <h1 style={{ fontSize: "18px", margin: 0, color: "#2B1D12" }}>
                Field Station <span className="vendor-star">✦</span>
              </h1>
            </div>
          </div>

          <div className="vendor-topbar-right">
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#EAF0EA",
                color: "#304B35",
                padding: "6px 12px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={14} color="#304B35" /> Active Duty Roster
            </span>
            <div
              className="vendor-top-avatar"
              onClick={() => navigate("/volunteer/profile")}
              style={{ background: "#647665", cursor: "pointer" }}
              title="Volunteer ID"
            >
              {volunteerInitial}
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

export default VolunteerLayout;

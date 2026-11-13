import { useState, useEffect } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";

import {
  LayoutDashboard,
  BriefcaseBusiness,
  ClipboardList,
  CalendarDays,
  WalletCards,
  Star,
  Bell,
  UserRound,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

import Logo from "../components/common/Logo";
import { notificationsAPI } from "../services/api";

const VendorLayout = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const getCurrentVendor = () => {
    try {
      const currentUser = JSON.parse(
        localStorage.getItem("evoraCurrentUser") || "{}",
      );

      return currentUser;
    } catch {
      return {};
    }
  };

  const currentVendor = getCurrentVendor();
  const vendorName = currentVendor.fullName || currentVendor.name || "Vendor";
  const vendorInitial = vendorName.charAt(0).toUpperCase();

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

  const workspaceMenu = [
    {
      name: "Dashboard",
      path: "/vendor",
      icon: LayoutDashboard,
    },
    {
      name: "My Services",
      path: "/vendor/services",
      icon: BriefcaseBusiness,
    },
    {
      name: "Event Requests",
      path: "/vendor/requests",
      icon: ClipboardList,
    },
    {
      name: "Bookings",
      path: "/vendor/bookings",
      icon: CalendarDays,
    },
    {
      name: "Availability",
      path: "/vendor/availability",
      icon: CalendarDays,
    },
    {
      name: "Earnings",
      path: "/vendor/earnings",
      icon: WalletCards,
    },
    {
      name: "Reviews",
      path: "/vendor/reviews",
      icon: Star,
    },
  ];

  const accountMenu = [
    {
      name: "Notifications",
      path: "/vendor/notifications",
      icon: Bell,
    },
    {
      name: "Profile",
      path: "/vendor/profile",
      icon: UserRound,
    },
    {
      name: "Settings",
      path: "/vendor/settings",
      icon: Settings,
    },
  ];

  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to logout?");

    if (confirmLogout) {
      localStorage.removeItem("evoraCurrentUser");
      localStorage.removeItem("evoraRole");

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
      {/* ================= SIDEBAR ================= */}

      <aside className={`vendor-sidebar ${mobileOpen ? "open" : ""}`} >
        {/* ================= LOGO ================= */}

        <div className="vendor-brand">
          <div className="vendor-brand-circle">
            <Logo />
          </div>

          <div className="vendor-brand-text">
            <h2>EVORA</h2>

            <span>Vendor Portal</span>
          </div>
        </div>

        {/* ================= WORKSPACE ================= */}

        <div className="vendor-sidebar-section">
          <p className="vendor-sidebar-title">WORKSPACE</p>

          <nav className="vendor-sidebar-menu">
            {workspaceMenu.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/vendor"}
                  className={({ isActive }) =>
                    `vendor-nav-item ${isActive ? "active" : ""}`
                  }
                >
                  <Icon size={17} />

                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* ================= ACCOUNT ================= */}

        <div className="vendor-sidebar-section vendor-account-section">
          <p className="vendor-sidebar-title">ACCOUNT</p>

          <nav className="vendor-sidebar-menu">
            {accountMenu.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `vendor-nav-item ${isActive ? "active" : ""}`
                  }
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

        {/* ================= USER ================= */}

        <div className="vendor-sidebar-bottom">
          <button
            type="button"
            className="vendor-sidebar-user"
            onClick={() => navigate("/vendor/profile")}
          >
            <div className="vendor-user-avatar">{vendorInitial}</div>

            <div className="vendor-user-details">
              <strong>{vendorName}</strong>

              <span>Vendor Partner</span>
            </div>
          </button>

          {/* ================= LOGOUT ================= */}

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

      {/* ================= MAIN ================= */}

      <main className="vendor-main">
        {/* ================= TOP NAVBAR ================= */}

        <header className="vendor-topbar">
          <button
            type="button"
            className="vendor-menu-button"
            onClick={() => setMobileOpen(!mobileOpen)}
            title="Toggle Menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div>
            <span className="vendor-topbar-label">VENDOR PORTAL</span>
            <h1 style={{ fontSize: "18px", margin: 0, color: "#2B1D12" }}>
              Partner Studio <span className="vendor-star">✦</span>
            </h1>
          </div>

          <div className="vendor-topbar-right">
            {/* ================= NOTIFICATIONS ================= */}

            <button
              type="button"
              className="vendor-top-notification"
              onClick={() => navigate("/vendor/notifications")}
              title="Notifications"
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

            {/* ================= PROFILE ================= */}

            <button
              type="button"
              className="vendor-top-avatar"
              onClick={() => navigate("/vendor/profile")}
              title="Go to Profile"
            >
              {vendorInitial}
            </button>
          </div>
        </header>

        {/* ================= PAGE CONTENT ================= */}

        <div className="vendor-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default VendorLayout;

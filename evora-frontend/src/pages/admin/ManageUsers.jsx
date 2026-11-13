import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { adminAPI } from "../../services/api";

const ROLES = ["All Roles", "user", "vendor", "volunteer", "admin"];

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [searchTerm, setSearchTerm] = useState("");

  const loadUsers = async () => {
    try {
      const data = await adminAPI.getUsers();
      setUsers(data || []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleStatus = async (user) => {
    try {
      await adminAPI.toggleStatus(user._id || user.id);
      await loadUsers();
    } catch (err) {
      alert(err.message || "Failed to update user status.");
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole =
      selectedRole === "All Roles" || u.role === selectedRole;
    const matchesSearch =
      (u.fullName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone && u.phone.includes(searchTerm));
    return matchesRole && matchesSearch;
  });

  if (loading) {
    return (
      <div className="vendor-page" style={{ textAlign: "center", padding: 50, color: "#8B7355" }}>
        Loading user directory…
      </div>
    );
  }

  return (
    <div className="vendor-page">
      <div style={{ marginBottom: "24px" }}>
        <span className="vendor-welcome-label" style={{ color: "#8C6435" }}>
          USER DIRECTORY
        </span>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "32px", margin: "4px 0" }}>
          Platform User Accounts
        </h1>
        <p style={{ margin: 0, color: "#766C67" }}>
          Audit, moderate, and manage authentication access for all EVORA roles.
        </p>
      </div>

      {/* FILTER & SEARCH */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRole(r)}
              style={{
                padding: "8px 16px",
                borderRadius: "999px",
                border: "1px solid",
                borderColor: selectedRole === r ? "#8C6435" : "#D5C2A5",
                background: selectedRole === r ? "#8C6435" : "#FFFDF9",
                color: selectedRole === r ? "#FFFFFF" : "#5C4A3A",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "all 0.15s ease",
              }}
            >
              {r === "user" ? "Organizers" : r === "vendor" ? "Vendors" : r === "volunteer" ? "Volunteers" : r === "admin" ? "Admins" : "All Accounts"}
            </button>
          ))}
        </div>

        <div className="login-input-wrapper" style={{ width: "280px", background: "#FFF" }}>
          <Search size={16} />
          <input
            placeholder="Search name, email, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="vendor-card">
        <div className="table-responsive" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", width: "100%" }}>
          <table style={{ width: "100%", minWidth: "720px", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E7DED5", textAlign: "left", color: "#766C67" }}>
                <th style={{ padding: "12px 8px" }}>MEMBER</th>
                <th style={{ padding: "12px 8px" }}>ROLE</th>
                <th style={{ padding: "12px 8px" }}>CONTACT</th>
                <th style={{ padding: "12px 8px" }}>LOCATION</th>
                <th style={{ padding: "12px 8px" }}>STATUS</th>
                <th style={{ padding: "12px 8px", textAlign: "right" }}>ACCESS ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const userId = user._id || user.id;
                const isSuspended = user.isActive === false;
                const roleStyles = {
                  user: { bg: "#EAF0EA", text: "#304B35", label: "Organizer" },
                  vendor: { bg: "#FFF7EB", text: "#B4712A", label: "Vendor" },
                  volunteer: { bg: "#E6EDDD", text: "#5F7C4E", label: "Volunteer" },
                  admin: { bg: "#F1E7D2", text: "#2B1D12", label: "Admin" },
                };
                const style = roleStyles[user.role] || roleStyles.user;

                return (
                  <tr key={userId} style={{ borderBottom: "1px solid #E7DED5" }}>
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background: style.bg,
                            color: style.text,
                            display: "grid",
                            placeItems: "center",
                            fontWeight: 700,
                            fontFamily: "Playfair Display, serif",
                          }}
                        >
                          {(user.fullName || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <strong style={{ color: "#2B1D12", display: "block" }}>{user.fullName}</strong>
                          <span style={{ fontSize: "11px", color: "#766C67" }}>ID: {userId}</span>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "12px 8px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: "999px",
                          background: style.bg,
                          color: style.text,
                        }}
                      >
                        {style.label}
                      </span>
                    </td>

                    <td style={{ padding: "12px 8px" }}>
                      <span style={{ display: "block", color: "#2B1D12" }}>{user.email}</span>
                      <span style={{ fontSize: "11px", color: "#766C67" }}>{user.phone || "No phone"}</span>
                    </td>

                    <td style={{ padding: "12px 8px", color: "#766C67" }}>
                      {user.location || user.city || "Bangalore, India"}
                    </td>

                    <td style={{ padding: "12px 8px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: "999px",
                          background: isSuspended ? "#F8D7DA" : "#D4EDDA",
                          color: isSuspended ? "#721C24" : "#155724",
                        }}
                      >
                        {isSuspended ? "Suspended" : "Active"}
                      </span>
                    </td>

                    <td style={{ padding: "12px 8px", textAlign: "right" }}>
                      {user.role !== "admin" && (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(user)}
                          style={{
                            padding: "6px 14px",
                            fontSize: "12px",
                            fontWeight: 600,
                            borderRadius: "6px",
                            cursor: "pointer",
                            border: isSuspended ? "1.5px solid #16A34A" : "1.5px solid #DC2626",
                            background: isSuspended ? "#F0FDF4" : "#FEF2F2",
                            color: isSuspended ? "#166534" : "#991B1B",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {isSuspended ? "Reinstate Access" : "Suspend Access"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageUsers;

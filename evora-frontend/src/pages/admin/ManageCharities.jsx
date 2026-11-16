import React, { useState, useEffect } from "react";
import {
  HeartHandshake,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  RefreshCw,
} from "lucide-react";
import { charityAIAPI } from "../../services/api";

const ManageCharities = () => {
  const [charities, setCharities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  // Add Charity Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    type: "NGO",
    address: "",
    city: "Hyderabad",
    phone: "",
    email: "",
    capacityPerDay: 200,
    acceptsCookedFood: true,
    operatingHours: "08:00 - 22:00",
    description: "",
    contactPerson: "",
  });

  const navy = "#0D1B2A";
  const softGold = "#C9A13A";
  const purple = "#4A154B";

  const loadCharities = async () => {
    setLoading(true);
    try {
      const data = await charityAIAPI.getCharities({ type: selectedType });
      setCharities(data || []);
    } catch (err) {
      console.warn("Error loading charities:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCharities();
  }, [selectedType]);

  const toggleVerification = async (charity) => {
    try {
      await charityAIAPI.updateCharity(charity._id, { verified: !charity.verified });
      await loadCharities();
    } catch (err) {
      alert("Failed to update charity verification: " + err.message);
    }
  };

  const handleCreateCharity = async (e) => {
    e.preventDefault();
    if (!addForm.name || !addForm.address || !addForm.phone) {
      alert("Name, address, and phone number are required.");
      return;
    }

    setAdding(true);
    try {
      await charityAIAPI.createCharity({
        ...addForm,
        verified: true,
      });
      setShowAddModal(false);
      setAddForm({
        name: "",
        type: "NGO",
        address: "",
        city: "Hyderabad",
        phone: "",
        email: "",
        capacityPerDay: 200,
        acceptsCookedFood: true,
        operatingHours: "08:00 - 22:00",
        description: "",
        contactPerson: "",
      });
      await loadCharities();
    } catch (err) {
      alert("Failed to add charity: " + err.message);
    } finally {
      setAdding(false);
    }
  };

  const filtered = charities.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="vendor-page" style={{ maxWidth: 1150, margin: "0 auto", padding: "20px 16px" }}>
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${navy}, #1E293B)`,
          borderRadius: 16,
          padding: "24px 28px",
          color: "#FAF5EA",
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(201, 161, 58, 0.2)", color: softGold, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
            <HeartHandshake size={13} /> CHARITY & NGO REGISTRY
          </div>
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 26, margin: "2px 0 4px" }}>
            Manage Charity & Shelter Listings
          </h1>
          <p style={{ color: "#CBD5E1", fontSize: 13, margin: 0 }}>
            Verify registered charities, orphanages, and community shelters eligible for surplus food donation
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{
            background: softGold,
            color: "#2B1D12",
            border: "none",
            borderRadius: 8,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 2px 8px rgba(201, 161, 58, 0.3)",
          }}
        >
          <Plus size={16} /> Add Verified Charity
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 12,
          padding: "14px 18px",
          border: "1px solid #E2E8F0",
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ position: "relative", minWidth: 260 }}>
          <Search size={16} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94A3B8" }} />
          <input
            type="text"
            placeholder="Search by name, address, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 34px",
              borderRadius: 8,
              border: "1px solid #CBD5E1",
              fontSize: 13,
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["all", "orphanage", "old-age home", "NGO", "shelter"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedType(t)}
              style={{
                background: selectedType === t ? navy : "#F1F5F9",
                color: selectedType === t ? "#FFFFFF" : "#475569",
                border: "none",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {t === "all" ? "All" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Charities Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: `3px solid ${softGold}`,
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <p style={{ color: "#8B7355" }}>Loading charities registry…</p>
        </div>
      ) : (
        <div style={{ background: "#FFFFFF", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", color: "#475569" }}>
                <th style={{ padding: "12px 16px" }}>Charity Name</th>
                <th style={{ padding: "12px 16px" }}>Type</th>
                <th style={{ padding: "12px 16px" }}>Address</th>
                <th style={{ padding: "12px 16px" }}>Capacity</th>
                <th style={{ padding: "12px 16px" }}>Cooked Food</th>
                <th style={{ padding: "12px 16px" }}>Verified</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c._id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                  <td style={{ padding: "14px 16px", fontWeight: 700, color: navy }}>
                    {c.name}
                    <div style={{ fontSize: 11, fontWeight: 400, color: "#64748B" }}>📞 {c.phone}</div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span
                      style={{
                        background: "#EEF2FF",
                        color: "#4338CA",
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      {c.type}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#475569", maxWidth: 220 }}>
                    {c.address}
                  </td>
                  <td style={{ padding: "14px 16px", fontWeight: 600 }}>
                    👥 {c.capacityPerDay || 150} /day
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {c.acceptsCookedFood ? (
                      <span style={{ color: "#16A34A", fontWeight: 600 }}>✓ Cooked</span>
                    ) : (
                      <span style={{ color: "#D97706", fontWeight: 600 }}>Packaged</span>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    {c.verified ? (
                      <span style={{ color: "#059669", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <ShieldCheck size={15} /> Verified
                      </span>
                    ) : (
                      <span style={{ color: "#DC2626", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <ShieldAlert size={15} /> Unverified
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => toggleVerification(c)}
                      style={{
                        background: c.verified ? "#FEF2F2" : "#ECFDF5",
                        color: c.verified ? "#DC2626" : "#059669",
                        border: `1px solid ${c.verified ? "#FCA5A5" : "#A7F3D0"}`,
                        padding: "6px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {c.verified ? "Revoke" : "Approve"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Charity Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              padding: "24px 28px",
              maxWidth: 540,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ fontSize: 18, color: navy, margin: "0 0 14px", fontWeight: 700 }}>
              Add Verified Charity or Shelter
            </h3>

            <form onSubmit={handleCreateCharity}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>
                  Charity Name *
                </label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g. Hyderabad Seva Old-Age Home"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>
                    Type
                  </label>
                  <select
                    value={addForm.type}
                    onChange={(e) => setAddForm({ ...addForm, type: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                  >
                    <option value="NGO">NGO</option>
                    <option value="orphanage">Orphanage</option>
                    <option value="old-age home">Old-Age Home</option>
                    <option value="shelter">Community Shelter</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>
                    Daily Capacity (meals)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={addForm.capacityPerDay}
                    onChange={(e) => setAddForm({ ...addForm, capacityPerDay: Number(e.target.value) })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>
                  Address & Locality *
                </label>
                <input
                  type="text"
                  required
                  value={addForm.address}
                  onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                  placeholder="e.g. Road No 10, Banjara Hills, Hyderabad"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="+91-9876543210"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 4 }}>
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    placeholder="contact@charity.org"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={addForm.acceptsCookedFood}
                    onChange={(e) => setAddForm({ ...addForm, acceptsCookedFood: e.target.checked })}
                    style={{ accentColor: purple }}
                  />
                  Equipped to accept freshly cooked event meals
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    background: "#F1F5F9",
                    border: "none",
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={adding}
                  style={{
                    background: navy,
                    color: "#FFFFFF",
                    border: "none",
                    padding: "8px 20px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: adding ? "wait" : "pointer",
                  }}
                >
                  {adding ? "Saving..." : "Save Charity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCharities;

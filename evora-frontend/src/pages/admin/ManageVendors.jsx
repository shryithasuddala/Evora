import { useState, useEffect } from "react";
import {
  ShieldCheck,
  MapPin,
  Search,
} from "lucide-react";
import { adminAPI, servicesAPI } from "../../services/api";

const ManageVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = async () => {
    try {
      const [vendorUsers, allServices] = await Promise.all([
        adminAPI.getUsers({ role: "vendor" }),
        servicesAPI.getAll(),
      ]);
      setVendors(vendorUsers || []);
      setServices(allServices || []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleVerification = async (vendor) => {
    try {
      await adminAPI.toggleVerify(vendor._id || vendor.id);
      await loadData();
    } catch (err) {
      alert(err.message || "Failed to toggle verification.");
    }
  };

  const filteredVendors = vendors.filter((v) => {
    const name = v.businessName || v.fullName || "";
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.serviceType && v.serviceType.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  if (loading) {
    return (
      <div className="vendor-page" style={{ textAlign: "center", padding: 50, color: "#8B7355" }}>
        Loading vendor registry…
      </div>
    );
  }

  return (
    <div className="vendor-page">
      <div style={{ marginBottom: "24px" }}>
        <span className="vendor-welcome-label" style={{ color: "#8C6435" }}>
          PARTNER NETWORK
        </span>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "32px", margin: "4px 0" }}>
          Vendor Partners & Quality Verification
        </h1>
        <p style={{ margin: 0, color: "#766C67" }}>
          Review business credentials, manage culinary/decor standards, and award trusted verification seals.
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
        <div className="login-input-wrapper" style={{ width: "300px", background: "#FFF" }}>
          <Search size={16} />
          <input
            placeholder="Search business, owner, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredVendors.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "#8B7355", background: "#FAF5EA", borderRadius: 12, border: "1px dashed #C9A13A55" }}>
          No registered vendor partners found on the platform.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "20px" }}>
          {filteredVendors.map((vendor) => {
            const vId = vendor._id || vendor.id;
            const vendorServices = services.filter((s) => (s.vendorId?._id || s.vendorId) === vId);
            const isVerified = vendor.isVerified !== false;

            return (
              <div
                key={vId}
                className="vendor-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  border: "1px solid #E7DED5",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        background: "#FFF7EB",
                        color: "#B4712A",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        textTransform: "uppercase",
                      }}
                    >
                      {vendor.serviceType || "Event Services"}
                    </span>

                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: "999px",
                        background: isVerified ? "#D4EDDA" : "#FFF3CD",
                        color: isVerified ? "#155724" : "#856404",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <ShieldCheck size={13} /> {isVerified ? "Verified Partner" : "Pending Audit"}
                    </span>
                  </div>

                  <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "19px", margin: "0 0 4px", color: "#2B1D12" }}>
                    {vendor.businessName || `${vendor.fullName}'s Studio`}
                  </h2>
                  <span style={{ fontSize: "13px", color: "#766C67", display: "block", marginBottom: "12px" }}>
                    Owner: {vendor.fullName} ({vendor.email})
                  </span>

                  <p style={{ fontSize: "13px", color: "#584C47", lineHeight: "1.5", margin: "0 0 14px" }}>
                    {vendor.bio || "Premier service partner catering to luxury celebrations."}
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px", color: "#766C67", borderTop: "1px solid #E7DED5", paddingTop: "12px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <MapPin size={13} color="#8C6435" /> Location: {vendor.location || "Hyderabad, India"}
                    </span>
                    <span>
                      Catalogue: <strong>{vendorServices.length} Published Service{vendorServices.length === 1 ? "" : "s"}</strong>
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #E7DED5", paddingTop: "14px", marginTop: "14px", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => handleToggleVerification(vendor)}
                    style={{
                      padding: "8px 18px",
                      fontSize: "13px",
                      fontWeight: 700,
                      borderRadius: "8px",
                      cursor: "pointer",
                      border: isVerified ? "1.5px solid #D97706" : "none",
                      background: isVerified ? "#FFFBEB" : "linear-gradient(135deg, #8C6435 0%, #6E4E28 100%)",
                      color: isVerified ? "#92400E" : "#FFFFFF",
                      boxShadow: isVerified ? "none" : "0 3px 8px rgba(140, 100, 53, 0.25)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isVerified ? "Revoke Verification" : "Approve & Verify Vendor"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ManageVendors;

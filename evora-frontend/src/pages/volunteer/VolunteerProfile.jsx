import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Award,
  UserRound,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Save,
  QrCode,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";

const VolunteerProfile = () => {
  const { currentUser, updateProfile } = useAuth();

  const [formData, setFormData] = useState({
    fullName: currentUser?.fullName || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    whatsappNumber: currentUser?.whatsappNumber || currentUser?.phone || "",
    whatsappOptIn: currentUser?.whatsappOptIn === true,
    whatsappEnabled: currentUser?.whatsappEnabled === true,
    inAppEnabled: currentUser?.inAppEnabled !== false,
    city: currentUser?.city || "Hyderabad",
    identityType: currentUser?.identityType || "Aadhaar / Government ID",
    identityNumber: currentUser?.identityNumber || "",
    skills: Array.isArray(currentUser?.skills)
      ? currentUser.skills.join(", ")
      : currentUser?.skills || "",
  });

  useEffect(() => {
    if (currentUser) {
      setFormData((prev) => ({
        ...prev,
        fullName: currentUser.fullName || prev.fullName,
        email: currentUser.email || prev.email,
        phone: currentUser.phone || prev.phone,
        whatsappNumber: currentUser.whatsappNumber || currentUser.phone || prev.whatsappNumber,
        whatsappOptIn: currentUser.whatsappOptIn === true,
        whatsappEnabled: currentUser.whatsappEnabled === true,
        inAppEnabled: currentUser.inAppEnabled !== false,
        city: currentUser.city || prev.city,
      }));
    }
  }, [currentUser]);

  const [saved, setSaved] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const nextVal = type === "checkbox" ? checked : value;
      const updated = { ...prev, [name]: nextVal };
      if (name === "whatsappOptIn") {
        updated.whatsappEnabled = nextVal ? true : false;
      }
      return updated;
    });
    setSaved(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const phoneVal = formData.whatsappNumber || formData.phone;
    if (phoneVal) {
      let digits = String(phoneVal).replace(/\D/g, "");
      if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
      else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
      if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
        alert(`Phone number must be a valid 10-digit mobile number starting with 9, 8, 7, or 6 (you entered: ${digits}).`);
        return;
      }
    }
    try {
      await updateProfile({
        ...formData,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.message || "Failed to update profile");
    }
  };

  const volunteerId = currentUser?.volunteerId || "EVO-VOL-2026-4091";

  return (
    <div className="vendor-page">
      <div style={{ marginBottom: "24px" }}>
        <span className="vendor-welcome-label" style={{ color: "#647665" }}>
          OFFICIAL CREDENTIALS
        </span>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "32px", margin: "4px 0" }}>
          Volunteer Digital ID & Profile
        </h1>
        <p style={{ margin: 0, color: "#766C67" }}>
          Verified EVORA event operations credential, station clearance pass, and skills records.
        </p>
      </div>

      <div className="volunteer-profile-grid">
        {/* DIGITAL ID CARD */}
        <div>
          <div
            style={{
              background: "linear-gradient(135deg, #2E2927 0%, #1A241C 100%)",
              color: "#FFFDF9",
              borderRadius: "18px",
              padding: "28px",
              boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
              position: "relative",
              overflow: "hidden",
              border: "1px solid rgba(201, 161, 58, 0.4)",
            }}
          >
            {/* GOLD FOIL ACCENT BAR */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "5px",
                background: "linear-gradient(90deg, #C9A13A, #F0E1BE, #C9A13A)",
              }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <span style={{ fontSize: "11px", letterSpacing: "2px", fontWeight: 700, color: "#D5B36A" }}>
                  EVORA PROTOCOL
                </span>
                <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: "18px", margin: "2px 0 0" }}>
                  Official Event Force
                </h3>
              </div>
              <ShieldCheck size={28} color="#C9A13A" />
            </div>

            <div style={{ display: "flex", gap: "18px", alignItems: "center", marginBottom: "20px" }}>
              <div
                style={{
                  width: "70px",
                  height: "70px",
                  borderRadius: "14px",
                  background: "#304B35",
                  color: "#FFF",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "26px",
                  fontWeight: 700,
                  fontFamily: "Playfair Display, serif",
                  border: "2px solid #C9A13A",
                }}
              >
                {formData.fullName.charAt(0).toUpperCase()}
              </div>

              <div>
                <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "20px", margin: "0 0 4px", color: "#FFF" }}>
                  {formData.fullName}
                </h2>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    background: "rgba(100, 118, 101, 0.3)",
                    color: "#A2C4A4",
                    padding: "3px 8px",
                    borderRadius: "999px",
                    display: "inline-block",
                  }}
                >
                  ✓ VERIFIED SPECIALIST
                </span>
                <span style={{ display: "block", fontSize: "12px", color: "#E7DED5", marginTop: "4px" }}>
                  Station: {formData.city}
                </span>
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "10px", padding: "12px 14px", marginBottom: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "6px" }}>
                <span style={{ color: "#E7DED5" }}>Pass / Badge ID:</span>
                <strong style={{ color: "#D5B36A", letterSpacing: "1px" }}>{volunteerId}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "#E7DED5" }}>Identity Proof:</span>
                <span style={{ color: "#FFF" }}>{formData.identityNumber}</span>
              </div>
            </div>

            {/* SIMULATED QR BAR */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#A89C94" }}>
                <QrCode size={28} color="#D5B36A" />
                <span>Scan for on-site authorization</span>
              </div>
              <span style={{ fontSize: "10px", color: "#C9A13A", letterSpacing: "1px", fontWeight: 700 }}>
                EVORA 2026
              </span>
            </div>
          </div>
        </div>

        {/* PROFILE EDIT FORM */}
        <div className="vendor-card">
          {saved && (
            <div
              style={{
                background: "#D4EDDA",
                color: "#155724",
                padding: "12px 16px",
                borderRadius: "8px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "13px",
              }}
            >
              <CheckCircle2 size={16} /> Volunteer credentials updated successfully!
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="login-field">
              <label>Full Name</label>
              <div className="login-input-wrapper">
                <UserRound size={16} />
                <input
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="volunteer-form-grid">
              <div className="login-field">
                <label>Email Address</label>
                <div className="login-input-wrapper">
                  <Mail size={16} />
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>Registered WhatsApp Number</span>
                  <span style={{
                    fontSize: "11px",
                    color: formData.whatsappOptIn && formData.whatsappEnabled ? "#25D366" : "#766C67",
                    background: formData.whatsappOptIn && formData.whatsappEnabled ? "#E8F9EE" : "#F0ECE1",
                    padding: "1px 6px",
                    borderRadius: "8px",
                    fontWeight: 700,
                  }}>
                    {formData.whatsappOptIn && formData.whatsappEnabled ? "WhatsApp Enabled" : "WhatsApp Inactive"}
                  </span>
                </label>
                <div className="login-input-wrapper">
                  <Phone size={16} />
                  <input
                    name="whatsappNumber"
                    placeholder="+91 87654 32109"
                    value={formData.whatsappNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({ ...prev, whatsappNumber: val, phone: val }));
                      setSaved(false);
                    }}
                  />
                </div>
                <span style={{ fontSize: "11px", color: "#8B7355", marginTop: "4px", display: "block" }}>
                  Duty assignments and schedule updates are sent automatically when you opt in below.
                </span>
              </div>
            </div>

            <div className="volunteer-form-grid">
              <div className="login-field">
                <label>City / Operational Zone</label>
                <div className="login-input-wrapper">
                  <MapPin size={16} />
                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="login-field">
                <label>Identity Proof Reference</label>
                <div className="login-input-wrapper">
                  <ShieldCheck size={16} />
                  <input
                    name="identityNumber"
                    value={formData.identityNumber}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="login-field">
              <label>Skills & Specializations (comma separated)</label>
              <div className="login-input-wrapper">
                <Award size={16} />
                <input
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="e.g. VIP Escort, Technical Sound, Registration Check-in"
                />
              </div>
            </div>

            <div
              style={{
                background: formData.whatsappOptIn ? "rgba(37, 211, 102, 0.06)" : "#FDFBF7",
                border: formData.whatsappOptIn ? "1px solid #25D366" : "1px solid #E7DED5",
                borderRadius: "10px",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  name="whatsappOptIn"
                  checked={formData.whatsappOptIn}
                  onChange={handleChange}
                  style={{ accentColor: "#25D366" }}
                />
                <MessageSquare size={15} color={formData.whatsappOptIn ? "#25D366" : "#766C67"} />
                <span>I consent to receive automated WhatsApp duty & schedule alerts (Opt-in)</span>
              </label>

              <div style={{ display: "flex", gap: "18px", flexWrap: "wrap", fontSize: "13px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    name="whatsappEnabled"
                    checked={formData.whatsappEnabled}
                    disabled={!formData.whatsappOptIn}
                    onChange={handleChange}
                  />
                  <span>Enable WhatsApp Notifications</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    name="inAppEnabled"
                    checked={formData.inAppEnabled}
                    onChange={handleChange}
                  />
                  <span>Enable In-App Notifications</span>
                </label>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "11px 26px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(27, 94, 32, 0.25)",
                  transition: "transform 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <Save size={16} /> Save Volunteer Profile
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VolunteerProfile;

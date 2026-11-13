import { useState, useEffect } from "react";
import {
  UserRound,
  Mail,
  Phone,
  MapPin,
  Save,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";

const UserProfile = () => {
  const { currentUser, updateProfile } = useAuth();

  const [formData, setFormData] = useState({
    fullName: currentUser?.fullName || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    whatsappNumber: currentUser?.whatsappNumber || currentUser?.phone || "",
    city: currentUser?.city || "Hyderabad",
    bio: currentUser?.bio || "",
    whatsappOptIn: currentUser?.whatsappOptIn === true,
    whatsappEnabled: currentUser?.whatsappEnabled === true,
    inAppEnabled: currentUser?.inAppEnabled !== false,
  });

  useEffect(() => {
    if (currentUser) {
      setFormData((prev) => ({
        ...prev,
        fullName: currentUser.fullName || prev.fullName,
        email: currentUser.email || prev.email,
        phone: currentUser.phone || prev.phone,
        whatsappNumber: currentUser.whatsappNumber || currentUser.phone || prev.whatsappNumber,
        city: currentUser.city || prev.city,
        bio: currentUser.bio || prev.bio,
        whatsappOptIn: currentUser.whatsappOptIn === true,
        whatsappEnabled: currentUser.whatsappEnabled === true,
        inAppEnabled: currentUser.inAppEnabled !== false,
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
      await updateProfile(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.message || "Failed to update profile");
    }
  };

  return (
    <div className="vendor-page">
      <div style={{ marginBottom: "24px" }}>
        <span className="vendor-welcome-label" style={{ color: "#C9A13A" }}>
          ORGANIZER CREDENTIALS
        </span>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "32px", margin: "4px 0" }}>
          Personal Profile & Settings
        </h1>
        <p style={{ margin: 0, color: "#766C67" }}>
          Manage your contact credentials and celebration planning preferences.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px" }}>
        {/* AVATAR CARD */}
        <div className="vendor-card" style={{ textAlign: "center", padding: "36px 20px" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "#304B35",
              color: "#FFF",
              display: "grid",
              placeItems: "center",
              fontSize: "32px",
              fontFamily: "Playfair Display, serif",
              margin: "0 auto 16px",
            }}
          >
            {formData.fullName.charAt(0).toUpperCase() || "U"}
          </div>

          <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "20px", margin: "0 0 4px" }}>
            {formData.fullName}
          </h2>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.8px",
              background: "#E7D9D4",
              color: "#2E2927",
              padding: "3px 10px",
              borderRadius: "999px",
              textTransform: "uppercase",
              display: "inline-block",
              marginBottom: "12px",
            }}
          >
            Event Host & Organizer
          </span>

          <p style={{ fontSize: "13px", color: "#766C67", margin: "0 0 16px" }}>
            {formData.city || "Hyderabad"}
          </p>

          <div style={{ borderTop: "1px solid #E7DED5", paddingTop: "16px", fontSize: "12px", color: "#766C67" }}>
            Member of EVORA Platform since 2026
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
              <CheckCircle2 size={16} /> Profile changes saved successfully!
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
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
                    padding: "2px 8px",
                    borderRadius: "10px",
                    fontWeight: 700
                  }}>
                    {formData.whatsappOptIn && formData.whatsappEnabled ? "WhatsApp Enabled" : "WhatsApp Inactive"}
                  </span>
                </label>
                <div className="login-input-wrapper">
                  <Phone size={16} />
                  <input
                    name="whatsappNumber"
                    placeholder="+91 98765 43210"
                    value={formData.whatsappNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({ ...prev, whatsappNumber: val, phone: val }));
                      setSaved(false);
                    }}
                  />
                </div>
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#8B7355" }}>
                  Automated WhatsApp alerts for event confirmations and vendor updates are sent to this number when opted in.
                </p>
              </div>
            </div>

            <div className="login-field">
              <label>City / Region</label>
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
              <label>Bio / About You</label>
              <textarea
                name="bio"
                rows={3}
                value={formData.bio}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #E7DED5",
                  borderRadius: "8px",
                  fontFamily: "inherit",
                  fontSize: "13px",
                }}
              />
            </div>

            {/* WHATSAPP NOTIFICATION CONSENT */}
            <div
              style={{
                background: formData.whatsappOptIn ? "rgba(37, 211, 102, 0.06)" : "#FDFBF7",
                border: formData.whatsappOptIn ? "1px solid #25D366" : "1px solid #E7DED5",
                borderRadius: "10px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  cursor: "pointer",
                  margin: 0,
                }}
              >
                <input
                  type="checkbox"
                  name="whatsappOptIn"
                  checked={formData.whatsappOptIn}
                  onChange={handleChange}
                  style={{
                    width: "18px",
                    height: "18px",
                    accentColor: "#25D366",
                    cursor: "pointer",
                    marginTop: "2px",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#2E2927",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <MessageSquare size={16} color={formData.whatsappOptIn ? "#25D366" : "#766C67"} />
                    I agree to receive WhatsApp notifications about my event bookings.
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#766C67",
                      display: "block",
                      marginTop: "4px",
                      lineHeight: "1.4",
                    }}
                  >
                    Receive instant booking confirmations, schedules, and celebration milestone alerts via WhatsApp. You can enable or disable this preference at any time.
                  </span>
                </div>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: formData.whatsappOptIn ? "#E8F9EE" : "#F0ECE1",
                    color: formData.whatsappOptIn ? "#25D366" : "#766C67",
                  }}
                >
                  {formData.whatsappOptIn ? "Consent Granted (Opted In)" : "Consent Not Provided (Opted Out)"}
                </span>
              </div>

              <div style={{ display: "flex", gap: "18px", flexWrap: "wrap", marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed #E7DED5" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    name="whatsappEnabled"
                    checked={formData.whatsappEnabled}
                    disabled={!formData.whatsappOptIn}
                    onChange={handleChange}
                    style={{ accentColor: "#25D366" }}
                  />
                  <span>Enable WhatsApp Notifications</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    name="inAppEnabled"
                    checked={formData.inAppEnabled}
                    onChange={handleChange}
                    style={{ accentColor: "#304B35" }}
                  />
                  <span>Enable In-App Notifications</span>
                </label>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                className="vendor-primary-button"
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 24px" }}
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;

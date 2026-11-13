import { useState } from "react";
import {
  UserRound,
  Mail,
  Phone,
  MapPin,
  Building2,
  BriefcaseBusiness,
  Save,
  Pencil,
  Camera,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import "./VendorProfile.css";

const VendorProfile = () => {
  const { currentUser, updateProfile } = useAuth();
  const currentVendor = currentUser || {};

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    name: currentVendor.fullName || currentVendor.name || "",
    businessName: currentVendor.businessName || "",
    email: currentVendor.email || "",
    phone: currentVendor.phone || "",
    whatsappNumber: currentVendor.whatsappNumber || currentVendor.phone || "",
    whatsappOptIn: currentVendor.whatsappOptIn === true,
    whatsappEnabled: currentVendor.whatsappEnabled === true,
    inAppEnabled: currentVendor.inAppEnabled !== false,
    location: currentVendor.location || "",
    serviceType: currentVendor.serviceType || "",
    description: currentVendor.bio || currentVendor.description || "",
    profileImage: currentVendor.profileImage || "",
  });

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setProfile((previous) => {
      const nextVal = type === "checkbox" ? checked : value;
      const updated = { ...previous, [name]: nextVal };
      if (name === "whatsappOptIn") {
        updated.whatsappEnabled = nextVal ? true : false;
      }
      if (name === "phone" && !previous.whatsappNumber) {
        updated.whatsappNumber = nextVal;
      }
      return updated;
    });
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile((previous) => ({
        ...previous,
        profileImage: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setProfile((previous) => ({
      ...previous,
      profileImage: "",
    }));
  };

  const handleSave = async () => {
    const phoneVal = profile.whatsappNumber || profile.phone;
    if (phoneVal) {
      let digits = String(phoneVal).replace(/\D/g, "");
      if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
      else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
      if (digits.length !== 10) {
        alert(`Phone number must be exactly 10 digits (currently ${digits.length} digits).`);
        return;
      }
    }
    setSaving(true);
    try {
      await updateProfile({
        fullName: profile.name,
        businessName: profile.businessName,
        phone: profile.phone,
        whatsappNumber: profile.whatsappNumber || profile.phone,
        whatsappOptIn: Boolean(profile.whatsappOptIn),
        whatsappEnabled: profile.whatsappOptIn ? Boolean(profile.whatsappEnabled) : false,
        inAppEnabled: Boolean(profile.inAppEnabled),
        location: profile.location,
        serviceType: profile.serviceType,
        bio: profile.description,
        profileImage: profile.profileImage,
      });

      setIsEditing(false);
    } catch (err) {
      alert(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setProfile({
      name: currentVendor.fullName || currentVendor.name || "",
      businessName: currentVendor.businessName || "",
      email: currentVendor.email || "",
      phone: currentVendor.phone || "",
      whatsappNumber: currentVendor.whatsappNumber || currentVendor.phone || "",
      whatsappOptIn: currentVendor.whatsappOptIn === true,
      whatsappEnabled: currentVendor.whatsappEnabled === true,
      inAppEnabled: currentVendor.inAppEnabled !== false,
      location: currentVendor.location || "",
      serviceType: currentVendor.serviceType || "",
      description: currentVendor.bio || currentVendor.description || "",
      profileImage: currentVendor.profileImage || "",
    });
    setIsEditing(false);
  };

  const vendorInitial = profile.name
    ? profile.name.charAt(0).toUpperCase()
    : "V";

  return (
    <div className="vendor-profile-page">
      {/* ================= HEADER ================= */}
      <div className="vendor-profile-header">
        <div>
          <span className="vendor-section-label">VENDOR PORTAL</span>
          <h1>My Profile</h1>
          <p>Manage your vendor information and business details.</p>
        </div>

        {!isEditing && (
          <button
            type="button"
            className="vendor-profile-edit-btn"
            onClick={() => setIsEditing(true)}
          >
            <Pencil size={15} />
            Edit Profile
          </button>
        )}
      </div>

      {/* ================= PROFILE CONTENT ================= */}
      <div className="vendor-profile-grid">
        {/* ================= LEFT PROFILE CARD ================= */}
        <section className="vendor-profile-card vendor-profile-main">
          {/* PROFILE IMAGE */}
          <div className="vendor-profile-image-section">
            <div className="vendor-profile-avatar">
              {profile.profileImage ? (
                <img
                  src={profile.profileImage}
                  alt={profile.name || "Vendor"}
                  className="vendor-profile-image"
                />
              ) : (
                <span>{vendorInitial}</span>
              )}
            </div>

            {isEditing && (
              <div className="vendor-photo-actions">
                <label
                  htmlFor="vendor-profile-image"
                  className="vendor-change-photo"
                >
                  <Camera size={15} />
                  Change Photo
                </label>

                <input
                  id="vendor-profile-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  hidden
                />

                {profile.profileImage && (
                  <button
                    type="button"
                    className="vendor-remove-photo"
                    onClick={handleRemoveImage}
                  >
                    <Trash2 size={15} />
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>

          <h2>{profile.name || "Vendor"}</h2>
          <span className="vendor-profile-role">EVORA Verified Vendor</span>

          <p className="vendor-profile-description">
            {profile.description ||
              "Complete your profile to help event organizers know more about your business and services."}
          </p>
        </section>

        {/* ================= DETAILS CARD ================= */}
        <section className="vendor-profile-card">
          <div className="vendor-card-heading">
            <div>
              <span className="vendor-section-label">BUSINESS INFORMATION</span>
              <h2>Vendor Details</h2>
            </div>
          </div>

          <div className="vendor-profile-form">
            {/* NAME */}
            <div className="vendor-profile-field">
              <label>
                <UserRound size={14} />
                Vendor Name
              </label>
              <input
                type="text"
                name="name"
                value={profile.name}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Enter your name"
              />
            </div>

            {/* BUSINESS NAME */}
            <div className="vendor-profile-field">
              <label>
                <Building2 size={14} />
                Business Name
              </label>
              <input
                type="text"
                name="businessName"
                value={profile.businessName}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Enter your business name"
              />
            </div>

            {/* EMAIL */}
            <div className="vendor-profile-field">
              <label>
                <Mail size={14} />
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={profile.email}
                disabled
                placeholder="Enter your email"
              />
            </div>

            {/* PHONE */}
            <div className="vendor-profile-field">
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Phone size={14} />
                  Phone Number
                </span>
                <span style={{ fontSize: "11px", color: profile.whatsappOptIn && profile.whatsappEnabled ? "#25D366" : "#766C67", background: profile.whatsappOptIn && profile.whatsappEnabled ? "#E8F9EE" : "#F0ECE1", padding: "1px 6px", borderRadius: "8px", fontWeight: 700 }}>
                  {profile.whatsappOptIn && profile.whatsappEnabled ? "WhatsApp Enabled" : "WhatsApp Inactive"}
                </span>
              </label>
              <input
                type="tel"
                name="whatsappNumber"
                value={profile.whatsappNumber}
                onChange={(e) => {
                  const val = e.target.value;
                  setProfile((prev) => ({ ...prev, whatsappNumber: val, phone: val }));
                }}
                disabled={!isEditing}
                placeholder="+91 90123 45678"
              />
              <span style={{ fontSize: "11px", color: "#8B7355", marginTop: "4px", display: "block" }}>
                Client booking requests and quote approvals are sent automatically when opted in.
              </span>
            </div>

            {/* LOCATION */}
            <div className="vendor-profile-field">
              <label>
                <MapPin size={14} />
                Location
              </label>
              <input
                type="text"
                name="location"
                value={profile.location}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Enter your location"
              />
            </div>

            {/* SERVICE TYPE */}
            <div className="vendor-profile-field">
              <label>
                <BriefcaseBusiness size={14} />
                Service Type
              </label>
              <select
                name="serviceType"
                value={profile.serviceType}
                onChange={handleChange}
                disabled={!isEditing}
              >
                <option value="">Select service type</option>
                <option value="Catering">Catering</option>
                <option value="Decoration">Decoration</option>
                <option value="Photography">Photography</option>
                <option value="Videography">Videography</option>
                <option value="Venue">Venue</option>
                <option value="Makeup & Beauty">Makeup & Beauty</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Transportation">Transportation</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* DESCRIPTION */}
            <div className="vendor-profile-field vendor-profile-full">
              <label>Business Description</label>
              <textarea
                name="description"
                value={profile.description}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="Tell event organizers about your services..."
                rows="5"
              />
            </div>

            {/* NOTIFICATION PREFERENCES */}
            <div
              className="vendor-profile-field vendor-profile-full"
              style={{
                background: "#FAF6EE",
                border: "1px solid #E7DED5",
                borderRadius: "12px",
                padding: "16px",
              }}
            >
              <label style={{ marginBottom: "10px", display: "block", fontWeight: 700, color: "#2B1D12" }}>
                Automated Notification Preferences
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: isEditing ? "pointer" : "default", margin: 0 }}>
                  <input
                    type="checkbox"
                    name="whatsappOptIn"
                    checked={Boolean(profile.whatsappOptIn)}
                    onChange={handleChange}
                    disabled={!isEditing}
                    style={{
                      width: "18px",
                      height: "18px",
                      minWidth: "18px",
                      minHeight: "18px",
                      accentColor: "#8C6435",
                      cursor: isEditing ? "pointer" : "default",
                      margin: 0,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: "#3B2F27" }}>I consent to receive automated WhatsApp alerts for service requests & bookings (Opt-in)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: isEditing ? "pointer" : "default", margin: 0 }}>
                  <input
                    type="checkbox"
                    name="whatsappEnabled"
                    checked={Boolean(profile.whatsappEnabled)}
                    onChange={handleChange}
                    disabled={!isEditing || !profile.whatsappOptIn}
                    style={{
                      width: "18px",
                      height: "18px",
                      minWidth: "18px",
                      minHeight: "18px",
                      accentColor: "#8C6435",
                      cursor: isEditing ? "pointer" : "default",
                      margin: 0,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: "#3B2F27" }}>Enable WhatsApp Notifications</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: isEditing ? "pointer" : "default", margin: 0 }}>
                  <input
                    type="checkbox"
                    name="inAppEnabled"
                    checked={Boolean(profile.inAppEnabled)}
                    onChange={handleChange}
                    disabled={!isEditing}
                    style={{
                      width: "18px",
                      height: "18px",
                      minWidth: "18px",
                      minHeight: "18px",
                      accentColor: "#8C6435",
                      cursor: isEditing ? "pointer" : "default",
                      margin: 0,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ color: "#3B2F27" }}>Enable In-App Notifications</span>
                </label>
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          {isEditing && (
            <div className="vendor-profile-actions">
              <button
                type="button"
                className="vendor-profile-cancel"
                onClick={handleCancel}
              >
                Cancel
              </button>

              <button
                type="button"
                className="vendor-profile-save"
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={15} />
                {saving ? "Saving…" : "Save Profile"}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default VendorProfile;

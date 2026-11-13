import { useState, useEffect } from "react";
import {
  Bell,
  Mail,
  MapPin,
  Lock,
  ShieldCheck,
  Save,
  RotateCcw,
  MessageCircle,
} from "lucide-react";
import { notificationsAPI } from "../../services/api";
import { useAuth } from "../../context/useAuth";

import "./VendorSettings.css";

const SETTINGS_KEY = "evoraVendorSettings";

const defaultSettings = {
  emailNotifications: true,
  bookingNotifications: true,
  requestNotifications: true,
  marketingEmails: false,
  locationServices: true,
  profileVisibility: true,
};

const VendorSettings = () => {
  const { updateProfile } = useAuth();
  const [settings, setSettings] = useState(() => {
    try {
      const savedSettings = localStorage.getItem(SETTINGS_KEY);

      if (savedSettings) {
        return {
          ...defaultSettings,
          ...JSON.parse(savedSettings),
        };
      }
    } catch {
      return defaultSettings;
    }

    return defaultSettings;
  });

  const [waPrefs, setWaPrefs] = useState({
    whatsappOptIn: false,
    whatsappEnabled: false,
    whatsappNumber: "",
    inAppEnabled: true,
  });

  useEffect(() => {
    notificationsAPI
      .getPreferences()
      .then((res) => {
        if (res?.preferences) {
          setWaPrefs({
            whatsappOptIn: Boolean(res.preferences.whatsappOptIn),
            whatsappEnabled: Boolean(res.preferences.whatsappEnabled),
            whatsappNumber: res.preferences.whatsappNumber || "",
            inAppEnabled: res.preferences.inAppEnabled !== false,
          });
        }
      })
      .catch(() => {});
  }, []);

  const [saved, setSaved] = useState(false);

  const handleChange = (name, value) => {
    setSettings((previous) => ({
      ...previous,
      [name]: value,
    }));

    setSaved(false);
  };

  const handleSave = async () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    try {
      await notificationsAPI.updatePreferences({
        whatsappOptIn: waPrefs.whatsappOptIn,
        whatsappEnabled: waPrefs.whatsappOptIn ? waPrefs.whatsappEnabled : false,
        whatsappNumber: waPrefs.whatsappNumber,
        inAppEnabled: waPrefs.inAppEnabled,
      });
      await updateProfile({
        whatsappOptIn: waPrefs.whatsappOptIn,
        whatsappEnabled: waPrefs.whatsappOptIn ? waPrefs.whatsappEnabled : false,
        whatsappNumber: waPrefs.whatsappNumber,
        inAppEnabled: waPrefs.inAppEnabled,
      }).catch(() => {});
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to save notification preferences.");
      return;
    }

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

  const handleReset = () => {
    setSettings(defaultSettings);

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));

    setSaved(false);
  };

  return (
    <div className="vendor-settings-page">
      <div className="vendor-settings-header">
        <div>
          <span className="vendor-section-label">VENDOR PORTAL</span>

          <h1>Settings</h1>

          <p>Manage your notifications, privacy and account preferences.</p>
        </div>

        <div className="vendor-settings-actions">
          <button
            type="button"
            className="vendor-settings-reset"
            onClick={handleReset}
          >
            <RotateCcw size={15} />
            Reset
          </button>

          <button
            type="button"
            className="vendor-settings-save"
            onClick={handleSave}
          >
            <Save size={15} />
            Save Changes
          </button>
        </div>
      </div>

      {saved && (
        <div className="vendor-settings-success">
          <ShieldCheck size={17} />
          Your settings have been saved successfully.
        </div>
      )}

      <div className="vendor-settings-grid">
        {/* ================= NOTIFICATIONS ================= */}

        <section className="vendor-settings-card">
          <div className="vendor-settings-card-header">
            <div className="vendor-settings-icon">
              <Bell size={19} />
            </div>

            <div>
              <h2>Notifications</h2>

              <p>Choose which updates you want to receive.</p>
            </div>
          </div>

          <div className="vendor-settings-options">
            <SettingToggle
              icon={<MessageCircle size={16} />}
              title="WhatsApp Consent (Opt-In)"
              description="I agree to receive automated WhatsApp alerts for incoming requests and bookings."
              checked={waPrefs.whatsappOptIn}
              onChange={(value) => {
                setWaPrefs((p) => ({
                  ...p,
                  whatsappOptIn: value,
                  whatsappEnabled: value ? true : false,
                }));
                setSaved(false);
              }}
            />

            <SettingToggle
              icon={<MessageCircle size={16} />}
              title="WhatsApp Notifications Enabled"
              description="Send automated WhatsApp messages to your registered number when opted in."
              checked={waPrefs.whatsappEnabled}
              onChange={(value) => {
                if (value && !waPrefs.whatsappOptIn) return;
                setWaPrefs((p) => ({ ...p, whatsappEnabled: value }));
                setSaved(false);
              }}
            />

            <div style={{ padding: "8px 0" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                Registered WhatsApp Number
              </label>
              <input
                type="tel"
                value={waPrefs.whatsappNumber}
                onChange={(e) => {
                  setWaPrefs((p) => ({ ...p, whatsappNumber: e.target.value }));
                  setSaved(false);
                }}
                placeholder="+91 98765 43210"
                style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #E2D9CE" }}
              />
            </div>

            <SettingToggle
              icon={<Bell size={16} />}
              title="In-App Notifications"
              description="Show real-time alerts inside the EVORA Notifications portal."
              checked={waPrefs.inAppEnabled}
              onChange={(value) => {
                setWaPrefs((p) => ({ ...p, inAppEnabled: value }));
                setSaved(false);
              }}
            />

            <SettingToggle
              icon={<Mail size={16} />}
              title="Email Notifications"
              description="Receive important EVORA updates by email."
              checked={settings.emailNotifications}
              onChange={(value) => handleChange("emailNotifications", value)}
            />

            <SettingToggle
              icon={<Bell size={16} />}
              title="Booking Notifications"
              description="Get notified about changes to your event bookings."
              checked={settings.bookingNotifications}
              onChange={(value) => handleChange("bookingNotifications", value)}
            />

            <SettingToggle
              icon={<Bell size={16} />}
              title="Event Request Notifications"
              description="Receive notifications when you get a new event request."
              checked={settings.requestNotifications}
              onChange={(value) => handleChange("requestNotifications", value)}
            />

            <SettingToggle
              icon={<Mail size={16} />}
              title="Marketing Emails"
              description="Receive EVORA tips, updates and promotional information."
              checked={settings.marketingEmails}
              onChange={(value) => handleChange("marketingEmails", value)}
            />
          </div>
        </section>

        {/* ================= PRIVACY & SECURITY ================= */}

        <section className="vendor-settings-card">
          <div className="vendor-settings-card-header">
            <div className="vendor-settings-icon">
              <ShieldCheck size={19} />
            </div>

            <div>
              <h2>Privacy & Security</h2>

              <p>Control your profile visibility and privacy preferences.</p>
            </div>
          </div>

          <div className="vendor-settings-options">
            <SettingToggle
              icon={<MapPin size={16} />}
              title="Location Services"
              description="Allow EVORA to use your location for relevant nearby events."
              checked={settings.locationServices}
              onChange={(value) => handleChange("locationServices", value)}
            />

            <SettingToggle
              icon={<ShieldCheck size={16} />}
              title="Public Vendor Profile"
              description="Allow event organizers to discover your vendor profile."
              checked={settings.profileVisibility}
              onChange={(value) => handleChange("profileVisibility", value)}
            />

            <div className="vendor-settings-row">
              <div className="vendor-settings-row-icon">
                <Lock size={16} />
              </div>

              <div className="vendor-settings-row-content">
                <strong>Password</strong>

                <span>Change your EVORA account password.</span>
              </div>

              <button
                type="button"
                className="vendor-settings-small-btn"
                onClick={() =>
                  alert(
                    "Password change will be connected to the backend later.",
                  )
                }
              >
                Change
              </button>
            </div>
          </div>
        </section>

        {/* ================= ACCOUNT ================= */}

        <section className="vendor-settings-card vendor-settings-account">
          <div className="vendor-settings-card-header">
            <div className="vendor-settings-icon">
              <Lock size={19} />
            </div>

            <div>
              <h2>Account</h2>

              <p>Manage your EVORA vendor account.</p>
            </div>
          </div>

          <div className="vendor-account-info">
            <div>
              <span>Account Type</span>

              <strong>Vendor Partner</strong>
            </div>

            <div>
              <span>Account Status</span>

              <strong className="vendor-active-status">Active</strong>
            </div>
          </div>

          <button
            type="button"
            className="vendor-danger-button"
            onClick={() =>
              alert("Account deletion will be connected to the backend later.")
            }
          >
            Delete Account
          </button>
        </section>
      </div>
    </div>
  );
};

const SettingToggle = ({ icon, title, description, checked, onChange }) => {
  return (
    <div className="vendor-settings-row">
      <div className="vendor-settings-row-icon">{icon}</div>

      <div className="vendor-settings-row-content">
        <strong>{title}</strong>

        <span>{description}</span>
      </div>

      <button
        type="button"
        className={`vendor-settings-toggle ${checked ? "active" : ""}`}
        onClick={() => onChange(!checked)}
        aria-label={title}
      >
        <span />
      </button>
    </div>
  );
};

export default VendorSettings;

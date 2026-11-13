import { useState, useEffect } from "react";
import {
  Bell,
  ClipboardList,
  CheckCircle2,
  XCircle,
  MessageCircle,
  AlertTriangle,
  Clock,
  SlidersHorizontal,
  RefreshCw,
} from "lucide-react";
import { notificationsAPI } from "../../services/api";
import { useToast } from "../../context/ToastContext";

const STATUS_STYLES = {
  Queued: { bg: "#EEF4FF", color: "#2753A7", border: "#C4D7FF", label: "Queued" },
  Sent: { bg: "#EBF9F0", color: "#1B7A43", border: "#A7E3BF", label: "Sent" },
  Delivered: { bg: "#E6F7ED", color: "#146C38", border: "#8ADBA9", label: "Delivered" },
  Read: { bg: "#E0F4F1", color: "#0D6E6E", border: "#8BD3CC", label: "Read" },
  Failed: { bg: "#FFF0F0", color: "#B42318", border: "#F9C6C6", label: "Failed" },
  Skipped: { bg: "#F5F5F4", color: "#57534E", border: "#D6D3D1", label: "Skipped" },
  "Simulated (Demo)": { bg: "#FFF4E5", color: "#9A5B00", border: "#FFE0B2", label: "Simulated (Demo)" },
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [mode, setMode] = useState("");
  const [loading, setLoading] = useState(true);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefs, setPrefs] = useState({
    whatsappOptIn: false,
    whatsappEnabled: false,
    whatsappNumber: "",
    maskedWhatsappNumber: "Not set",
    inAppEnabled: true,
  });
  const toast = useToast();

  const loadNotifications = async () => {
    try {
      const [notifRes, prefRes] = await Promise.all([
        notificationsAPI.getWithMeta(),
        notificationsAPI.getPreferences().catch(() => null),
      ]);
      setNotifications(notifRes?.notifications || []);
      const resolvedMode = notifRes?.mode || prefRes?.mode;
      if (resolvedMode) setMode(resolvedMode);
      if (prefRes?.preferences) setPrefs(prefRes.preferences);
    } catch (err) {
      console.error("Notifications load error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleSavePrefs = async (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      const res = await notificationsAPI.updatePreferences({
        whatsappOptIn: prefs.whatsappOptIn,
        whatsappEnabled: prefs.whatsappOptIn ? prefs.whatsappEnabled : false,
        whatsappNumber: prefs.whatsappNumber,
        inAppEnabled: prefs.inAppEnabled,
      });
      if (res?.mode) setMode(res.mode);
      if (res?.preferences) setPrefs(res.preferences);
      toast.success("Preferences Saved", "Your notification preferences have been updated.");
      setShowPrefs(false);
    } catch (err) {
      toast.error("Save Failed", err.response?.data?.message || err.message || "Could not update preferences.");
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleTestWhatsApp = async () => {
    setTestingWhatsApp(true);
    try {
      const res = await notificationsAPI.testWhatsApp();
      if (res.success) {
        toast.whatsapp(
          res.mode === "demo" ? "Simulated WhatsApp Test Recorded" : "WhatsApp Test Dispatched",
          res.message || `Status: ${res.deliveryStatus} (${res.maskedPhone})`
        );
        loadNotifications();
      } else {
        toast.error("WhatsApp Dispatch Failed", res.failureReason || res.message || "Delivery failed.");
        loadNotifications();
      }
    } catch (err) {
      toast.error("WhatsApp Error", err.response?.data?.message || err.message || "Failed to trigger test alert.");
    } finally {
      setTestingWhatsApp(false);
    }
  };

  const getIcon = (type, channel, deliveryStatus) => {
    if (deliveryStatus === "Failed") return AlertTriangle;
    if (type === "whatsapp" || channel === "whatsapp" || channel === "both") return MessageCircle;
    if (type === "success") return CheckCircle2;
    if (type === "warning" || type === "alert") return XCircle;
    return ClipboardList;
  };

  if (loading) {
    return (
      <div className="vendor-page" style={{ textAlign: "center", padding: 50, color: "#8B7355" }}>
        Loading notifications…
      </div>
    );
  }

  return (
    <div className="vendor-page">
      <div className="vendor-page-header">
        <div>
          <span className="vendor-page-label">COMMUNICATION & UPDATES</span>
          <h1>Notifications & Automated WhatsApp Alerts</h1>
          <p>
            In-app updates and backend-dispatched WhatsApp delivery tracking (
            {mode === "live"
              ? "Live Business API"
              : mode === "demo"
                ? "Demo Simulation Mode"
                : "Connecting to Backend..."}
            ).
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="vendor-secondary-button"
            onClick={() => setShowPrefs((v) => !v)}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <SlidersHorizontal size={14} />
            Preferences
          </button>

          <button
            type="button"
            className="vendor-secondary-button"
            onClick={loadNotifications}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            title="Refresh delivery statuses"
          >
            <RefreshCw size={14} />
            Refresh
          </button>

          <button
            type="button"
            className="vendor-primary-button"
            onClick={handleTestWhatsApp}
            disabled={testingWhatsApp}
            style={{
              background: "#25D366",
              borderColor: "#25D366",
              color: "#FFF",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              fontSize: "13px",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(37,211,102,0.3)",
            }}
          >
            <MessageCircle size={15} />
            {testingWhatsApp ? "Sending…" : "Test WhatsApp Alert"}
          </button>

          {notifications.length > 0 && (
            <button
              type="button"
              className="vendor-secondary-button"
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Preferences Summary Banner */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#FAF6EE",
          border: "1px solid #E7DED5",
          borderRadius: "10px",
          padding: "12px 16px",
          marginBottom: "18px",
          fontSize: "12px",
          color: "#4A3B32",
        }}
      >
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center" }}>
          <span>
            <strong>WhatsApp Consent:</strong>{" "}
            <span style={{ color: prefs.whatsappOptIn ? "#1E8E46" : "#B42318", fontWeight: 700 }}>
              {prefs.whatsappOptIn ? "Opted In" : "Not Opted In"}
            </span>
          </span>
          <span>
            <strong>WhatsApp Alerts:</strong>{" "}
            <span style={{ color: prefs.whatsappEnabled ? "#1E8E46" : "#766C67", fontWeight: 700 }}>
              {prefs.whatsappEnabled ? "Enabled" : "Disabled"}
            </span>
          </span>
          <span>
            <strong>Registered Number:</strong> {prefs.maskedWhatsappNumber || "Not set"}
          </span>
          <span>
            <strong>In-App Alerts:</strong> {prefs.inAppEnabled ? "Enabled" : "Disabled"}
          </span>
        </div>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "999px",
            background: mode === "live" ? "#E6F7ED" : "#FFF4E5",
            color: mode === "live" ? "#146C38" : "#9A5B00",
          }}
        >
          {mode === "live" ? "LIVE MODE" : mode === "demo" ? "DEMO MODE" : "MODE UNKNOWN"}
        </span>
      </div>

      {/* Inline Preferences Editor */}
      {showPrefs && (
        <form
          onSubmit={handleSavePrefs}
          style={{
            background: "#FFFDF9",
            border: "1px solid #E7DED5",
            borderRadius: "12px",
            padding: "18px",
            marginBottom: "20px",
            display: "grid",
            gap: "12px",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "15px", color: "#2B1D12" }}>Notification Preferences</h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                Registered WhatsApp Number (E.164)
              </label>
              <input
                type="tel"
                value={prefs.whatsappNumber || ""}
                onChange={(e) => setPrefs((p) => ({ ...p, whatsappNumber: e.target.value }))}
                placeholder="+91 98765 43210"
                style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #D9CFC5" }}
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={Boolean(prefs.whatsappOptIn)}
                onChange={(e) =>
                  setPrefs((p) => ({
                    ...p,
                    whatsappOptIn: e.target.checked,
                    whatsappEnabled: e.target.checked ? p.whatsappEnabled : false,
                  }))
                }
              />
              <span>I consent to receive automated WhatsApp alerts (Opt-in)</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={Boolean(prefs.whatsappEnabled)}
                disabled={!prefs.whatsappOptIn}
                onChange={(e) => setPrefs((p) => ({ ...p, whatsappEnabled: e.target.checked }))}
              />
              <span>Enable WhatsApp notifications</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={Boolean(prefs.inAppEnabled)}
                onChange={(e) => setPrefs((p) => ({ ...p, inAppEnabled: e.target.checked }))}
              />
              <span>Enable In-App notifications</span>
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <button type="button" className="vendor-secondary-button" onClick={() => setShowPrefs(false)}>
              Cancel
            </button>
            <button type="submit" className="vendor-primary-button" disabled={savingPrefs}>
              {savingPrefs ? "Saving…" : "Save Preferences"}
            </button>
          </div>
        </form>
      )}

      {notifications.length === 0 ? (
        <div className="vendor-large-empty">
          <div className="vendor-large-empty-icon">
            <Bell size={32} />
          </div>
          <h2>No notifications yet</h2>
          <p>
            Event confirmations, vendor requests, duty assignments, and automated WhatsApp statuses will appear here.
          </p>
        </div>
      ) : (
        <div className="vendor-notifications-list">
          {notifications.map((notification) => {
            const notifId = notification._id || notification.id;
            const isWhatsApp =
              notification.channel === "whatsapp" ||
              notification.channel === "both" ||
              notification.type === "whatsapp";
            const status = notification.deliveryStatus;
            const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.Queued;
            const Icon = getIcon(notification.type, notification.channel, status);
            const read = notification.isRead;
            const maskedRecipient = notification.maskedPhone || notification.customerPhone || notification.phone;
            const timestamp = notification.sentAt || notification.createdAt;

            return (
              <div
                className={`vendor-notification-card ${read ? "read" : "unread"}`}
                key={notifId}
                onClick={() => handleMarkAsRead(notifId)}
                style={{
                  borderLeft: status === "Failed"
                    ? "4px solid #D92D20"
                    : isWhatsApp
                      ? "4px solid #25D366"
                      : undefined,
                }}
              >
                <div
                  className="vendor-notification-icon"
                  style={{
                    color: status === "Failed" ? "#B42318" : isWhatsApp ? "#25D366" : undefined,
                    background: status === "Failed" ? "#FFF0F0" : isWhatsApp ? "#EAF8EF" : undefined,
                  }}
                >
                  <Icon size={18} />
                </div>

                <div className="vendor-notification-content" style={{ width: "100%" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                      <h2 style={{ margin: 0, fontSize: "15px", color: "#2B1D12" }}>{notification.title}</h2>
                      {isWhatsApp && status && status !== "Not Applicable" && (
                        <span
                          style={{
                            fontSize: "10px",
                            background: statusStyle.bg,
                            color: statusStyle.color,
                            border: `1px solid ${statusStyle.border}`,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "10px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <MessageCircle size={10} />
                          {statusStyle.label}
                        </span>
                      )}
                    </div>

                    <p style={{ margin: "0 0 8px", color: "#6B5240", fontSize: "13px", lineHeight: 1.5, whiteSpace: "pre-line" }}>
                      {notification.message}
                    </p>

                    {status === "Failed" && notification.failureReason && (
                      <div
                        style={{
                          background: "#FFF5F5",
                          border: "1px solid #F9C6C6",
                          color: "#B42318",
                          borderRadius: "8px",
                          padding: "8px 10px",
                          fontSize: "12px",
                          marginBottom: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <AlertTriangle size={14} />
                        <span>
                          <strong>Delivery Failure:</strong> {notification.failureReason}
                          {notification.errorCode ? ` (Code: ${notification.errorCode})` : ""}
                        </span>
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "6px" }}>
                      {isWhatsApp && maskedRecipient && (
                        <span style={{ fontSize: "11px", color: "#1E8E46", background: "#EBF9F0", padding: "2px 8px", borderRadius: "6px", fontWeight: 600 }}>
                          📱 To: {maskedRecipient}
                        </span>
                      )}
                      {notification.eventName && (
                        <span style={{ fontSize: "11px", color: "#6A3805", background: "#FDF0D5", padding: "2px 8px", borderRadius: "6px", fontWeight: 600 }}>
                          🎉 {notification.eventName}
                        </span>
                      )}
                      {notification.bookingRef && (
                        <span style={{ fontSize: "11px", color: "#2B4C7E", background: "#EBF2FA", padding: "2px 8px", borderRadius: "6px", fontWeight: 600 }}>
                          📋 {notification.bookingRef}
                        </span>
                      )}
                      {timestamp && (
                        <span style={{ fontSize: "11px", color: "#766C67", background: "#F7F6F4", padding: "2px 8px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Clock size={11} />
                          {notification.sentAt ? "Sent " : ""}
                          {new Date(timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                      )}
                      {notification.deliveredAt && (
                        <span style={{ fontSize: "11px", color: "#146C38", background: "#E6F7ED", padding: "2px 8px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircle2 size={11} />
                          Delivered {new Date(notification.deliveredAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                      )}
                      {notification.readAt && (
                        <span style={{ fontSize: "11px", color: "#0D6E6E", background: "#E0F4F1", padding: "2px 8px", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircle2 size={11} />
                          Read {new Date(notification.readAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="vendor-notification-status">
                    {read ? "Read" : "New"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;

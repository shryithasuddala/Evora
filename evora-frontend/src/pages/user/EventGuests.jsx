import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  MessageCircle,
  Copy,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { guestsAPI, eventsAPI } from "../../services/api";
import { useToast } from "../../context/ToastContext";

const EventGuests = () => {
  const { id } = useParams();
  const toast = useToast();

  const [event, setEvent] = useState(null);
  const [guests, setGuests] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    confirmed: 0,
    declined: 0,
    pending: 0,
    maybe: 0,
    totalPlusOnes: 0,
    expectedHeadcount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [shareDialogGuest, setShareDialogGuest] = useState(null);

  // Add guest form
  const [newGuest, setNewGuest] = useState({
    name: "",
    email: "",
    phone: "",
    group: "Friends",
    plusOnes: 0,
  });

  // Batch import text
  const [importText, setImportText] = useState("");

  const loadData = async () => {
    try {
      const [ev, guestRes] = await Promise.all([
        eventsAPI.getOne(id),
        guestsAPI.getEventGuests(id),
      ]);
      setEvent(ev);
      setGuests(guestRes.data || []);
      setSummary(guestRes.summary || {});
    } catch (err) {
      toast.error("Error", err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAddGuest = async (e) => {
    e.preventDefault();
    if (!newGuest.name.trim()) return;
    try {
      await guestsAPI.addGuest(id, newGuest);
      toast.success("Guest Added", `${newGuest.name} has been added to your guest list.`);
      setShowAddModal(false);
      setNewGuest({ name: "", email: "", phone: "", group: "Friends", plusOnes: 0 });
      loadData();
    } catch (err) {
      toast.error("Failed to add guest", err.response?.data?.message || err.message);
    }
  };

  const handleBatchImport = async (e) => {
    e.preventDefault();
    const lines = importText.split("\n").filter((l) => l.trim().length > 0);
    const parsed = lines.map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      return {
        name: parts[0] || "",
        phone: parts[1] || "",
        email: parts[2] || "",
        group: parts[3] || "General Guests",
      };
    }).filter((g) => g.name);

    if (parsed.length === 0) {
      toast.error("No valid guests found", "Please provide at least one name per line.");
      return;
    }

    try {
      await guestsAPI.importGuests(id, parsed);
      toast.success("Import Successful", `Added ${parsed.length} guests.`);
      setShowImportModal(false);
      setImportText("");
      loadData();
    } catch (err) {
      toast.error("Import failed", err.response?.data?.message || err.message);
    }
  };

  const handleDeleteGuest = async (guestId, name) => {
    if (!window.confirm(`Remove ${name} from your guest list?`)) return;
    try {
      await guestsAPI.deleteGuest(id, guestId);
      toast.info("Guest Removed", `${name} was removed.`);
      loadData();
    } catch (err) {
      toast.error("Error", err.message);
    }
  };

  const handlePrepareInvite = async (guest) => {
    try {
      const res = await guestsAPI.sendInvite(id, guest._id);
      setShareDialogGuest({
        guest: res.guest || guest,
        rsvpLink: res.rsvpLink,
        whatsappUrl: res.whatsappUrl,
      });
      loadData();
    } catch (err) {
      toast.error("Could not prepare invite", err.message);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Link Copied", "RSVP link copied to clipboard.");
  };

  if (loading) {
    return (
      <div className="vendor-content" style={{ textAlign: "center", padding: "50px", color: "#8B7355" }}>
        Loading guest list…
      </div>
    );
  }

  return (
    <div className="vendor-content">
      <div style={{ marginBottom: "20px" }}>
        <Link
          to={`/user/events/${id}`}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#8C6435", textDecoration: "none", fontSize: "13px", fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Back to Event Details
        </Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <div>
          <span style={{ fontSize: "11px", letterSpacing: "2px", color: "#C9A13A", fontWeight: 700, textTransform: "uppercase" }}>
            DIGITAL INVITATIONS & GUEST LIST
          </span>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "28px", color: "#2B1D12", margin: "4px 0" }}>
            {event?.title} — Guest Tracker
          </h1>
          <p style={{ color: "#766C67", fontSize: "13px", margin: 0 }}>
            Manage RSVP attendance, dietary requirements, and dispatch direct WhatsApp invitations.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="vendor-btn"
            onClick={() => setShowAddModal(true)}
          >
            <UserPlus size={16} /> Add Guest
          </button>
          <button
            type="button"
            style={{
              background: "#FAF5EA",
              border: "1px solid #D5B36A",
              color: "#2B1D12",
              padding: "10px 16px",
              borderRadius: "8px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={() => setShowImportModal(true)}
          >
            <FileSpreadsheet size={16} color="#304B35" /> Batch Import
          </button>
        </div>
      </div>

      {/* Headcount Breakdown Metrics */}
      <div className="vendor-stats-grid" style={{ marginBottom: "28px" }}>
        <div className="vendor-card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "12px", color: "#766C67", fontWeight: 600 }}>TOTAL INVITED</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#2B1D12", margin: "4px 0" }}>{summary.total}</div>
          <div style={{ fontSize: "11px", color: "#8B7355" }}>Unique invitations dispatched</div>
        </div>

        <div className="vendor-card" style={{ padding: "20px", borderLeft: "4px solid #304B35" }}>
          <div style={{ fontSize: "12px", color: "#304B35", fontWeight: 600 }}>CONFIRMED ATTENDING</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#304B35", margin: "4px 0" }}>{summary.confirmed}</div>
          <div style={{ fontSize: "11px", color: "#8B7355" }}>+ {summary.totalPlusOnes} plus-ones included</div>
        </div>

        <div className="vendor-card" style={{ padding: "20px", background: "linear-gradient(135deg, #FAF5EA, #F5ECDB)" }}>
          <div style={{ fontSize: "12px", color: "#C9A13A", fontWeight: 700 }}>EXPECTED HEADCOUNT</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#C9A13A", margin: "4px 0" }}>{summary.expectedHeadcount}</div>
          <div style={{ fontSize: "11px", color: "#8B7355" }}>Live dining catering target</div>
        </div>

        <div className="vendor-card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "12px", color: "#766C67", fontWeight: 600 }}>DECLINED / PENDING</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#B33A3A", margin: "4px 0" }}>
            {summary.declined} <span style={{ fontSize: "16px", color: "#766C67", fontWeight: 400 }}>/ {summary.pending} pending</span>
          </div>
          <div style={{ fontSize: "11px", color: "#8B7355" }}>Awaiting or declined response</div>
        </div>
      </div>

      {/* Guest Table */}
      <div className="vendor-card" style={{ padding: "24px" }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", color: "#2B1D12", margin: "0 0 16px" }}>
          Guest Attendance Directory ({guests.length})
        </h3>

        {guests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#8B7355" }}>
            <Users size={36} color="#D5B36A" style={{ marginBottom: "10px" }} />
            <p style={{ margin: 0 }}>No guests added yet. Click &quot;Add Guest&quot; or &quot;Batch Import&quot; above to invite friends and family.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "750px", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #EADBBE", textAlign: "left", color: "#766C67" }}>
                  <th style={{ padding: "12px 10px" }}>Guest Name</th>
                  <th style={{ padding: "12px 10px" }}>Group</th>
                  <th style={{ padding: "12px 10px" }}>Contact</th>
                  <th style={{ padding: "12px 10px" }}>RSVP Status</th>
                  <th style={{ padding: "12px 10px" }}>Plus-Ones</th>
                  <th style={{ padding: "12px 10px" }}>Dietary Notes</th>
                  <th style={{ padding: "12px 10px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => {
                  let badgeBg = "#FFF3E0";
                  let badgeColor = "#E65100";
                  let StatusIcon = Clock;

                  if (g.status === "Confirmed") {
                    badgeBg = "#E8F5E9";
                    badgeColor = "#2E7D32";
                    StatusIcon = CheckCircle2;
                  } else if (g.status === "Declined") {
                    badgeBg = "#FFEBEE";
                    badgeColor = "#C62828";
                    StatusIcon = XCircle;
                  }

                  return (
                    <tr key={g._id} style={{ borderBottom: "1px solid #FAF5EA" }}>
                      <td style={{ padding: "14px 10px", fontWeight: 600, color: "#2B1D12" }}>
                        {g.name}
                        {g.invitationSent && (
                          <span style={{ marginLeft: "6px", fontSize: "10px", background: "#E8F5E9", color: "#2E7D32", padding: "2px 6px", borderRadius: "4px" }}>
                            Sent
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 10px", color: "#766C67" }}>{g.group}</td>
                      <td style={{ padding: "14px 10px", color: "#6B5240", fontSize: "12px" }}>
                        {g.phone && <div>{g.phone}</div>}
                        {g.email && <div style={{ color: "#8B7355" }}>{g.email}</div>}
                        {!g.phone && !g.email && <span style={{ color: "#B0A8A0" }}>—</span>}
                      </td>
                      <td style={{ padding: "14px 10px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: badgeBg, color: badgeColor, padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>
                          <StatusIcon size={13} /> {g.status}
                        </span>
                      </td>
                      <td style={{ padding: "14px 10px", color: "#2B1D12", fontWeight: 600 }}>
                        {g.status === "Confirmed" ? `+${g.plusOnes || 0}` : "—"}
                      </td>
                      <td style={{ padding: "14px 10px", color: "#6B5240", fontSize: "12px" }}>
                        {g.dietaryNotes || "None"}
                      </td>
                      <td style={{ padding: "14px 10px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => handlePrepareInvite(g)}
                            title="Share WhatsApp / Digital Invite"
                            style={{ background: "#25D366", border: "none", color: "#FFF", padding: "6px 10px", borderRadius: "6px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600 }}
                          >
                            <MessageCircle size={13} /> Invite
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGuest(g._id, g.name)}
                            title="Delete Guest"
                            style={{ background: "transparent", border: "1px solid #F5C2C7", color: "#C62828", padding: "6px", borderRadius: "6px", cursor: "pointer" }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Share Invite Dialog Modal */}
      {shareDialogGuest && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#FFFDF9", border: "1px solid #D5B36A", borderRadius: "16px", padding: "30px", maxWidth: "480px", width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", margin: 0, color: "#2B1D12" }}>Digital Invitation Link</h3>
              <button
                type="button"
                onClick={() => setShareDialogGuest(null)}
                style={{ background: "transparent", border: "none", fontSize: "18px", cursor: "pointer", color: "#766C67" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: "13px", color: "#766C67", margin: "0 0 16px" }}>
              Personalized RSVP link created for <strong style={{ color: "#2B1D12" }}>{shareDialogGuest.guest.name}</strong>:
            </p>

            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              <input
                type="text"
                readOnly
                value={shareDialogGuest.rsvpLink}
                style={{ flex: 1, padding: "10px 12px", borderRadius: "8px", border: "1px solid #D5B36A", background: "#FAF5EA", fontSize: "12px", color: "#2B1D12" }}
              />
              <button
                type="button"
                onClick={() => copyToClipboard(shareDialogGuest.rsvpLink)}
                style={{ background: "#C9A13A", border: "none", color: "#2B1D12", padding: "10px 14px", borderRadius: "8px", fontWeight: 700, fontSize: "12px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <Copy size={14} /> Copy
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {shareDialogGuest.whatsappUrl ? (
                <a
                  href={shareDialogGuest.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: "#25D366",
                    color: "#FFF",
                    padding: "12px",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontWeight: 700,
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 12px rgba(37,211,102,0.3)",
                  }}
                >
                  <MessageCircle size={18} /> Launch WhatsApp with Invite
                </a>
              ) : (
                <p style={{ fontSize: "12px", color: "#8B7355", margin: 0, fontStyle: "italic" }}>
                  Note: Add a phone number to enable 1-click WhatsApp dispatch.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Single Guest Modal */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#FFFDF9", border: "1px solid #D5B36A", borderRadius: "16px", padding: "30px", maxWidth: "440px", width: "100%" }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", margin: "0 0 16px", color: "#2B1D12" }}>Add New Guest</h3>
            <form onSubmit={handleAddGuest}>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#2B1D12", marginBottom: "4px" }}>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={newGuest.name}
                  onChange={(e) => setNewGuest((prev) => ({ ...prev, name: e.target.value }))}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #D5B36A", background: "#FAF5EA", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#2B1D12", marginBottom: "4px" }}>Phone (for WhatsApp)</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={newGuest.phone}
                  onChange={(e) => setNewGuest((prev) => ({ ...prev, phone: e.target.value }))}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #D5B36A", background: "#FAF5EA", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#2B1D12", marginBottom: "4px" }}>Email</label>
                <input
                  type="email"
                  placeholder="guest@example.com"
                  value={newGuest.email}
                  onChange={(e) => setNewGuest((prev) => ({ ...prev, email: e.target.value }))}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #D5B36A", background: "#FAF5EA", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#2B1D12", marginBottom: "4px" }}>Cohort / Group</label>
                <select
                  value={newGuest.group}
                  onChange={(e) => setNewGuest((prev) => ({ ...prev, group: e.target.value }))}
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #D5B36A", background: "#FAF5EA", boxSizing: "border-box" }}
                >
                  <option value="Family">Family</option>
                  <option value="Friends">Friends</option>
                  <option value="VIP">VIP Guests</option>
                  <option value="Colleagues">Colleagues</option>
                  <option value="General Guests">General Guests</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ background: "transparent", border: "1px solid #D5B36A", color: "#6B5240", padding: "8px 16px", borderRadius: "8px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="vendor-btn"
                >
                  Save Guest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Import Modal */}
      {showImportModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "#FFFDF9", border: "1px solid #D5B36A", borderRadius: "16px", padding: "30px", maxWidth: "520px", width: "100%" }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", margin: "0 0 8px", color: "#2B1D12" }}>Batch Import Guests</h3>
            <p style={{ fontSize: "12px", color: "#766C67", margin: "0 0 16px" }}>
              Paste one guest per line in format: <code>Name, Phone, Email, Group</code>
            </p>

            <form onSubmit={handleBatchImport}>
              <textarea
                rows="6"
                required
                placeholder="Aarav Sharma, +91 9876543210, aarav@example.com, Family&#10;Diya Kapoor, +91 9812345678, diya@example.com, Friends"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #D5B36A", background: "#FAF5EA", boxSizing: "border-box", fontSize: "12px", fontFamily: "monospace", marginBottom: "20px" }}
              />

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  style={{ background: "transparent", border: "1px solid #D5B36A", color: "#6B5240", padding: "8px 16px", borderRadius: "8px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="vendor-btn"
                >
                  Import All
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventGuests;

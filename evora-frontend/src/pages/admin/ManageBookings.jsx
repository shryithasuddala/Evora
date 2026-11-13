import { useState, useEffect } from "react";
import { Search, ShieldCheck, CheckCircle2, Clock, XCircle, Send } from "lucide-react";
import { bookingsAPI } from "../../services/api";
import { useToast } from "../../context/ToastContext";

const STATUS_TABS = ["All", "Pending", "Proposal Sent", "Accepted", "Confirmed", "Completed", "Cancelled", "Declined"];

const ManageBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const toast = useToast();

  const loadBookings = async () => {
    try {
      const data = await bookingsAPI.getAll();
      setBookings(data || []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleGiveAssurance = async (booking) => {
    const bId = booking._id || booking.id;
    const hostName = booking.organizer || booking.organizerId?.fullName || "Host";
    const svcName = booking.serviceName || booking.serviceId?.name || "Service";

    if (!window.confirm(`Give Official EVORA Assurance to ${hostName} for "${svcName}"?\n\nThis will lock the vendor assignment, confirm the booking, and dispatch the official confirmation to the host.`)) {
      return;
    }

    setActionLoadingId(bId);
    try {
      const updated = await bookingsAPI.updateStatus(bId, "Confirmed");
      toast.success(
        "Assurance Confirmed! 🎉",
        `Official EVORA assurance dispatched to ${hostName}. The artisan is locked for this celebration.`
      );
      await loadBookings();
    } catch (err) {
      toast.error("Assurance Failed", err.message || "Failed to confirm assurance.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleForwardToVendor = async (booking) => {
    const bId = booking._id || booking.id;
    const vendorName = booking.vendorId?.businessName || booking.vendorId?.fullName || "Vendor";

    setActionLoadingId(bId);
    try {
      await bookingsAPI.updateStatus(bId, "Proposal Sent");
      toast.success(
        "Dispatched to Artisan 📨",
        `Booking requirements forwarded to ${vendorName}. Waiting for vendor acceptance.`
      );
      await loadBookings();
    } catch (err) {
      toast.error("Forwarding Failed", err.message || "Failed to forward booking.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (booking) => {
    const bId = booking._id || booking.id;
    const reason = window.prompt("Reason for declining or unavailability:", "Artisan unavailable on requested date");
    if (reason === null) return;

    setActionLoadingId(bId);
    try {
      await bookingsAPI.updateStatus(bId, "Declined");
      toast.info("Booking Declined", "The host has been notified of artisan unavailability.");
      await loadBookings();
    } catch (err) {
      toast.error("Decline Failed", err.message || "Failed to decline booking.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filtered = bookings.filter((b) => {
    const sName = b.serviceName || b.serviceId?.name || "";
    const vName = b.vendorId?.businessName || b.vendorId?.fullName || "";
    const org = b.organizer || b.organizerId?.fullName || "";
    const eName = b.eventName || b.eventId?.title || "";

    const matchesSearch =
      sName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eName.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === "All") return matchesSearch;
    return matchesSearch && b.status === statusFilter;
  });

  if (loading) {
    return (
      <div className="vendor-page" style={{ textAlign: "center", padding: 50, color: "#8B7355" }}>
        Loading platform transactions…
      </div>
    );
  }

  return (
    <div className="vendor-page">
      <div style={{ marginBottom: "24px" }}>
        <span className="vendor-welcome-label" style={{ color: "#8C6435" }}>
          ADMIN CONCIERGE & ASSURANCE CONTROL
        </span>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "32px", margin: "4px 0" }}>
          Vendor Allocation & Assurance Hub
        </h1>
        <p style={{ margin: 0, color: "#766C67" }}>
          Users connect with artisans strictly through Admin mediation. Review availability, forward inquiries, and give official EVORA assurance once the vendor accepts.
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {STATUS_TABS.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              style={{
                padding: "8px 16px",
                borderRadius: "999px",
                border: "1px solid",
                borderColor: statusFilter === st ? "#8C6435" : "#D5C2A5",
                background: statusFilter === st ? "#8C6435" : "#FFFDF9",
                color: statusFilter === st ? "#FFFFFF" : "#5C4A3A",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="login-input-wrapper" style={{ width: "280px", background: "#FFF" }}>
          <Search size={16} />
          <input
            placeholder="Search bookings, vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="vendor-card">
        <div className="table-responsive" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", width: "100%" }}>
          <table style={{ width: "100%", minWidth: "900px", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E7DED5", textAlign: "left", color: "#766C67" }}>
                <th style={{ padding: "12px 8px" }}>BOOKING ID</th>
                <th style={{ padding: "12px 8px" }}>SERVICE REQUESTED</th>
                <th style={{ padding: "12px 8px" }}>VENDOR (ARTISAN)</th>
                <th style={{ padding: "12px 8px" }}>ORGANIZER (HOST)</th>
                <th style={{ padding: "12px 8px" }}>EVENT & DATE</th>
                <th style={{ padding: "12px 8px", textAlign: "right" }}>PRICE</th>
                <th style={{ padding: "12px 8px", textAlign: "center" }}>STATUS</th>
                <th style={{ padding: "12px 8px", textAlign: "center" }}>ADMIN ASSURANCE & ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "#8B7355" }}>
                    No bookings found matching current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => {
                  const bId = b._id || b.id;
                  const isActionLoading = actionLoadingId === bId;
                  const statusStyles = {
                    Pending: { bg: "#FFF3CD", text: "#856404" },
                    "Proposal Sent": { bg: "#D1ECF1", text: "#0C5460" },
                    Accepted: { bg: "#D4EDDA", text: "#155724" },
                    Confirmed: { bg: "#2E7D32", text: "#FFFFFF" },
                    Cancelled: { bg: "#F8D7DA", text: "#721C24" },
                    Declined: { bg: "#F8D7DA", text: "#721C24" },
                    Completed: { bg: "#E2E3E5", text: "#383D41" },
                  };
                  const style = statusStyles[b.status] || statusStyles.Pending;

                  return (
                    <tr key={bId} style={{ borderBottom: "1px solid #E7DED5" }}>
                      <td style={{ padding: "12px 8px", color: "#8C6435", fontWeight: 700 }}>
                        {String(bId).slice(-6)}
                      </td>

                      <td style={{ padding: "12px 8px" }}>
                        <strong style={{ color: "#2B1D12", display: "block" }}>{b.serviceName || b.serviceId?.name || "Service"}</strong>
                        <span style={{ fontSize: "11px", color: "#766C67" }}>{b.serviceId?.category || "Standard"}</span>
                      </td>

                      <td style={{ padding: "12px 8px", color: "#2E2927" }}>
                        <div style={{ fontWeight: 600 }}>{b.vendorId?.businessName || b.vendorId?.fullName || "Vendor"}</div>
                        <span style={{ fontSize: "11px", color: "#8C6435" }}>Verified Partner</span>
                      </td>

                      <td style={{ padding: "12px 8px", color: "#2E2927" }}>
                        <div style={{ fontWeight: 600 }}>{b.organizer || b.organizerId?.fullName || "Organizer"}</div>
                        <span style={{ fontSize: "11px", color: "#766C67" }}>{b.organizerId?.phone || "No phone"}</span>
                      </td>

                      <td style={{ padding: "12px 8px" }}>
                        <strong style={{ display: "block" }}>{b.eventName || b.eventId?.title}</strong>
                        <span style={{ fontSize: "11px", color: "#766C67" }}>📅 {b.eventDate || b.eventId?.date || "TBD"}</span>
                      </td>

                      <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 700, color: "#304B35" }}>
                        {b.serviceId?.price ? `₹${Number(b.serviceId.price).toLocaleString("en-IN")}` : "Custom Quote"}
                      </td>

                      <td style={{ padding: "12px 8px", textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: "999px",
                            background: style.bg,
                            color: style.text,
                            display: "inline-block",
                          }}
                        >
                          {b.status}
                        </span>
                      </td>

                      <td style={{ padding: "12px 8px", textAlign: "center" }}>
                        {/* PENDING: Forward to vendor or decline */}
                        {b.status === "Pending" && (
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <button
                              type="button"
                              disabled={isActionLoading}
                              onClick={() => handleForwardToVendor(b)}
                              style={{
                                padding: "6px 12px",
                                background: "#8C6435",
                                color: "#FFF",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Send size={12} />
                              Forward to Vendor
                            </button>
                            <button
                              type="button"
                              disabled={isActionLoading}
                              onClick={() => handleDecline(b)}
                              style={{
                                padding: "6px 10px",
                                background: "#FFF5F5",
                                color: "#CC0000",
                                border: "1px solid #FFCCCC",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Decline
                            </button>
                          </div>
                        )}

                        {/* PROPOSAL SENT: Waiting for vendor acceptance */}
                        {b.status === "Proposal Sent" && (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                            <span style={{ fontSize: "11px", color: "#0C5460", fontWeight: 600 }}>
                              ⏳ Awaiting Vendor Acceptance
                            </span>
                            <button
                              type="button"
                              disabled={isActionLoading}
                              onClick={() => handleGiveAssurance(b)}
                              style={{
                                padding: "5px 12px",
                                background: "#FAF6F0",
                                color: "#8C6435",
                                border: "1.5px solid #8C6435",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >
                              ✦ Fast-Track Assurance
                            </button>
                          </div>
                        )}

                        {/* ACCEPTED BY VENDOR: Admin gives official assurance! */}
                        {b.status === "Accepted" && (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleGiveAssurance(b)}
                            style={{
                              padding: "7px 14px",
                              background: "linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)",
                              color: "#FFFFFF",
                              border: "none",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            }}
                          >
                            <ShieldCheck size={14} color="#FFF" />
                            ✦ Give Assurance (Confirm)
                          </button>
                        )}

                        {/* CONFIRMED: Official assurance given */}
                        {b.status === "Confirmed" && (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#2E7D32", fontWeight: 700, fontSize: "11px" }}>
                            <CheckCircle2 size={14} />
                            Assurance Given & Locked
                          </div>
                        )}

                        {/* CANCELLED */}
                        {b.status === "Cancelled" && (
                          <div style={{ fontSize: "11px", color: "#721C24" }}>
                            Cancelled (20% fee applied)
                          </div>
                        )}

                        {/* DECLINED */}
                        {b.status === "Declined" && (
                          <div style={{ fontSize: "11px", color: "#721C24" }}>
                            Declined by Admin
                          </div>
                        )}

                        {/* COMPLETED */}
                        {b.status === "Completed" && (
                          <div style={{ fontSize: "11px", color: "#383D41", fontWeight: 600 }}>
                            Delivered
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManageBookings;

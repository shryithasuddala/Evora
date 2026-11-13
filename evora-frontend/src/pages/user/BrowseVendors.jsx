import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, IndianRupee } from "lucide-react";
import { servicesAPI, eventsAPI, bookingsAPI } from "../../services/api";
import { useToast } from "../../context/ToastContext";

const CATEGORIES = ["All", "Photography", "Videography", "Catering", "Decoration", "Music & Sound", "Venue", "Transport", "Attire", "Other"];

const BrowseVendors = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [services, setServices] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedService, setSelectedService] = useState(null);
  const [bookingForm, setBookingForm] = useState({ eventId: "", notes: "" });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [svcs, evts] = await Promise.all([
          servicesAPI.getAll(),
          eventsAPI.getAll(),
        ]);
        setServices(svcs || []);
        setEvents(evts || []);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = services.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.vendorId?.businessName || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.location || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || s.category === category;
    return matchSearch && matchCat;
  });

  const handleRequestBooking = async (e) => {
    e.preventDefault();
    if (!bookingForm.eventId) { setBookingError("Please select an event."); return; }
    if (!selectedService) return;

    const vendorId = selectedService.vendorId?._id || (typeof selectedService.vendorId === "string" ? selectedService.vendorId : null);
    if (!vendorId) {
      setBookingError("Vendor details not found for this service.");
      return;
    }

    setBookingLoading(true);
    setBookingError("");
    try {
      const event = events.find((ev) => ev._id === bookingForm.eventId);
      await bookingsAPI.create({
        vendorId,
        eventId: bookingForm.eventId,
        serviceId: selectedService._id,
        eventName: event?.title || "",
        serviceName: selectedService.name,
        items: [selectedService.name],
        eventDate: event?.date || "",
        eventVenue: event?.venue || "",
        guestCount: event?.guestCount || 0,
        notes: bookingForm.notes,
      });
      setBookingSuccess(true);
      toast.success(
        "Booking Request Dispatched! ✨",
        `Inquiry sent to ${selectedService.name}. Notifications have been queued automatically.`
      );
      setTimeout(() => {
        setSelectedService(null);
        setBookingSuccess(false);
        setBookingForm({ eventId: "", notes: "" });
        navigate("/user/bookings");
      }, 1500);
    } catch (err) {
      setBookingError(err.message || "Failed to send request.");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return (
    <div className="vendor-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid #C9A13A", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ color: "#8B7355" }}>Loading services…</p>
      </div>
    </div>
  );

  return (
    <div className="vendor-page">
      <div style={{ marginBottom: 24 }}>
        <span className="vendor-welcome-label" style={{ color: "#C9A13A" }}>ADMIN-MANAGED ARTISAN CATALOGUE</span>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 30, margin: "4px 0 6px" }}>Curated Artisan Services</h1>
        <p style={{ color: "#8B7355", margin: "0 0 12px" }}>
          All vendor and volunteer engagements are secured via EVORA Admin Concierge. Select your requirements, and Admin verifies availability and gives official assurance once the artisan accepts.
        </p>
        <div style={{ background: "#FAF5EA", border: "1px solid #E8DCC8", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#6B5240", display: "flex", alignItems: "center", gap: 8 }}>
          <span>🛡️</span>
          <span><strong>100% Admin Protected:</strong> Hosts never have to negotiate directly with vendors. EVORA Admin handles availability checks, pricing assurance, and date locks.</span>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#8B7355" }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search services, vendors, locations…" style={{ width: "100%", padding: "10px 12px 10px 36px", border: "1px solid #E8DCC8", borderRadius: 10, fontSize: 14, background: "#FDFAF4", boxSizing: "border-box", outline: "none" }} />
      </div>

      {/* Categories */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)} style={{ padding: "6px 16px", borderRadius: 20, border: "1px solid", fontSize: 13, cursor: "pointer", borderColor: category === c ? "#C9A13A" : "#E8DCC8", background: category === c ? "#C9A13A" : "#fff", color: category === c ? "#fff" : "#6B5240" }}>
            {c}
          </button>
        ))}
      </div>

      {/* Services Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 50, color: "#8B7355" }}>No services found.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
          {filtered.map((service) => (
            <div key={service._id} style={{ background: "#fff", border: "1px solid #E8DCC8", borderRadius: 14, padding: 20, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <span style={{ background: "#C9A13A22", color: "#C9A13A", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{service.category}</span>
                {service.vendorId?.isVerified && <span style={{ fontSize: 11, color: "#304B35", background: "#304B3522", padding: "2px 8px", borderRadius: 20 }}>✓ Verified</span>}
              </div>
              <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 18, margin: "0 0 4px", color: "#2B1D12" }}>{service.name}</h3>
              <p style={{ fontSize: 13, color: "#8B7355", margin: "0 0 4px", fontWeight: 500 }}>{service.vendorId?.businessName || service.vendorId?.fullName}</p>
              {service.location && <p style={{ fontSize: 12, color: "#A09080", margin: "0 0 8px" }}>📍 {service.location}</p>}
              {service.duration && <p style={{ fontSize: 12, color: "#A09080", margin: "0 0 10px" }}>⏱ {service.duration}</p>}
              {service.description && <p style={{ fontSize: 13, color: "#6B5240", margin: "0 0 14px", flex: 1, lineHeight: 1.5 }}>{service.description.slice(0, 100)}{service.description.length > 100 ? "…" : ""}</p>}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 2, color: "#2B1D12", fontWeight: 700, fontSize: 18 }}>
                  <IndianRupee size={16} />{Number(service.price).toLocaleString()}
                  <span style={{ fontSize: 12, color: "#8B7355", fontWeight: 400 }}> / {service.unit || "event"}</span>
                </div>
                <button onClick={() => { setSelectedService(service); setBookingForm({ eventId: "", notes: "" }); setBookingSuccess(false); setBookingError(""); }} className="vendor-btn" style={{ padding: "7px 16px", fontSize: 13 }}>
                  ✦ Request via Admin
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {selectedService && (
        <div style={{ position: "fixed", inset: 0, background: "#00000055", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, margin: "0 0 4px" }}>Request Artisan via Admin</h3>
                <p style={{ margin: 0, fontSize: 13, color: "#8B7355" }}>
                  EVORA Admin will verify availability with {selectedService.name} and provide assurance once accepted.
                </p>
              </div>
              <button onClick={() => setSelectedService(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} color="#6B5240" /></button>
            </div>

            {bookingSuccess ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <p style={{ color: "#304B35", fontWeight: 600, fontSize: 16 }}>Booking request sent!</p>
                <p style={{ color: "#8B7355", fontSize: 14 }}>Redirecting to your bookings…</p>
              </div>
            ) : (
              <form onSubmit={handleRequestBooking}>
                {bookingError && <div style={{ background: "#FFF5F5", border: "1px solid #FFCCCC", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#CC0000", fontSize: 14 }}>{bookingError}</div>}
                <label style={{ fontSize: 13, fontWeight: 600, color: "#6B5240", display: "block", marginBottom: 6 }}>Select Event *</label>
                {events.length === 0 ? (
                  <div style={{ background: "#FFF8E8", border: "1px solid #E8DCC8", borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    <p style={{ color: "#8B7355", fontSize: 13, margin: "0 0 10px" }}>You have no events yet. Please create an event first to request vendor services.</p>
                    <button type="button" onClick={() => navigate("/user/events/create")} className="vendor-btn" style={{ padding: "6px 14px", fontSize: 12 }}>
                      + Create Celebration Event
                    </button>
                  </div>
                ) : (
                  <select value={bookingForm.eventId} onChange={(e) => setBookingForm((p) => ({ ...p, eventId: e.target.value }))} style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8DCC8", borderRadius: 8, fontSize: 14, background: "#FDFAF4", marginBottom: 14, boxSizing: "border-box", outline: "none" }}>
                    <option value="">— Choose an event —</option>
                    {events.map((ev) => <option key={ev._id} value={ev._id}>{ev.title} ({ev.date})</option>)}
                  </select>
                )}
                <label style={{ fontSize: 13, fontWeight: 600, color: "#6B5240", display: "block", marginBottom: 6 }}>Notes for vendor</label>
                <textarea value={bookingForm.notes} onChange={(e) => setBookingForm((p) => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Any specific requirements…" style={{ width: "100%", padding: "9px 12px", border: "1px solid #E8DCC8", borderRadius: 8, fontSize: 14, resize: "vertical", boxSizing: "border-box", outline: "none", marginBottom: 20 }} />
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setSelectedService(null)} style={{ padding: "9px 20px", border: "1px solid #E8DCC8", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 14 }}>Cancel</button>
                  <button type="submit" disabled={bookingLoading || events.length === 0} className="vendor-btn" style={{ padding: "9px 20px", opacity: (bookingLoading || events.length === 0) ? 0.6 : 1 }}>
                    {bookingLoading ? "Sending…" : "Send Request"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowseVendors;

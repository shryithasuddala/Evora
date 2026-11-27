import { useMemo, useState, useEffect, useCallback } from "react";
import {
  CalendarDays,
  MapPin,
  User,
  Package,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { bookingsAPI } from "../../services/api";
import { usePortalSync, broadcastPortalSync } from "../../utils/portalSync";

const Bookings = () => {
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = useCallback(async () => {
    try {
      const data = await bookingsAPI.getAll();
      setBookings(data || []);
    } catch (err) {
      console.error("Failed to load bookings:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Real-time synchronization across all portals and tabs
  usePortalSync(loadBookings, 4000);

  const confirmedBookings = useMemo(() => {
    return bookings.filter((b) => b.status === "Accepted" || b.status === "Completed");
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return confirmedBookings.filter((booking) => {
      const isCompleted = booking.status === "Completed" || booking.bookingStatus === "Completed";
      const isCancelled = booking.status === "Cancelled" || booking.bookingStatus === "Cancelled";
      const effectiveStatus = isCompleted ? "Completed" : isCancelled ? "Cancelled" : (booking.bookingStatus || "Upcoming");
      return effectiveStatus === activeTab;
    });
  }, [confirmedBookings, activeTab]);

  const handleUpdateBookingStatus = async (bookingId, newBookingStatus) => {
    try {
      await bookingsAPI.updateStatus(
        bookingId,
        newBookingStatus === "Completed" ? "Completed" : "Cancelled",
        newBookingStatus
      );
      broadcastPortalSync("BOOKING_COMPLETED", { bookingId, status: newBookingStatus });
      await loadBookings();
    } catch (err) {
      alert(err.message || "Failed to update booking status.");
    }
  };

  return (
    <div className="vendor-page">
      <div className="vendor-page-header">
        <div>
          <span className="vendor-page-label">EVENT SCHEDULE</span>
          <h1>Bookings</h1>
          <p>Track and manage your confirmed celebration bookings.</p>
        </div>
      </div>

      <div className="vendor-booking-tabs">
        <button
          className={activeTab === "Upcoming" ? "active" : ""}
          onClick={() => setActiveTab("Upcoming")}
        >
          Upcoming
        </button>

        <button
          className={activeTab === "Completed" ? "active" : ""}
          onClick={() => setActiveTab("Completed")}
        >
          Completed
        </button>

        <button
          className={activeTab === "Cancelled" ? "active" : ""}
          onClick={() => setActiveTab("Cancelled")}
        >
          Cancelled
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#8B7355" }}>Loading bookings…</div>
      ) : filteredBookings.length === 0 ? (
        <div className="vendor-large-empty">
          <div className="vendor-large-empty-icon">
            <CalendarDays size={32} />
          </div>
          <h2>No {activeTab.toLowerCase()} bookings</h2>
          <p>Accepted event assignments will appear here.</p>
        </div>
      ) : (
        <div className="vendor-bookings-list">
          {filteredBookings.map((booking) => {
            const bId = booking._id || booking.id;
            return (
              <div className="vendor-booking-card" key={bId}>
                <div className="vendor-booking-card-header">
                  <div>
                    <span className="booking-event-label">CONFIRMED CELEBRATION</span>
                    <h2>{booking.eventName || booking.serviceName || "Celebration Booking"}</h2>
                  </div>
                  <span className="booking-status">{booking.bookingStatus || "Upcoming"}</span>
                </div>

                <div className="vendor-booking-details">
                  <p>
                    <User size={17} />
                    <span>{booking.organizer || booking.organizerId?.fullName || "Organizer"}</span>
                  </p>

                  <p>
                    <CalendarDays size={17} />
                    <span>{booking.eventDate || booking.date || "Date scheduled"}</span>
                  </p>

                  <p>
                    <MapPin size={17} />
                    <span>{booking.eventVenue || booking.location || "Venue confirmed"}</span>
                  </p>

                  <p>
                    <Package size={17} />
                    <span>{booking.serviceName || "Service contract"}</span>
                  </p>
                </div>

                {booking.bookingStatus !== "Completed" && booking.bookingStatus !== "Cancelled" && (
                  <div className="vendor-booking-actions">
                    <button
                      className="booking-complete-button"
                      onClick={() => handleUpdateBookingStatus(bId, "Completed")}
                    >
                      <CheckCircle2 size={17} />
                      Mark as Completed
                    </button>

                    <button
                      className="booking-cancel-button"
                      onClick={() => handleUpdateBookingStatus(bId, "Cancelled")}
                    >
                      <XCircle size={17} />
                      Cancel Booking
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Bookings;

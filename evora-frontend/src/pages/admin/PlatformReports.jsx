import { useState, useEffect } from "react";
import { adminAPI, eventsAPI, servicesAPI, bookingsAPI } from "../../services/api";

const PlatformReports = () => {
  const [metrics, setMetrics] = useState({ totalVolunteers: 0 });
  const [events, setEvents] = useState([]);
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsData, eventsData, servicesData, bookingsData] = await Promise.all([
          adminAPI.getStats(),
          eventsAPI.getAll(),
          servicesAPI.getAll(),
          bookingsAPI.getAll(),
        ]);
        if (statsData) setMetrics(statsData);
        setEvents(eventsData || []);
        setServices(servicesData || []);
        setBookings(bookingsData || []);
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalEventBudget = events.reduce((s, e) => s + Number(e.totalBudget || 0), 0);

  // Category counts
  const categoryCounts = events.reduce((acc, evt) => {
    acc[evt.category] = (acc[evt.category] || 0) + 1;
    return acc;
  }, {});

  const serviceCategoryCounts = services.reduce((acc, srv) => {
    acc[srv.category] = (acc[srv.category] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="vendor-page" style={{ textAlign: "center", padding: 50, color: "#8B7355" }}>
        Aggregating platform intelligence…
      </div>
    );
  }

  return (
    <div className="vendor-page">
      <div style={{ marginBottom: "24px" }}>
        <span className="vendor-welcome-label" style={{ color: "#8C6435" }}>
          BUSINESS INTELLIGENCE
        </span>
        <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: "32px", margin: "4px 0" }}>
          Platform Analytics & Capstone Reports
        </h1>
        <p style={{ margin: 0, color: "#766C67" }}>
          Consolidated performance metrics, service distributions, and operational volume.
        </p>
      </div>

      {/* AGGREGATE STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div className="vendor-stat-card">
          <span className="vendor-stat-label">Total Platform Volume</span>
          <h3 style={{ fontSize: "24px", color: "#304B35", margin: "6px 0 0" }}>
            ₹{totalEventBudget.toLocaleString("en-IN")}
          </h3>
        </div>

        <div className="vendor-stat-card">
          <span className="vendor-stat-label">Total Active Services</span>
          <h3 style={{ fontSize: "24px", color: "#647665", margin: "6px 0 0" }}>
            {services.length}
          </h3>
        </div>

        <div className="vendor-stat-card">
          <span className="vendor-stat-label">Total Booking Orders</span>
          <h3 style={{ fontSize: "24px", color: "#2B1D12", margin: "6px 0 0" }}>
            {bookings.length}
          </h3>
        </div>

        <div className="vendor-stat-card">
          <span className="vendor-stat-label">Verified Volunteers</span>
          <h3 style={{ fontSize: "24px", color: "#8C6435", margin: "6px 0 0" }}>
            {metrics.totalVolunteers}
          </h3>
        </div>
      </div>

      <div className="vendor-reports-grid">
        {/* EVENT CATEGORY BREAKDOWN */}
        <div className="vendor-card">
          <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "18px", margin: "0 0 16px" }}>
            Celebration Categories Breakdown
          </h2>

          {events.length === 0 ? (
            <p style={{ color: "#8B7355", fontSize: 13 }}>No events data recorded yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {Object.entries(categoryCounts).map(([cat, count]) => {
                const pct = Math.round((count / (events.length || 1)) * 100);
                return (
                  <div key={cat}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                      <strong>{cat}</strong>
                      <span style={{ color: "#766C67" }}>{count} events ({pct}%)</span>
                    </div>
                    <div style={{ height: "6px", background: "#E7DED5", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "#8C6435" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* VENDOR SERVICES DISTRIBUTION */}
        <div className="vendor-card">
          <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: "18px", margin: "0 0 16px" }}>
            Vendor Service Categories
          </h2>

          {services.length === 0 ? (
            <p style={{ color: "#8B7355", fontSize: 13 }}>No vendor services registered yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {Object.entries(serviceCategoryCounts).map(([cat, count]) => {
                const pct = Math.round((count / (services.length || 1)) * 100);
                return (
                  <div key={cat}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
                      <strong>{cat}</strong>
                      <span style={{ color: "#766C67" }}>{count} offerings ({pct}%)</span>
                    </div>
                    <div style={{ height: "6px", background: "#E7DED5", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "#304B35" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlatformReports;

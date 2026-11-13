import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  IndianRupee,
  FileText,
  Package,
  CalendarDays,
  Send,
} from "lucide-react";
import { bookingsAPI } from "../../services/api";
import { useToast } from "../../context/ToastContext";

const SendProposal = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [formData, setFormData] = useState({
    servicePrice: "",
    advanceAmount: "",
    includedServices: "",
    description: "",
    validityDate: "",
    serviceDuration: "",
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    bookingsAPI.getOne(id)
      .then((data) => setBooking(data))
      .catch((err) => setMessage(err.message || "Failed to load request."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSending(true);
    setMessage("");

    try {
      await bookingsAPI.sendProposal(id, {
        servicePrice: Number(formData.servicePrice),
        advanceAmount: Number(formData.advanceAmount) || 0,
        includedServices: formData.includedServices,
        description: formData.description,
        validityDate: formData.validityDate,
        serviceDuration: formData.serviceDuration,
      });

      setMessage("Proposal sent successfully!");
      toast.success(
        "Commercial Proposal Dispatched! 💼",
        `Quotation of ₹${Number(formData.servicePrice).toLocaleString("en-IN")} transmitted to the organizer.`
      );
      setTimeout(() => {
        navigate("/vendor/requests");
      }, 1200);
    } catch (err) {
      setMessage(err.message || "Unable to send proposal. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="proposal-page" style={{ textAlign: "center", padding: 50 }}>
        <p style={{ color: "#8B7355" }}>Loading request context…</p>
      </div>
    );
  }

  return (
    <div className="proposal-page">
      <button
        className="proposal-back-button"
        onClick={() => navigate(`/vendor/requests/${id}`)}
      >
        <ArrowLeft size={16} />
        Back to Request
      </button>

      <div className="proposal-layout">
        {/* ================= SUMMARY PANEL ================= */}
        <div className="proposal-summary-card">
          <span className="proposal-badge">EVENT DETAILS</span>
          <h2>{booking?.eventName || booking?.serviceName || "Celebration Inquiry"}</h2>

          <div className="proposal-summary-list">
            <div className="proposal-summary-item">
              <span className="summary-label">Organizer</span>
              <strong className="summary-value">
                {booking?.organizer || booking?.organizerId?.fullName || "Not specified"}
              </strong>
            </div>

            <div className="proposal-summary-item">
              <span className="summary-label">Event Date</span>
              <strong className="summary-value">
                {booking?.eventDate || "Flexible"}
              </strong>
            </div>

            <div className="proposal-summary-item">
              <span className="summary-label">Location</span>
              <strong className="summary-value">
                {booking?.eventVenue || "Not specified"}
              </strong>
            </div>

            <div className="proposal-summary-item">
              <span className="summary-label">Requested Offering</span>
              <strong className="summary-value">
                {booking?.serviceName || "Event Service"}
              </strong>
            </div>
          </div>
        </div>

        {/* ================= FORM PANEL ================= */}
        <div className="proposal-form-card">
          <div className="proposal-form-header">
            <span className="proposal-form-tag">COMMERCIAL QUOTE</span>
            <h2>Submit Formal Proposal</h2>
            <p>
              Outline your service deliverables, contract price, and payment terms.
            </p>
          </div>

          {message && (
            <div
              className={`proposal-alert ${
                message.includes("success") ? "success" : "error"
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="proposal-form">
            <div className="proposal-form-grid">
              {/* SERVICE PRICE */}
              <div className="proposal-input-group">
                <label htmlFor="servicePrice">
                  <IndianRupee size={15} />
                  Total Contract Price (₹) *
                </label>
                <input
                  id="servicePrice"
                  name="servicePrice"
                  type="number"
                  placeholder="e.g. 50000"
                  value={formData.servicePrice}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* ADVANCE AMOUNT */}
              <div className="proposal-input-group">
                <label htmlFor="advanceAmount">
                  <IndianRupee size={15} />
                  Required Booking Advance (₹)
                </label>
                <input
                  id="advanceAmount"
                  name="advanceAmount"
                  type="number"
                  placeholder="e.g. 15000"
                  value={formData.advanceAmount}
                  onChange={handleChange}
                />
              </div>

              {/* VALIDITY DATE */}
              <div className="proposal-input-group">
                <label htmlFor="validityDate">
                  <CalendarDays size={15} />
                  Quote Validity Deadline
                </label>
                <input
                  id="validityDate"
                  name="validityDate"
                  type="date"
                  value={formData.validityDate}
                  onChange={handleChange}
                />
              </div>

              {/* DURATION */}
              <div className="proposal-input-group">
                <label htmlFor="serviceDuration">
                  <Package size={15} />
                  On-Site Service Duration
                </label>
                <input
                  id="serviceDuration"
                  name="serviceDuration"
                  type="text"
                  placeholder="e.g. 8 Hours / Entire Day"
                  value={formData.serviceDuration}
                  onChange={handleChange}
                />
              </div>

              {/* INCLUDED SERVICES */}
              <div className="proposal-input-group full">
                <label htmlFor="includedServices">
                  <FileText size={15} />
                  Included Deliverables & Equipment
                </label>
                <input
                  id="includedServices"
                  name="includedServices"
                  type="text"
                  placeholder="e.g. 2 Senior Photographers, 1 Drone Pilot, 400 Edited Photos"
                  value={formData.includedServices}
                  onChange={handleChange}
                />
              </div>

              {/* NOTES */}
              <div className="proposal-input-group full">
                <label htmlFor="description">
                  <FileText size={15} />
                  Terms, Notes & Customizations
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  placeholder="Describe timeline milestones, delivery timelines, or requirements..."
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="proposal-form-actions">
              <button
                type="button"
                className="proposal-cancel-btn"
                onClick={() => navigate(`/vendor/requests/${id}`)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="proposal-submit-btn"
                disabled={sending}
              >
                <Send size={15} />
                {sending ? "Transmitting…" : "Transmit Proposal"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SendProposal;

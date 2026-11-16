import React, { useState, useEffect } from "react";
import {
  Sparkles,
  MapPin,
  Clock,
  Utensils,
  Package,
  Phone,
  User,
  Plus,
  Trash2,
  AlertTriangle,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { eventsAPI } from "../../services/api";

const SurplusFoodForm = ({ initialEventId, initialData, onSubmit, loading }) => {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || "");
  const [eventsLoading, setEventsLoading] = useState(false);

  // Default prepared time is 1 hour ago; safe until is 4 hours from now
  const defaultPreparedAt = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - 60);
    return d.toISOString().slice(0, 16);
  };

  const defaultSafeUntil = () => {
    const d = new Date();
    d.setHours(d.getHours() + 4);
    return d.toISOString().slice(0, 16);
  };

  const [form, setForm] = useState({
    eventId: initialEventId || "",
    eventName: initialData?.eventName || "",
    eventType: initialData?.eventType || "Wedding",
    venueAddress: initialData?.venueAddress || "",
    city: initialData?.city || "Hyderabad",
    quantity: initialData?.quantity || 100,
    unit: initialData?.unit || "plates",
    foodItems: initialData?.foodItems || [
      { name: "Vegetable Biryani & Mirchi Ka Salan", dietType: "Vegetarian", quantity: 70, unit: "plates" },
      { name: "Paneer Butter Masala & Naan", dietType: "Vegetarian", quantity: 30, unit: "plates" },
    ],
    preparedAt: initialData?.preparedAt || defaultPreparedAt(),
    safeUntil: initialData?.safeUntil || defaultSafeUntil(),
    packagingAvailable: initialData?.packagingAvailable ?? true,
    pickupType: initialData?.pickupType || "pickup",
    contactName: initialData?.contactName || "",
    contactPhone: initialData?.contactPhone || "",
    notes: initialData?.notes || "",
  });

  const [validationError, setValidationError] = useState("");
  const [timeWarning, setTimeWarning] = useState("");

  // Load user's events to allow autofill
  useEffect(() => {
    const fetchEvents = async () => {
      setEventsLoading(true);
      try {
        const evts = await eventsAPI.getAll();
        setEvents(evts || []);

        if (initialEventId && evts) {
          const match = evts.find((e) => e._id === initialEventId);
          if (match) applyEventAutofill(match);
        }
      } catch (err) {
        console.warn("Could not load events for autofill:", err.message);
      } finally {
        setEventsLoading(false);
      }
    };
    fetchEvents();
  }, [initialEventId]);

  const applyEventAutofill = (evt) => {
    setSelectedEventId(evt._id);
    setForm((prev) => ({
      ...prev,
      eventId: evt._id,
      eventName: evt.title || prev.eventName,
      eventType: evt.category || prev.eventType,
      venueAddress: evt.venue
        ? `${evt.venue}${evt.location ? `, ${evt.location}` : ""}`
        : evt.location || prev.venueAddress,
      city: evt.city || "Hyderabad",
    }));
  };

  const handleEventSelectChange = (e) => {
    const val = e.target.value;
    setSelectedEventId(val);
    if (!val) {
      setForm((prev) => ({ ...prev, eventId: "" }));
      return;
    }
    const match = events.find((item) => item._id === val);
    if (match) applyEventAutofill(match);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Safe until vs Prepared time check
  useEffect(() => {
    if (form.preparedAt && form.safeUntil) {
      const prep = new Date(form.preparedAt).getTime();
      const safe = new Date(form.safeUntil).getTime();
      const now = Date.now();

      if (safe <= prep) {
        setTimeWarning("⚠️ 'Safe until' time must be after the preparation time.");
      } else if (safe <= now) {
        setTimeWarning("⚠️ 'Safe until' time is in the past! Expired food cannot be distributed.");
      } else {
        const diffHours = (safe - now) / (1000 * 60 * 60);
        if (diffHours < 1.5) {
          setTimeWarning(`⚠️ Urgent: Only ${(diffHours * 60).toFixed(0)} minutes left for pickup & delivery!`);
        } else {
          setTimeWarning("");
        }
      }
    }
  }, [form.preparedAt, form.safeUntil]);

  // Food Item management
  const handleFoodItemChange = (index, field, value) => {
    setForm((prev) => {
      const updated = [...prev.foodItems];
      updated[index] = { ...updated[index], [field]: value };
      // auto update total quantity
      const sum = updated.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
      return { ...prev, foodItems: updated, quantity: sum > 0 ? sum : prev.quantity };
    });
  };

  const addFoodItem = () => {
    setForm((prev) => ({
      ...prev,
      foodItems: [
        ...prev.foodItems,
        { name: "", dietType: "Vegetarian", quantity: 20, unit: prev.unit },
      ],
    }));
  };

  const removeFoodItem = (index) => {
    setForm((prev) => {
      if (prev.foodItems.length <= 1) return prev;
      const updated = prev.foodItems.filter((_, i) => i !== index);
      const sum = updated.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
      return { ...prev, foodItems: updated, quantity: sum > 0 ? sum : prev.quantity };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError("");

    if (!form.venueAddress.trim()) {
      setValidationError("Please enter the venue address or location.");
      return;
    }
    if (!form.quantity || Number(form.quantity) <= 0) {
      setValidationError("Please specify a valid surplus quantity.");
      return;
    }
    if (!form.contactName.trim() || !form.contactPhone.trim()) {
      setValidationError("Contact coordinator name and phone number are required.");
      return;
    }

    const prep = new Date(form.preparedAt).getTime();
    const safe = new Date(form.safeUntil).getTime();
    if (safe <= prep) {
      setValidationError("'Safe to consume until' time must be after the prepared time.");
      return;
    }

    onSubmit(form);
  };

  const navy = "#0D1B2A";
  const softGold = "#C9A13A";
  const purple = "#4A154B";

  const cardStyle = {
    background: "#FFFFFF",
    borderRadius: 16,
    border: "1px solid #E8DCC8",
    padding: "24px 28px",
    marginBottom: 20,
    boxShadow: "0 4px 14px rgba(13, 27, 42, 0.04)",
  };

  const labelStyle = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#2B1D12",
    marginBottom: 6,
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #CBD5E1",
    fontSize: 14,
    color: "#0F172A",
    outline: "none",
    background: "#F8FAFC",
    transition: "border-color 0.2s ease",
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 840, margin: "0 auto" }}>
      {/* Autofill / Event Header */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ background: "rgba(201, 161, 58, 0.15)", padding: 8, borderRadius: 10, color: softGold }}>
            <Calendar size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, color: navy, margin: 0, fontWeight: 700 }}>1. Event Details</h3>
            <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>Select an existing celebration to autofill or type venue information</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          <div>
            <label style={labelStyle}>Select Registered Event (Optional)</label>
            <select
              value={selectedEventId}
              onChange={handleEventSelectChange}
              style={inputStyle}
              disabled={eventsLoading}
            >
              <option value="">-- Choose celebration or enter custom --</option>
              {events.map((ev) => (
                <option key={ev._id} value={ev._id}>
                  {ev.title} ({ev.category}) - {ev.date || "Upcoming"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Celebration Name *</label>
            <input
              type="text"
              name="eventName"
              value={form.eventName}
              onChange={handleChange}
              placeholder="e.g. Hyderabad Royal Wedding Feast"
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Event Type</label>
            <select name="eventType" value={form.eventType} onChange={handleChange} style={inputStyle}>
              <option value="Wedding">Wedding</option>
              <option value="Reception">Reception</option>
              <option value="Birthday">Birthday</option>
              <option value="Corporate">Corporate Gala</option>
              <option value="Anniversary">Anniversary</option>
              <option value="Festival">Festival Celebration</option>
              <option value="Other">Other Gathering</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginTop: 16 }}>
          <div>
            <label style={labelStyle}>
              <MapPin size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4, color: softGold }} />
              Venue Address / Landmark *
            </label>
            <input
              type="text"
              name="venueAddress"
              value={form.venueAddress}
              onChange={handleChange}
              placeholder="e.g. Taj Krishna, Road No. 1, Banjara Hills"
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>City</label>
            <input
              type="text"
              name="city"
              value={form.city}
              onChange={handleChange}
              placeholder="Hyderabad"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Food Surplus Details */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "rgba(74, 21, 75, 0.1)", padding: 8, borderRadius: 10, color: purple }}>
              <Utensils size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 18, color: navy, margin: 0, fontWeight: 700 }}>2. Surplus Food Items</h3>
              <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>List dishes and approximate quantities available for donation</p>
            </div>
          </div>

          <button
            type="button"
            onClick={addFoodItem}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "#F1F5F9",
              border: "1px solid #CBD5E1",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 13,
              fontWeight: 600,
              color: navy,
              cursor: "pointer",
            }}
          >
            <Plus size={14} /> Add Dish
          </button>
        </div>

        {form.foodItems.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.2fr 1fr 1fr auto",
              gap: 10,
              alignItems: "center",
              marginBottom: 12,
              padding: "10px 12px",
              background: "#F8FAFC",
              borderRadius: 8,
              border: "1px solid #E2E8F0",
            }}
          >
            <div>
              <input
                type="text"
                placeholder="Dish name (e.g. Veg Pulao)"
                value={item.name}
                onChange={(e) => handleFoodItemChange(idx, "name", e.target.value)}
                style={{ ...inputStyle, background: "#FFF", padding: "8px 10px" }}
                required
              />
            </div>
            <div>
              <select
                value={item.dietType}
                onChange={(e) => handleFoodItemChange(idx, "dietType", e.target.value)}
                style={{ ...inputStyle, background: "#FFF", padding: "8px 10px" }}
              >
                <option value="Vegetarian">Vegetarian 🟢</option>
                <option value="Non-Vegetarian">Non-Vegetarian 🔴</option>
                <option value="Vegan">Vegan 🌱</option>
                <option value="Mixed">Mixed / Assorted</option>
              </select>
            </div>
            <div>
              <input
                type="number"
                min="1"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => handleFoodItemChange(idx, "quantity", e.target.value)}
                style={{ ...inputStyle, background: "#FFF", padding: "8px 10px" }}
                required
              />
            </div>
            <div>
              <select
                value={item.unit}
                onChange={(e) => handleFoodItemChange(idx, "unit", e.target.value)}
                style={{ ...inputStyle, background: "#FFF", padding: "8px 10px" }}
              >
                <option value="plates">Plates</option>
                <option value="kg">Kg</option>
                <option value="boxes">Boxes</option>
                <option value="packets">Packets</option>
              </select>
            </div>
            <div>
              <button
                type="button"
                onClick={() => removeFoodItem(idx)}
                disabled={form.foodItems.length <= 1}
                style={{
                  background: "transparent",
                  border: "none",
                  color: form.foodItems.length <= 1 ? "#CBD5E1" : "#EF4444",
                  cursor: form.foodItems.length <= 1 ? "not-allowed" : "pointer",
                  padding: 4,
                }}
                title="Remove item"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, padding: "10px 16px", background: "#FEF9C3", borderRadius: 8, border: "1px solid #FDE047" }}>
          <span style={{ fontSize: 13, color: "#854D0E", fontWeight: 600 }}>Total Donation Volume:</span>
          <span style={{ fontSize: 16, color: "#713F12", fontWeight: 800 }}>
            {form.quantity} {form.unit} (Feeds approx. {form.unit === "kg" ? Math.round(form.quantity * 2.5) : form.quantity} people)
          </span>
        </div>
      </div>

      {/* Safety Window & Logistics */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ background: "rgba(201, 161, 58, 0.15)", padding: 8, borderRadius: 10, color: softGold }}>
            <Clock size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: 18, color: navy, margin: 0, fontWeight: 700 }}>3. Safe Consumption Window & Logistics</h3>
            <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>Ensures food is redistributed in accordance with food safety standards</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          <div>
            <label style={labelStyle}>Food Prepared Time *</label>
            <input
              type="datetime-local"
              name="preparedAt"
              value={form.preparedAt}
              onChange={handleChange}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>Safe to Consume Until *</label>
            <input
              type="datetime-local"
              name="safeUntil"
              value={form.safeUntil}
              onChange={handleChange}
              style={inputStyle}
              required
            />
          </div>
        </div>

        {timeWarning && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 8,
              background: "#FFFBEB",
              border: "1px solid #FCD34D",
              color: "#92400E",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <AlertTriangle size={16} />
            <span>{timeWarning}</span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 18 }}>
          <div>
            <label style={labelStyle}>
              <Package size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              Packaging Available?
            </label>
            <select
              name="packagingAvailable"
              value={form.packagingAvailable ? "true" : "false"}
              onChange={(e) => setForm((prev) => ({ ...prev, packagingAvailable: e.target.value === "true" }))}
              style={inputStyle}
            >
              <option value="true">Yes, packed in food-grade containers / foil boxes</option>
              <option value="false">No, charity should bring vessels / containers</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Pickup Preference</label>
            <select name="pickupType" value={form.pickupType} onChange={handleChange} style={inputStyle}>
              <option value="pickup">Request Charity / Volunteer Pickup</option>
              <option value="drop_off">We will drop off at charity shelter</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginTop: 18 }}>
          <div>
            <label style={labelStyle}>
              <User size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              On-Site Coordinator Name *
            </label>
            <input
              type="text"
              name="contactName"
              value={form.contactName}
              onChange={handleChange}
              placeholder="e.g. Imran Khan"
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={labelStyle}>
              <Phone size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              Contact Phone *
            </label>
            <input
              type="tel"
              name="contactPhone"
              value={form.contactPhone}
              onChange={handleChange}
              placeholder="+91-9876543210"
              style={inputStyle}
              required
            />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Special Instructions / Notes</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="e.g. Please enter via Gate 3 (Banquet Kitchen Loading Bay). Food is kept in warmers."
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
      </div>

      {validationError && (
        <div
          style={{
            background: "#FEF2F2",
            color: "#991B1B",
            border: "1px solid #F87171",
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {validationError}
        </div>
      )}

      {/* Action Button */}
      <div style={{ textAlign: "right" }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            background: `linear-gradient(135deg, ${navy}, ${purple})`,
            color: "#FFFFFF",
            border: `1px solid ${softGold}`,
            padding: "14px 28px",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? "wait" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 4px 14px rgba(74, 21, 75, 0.25)",
            transition: "transform 0.15s ease",
          }}
        >
          <Sparkles size={18} style={{ color: softGold }} />
          {loading ? "Analyzing Food Safety & Matching Charities..." : "Find Nearby Charities with AI"}
          <ChevronRight size={18} />
        </button>
      </div>
    </form>
  );
};

export default SurplusFoodForm;

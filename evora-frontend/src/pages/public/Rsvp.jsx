import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Calendar, MapPin, CheckCircle2, XCircle, HelpCircle, Utensils, Users, Sparkles } from "lucide-react";
import { guestsAPI } from "../../services/api";
import Logo from "../../components/common/Logo";

const Rsvp = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [eventData, setEventData] = useState(null);
  const [guestData, setGuestData] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    status: "Confirmed",
    plusOnes: 0,
    dietaryNotes: "",
  });

  useEffect(() => {
    const fetchRsvp = async () => {
      try {
        const data = await guestsAPI.getPublicRsvp(token);
        setEventData(data.event);
        setGuestData(data.guest);
        setForm({
          status: data.guest.status === "Invited" ? "Confirmed" : data.guest.status,
          plusOnes: data.guest.plusOnes || 0,
          dietaryNotes: data.guest.dietaryNotes || "",
        });
        if (data.guest.status !== "Invited") {
          setSubmitted(true);
        }
      } catch (err) {
        setError(err.response?.data?.message || err.message || "Invalid or expired invitation link.");
      } finally {
        setLoading(false);
      }
    };

    fetchRsvp();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await guestsAPI.submitPublicRsvp(token, form);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to submit RSVP response.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF5EA", color: "#6B5240", fontFamily: "'Poppins', sans-serif" }}>
        <p>Loading your celebration invitation…</p>
      </div>
    );
  }

  if (error && !eventData) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#FAF5EA", padding: "20px", fontFamily: "'Poppins', sans-serif" }}>
        <div style={{ background: "#FFFDF9", border: "1px solid #D5B36A", borderRadius: "16px", padding: "36px 30px", maxWidth: "460px", textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.06)" }}>
          <Logo />
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#2B1D12", marginTop: "20px" }}>Invitation Not Found</h2>
          <p style={{ color: "#766C67", fontSize: "14px", margin: "10px 0 24px" }}>{error}</p>
          <Link to="/" style={{ background: "#C9A13A", color: "#2B1D12", padding: "10px 22px", borderRadius: "8px", textDecoration: "none", fontWeight: 700, fontSize: "13px" }}>
            Return to EVORA
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at 10% 20%, rgba(201,161,58,0.12), transparent 30%), radial-gradient(circle at 90% 80%, rgba(48,75,53,0.12), transparent 30%), #FAF5EA", padding: "40px 20px 60px", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'Poppins', sans-serif" }}>
      <div style={{ width: "120px", marginBottom: "20px" }}>
        <Logo />
      </div>

      <div style={{ width: "100%", maxWidth: "560px", background: "#FFFDF9", border: "1px solid #D5B36A", borderRadius: "20px", padding: "40px 32px", boxShadow: "0 16px 40px rgba(43,29,18,0.08)", boxSizing: "border-box" }}>
        <div style={{ textAlign: "center", borderBottom: "1px solid #EADBBE", paddingBottom: "24px", marginBottom: "28px" }}>
          <span style={{ fontSize: "11px", letterSpacing: "2.5px", color: "#C9A13A", fontWeight: 700, textTransform: "uppercase" }}>
            ✦ CORDIAL INVITATION ✦
          </span>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "28px", color: "#2B1D12", margin: "8px 0" }}>
            {eventData?.title}
          </h1>
          <p style={{ color: "#766C67", fontSize: "13px", margin: 0 }}>
            Honored Guest: <strong style={{ color: "#2B1D12" }}>{guestData?.name}</strong>
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: "20px", marginTop: "18px", flexWrap: "wrap", fontSize: "13px", color: "#304B35" }}>
            {eventData?.date && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <Calendar size={16} color="#C9A13A" />
                {new Date(eventData.date).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
              </span>
            )}
            {eventData?.location && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <MapPin size={16} color="#C9A13A" />
                {eventData.location}
              </span>
            )}
          </div>
        </div>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: form.status === "Confirmed" ? "#E8F5E9" : "#FFF3E0", color: form.status === "Confirmed" ? "#2E7D32" : "#E65100", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
              <CheckCircle2 size={36} />
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#2B1D12", margin: "0 0 10px", fontSize: "22px" }}>
              {form.status === "Confirmed" ? "You're Attending! 🎉" : form.status === "Declined" ? "Response Recorded" : "Tentative Response Recorded"}
            </h2>
            <p style={{ color: "#766C67", fontSize: "14px", lineHeight: 1.6, margin: "0 0 24px" }}>
              {form.status === "Confirmed"
                ? `Thank you, ${guestData?.name}! The host has been notified of your RSVP with ${form.plusOnes} additional guest(s). We look forward to celebrating together.`
                : `Thank you for letting us know. Your response has been shared with the event host.`}
            </p>

            <button
              type="button"
              onClick={() => setSubmitted(false)}
              style={{ background: "transparent", border: "1px solid #D5B36A", color: "#8C6435", padding: "8px 18px", borderRadius: "8px", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}
            >
              Update My RSVP
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: "#FCEBEB", border: "1px solid #F5C2C7", color: "#842029", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: "22px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#2B1D12", marginBottom: "10px" }}>
                Will you be joining us?
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                {[
                  { value: "Confirmed", label: "Attending", icon: CheckCircle2, color: "#2E7D32" },
                  { value: "Maybe", label: "Maybe", icon: HelpCircle, color: "#E65100" },
                  { value: "Declined", label: "Decline", icon: XCircle, color: "#C62828" },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = form.status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, status: opt.value }))}
                      style={{
                        padding: "12px 10px",
                        borderRadius: "10px",
                        border: isSelected ? `2px solid ${opt.color}` : "1px solid #D5B36A",
                        background: isSelected ? "#FAF5EA" : "#FFFDF9",
                        color: isSelected ? opt.color : "#6B5240",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "6px",
                        fontWeight: 700,
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      <Icon size={18} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {form.status !== "Declined" && (
              <>
                <div style={{ marginBottom: "20px" }}>
                  <label htmlFor="plusOnes" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: "#2B1D12", marginBottom: "6px" }}>
                    <Users size={16} color="#C9A13A" /> Plus-Ones / Family Members Accompanying
                  </label>
                  <input
                    id="plusOnes"
                    type="number"
                    min="0"
                    max="10"
                    value={form.plusOnes}
                    onChange={(e) => setForm((prev) => ({ ...prev, plusOnes: Number(e.target.value) || 0 }))}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #D5B36A", background: "#FAF5EA", boxSizing: "border-box", fontSize: "14px" }}
                  />
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <label htmlFor="dietaryNotes" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: "#2B1D12", marginBottom: "6px" }}>
                    <Utensils size={16} color="#C9A13A" /> Dietary Preferences or Allergies
                  </label>
                  <textarea
                    id="dietaryNotes"
                    rows="3"
                    placeholder="e.g. Vegetarian, Jain food, Nut allergy, etc."
                    value={form.dietaryNotes}
                    onChange={(e) => setForm((prev) => ({ ...prev, dietaryNotes: e.target.value }))}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #D5B36A", background: "#FAF5EA", boxSizing: "border-box", fontSize: "13px", resize: "vertical" }}
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #C9A13A 0%, #D4AF37 50%, #B8860B 100%)",
                color: "#2B1D12",
                fontWeight: 700,
                fontSize: "14px",
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(201,161,58,0.35)",
              }}
            >
              {submitting ? "Confirming RSVP…" : "Confirm RSVP Response"}
            </button>
          </form>
        )}

        <div style={{ marginTop: "30px", paddingTop: "20px", borderTop: "1px solid #EADBBE", textAlign: "center", fontSize: "11px", color: "#8B7355" }}>
          <Sparkles size={12} color="#C9A13A" style={{ verticalAlign: "middle", marginRight: "4px" }} />
          Powered by EVORA – Made to Celebrate
        </div>
      </div>
    </div>
  );
};

export default Rsvp;

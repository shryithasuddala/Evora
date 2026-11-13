import { useState } from "react";
import {
  Loader2,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Download,
  RefreshCw,
} from "lucide-react";
import { aiAPI } from "../../services/api";

const STYLES = [
  "Traditional and elegant",
  "Modern and minimalist",
  "Royal and festive",
  "Warm and casual",
  "Poetic and romantic",
];

const LANGUAGES = [
  "English",
  "Hindi",
  "Telugu",
  "Tamil",
  "Kannada",
  "Marathi",
  "Bengali",
  "Gujarati",
];

const InvitationGeneratorFeature = () => {
  const [eventName, setEventName] = useState("Wedding");
  const [hostName, setHostName] = useState("Shryitha");
  const [date, setDate] = useState("2026-12-20");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [location, setLocation] = useState("Hyderabad");
  const [style, setStyle] = useState("Traditional and elegant");
  const [language, setLanguage] = useState("English");
  const [additionalDetails, setAdditionalDetails] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [invitation, setInvitation] = useState(null);
  const [editableHeadline, setEditableHeadline] = useState("");
  const [editableMessage, setEditableMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const generateInvitation = async (e) => {
    e?.preventDefault();
    setError("");
    if (!eventName.trim() || !hostName.trim()) {
      setError("Event name and host name are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await aiAPI.invitation({
        eventName: eventName.trim(),
        hostName: hostName.trim(),
        date: date.trim(),
        time: time.trim(),
        venue: venue.trim(),
        location: location.trim(),
        style,
        language,
        additionalDetails: additionalDetails.trim(),
      });
      setInvitation(res);
      setEditableHeadline(res.headline || eventName);
      setEditableMessage(res.message || "");
      setCopied(false);
    } catch (err) {
      setError(err.message || "Failed to generate invitation.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!editableMessage) return;
    const text = `${editableHeadline ? `${editableHeadline}\n\n` : ""}${editableMessage}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const handleDownloadTxt = () => {
    if (!editableMessage) return;
    const content = `${editableHeadline ? `${editableHeadline}\n\n` : ""}${editableMessage}\n`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-invitation.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCardPng = () => {
    if (!editableMessage) return;
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 1200;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // EVORA Cream + Forest Green + Gold card
    ctx.fillStyle = "#F8F4E9";
    ctx.fillRect(0, 0, 960, 1200);

    ctx.strokeStyle = "#C9A13A";
    ctx.lineWidth = 6;
    ctx.strokeRect(36, 36, 888, 1128);

    ctx.strokeStyle = "#304B35";
    ctx.lineWidth = 2;
    ctx.strokeRect(52, 52, 856, 1096);

    ctx.textAlign = "center";
    ctx.fillStyle = "#304B35";
    ctx.font = "bold 28px Georgia, serif";
    ctx.fillText("EVORA – MADE TO CELEBRATE", 480, 130);

    ctx.fillStyle = "#C9A13A";
    ctx.font = "bold 40px Georgia, serif";
    ctx.fillText(editableHeadline || eventName, 480, 210);

    ctx.fillStyle = "#1F3324";
    ctx.font = "22px sans-serif";

    const lines = [];
    for (const para of editableMessage.split("\n")) {
      if (!para.trim()) {
        lines.push("");
        continue;
      }
      let current = "";
      for (const word of para.split(" ")) {
        const test = current ? `${current} ${word}` : word;
        if (ctx.measureText(test).width > 740) {
          lines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
    }

    let y = 300;
    for (const line of lines.slice(0, 22)) {
      if (line === "") {
        y += 18;
      } else {
        ctx.fillText(line, 480, y);
        y += 34;
      }
    }

    // Only print user-provided details at bottom
    const footerParts = [
      date ? `Date: ${date}` : "",
      time ? `Time: ${time}` : "",
      [venue, location].filter(Boolean).join(", ")
        ? `Venue: ${[venue, location].filter(Boolean).join(", ")}`
        : "",
    ].filter(Boolean);

    let fy = 1010;
    ctx.fillStyle = "#304B35";
    ctx.font = "bold 20px sans-serif";
    for (const part of footerParts) {
      ctx.fillText(part, 480, fy);
      fy += 32;
    }

    const link = document.createElement("a");
    link.download = `${eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-card.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const inputStyle = {
    width: "100%",
    padding: "8px 11px",
    borderRadius: 8,
    border: "1px solid #718365",
    background: "#FFFFFF",
    color: "#1F3324",
    fontSize: 13,
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "#304B35",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <form
        onSubmit={generateInvitation}
        style={{
          background: "#F8F4E9",
          border: "1px solid #EEE7D7",
          borderRadius: 12,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <div>
            <label style={labelStyle}>Event Name *</label>
            <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. Wedding" style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Host Name *</label>
            <input type="text" value={hostName} onChange={(e) => setHostName(e.target.value)} placeholder="e.g. Shryitha" style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Date (Optional)</label>
            <input type="text" value={date} onChange={(e) => setDate(e.target.value)} placeholder="e.g. 20 December 2026" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Time (Optional)</label>
            <input type="text" value={time} onChange={(e) => setTime(e.target.value)} placeholder="Leave blank if undecided" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Venue (Optional)</label>
            <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Taj Falaknuma Palace" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>City / Location (Optional)</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Hyderabad" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Invitation Style</label>
            <select value={style} onChange={(e) => setStyle(e.target.value)} style={inputStyle}>
              {STYLES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} style={inputStyle}>
              {LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={labelStyle}>Additional Details (Optional)</label>
          <input
            type="text"
            value={additionalDetails}
            onChange={(e) => setAdditionalDetails(e.target.value)}
            placeholder="e.g. Dinner follows, traditional attire, RSVP note"
            style={inputStyle}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#718365" }}>
            Blank fields are strictly omitted—AI will never invent missing time or venue details.
          </span>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "#304B35",
              color: "#F8F4E9",
              fontSize: 13,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? (
              <>
                <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                Crafting Invitation…
              </>
            ) : (
              <>
                <Sparkles size={15} color="#C9A13A" />
                Generate Invitation
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", borderRadius: 10, padding: "10px 14px", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {invitation && (
        <div
          style={{
            background: "#F8F4E9",
            border: "2px solid #C9A13A",
            borderRadius: 14,
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#304B35" }}>
              Preview & Edit ({invitation.language} · {invitation.style})
            </span>
            <button
              type="button"
              onClick={generateInvitation}
              disabled={loading}
              style={{
                background: "#FFFFFF",
                border: "1px solid #718365",
                color: "#304B35",
                borderRadius: 8,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
              }}
            >
              <RefreshCw size={13} /> Regenerate
            </button>
          </div>

          <input
            type="text"
            value={editableHeadline}
            onChange={(e) => setEditableHeadline(e.target.value)}
            aria-label="Invitation Headline"
            style={{
              ...inputStyle,
              fontFamily: "Playfair Display, serif",
              fontSize: 18,
              fontWeight: 700,
              textAlign: "center",
              borderColor: "#C9A13A",
            }}
          />

          <textarea
            rows={6}
            value={editableMessage}
            onChange={(e) => setEditableMessage(e.target.value)}
            aria-label="Invitation Message"
            style={{
              ...inputStyle,
              lineHeight: 1.65,
              resize: "vertical",
              borderColor: "#C9A13A",
            }}
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleCopy}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #304B35",
                background: copied ? "#304B35" : "#FFFFFF",
                color: copied ? "#F8F4E9" : "#304B35",
                fontSize: 12,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy Message"}
            </button>
            <button
              type="button"
              onClick={handleDownloadTxt}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #718365",
                background: "#EEE7D7",
                color: "#1F3324",
                fontSize: 12,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
              }}
            >
              <Download size={14} /> Download .TXT
            </button>
            <button
              type="button"
              onClick={handleDownloadCardPng}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "none",
                background: "#1F3324",
                color: "#F8F4E9",
                fontSize: 12,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
              }}
            >
              <Download size={14} color="#C9A13A" /> Download Card (.PNG)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvitationGeneratorFeature;

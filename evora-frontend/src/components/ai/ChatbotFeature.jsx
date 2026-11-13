import { useState, useRef, useEffect } from "react";
import { Send, Loader2, AlertCircle, RotateCcw, Sparkles } from "lucide-react";
import { aiAPI } from "../../services/api";

const STARTER_PROMPTS = [
  "I am planning a birthday party for 100 guests. What services should I select?",
  "How do I create an event and track vendor proposals in EVORA?",
  "I am hosting a 200-guest wedding in Hyderabad. What preparation steps should I start first?",
];

const INITIAL_MESSAGES = [
  {
    sender: "ai",
    text: "Hello! I am your EVORA AI Assistant. Ask me any event-planning question—about choosing services, preparing timelines, or creating and managing your celebration in EVORA.",
  },
];

const ChatbotFeature = () => {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastFailedPrompt, setLastFailedPrompt] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (overrideText) => {
    const text = (overrideText !== undefined ? overrideText : input).trim();
    if (!text || loading) return;

    setError("");
    setLastFailedPrompt("");

    const priorHistory = messages;
    const nextMessages = [...priorHistory, { sender: "user", text }];
    setMessages(nextMessages);
    if (overrideText === undefined) setInput("");
    setLoading(true);

    try {
      const res = await aiAPI.chat(text, priorHistory);
      if (!res?.reply) {
        throw new Error("No response received from EVORA AI.");
      }
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: res.reply,
          suggestions: Array.isArray(res.suggestions) ? res.suggestions : [],
        },
      ]);
    } catch (err) {
      setError(err.message || "Failed to reach EVORA AI Assistant.");
      setLastFailedPrompt(text);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages(INITIAL_MESSAGES);
    setError("");
    setLastFailedPrompt("");
    setInput("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Quick Starter Prompts */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={loading}
              onClick={() => sendMessage(prompt)}
              style={{
                background: "#F8F4E9",
                border: "1px solid #C9A13A",
                color: "#1F3324",
                borderRadius: 16,
                padding: "5px 11px",
                fontSize: 11,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                textAlign: "left",
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleReset}
          disabled={loading}
          title="Reset conversation"
          style={{
            background: "transparent",
            border: "1px solid #718365",
            color: "#304B35",
            borderRadius: 8,
            padding: "4px 10px",
            fontSize: 11,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          <RotateCcw size={12} /> Clear Chat
        </button>
      </div>

      {/* Conversation History */}
      <div
        style={{
          background: "#F8F4E9",
          border: "1px solid #EEE7D7",
          borderRadius: 12,
          padding: 14,
          height: 330,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.map((m, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              background: m.sender === "user" ? "#304B35" : "#FFFFFF",
              color: m.sender === "user" ? "#F8F4E9" : "#1F3324",
              border: m.sender === "user" ? "none" : "1px solid #EEE7D7",
              borderRadius: 12,
              padding: "10px 14px",
              fontSize: 13,
              lineHeight: 1.55,
              boxShadow: "0 1px 4px rgba(31,51,36,0.06)",
            }}
          >
            <div style={{ whiteSpace: "pre-line" }}>{m.text}</div>
            {m.suggestions && m.suggestions.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {m.suggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    disabled={loading}
                    onClick={() => sendMessage(sug)}
                    style={{
                      background: "#EEE7D7",
                      border: "1px solid #C9A13A",
                      color: "#1F3324",
                      borderRadius: 14,
                      padding: "3px 9px",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: loading ? "not-allowed" : "pointer",
                    }}
                  >
                    {sug} →
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div
            style={{
              alignSelf: "flex-start",
              background: "#FFFFFF",
              border: "1px solid #EEE7D7",
              borderRadius: 12,
              padding: "10px 14px",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              color: "#304B35",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            EVORA AI is thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Explicit Error State */}
      {error && (
        <div
          role="alert"
          style={{
            background: "#FEF2F2",
            border: "1px solid #FCA5A5",
            color: "#991B1B",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <AlertCircle size={15} />
            {error}
          </span>
          {lastFailedPrompt && (
            <button
              type="button"
              onClick={() => sendMessage(lastFailedPrompt)}
              style={{
                background: "#991B1B",
                color: "#FFF",
                border: "none",
                borderRadius: 6,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        style={{ display: "flex", gap: 8 }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask any event-planning or EVORA question…"
          disabled={loading}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #718365",
            background: "#FFFFFF",
            color: "#1F3324",
            fontSize: 13,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: loading || !input.trim() ? "#718365" : "#304B35",
            color: "#F8F4E9",
            fontSize: 13,
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
          }}
        >
          {loading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={15} color="#C9A13A" />}
          Send
        </button>
      </form>

      <div style={{ fontSize: 11, color: "#718365", display: "flex", alignItems: "center", gap: 4 }}>
        <Sparkles size={12} color="#C9A13A" />
        Powered by live Gemini AI via secure EVORA backend
      </div>
    </div>
  );
};

export default ChatbotFeature;

/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, XCircle, Info, MessageCircle, X } from "lucide-react";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, message = "", type = "success", duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (title, message = "") =>
      addToast({ title, message, type: "success" }),
    error: (title, message = "") =>
      addToast({ title, message, type: "error" }),
    info: (title, message = "") =>
      addToast({ title, message, type: "info" }),
    whatsapp: (title, message = "") =>
      addToast({ title, message, type: "whatsapp", duration: 5500 }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Render View */}
      <div
        style={{
          position: "fixed",
          bottom: "24px",
          left: "24px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxWidth: "380px",
          width: "calc(100% - 48px)",
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => {
          const isWhatsApp = t.type === "whatsapp";
          const isError = t.type === "error";
          const isSuccess = t.type === "success";

          let accentColor = "#C9A13A";
          let bgGradient = "linear-gradient(135deg, #2B1D12, #3D2B1C)";
          let Icon = Info;

          if (isWhatsApp) {
            accentColor = "#25D366";
            bgGradient = "linear-gradient(135deg, #163620, #0E2415)";
            Icon = MessageCircle;
          } else if (isSuccess) {
            accentColor = "#304B35";
            bgGradient = "linear-gradient(135deg, #243527, #19271C)";
            Icon = CheckCircle2;
          } else if (isError) {
            accentColor = "#D9534F";
            bgGradient = "linear-gradient(135deg, #3A1B1A, #281110)";
            Icon = XCircle;
          }

          return (
            <div
              key={t.id}
              style={{
                pointerEvents: "auto",
                background: bgGradient,
                color: "#FAF5EA",
                borderRadius: "14px",
                padding: "14px 18px",
                border: `1px solid ${accentColor}55`,
                boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                animation: "toastSlideIn 0.25s ease-out",
              }}
            >
              <div style={{ color: accentColor, marginTop: "2px" }}>
                <Icon size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: "0 0 2px", fontSize: "14px", fontWeight: 600, color: "#FFFDF9" }}>
                  {t.title}
                </h4>
                {t.message && (
                  <p style={{ margin: 0, fontSize: "12px", color: "#D7CFC7", lineHeight: 1.4 }}>
                    {t.message}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                style={{ background: "transparent", border: "none", color: "#D7CFC7", cursor: "pointer", padding: "2px" }}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      success: (msg) => console.log("[Success]", msg),
      error: (msg) => console.error("[Error]", msg),
      info: (msg) => console.log("[Info]", msg),
      whatsapp: (msg) => console.log("[WhatsApp]", msg),
    };
  }
  return context;
};

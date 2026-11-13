import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  MessageSquare,
  Wallet,
  Utensils,
  Mail,
  CheckSquare,
  Sparkles,
  ExternalLink,
  Lock,
} from "lucide-react";
import ChatbotFeature from "../ai/ChatbotFeature";
import BudgetAssistantFeature from "../ai/BudgetAssistantFeature";
import FoodRecommendationFeature from "../ai/FoodRecommendationFeature";
import InvitationGeneratorFeature from "../ai/InvitationGeneratorFeature";
import ChecklistGeneratorFeature from "../ai/ChecklistGeneratorFeature";
import EventPlanningAssistantFeature from "../ai/EventPlanningAssistantFeature";

const TABS = [
  { id: "chat", label: "1. AI Chatbot", icon: MessageSquare, active: true },
  { id: "budget", label: "2. Budget Assistant", icon: Wallet, active: true },
  { id: "food", label: "3. Food Recommendation", icon: Utensils, active: true },
  { id: "invitation", label: "4. Invitation Generator", icon: Mail, active: true },
  { id: "checklist", label: "5. Checklist Generator", icon: CheckSquare, active: true },
  { id: "plan", label: "6. Planning Assistant", icon: Sparkles, active: true },
];

const AICopilotModal = ({ isOpen, onClose, initialTab = "chat" }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(
    TABS.some((t) => t.id === initialTab && t.active) ? initialTab : "chat"
  );

  useEffect(() => {
    if (isOpen) {
      const target = TABS.find((t) => t.id === initialTab && t.active);
      setActiveTab(target ? target.id : "chat");
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        background: "rgba(31, 51, 36, 0.55)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 880,
          maxHeight: "90vh",
          background: "#F8F4E9",
          border: "1.5px solid #C9A13A",
          borderRadius: 18,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 48px rgba(31, 51, 36, 0.28)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #1F3324 0%, #304B35 100%)",
            color: "#F8F4E9",
            padding: "16px 22px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={20} color="#C9A13A" />
            <div>
              <h2 style={{ margin: 0, fontFamily: "Playfair Display, serif", fontSize: 20 }}>
                EVORA AI Planning Suite
              </h2>
              <span style={{ fontSize: 11, color: "#EEE7D7" }}>
                Quick AI Assistant Drawer
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/user/ai?feature=${activeTab}`);
              }}
              style={{
                background: "rgba(248,244,233,0.12)",
                color: "#F8F4E9",
                border: "1px solid #C9A13A",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
              }}
            >
              Full AI Hub <ExternalLink size={13} color="#C9A13A" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close AI modal"
              style={{
                background: "transparent",
                border: "none",
                color: "#F8F4E9",
                cursor: "pointer",
                padding: 4,
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            background: "#EEE7D7",
            borderBottom: "1px solid #D8CEB8",
            padding: "8px 16px",
            display: "flex",
            gap: 6,
            overflowX: "auto",
          }}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                disabled={!tab.active}
                onClick={() => tab.active && setActiveTab(tab.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 12px",
                  borderRadius: 18,
                  border: isSel ? "1px solid #C9A13A" : "1px solid transparent",
                  background: isSel ? "#304B35" : "transparent",
                  color: isSel ? "#F8F4E9" : tab.active ? "#1F3324" : "#718365",
                  fontSize: 12,
                  fontWeight: isSel ? 700 : 500,
                  whiteSpace: "nowrap",
                  cursor: tab.active ? "pointer" : "not-allowed",
                  opacity: tab.active ? 1 : 0.65,
                }}
              >
                {tab.active ? (
                  <Icon size={14} color={isSel ? "#C9A13A" : "#304B35"} />
                ) : (
                  <Lock size={12} />
                )}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ padding: 20, overflowY: "auto", flex: 1, background: "#FFFFFF" }}>
          {activeTab === "chat" && <ChatbotFeature />}
          {activeTab === "budget" && <BudgetAssistantFeature />}
          {activeTab === "food" && <FoodRecommendationFeature />}
          {activeTab === "invitation" && <InvitationGeneratorFeature />}
          {activeTab === "checklist" && <ChecklistGeneratorFeature />}
          {activeTab === "plan" && <EventPlanningAssistantFeature onAfterTransfer={onClose} />}
        </div>
      </div>
    </div>
  );
};

export default AICopilotModal;

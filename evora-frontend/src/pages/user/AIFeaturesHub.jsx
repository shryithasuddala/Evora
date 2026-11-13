import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MessageSquare,
  Wallet,
  Utensils,
  Mail,
  CheckSquare,
  Sparkles,
  ChevronUp,
  ArrowRight,
  Lock,
} from "lucide-react";
import ChatbotFeature from "../../components/ai/ChatbotFeature";
import BudgetAssistantFeature from "../../components/ai/BudgetAssistantFeature";
import FoodRecommendationFeature from "../../components/ai/FoodRecommendationFeature";
import InvitationGeneratorFeature from "../../components/ai/InvitationGeneratorFeature";
import ChecklistGeneratorFeature from "../../components/ai/ChecklistGeneratorFeature";
import EventPlanningAssistantFeature from "../../components/ai/EventPlanningAssistantFeature";

const AI_FEATURES = [
  {
    id: "chat",
    name: "EVORA AI Chatbot",
    description:
      "Ask natural-language event-planning questions, get service selection guidance, preparation advice, and step-by-step help creating events in EVORA.",
    icon: MessageSquare,
    status: "active",
    ctaLabel: "Use AI Chatbot",
  },
  {
    id: "budget",
    name: "AI Budget Assistant",
    description:
      "Distribute your event budget across selected services using platform pricing context, edit allocations, spot overruns, and explore cheaper alternatives.",
    icon: Wallet,
    status: "active",
    ctaLabel: "Use Budget Assistant",
  },
  {
    id: "food",
    name: "AI Food Recommendation",
    description:
      "Generate guest-scaled menus, serving quantities, dietary/allergy alternatives, cost estimates, and waste-reduction insights—editable and saveable.",
    icon: Utensils,
    status: "active",
    ctaLabel: "Use Food Planner",
  },
  {
    id: "invitation",
    name: "AI Invitation Generator",
    description:
      "Create personalized invitations in your chosen style and language strictly using your exact event details, with edit, copy, and download options.",
    icon: Mail,
    status: "active",
    ctaLabel: "Create Invitation",
  },
  {
    id: "checklist",
    name: "AI Checklist Generator",
    description:
      "Automatically build preparation timelines anchored to your event date with persistent task tracking, completion counts, and custom task edits.",
    icon: CheckSquare,
    status: "active",
    ctaLabel: "Open Checklist Generator",
  },
  {
    id: "plan",
    name: "AI Event Planning Assistant",
    description:
      "Describe your celebration in plain English to generate an editable event blueprint and transfer selected details directly into Create Event.",
    icon: Sparkles,
    status: "active",
    ctaLabel: "Open Planning Assistant",
  },
];

const AIFeaturesHub = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFeature = searchParams.get("feature");
  const [openFeatureId, setOpenFeatureId] = useState(
    AI_FEATURES.some((f) => f.id === initialFeature && f.status === "active")
      ? initialFeature
      : "chat"
  );

  useEffect(() => {
    const param = searchParams.get("feature");
    if (param) {
      const target = AI_FEATURES.find((f) => f.id === param && f.status === "active");
      if (target) setOpenFeatureId(target.id);
    }
  }, [searchParams]);

  const handleToggleCard = (feature) => {
    if (feature.status !== "active") return;
    const next = openFeatureId === feature.id ? null : feature.id;
    setOpenFeatureId(next);
    if (next) {
      setSearchParams({ feature: next }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const renderFeatureWorkspace = (featureId) => {
    switch (featureId) {
      case "chat":
        return <ChatbotFeature />;
      case "budget":
        return <BudgetAssistantFeature />;
      case "food":
        return <FoodRecommendationFeature />;
      case "invitation":
        return <InvitationGeneratorFeature />;
      case "checklist":
        return <ChecklistGeneratorFeature />;
      case "plan":
        return <EventPlanningAssistantFeature />;
      default:
        return null;
    }
  };

  return (
    <div className="vendor-page" style={{ background: "#F8F4E9", minHeight: "100%" }}>
      {/* Hero Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #1F3324 0%, #304B35 100%)",
          borderRadius: 16,
          padding: "26px 28px",
          marginBottom: 24,
          color: "#F8F4E9",
          border: "1px solid #C9A13A55",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1.4,
              color: "#C9A13A",
              textTransform: "uppercase",
            }}
          >
            EVORA – MADE TO CELEBRATE
          </span>
          <h1
            style={{
              fontFamily: "Playfair Display, serif",
              fontSize: 30,
              margin: "6px 0 6px",
              color: "#F8F4E9",
            }}
          >
            AI Planning Suite
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "#EEE7D7", maxWidth: 680 }}>
            Six specialized AI planning assistants built for EVORA hosts. Open any active tool below to plan with live AI intelligence.
          </p>
        </div>

        <div
          style={{
            background: "rgba(248, 244, 233, 0.1)",
            border: "1px solid #C9A13A66",
            borderRadius: 12,
            padding: "10px 16px",
            fontSize: 12,
            color: "#F8F4E9",
          }}
        >
          <strong style={{ color: "#C9A13A" }}>
            {AI_FEATURES.filter((f) => f.status === "active").length} of {AI_FEATURES.length}
          </strong>{" "}
          AI Modules Active
        </div>
      </div>

      {/* Six Separate AI Feature Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 18,
          alignItems: "start",
        }}
      >
        {AI_FEATURES.map((feature) => {
          const Icon = feature.icon;
          const isActive = feature.status === "active";
          const isOpen = isActive && openFeatureId === feature.id;

          return (
            <section
              key={feature.id}
              style={{
                gridColumn: isOpen ? "1 / -1" : undefined,
                background: "#FFFFFF",
                border: isOpen
                  ? "2px solid #304B35"
                  : isActive
                  ? "1.5px solid #C9A13A"
                  : "1px solid #EEE7D7",
                borderRadius: 16,
                padding: 22,
                boxShadow: isOpen
                  ? "0 12px 28px rgba(31, 51, 36, 0.12)"
                  : "0 4px 14px rgba(31, 51, 36, 0.05)",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                opacity: isActive ? 1 : 0.85,
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: isActive ? "#304B35" : "#EEE7D7",
                      color: isActive ? "#C9A13A" : "#718365",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <h2
                        style={{
                          fontFamily: "Playfair Display, serif",
                          fontSize: 19,
                          margin: 0,
                          color: "#1F3324",
                        }}
                      >
                        {feature.name}
                      </h2>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 0.4,
                          padding: "2px 8px",
                          borderRadius: 999,
                          textTransform: "uppercase",
                          background: isActive ? "#EAF0EA" : "#EEE7D7",
                          color: isActive ? "#304B35" : "#718365",
                          border: isActive ? "1px solid #718365" : "1px solid #D8CEB8",
                        }}
                      >
                        {isActive ? "Active" : "In Development"}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: "#718365",
                      }}
                    >
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Action Row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: 10,
                  borderTop: "1px solid #EEE7D7",
                }}
              >
                <span style={{ fontSize: 12, color: isActive ? "#304B35" : "#718365" }}>
                  {isActive
                    ? isOpen
                      ? "Workspace open below"
                      : "Ready to use"
                    : "Scheduled for upcoming rollout step"}
                </span>

                {isActive ? (
                  <button
                    type="button"
                    onClick={() => handleToggleCard(feature)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 10,
                      border: isOpen ? "1px solid #304B35" : "none",
                      background: isOpen ? "#EEE7D7" : "#304B35",
                      color: isOpen ? "#1F3324" : "#F8F4E9",
                      fontSize: 13,
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                    }}
                  >
                    {isOpen ? (
                      <>
                        Hide <ChevronUp size={15} />
                      </>
                    ) : (
                      <>
                        {feature.ctaLabel} <ArrowRight size={15} color="#C9A13A" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    style={{
                      padding: "8px 16px",
                      borderRadius: 10,
                      border: "1px solid #D8CEB8",
                      background: "#EEE7D7",
                      color: "#718365",
                      fontSize: 12,
                      fontWeight: 600,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "not-allowed",
                    }}
                  >
                    <Lock size={13} />
                    {feature.ctaLabel}
                  </button>
                )}
              </div>

              {/* Functional Input & AI Output Workspace */}
              {isOpen && (
                <div
                  style={{
                    marginTop: 4,
                    paddingTop: 16,
                    borderTop: "1px dashed #C9A13A88",
                  }}
                >
                  {renderFeatureWorkspace(feature.id)}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default AIFeaturesHub;

import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  AlertCircle,
  Sparkles,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  CalendarDays,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { aiAPI, eventsAPI } from "../../services/api";

const EVENT_TYPE_OPTIONS = [
  "Wedding",
  "Birthday",
  "Corporate",
  "Anniversary",
  "Engagement",
  "Festival",
  "Graduation",
  "Other",
];

const SERVICE_OPTIONS = [
  "Venue",
  "Catering",
  "Photography",
  "Decoration",
  "Music & Sound",
  "Makeup & Styling",
];

const CATEGORY_OPTIONS = [
  "Venue",
  "Catering",
  "Photography",
  "Decoration",
  "Music & Sound",
  "Guests",
  "Logistics",
  "General",
];

function formatPhaseLabel(daysBefore) {
  const n = Math.max(0, Math.round(Number(daysBefore) || 0));
  if (n === 0) return "Event Day";
  if (n === 1) return "1 Day Before";
  return `${n} Days Before`;
}

function subtractDaysIso(dateStr, daysBefore) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || "")) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - Math.max(0, Math.round(Number(daysBefore) || 0)));
  return dt.toISOString().slice(0, 10);
}

function computeLocalCounts(tasks = []) {
  const total = tasks.length;
  const completed = tasks.filter((t) => Boolean(t.completed)).length;
  return { total, completed, pending: total - completed };
}

const ChecklistGeneratorFeature = () => {
  const [eventType, setEventType] = useState("Wedding");
  const [eventDate, setEventDate] = useState("2026-12-20");
  const [guestCount, setGuestCount] = useState("200");
  const [selectedServices, setSelectedServices] = useState([
    "Venue",
    "Catering",
    "Photography",
    "Decoration",
  ]);
  const [linkedEventId, setLinkedEventId] = useState("");
  const [userEvents, setUserEvents] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const [activeChecklist, setActiveChecklist] = useState(null);
  const [savedChecklists, setSavedChecklists] = useState([]);

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "General",
    daysBefore: "7",
  });
  const [editingIndex, setEditingIndex] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  const loadInitialData = async () => {
    try {
      const [checklistsRes, eventsRes] = await Promise.allSettled([
        aiAPI.getSavedChecklists(),
        eventsAPI.getAll(),
      ]);
      if (checklistsRes.status === "fulfilled") {
        const list = checklistsRes.value || [];
        setSavedChecklists(list);
        if (list.length > 0 && !activeChecklist) {
          setActiveChecklist(list[0]);
        }
      }
      if (eventsRes.status === "fulfilled") {
        const evList = Array.isArray(eventsRes.value)
          ? eventsRes.value
          : eventsRes.value?.events || [];
        setUserEvents(evList);
      }
    } catch {
      // silent initial load fallback
    }
  };

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectExistingEvent = (evId) => {
    setLinkedEventId(evId);
    if (!evId) return;
    const ev = userEvents.find((item) => item._id === evId);
    if (!ev) return;
    if (ev.category) setEventType(ev.category);
    if (ev.date) setEventDate(String(ev.date).slice(0, 10));
    if (ev.guestCount) setGuestCount(String(ev.guestCount));
    const svcs = ev.requestedServices?.length
      ? ev.requestedServices
      : (ev.requiredServices || []).map((s) => s.name || s.category).filter(Boolean);
    if (svcs.length > 0) setSelectedServices(svcs);
  };

  const toggleService = (service) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const handleGenerate = async (e) => {
    e?.preventDefault();
    setError("");
    setStatusMessage("");

    if (!eventType.trim()) {
      setError("Please select or enter an event type.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      setError("Please provide a valid event date (YYYY-MM-DD).");
      return;
    }

    setLoading(true);
    try {
      const res = await aiAPI.checklist({
        eventType: eventType.trim(),
        eventDate,
        guestCount: Number(guestCount) || 100,
        services: selectedServices,
        eventId: linkedEventId || null,
      });
      const created = res.checklist;
      setActiveChecklist(created);
      setSavedChecklists((prev) => [created, ...prev.filter((c) => c._id !== created._id)]);
      setStatusMessage("Checklist generated and saved privately to your account.");
      setEditingIndex(null);
      setEditDraft(null);
    } catch (err) {
      setError(err.message || "Failed to generate checklist.");
    } finally {
      setLoading(false);
    }
  };

  const persistChecklistTasks = async (nextTasks, message = "Progress saved.") => {
    if (!activeChecklist?._id) return;
    const previous = activeChecklist;
    setActiveChecklist({ ...activeChecklist, tasks: nextTasks });
    setSaving(true);
    setError("");
    try {
      const res = await aiAPI.updateSavedChecklist(activeChecklist._id, {
        title: activeChecklist.title,
        eventDate: activeChecklist.eventDate,
        tasks: nextTasks,
      });
      const updated = res.checklist;
      setActiveChecklist(updated);
      setSavedChecklists((prev) =>
        prev.map((item) => (item._id === updated._id ? updated : item))
      );
      if (message) setStatusMessage(message);
    } catch (err) {
      setActiveChecklist(previous);
      setError(err.message || "Failed to save checklist changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTask = (taskIndex) => {
    if (!activeChecklist) return;
    const nextTasks = activeChecklist.tasks.map((t, idx) =>
      idx === taskIndex ? { ...t, completed: !t.completed } : t
    );
    persistChecklistTasks(nextTasks, "");
  };

  const handleAddTask = async (e) => {
    e?.preventDefault();
    if (!activeChecklist) return;
    if (!newTask.title.trim()) {
      setError("Please enter a task title before adding.");
      return;
    }

    const daysBefore = Math.max(0, Math.round(Number(newTask.daysBefore) || 0));
    const added = {
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      category: newTask.category || "General",
      daysBefore,
      phase: formatPhaseLabel(daysBefore),
      dueDate: subtractDaysIso(activeChecklist.eventDate, daysBefore),
      completed: false,
    };

    const nextTasks = [...(activeChecklist.tasks || []), added].sort(
      (a, b) => b.daysBefore - a.daysBefore
    );
    await persistChecklistTasks(nextTasks, "Task added and saved.");
    setNewTask({ title: "", description: "", category: "General", daysBefore: "7" });
  };

  const handleStartEdit = (taskIndex) => {
    const task = activeChecklist.tasks[taskIndex];
    setEditingIndex(taskIndex);
    setEditDraft({
      title: task.title || "",
      description: task.description || "",
      category: task.category || "General",
      daysBefore: String(task.daysBefore ?? 7),
    });
  };

  const handleSaveEdit = async (taskIndex) => {
    if (!editDraft?.title?.trim()) {
      setError("Task title cannot be empty.");
      return;
    }
    const daysBefore = Math.max(0, Math.round(Number(editDraft.daysBefore) || 0));
    const nextTasks = activeChecklist.tasks
      .map((t, idx) =>
        idx === taskIndex
          ? {
              ...t,
              title: editDraft.title.trim(),
              description: editDraft.description.trim(),
              category: editDraft.category || "General",
              daysBefore,
              phase: formatPhaseLabel(daysBefore),
              dueDate: subtractDaysIso(activeChecklist.eventDate, daysBefore),
            }
          : t
      )
      .sort((a, b) => b.daysBefore - a.daysBefore);

    setEditingIndex(null);
    setEditDraft(null);
    await persistChecklistTasks(nextTasks, "Task updated and saved.");
  };

  const handleDeleteTask = async (taskIndex) => {
    if (!activeChecklist) return;
    const nextTasks = activeChecklist.tasks.filter((_, idx) => idx !== taskIndex);
    if (editingIndex === taskIndex) {
      setEditingIndex(null);
      setEditDraft(null);
    }
    await persistChecklistTasks(nextTasks, "Task deleted.");
  };

  const handleDeleteChecklist = async (id) => {
    setError("");
    setStatusMessage("");
    try {
      await aiAPI.deleteSavedChecklist(id);
      const remaining = savedChecklists.filter((c) => c._id !== id);
      setSavedChecklists(remaining);
      if (activeChecklist?._id === id) {
        setActiveChecklist(remaining[0] || null);
      }
      setStatusMessage("Checklist deleted.");
    } catch (err) {
      setError(err.message || "Failed to delete checklist.");
    }
  };

  const counts = useMemo(
    () => computeLocalCounts(activeChecklist?.tasks || []),
    [activeChecklist]
  );

  const groupedPhases = useMemo(() => {
    if (!activeChecklist?.tasks?.length) return [];
    const map = new Map();
    activeChecklist.tasks.forEach((task, index) => {
      const key = task.phase || formatPhaseLabel(task.daysBefore);
      if (!map.has(key)) {
        map.set(key, {
          phase: key,
          daysBefore: Number(task.daysBefore) || 0,
          dueDate: task.dueDate || subtractDaysIso(activeChecklist.eventDate, task.daysBefore),
          items: [],
        });
      }
      map.get(key).items.push({ task, index });
    });
    return Array.from(map.values()).sort((a, b) => b.daysBefore - a.daysBefore);
  }, [activeChecklist]);

  const completionPct =
    counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Input Form */}
      <form
        onSubmit={handleGenerate}
        style={{
          background: "#F8F4E9",
          border: "1px solid #DDD2BE",
          borderRadius: 12,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {userEvents.length > 0 && (
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#1F3324",
                marginBottom: 4,
              }}
            >
              Pre-fill from one of your EVORA events (optional)
            </label>
            <select
              value={linkedEventId}
              onChange={(e) => handleSelectExistingEvent(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 10px",
                borderRadius: 8,
                border: "1px solid #C8BDA6",
                background: "#FFFFFF",
                fontSize: 13,
              }}
            >
              <option value="">-- Custom Checklist Details --</option>
              {userEvents.map((ev) => (
                <option key={ev._id} value={ev._id}>
                  {ev.title} ({ev.category} · {ev.date || "Date TBD"})
                </option>
              ))}
            </select>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#1F3324",
                marginBottom: 4,
              }}
            >
              Event Type *
            </label>
            <select
              value={EVENT_TYPE_OPTIONS.includes(eventType) ? eventType : "Other"}
              onChange={(e) => setEventType(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 10px",
                borderRadius: 8,
                border: "1px solid #C8BDA6",
                background: "#FFFFFF",
                fontSize: 13,
              }}
            >
              {EVENT_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#1F3324",
                marginBottom: 4,
              }}
            >
              Event Date *
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #C8BDA6",
                background: "#FFFFFF",
                fontSize: 13,
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                color: "#1F3324",
                marginBottom: 4,
              }}
            >
              Guest Count
            </label>
            <input
              type="number"
              min="1"
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 10px",
                borderRadius: 8,
                border: "1px solid #C8BDA6",
                background: "#FFFFFF",
                fontSize: 13,
              }}
            />
          </div>
        </div>

        <div>
          <span
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#1F3324",
              marginBottom: 6,
            }}
          >
            Selected Services
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SERVICE_OPTIONS.map((service) => {
              const active = selectedServices.includes(service);
              return (
                <button
                  key={service}
                  type="button"
                  onClick={() => toggleService(service)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: active ? "1px solid #304B35" : "1px solid #C8BDA6",
                    background: active ? "#304B35" : "#FFFFFF",
                    color: active ? "#FFFFFF" : "#304B35",
                  }}
                >
                  {active ? "✓ " : "+ "}
                  {service}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#304B35",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? "Generating Timeline..." : "Generate AI Checklist"}
          </button>
        </div>
      </form>

      {/* Error & Status Alerts */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#991B1B",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {statusMessage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#ECFDF5",
            border: "1px solid #A7F3D0",
            color: "#065F46",
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={15} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Saved Private Checklists Switcher */}
      {savedChecklists.length > 0 && (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E5DEC9",
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#1F3324",
              marginBottom: 8,
            }}
          >
            Your Saved Private Checklists ({savedChecklists.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {savedChecklists.map((cl) => {
              const isSelected = activeChecklist?._id === cl._id;
              const clCounts = computeLocalCounts(cl.tasks || []);
              return (
                <div
                  key={cl._id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    borderRadius: 8,
                    border: isSelected ? "1.5px solid #304B35" : "1px solid #DDD2BE",
                    background: isSelected ? "#F8F4E9" : "#FFFFFF",
                    padding: "6px 10px",
                    fontSize: 12,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChecklist(cl);
                      setEditingIndex(null);
                      setEditDraft(null);
                      setStatusMessage("");
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#1F3324",
                      fontWeight: isSelected ? 700 : 500,
                      textAlign: "left",
                      padding: 0,
                    }}
                  >
                    {cl.title} · {cl.eventDate} ({clCounts.completed}/{clCounts.total})
                  </button>
                  <button
                    type="button"
                    title="Delete checklist"
                    onClick={() => handleDeleteChecklist(cl._id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "#991B1B",
                      padding: 2,
                      display: "inline-flex",
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Checklist Workspace */}
      {activeChecklist && (
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #DDD2BE",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Summary Header + Task Counts */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              paddingBottom: 12,
              borderBottom: "1px solid #EEE7D7",
            }}
          >
            <div>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1F3324" }}>
                {activeChecklist.title}
              </h4>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 12,
                  color: "#718365",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <CalendarDays size={13} />
                Event Date: <strong>{activeChecklist.eventDate}</strong> ·{" "}
                {activeChecklist.eventType} · {activeChecklist.guestCount || 0} Guests
                {saving && " · Saving..."}
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  background: "#ECFDF5",
                  color: "#065F46",
                  border: "1px solid #A7F3D0",
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Completed: {counts.completed}
              </span>
              <span
                style={{
                  background: "#FFFBEB",
                  color: "#92400E",
                  border: "1px solid #FDE68A",
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Pending: {counts.pending}
              </span>
              <span
                style={{
                  background: "#EEE7D7",
                  color: "#1F3324",
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Total: {counts.total} ({completionPct}%)
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: "100%",
              height: 8,
              borderRadius: 999,
              background: "#EEE7D7",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${completionPct}%`,
                height: "100%",
                background: "#304B35",
                transition: "width 0.25s ease",
              }}
            />
          </div>

          {/* Timeline Phases */}
          {groupedPhases.length === 0 ? (
            <p style={{ fontSize: 13, color: "#718365", margin: 0 }}>
              No tasks in this checklist yet. Add a custom task below.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {groupedPhases.map((group) => (
                <div
                  key={group.phase}
                  style={{
                    background: "#F8F4E9",
                    border: "1px solid #E5DEC9",
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#304B35",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Clock size={14} color="#C9A13A" />
                      {group.phase}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#718365" }}>
                      Target Date: {group.dueDate}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {group.items.map(({ task, index }) => {
                      const isEditing = editingIndex === index;
                      return (
                        <div
                          key={task._id || `${index}-${task.title}`}
                          style={{
                            background: "#FFFFFF",
                            border: "1px solid #E5DEC9",
                            borderRadius: 8,
                            padding: "10px 12px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                          }}
                        >
                          {isEditing && editDraft ? (
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 130px 90px auto",
                                gap: 8,
                                alignItems: "center",
                              }}
                            >
                              <input
                                type="text"
                                value={editDraft.title}
                                onChange={(e) =>
                                  setEditDraft({ ...editDraft, title: e.target.value })
                                }
                                placeholder="Task title"
                                style={{
                                  padding: "6px 8px",
                                  borderRadius: 6,
                                  border: "1px solid #C8BDA6",
                                  fontSize: 13,
                                }}
                              />
                              <select
                                value={editDraft.category}
                                onChange={(e) =>
                                  setEditDraft({ ...editDraft, category: e.target.value })
                                }
                                style={{
                                  padding: "6px 8px",
                                  borderRadius: 6,
                                  border: "1px solid #C8BDA6",
                                  fontSize: 12,
                                }}
                              >
                                {CATEGORY_OPTIONS.map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min="0"
                                value={editDraft.daysBefore}
                                onChange={(e) =>
                                  setEditDraft({ ...editDraft, daysBefore: e.target.value })
                                }
                                title="Days before event"
                                style={{
                                  padding: "6px 8px",
                                  borderRadius: 6,
                                  border: "1px solid #C8BDA6",
                                  fontSize: 12,
                                }}
                              />
                              <div style={{ display: "flex", gap: 4 }}>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(index)}
                                  title="Save"
                                  style={{
                                    background: "#304B35",
                                    color: "#FFFFFF",
                                    border: "none",
                                    borderRadius: 6,
                                    padding: "6px 8px",
                                    cursor: "pointer",
                                  }}
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingIndex(null);
                                    setEditDraft(null);
                                  }}
                                  title="Cancel"
                                  style={{
                                    background: "#EEE7D7",
                                    color: "#1F3324",
                                    border: "none",
                                    borderRadius: 6,
                                    padding: "6px 8px",
                                    cursor: "pointer",
                                  }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: 10,
                              }}
                            >
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: 10,
                                  cursor: "pointer",
                                  flex: 1,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={Boolean(task.completed)}
                                  onChange={() => handleToggleTask(index)}
                                  style={{
                                    marginTop: 3,
                                    width: 16,
                                    height: 16,
                                    accentColor: "#304B35",
                                    cursor: "pointer",
                                  }}
                                />
                                <div>
                                  <div
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: task.completed ? "#718365" : "#1F3324",
                                      textDecoration: task.completed ? "line-through" : "none",
                                    }}
                                  >
                                    {task.title}
                                  </div>
                                  {task.description && (
                                    <div
                                      style={{
                                        fontSize: 12,
                                        color: "#5C6B57",
                                        marginTop: 2,
                                      }}
                                    >
                                      {task.description}
                                    </div>
                                  )}
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 8,
                                      marginTop: 4,
                                      fontSize: 11,
                                      color: "#718365",
                                    }}
                                  >
                                    <span
                                      style={{
                                        background: "#EEE7D7",
                                        color: "#304B35",
                                        padding: "1px 7px",
                                        borderRadius: 999,
                                        fontWeight: 600,
                                      }}
                                    >
                                      {task.category || "General"}
                                    </span>
                                    <span>Due: {task.dueDate}</span>
                                  </div>
                                </div>
                              </label>

                              <div style={{ display: "flex", gap: 4 }}>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(index)}
                                  title="Edit task"
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#304B35",
                                    padding: 4,
                                  }}
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(index)}
                                  title="Delete task"
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#991B1B",
                                    padding: 4,
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Custom Task Form */}
          <form
            onSubmit={handleAddTask}
            style={{
              background: "#F8F4E9",
              border: "1px dashed #C8BDA6",
              borderRadius: 10,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1F3324" }}>
              Add Custom Task
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 140px 110px auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <input
                type="text"
                placeholder="Task title (e.g. Confirm florist delivery time)"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #C8BDA6",
                  background: "#FFFFFF",
                  fontSize: 13,
                }}
              />
              <select
                value={newTask.category}
                onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #C8BDA6",
                  background: "#FFFFFF",
                  fontSize: 12,
                }}
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                value={newTask.daysBefore}
                onChange={(e) => setNewTask({ ...newTask, daysBefore: e.target.value })}
                placeholder="Days before"
                title="Days before event"
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #C8BDA6",
                  background: "#FFFFFF",
                  fontSize: 12,
                }}
              />
              <button
                type="submit"
                disabled={saving}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#304B35",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                <Plus size={14} /> Add
              </button>
            </div>
            <input
              type="text"
              placeholder="Optional note or detail"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              style={{
                padding: "7px 10px",
                borderRadius: 8,
                border: "1px solid #C8BDA6",
                background: "#FFFFFF",
                fontSize: 12,
              }}
            />
          </form>
        </div>
      )}
    </div>
  );
};

export default ChecklistGeneratorFeature;

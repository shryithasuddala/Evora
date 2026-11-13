import { useState, useEffect } from "react";
import {
  Loader2,
  AlertCircle,
  Sparkles,
  Save,
  Trash2,
  Plus,
  Leaf,
  CheckCircle2,
} from "lucide-react";
import { aiAPI } from "../../services/api";

const EVENT_TYPES = ["Wedding", "Birthday", "Corporate", "Anniversary", "Engagement", "Festival", "Private Party"];
const FOOD_PREFERENCES = ["Vegetarian", "Non-Vegetarian", "Mixed (Veg & Non-Veg)", "Vegan", "Jain"];
const MEAL_TYPES = ["Breakfast", "Lunch", "High Tea & Snacks", "Dinner", "Full Day"];

const COURSE_LABELS = [
  { key: "welcomeDrinks", label: "Welcome Drinks" },
  { key: "starters", label: "Starters" },
  { key: "mainCourse", label: "Main Course" },
  { key: "sideDishes", label: "Side Dishes" },
  { key: "desserts", label: "Desserts" },
];

const FoodRecommendationFeature = () => {
  const [eventType, setEventType] = useState("Wedding");
  const [guestCount, setGuestCount] = useState("200");
  const [budget, setBudget] = useState("60000");
  const [foodPreference, setFoodPreference] = useState("Vegetarian");
  const [mealType, setMealType] = useState("Dinner");
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [location, setLocation] = useState("Hyderabad");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const [menu, setMenu] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [savedMenus, setSavedMenus] = useState([]);

  const loadSavedMenus = async () => {
    try {
      const list = await aiAPI.getSavedMenus();
      setSavedMenus(list || []);
    } catch {
      // ignore silent initial load failure
    }
  };

  useEffect(() => {
    loadSavedMenus();
  }, []);

  const handleGenerate = async (e) => {
    e?.preventDefault();
    setError("");
    setSaveMessage("");
    const guestsNum = Number(guestCount);
    if (!guestsNum || guestsNum <= 0) {
      setError("Guest count must be greater than 0.");
      return;
    }

    setLoading(true);
    try {
      const generated = await aiAPI.food({
        eventType,
        guestCount: guestsNum,
        budget: Number(budget) || 0,
        foodPreference,
        mealType,
        dietaryRestrictions,
        location,
      });
      setMenu(generated);
      setEditingId(null);
    } catch (err) {
      setError(err.message || "Failed to generate menu recommendations.");
    } finally {
      setLoading(false);
    }
  };

  const handleItemChange = (courseKey, idx, field, value) => {
    setMenu((prev) => {
      if (!prev) return prev;
      const list = [...(prev[courseKey] || [])];
      list[idx] = {
        ...list[idx],
        [field]: field === "servings" ? Math.max(0, Number(value) || 0) : value,
      };
      return { ...prev, [courseKey]: list };
    });
  };

  const handleAddItem = (courseKey) => {
    setMenu((prev) => {
      if (!prev) return prev;
      const guestsNum = Number(prev.guestCount) || Number(guestCount) || 100;
      const list = [...(prev[courseKey] || [])];
      list.push({
        item: "Custom Dish",
        servings: guestsNum,
        quantityEstimate: `${guestsNum} servings`,
        notes: "",
      });
      return { ...prev, [courseKey]: list };
    });
  };

  const handleRemoveItem = (courseKey, idx) => {
    setMenu((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [courseKey]: (prev[courseKey] || []).filter((_, i) => i !== idx),
      };
    });
  };

  const handleSaveMenu = async () => {
    if (!menu) return;
    setSaving(true);
    setError("");
    setSaveMessage("");
    try {
      let saved;
      if (editingId) {
        saved = await aiAPI.updateSavedMenu(editingId, menu);
        setSavedMenus((prev) => prev.map((m) => (m._id === saved._id ? saved : m)));
        setSaveMessage("Saved menu updated in your private EVORA library.");
      } else {
        saved = await aiAPI.saveMenu(menu);
        setEditingId(saved._id);
        setSavedMenus((prev) => [saved, ...prev]);
        setSaveMessage("Menu saved to your private EVORA library.");
      }
    } catch (err) {
      setError(err.message || "Failed to save menu.");
    } finally {
      setSaving(false);
    }
  };

  const handleLoadSaved = (saved) => {
    setMenu(saved);
    setEditingId(saved._id);
    setSaveMessage("");
    setError("");
  };

  const handleDeleteSaved = async (id) => {
    try {
      await aiAPI.deleteSavedMenu(id);
      setSavedMenus((prev) => prev.filter((m) => m._id !== id));
      if (editingId === id) setEditingId(null);
    } catch (err) {
      setError(err.message || "Failed to delete saved menu.");
    }
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
      {/* Input Form */}
      <form
        onSubmit={handleGenerate}
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <div>
            <label style={labelStyle}>Event Type</label>
            <select value={eventType} onChange={(e) => setEventType(e.target.value)} style={inputStyle}>
              {EVENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Guest Count</label>
            <input type="number" min="1" value={guestCount} onChange={(e) => setGuestCount(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Food Budget (₹)</label>
            <input type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Food Preference</label>
            <select value={foodPreference} onChange={(e) => setFoodPreference(e.target.value)} style={inputStyle}>
              {FOOD_PREFERENCES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Meal Type</label>
            <select value={mealType} onChange={(e) => setMealType(e.target.value)} style={inputStyle}>
              {MEAL_TYPES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>City / Cuisine Region</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Hyderabad" style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Allergies & Dietary Restrictions (Optional)</label>
          <input
            type="text"
            value={dietaryRestrictions}
            onChange={(e) => setDietaryRestrictions(e.target.value)}
            placeholder="e.g. Nut-free options, Gluten-free dessert, Low-sugar dishes for elders"
            style={inputStyle}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
                Generating Menu…
              </>
            ) : (
              <>
                <Sparkles size={15} color="#C9A13A" />
                Generate AI Menu
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

      {saveMessage && (
        <div style={{ background: "#EAF0EA", border: "1px solid #304B35", color: "#1F3324", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={16} color="#304B35" />
          {saveMessage}
        </div>
      )}

      {/* Menu Output & Inline Editor */}
      {menu && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              background: "#1F3324",
              color: "#F8F4E9",
              borderRadius: 12,
              padding: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 220 }}>
              <input
                type="text"
                value={menu.title || ""}
                onChange={(e) => setMenu((p) => ({ ...p, title: e.target.value }))}
                aria-label="Menu Title"
                style={{
                  background: "rgba(248,244,233,0.1)",
                  border: "1px solid #C9A13A66",
                  color: "#F8F4E9",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: "Playfair Display, serif",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ fontSize: 12, color: "#EEE7D7", marginTop: 6 }}>
                {menu.guestCount} Guests · {menu.foodPreference} · {menu.mealType} · Est. Budget:{" "}
                <strong style={{ color: "#C9A13A" }}>
                  ₹{Number(menu.estimatedTotalCost || 0).toLocaleString("en-IN")}
                </strong>{" "}
                (₹{Number(menu.costPerGuest || 0).toLocaleString("en-IN")}/guest)
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveMenu}
              disabled={saving}
              style={{
                padding: "9px 16px",
                borderRadius: 8,
                border: "none",
                background: "#C9A13A",
                color: "#1F3324",
                fontWeight: 700,
                fontSize: 13,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              <Save size={15} />
              {saving ? "Saving…" : editingId ? "Update Saved Menu" : "Save Menu"}
            </button>
          </div>

          {/* Courses Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 12 }}>
            {COURSE_LABELS.map(({ key, label }) => {
              const items = menu[key] || [];
              return (
                <div
                  key={key}
                  style={{
                    background: "#F8F4E9",
                    border: "1px solid #EEE7D7",
                    borderRadius: 12,
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ color: "#304B35", fontSize: 14 }}>{label}</strong>
                    <button
                      type="button"
                      onClick={() => handleAddItem(key)}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #718365",
                        color: "#304B35",
                        borderRadius: 6,
                        padding: "3px 8px",
                        fontSize: 11,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        cursor: "pointer",
                      }}
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>

                  {items.map((dish, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #EEE7D7",
                        borderRadius: 8,
                        padding: 8,
                        display: "flex",
                        flexDirection: "column",
                        gap: 5,
                      }}
                    >
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          type="text"
                          value={dish.item}
                          onChange={(e) => handleItemChange(key, idx, "item", e.target.value)}
                          style={{
                            flex: 1,
                            padding: "4px 8px",
                            borderRadius: 6,
                            border: "1px solid #D8CEB8",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#1F3324",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(key, idx)}
                          title="Remove item"
                          style={{ background: "none", border: "none", color: "#991B1B", cursor: "pointer", padding: 2 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input
                          type="text"
                          value={dish.quantityEstimate}
                          onChange={(e) => handleItemChange(key, idx, "quantityEstimate", e.target.value)}
                          placeholder="Quantity estimate"
                          style={{
                            flex: 1,
                            padding: "4px 8px",
                            borderRadius: 6,
                            border: "1px solid #EEE7D7",
                            fontSize: 11,
                            color: "#304B35",
                          }}
                        />
                        <input
                          type="number"
                          min="0"
                          value={dish.servings}
                          onChange={(e) => handleItemChange(key, idx, "servings", e.target.value)}
                          title="Servings"
                          style={{
                            width: 70,
                            padding: "4px 6px",
                            borderRadius: 6,
                            border: "1px solid #EEE7D7",
                            fontSize: 11,
                            color: "#1F3324",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Dietary Alternatives, Assumptions & Waste Reduction */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
            {menu.dietaryAlternatives?.length > 0 && (
              <div style={{ background: "#EEE7D7", borderRadius: 12, padding: 14 }}>
                <strong style={{ fontSize: 13, color: "#1F3324", display: "block", marginBottom: 6 }}>
                  Allergy & Dietary Alternatives
                </strong>
                {menu.dietaryAlternatives.map((alt, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#1F3324", marginBottom: 6 }}>
                    <strong>{alt.restrictionOrAllergy}:</strong> {alt.substituteItem}
                    {alt.notes ? ` — ${alt.notes}` : ""}
                  </div>
                ))}
              </div>
            )}

            {menu.costAssumptions?.length > 0 && (
              <div style={{ background: "#F8F4E9", border: "1px solid #EEE7D7", borderRadius: 12, padding: 14 }}>
                <strong style={{ fontSize: 13, color: "#304B35", display: "block", marginBottom: 6 }}>
                  Approximate Cost Assumptions
                </strong>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#40382F" }}>
                  {menu.costAssumptions.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {menu.wasteReductionTips?.length > 0 && (
              <div style={{ background: "#EAF0EA", border: "1px solid #718365", borderRadius: 12, padding: 14 }}>
                <strong style={{ fontSize: 13, color: "#1F3324", display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <Leaf size={14} color="#304B35" /> Excess Food Reduction Tips
                </strong>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#1F3324" }}>
                  {menu.wasteReductionTips.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User's Private Saved Menus */}
      {savedMenus.length > 0 && (
        <div style={{ background: "#F8F4E9", border: "1px solid #EEE7D7", borderRadius: 12, padding: 14 }}>
          <strong style={{ fontSize: 13, color: "#1F3324", display: "block", marginBottom: 8 }}>
            Your Saved Menus ({savedMenus.length})
          </strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {savedMenus.map((sm) => (
              <div
                key={sm._id}
                style={{
                  background: "#FFFFFF",
                  border: editingId === sm._id ? "1.5px solid #304B35" : "1px solid #D8CEB8",
                  borderRadius: 10,
                  padding: "8px 12px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 12,
                }}
              >
                <button
                  type="button"
                  onClick={() => handleLoadSaved(sm)}
                  style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer", padding: 0, color: "#1F3324" }}
                >
                  <strong>{sm.title}</strong>
                  <span style={{ display: "block", fontSize: 11, color: "#718365" }}>
                    {sm.guestCount} guests · {sm.foodPreference}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSaved(sm._id)}
                  title="Delete saved menu"
                  style={{ background: "none", border: "none", color: "#991B1B", cursor: "pointer", padding: 2 }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodRecommendationFeature;

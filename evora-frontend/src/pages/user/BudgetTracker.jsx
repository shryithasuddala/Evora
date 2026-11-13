import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Wallet, Plus, Trash2, X } from "lucide-react";
import { eventsAPI, expensesAPI } from "../../services/api";

const CATEGORIES = ["Catering", "Venue", "Decoration", "Photography", "Music & Sound", "Invitations & Favors", "Attire & Styling", "Logistics & Transport", "Miscellaneous"];

const BudgetTracker = () => {
  const [searchParams] = useSearchParams();
  const initialEventId = searchParams.get("eventId") || "";

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expLoading, setExpLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExpense, setNewExpense] = useState({ title: "", category: "Catering", amount: "", status: "Paid", vendorName: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    eventsAPI.getAll().then((evts) => {
      setEvents(evts || []);
      if (!selectedEventId && evts && evts.length > 0) setSelectedEventId(evts[0]._id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedEventId) return;
    setExpLoading(true);
    expensesAPI.getByEvent(selectedEventId)
      .then((exps) => setExpenses(exps || []))
      .catch(() => setExpenses([]))
      .finally(() => setExpLoading(false));
  }, [selectedEventId]);

  const currentEvent = events.find((e) => e._id === selectedEventId);
  const totalAllocated = Number(currentEvent?.totalBudget || 0);
  const totalSpent = expenses.reduce((s, x) => s + Number(x.amount || 0), 0);
  const remaining = Math.max(0, totalAllocated - totalSpent);
  const pct = totalAllocated > 0 ? Math.min(100, Math.round((totalSpent / totalAllocated) * 100)) : 0;

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.title.trim() || newExpense.title.trim().length < 2) {
      setAddError("Expense title must be at least 2 characters long.");
      return;
    }
    if (!newExpense.amount || isNaN(Number(newExpense.amount)) || Number(newExpense.amount) <= 0) {
      setAddError("Amount must be a positive number greater than 0.");
      return;
    }
    setAddLoading(true);
    setAddError("");
    try {
      const created = await expensesAPI.create({
        eventId: selectedEventId,
        title: newExpense.title.trim(),
        category: newExpense.category,
        amount: Number(newExpense.amount),
        status: newExpense.status,
        vendorName: newExpense.vendorName.trim(),
      });
      setExpenses((prev) => [created, ...prev]);
      setShowAddModal(false);
      setNewExpense({ title: "", category: "Catering", amount: "", status: "Paid", vendorName: "" });
    } catch (err) { setAddError(err.message); }
    finally { setAddLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this expense?")) return;
    try {
      await expensesAPI.remove(id);
      setExpenses((prev) => prev.filter((x) => x._id !== id));
    } catch (err) { alert(err.message); }
  };

  const inputStyle = { width: "100%", padding: "9px 12px", border: "1px solid #E8DCC8", borderRadius: 8, fontSize: 14, background: "#FDFAF4", boxSizing: "border-box", outline: "none" };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: "#6B5240", display: "block", marginBottom: 5 };

  if (loading) return <div className="vendor-page" style={{ textAlign: "center", padding: 60, color: "#8B7355" }}>Loading…</div>;

  return (
    <div className="vendor-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="vendor-welcome-label" style={{ color: "#C9A13A" }}>FINANCIAL CONTROLS</span>
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 30, margin: "4px 0" }}>Budget Tracker</h1>
        </div>
        <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} style={{ padding: "9px 14px", border: "1px solid #E8DCC8", borderRadius: 8, fontSize: 14, background: "#FDFAF4", cursor: "pointer", outline: "none" }}>
          {events.map((ev) => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
        </select>
      </div>

      {!selectedEventId || events.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: "#8B7355" }}>No events found. Create an event first.</div>
      ) : (
        <>
          {/* Budget Overview */}
          <div style={{ background: "linear-gradient(135deg, #2B1D12, #4A3728)", borderRadius: 16, padding: "24px 28px", marginBottom: 24, color: "#FAF5EA" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <Wallet size={22} color="#C9A13A" />
              <span style={{ fontSize: 16, fontWeight: 600 }}>{currentEvent?.title}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Total Budget", val: `₹${totalAllocated.toLocaleString()}`, color: "#FAF5EA" },
                { label: "Spent", val: `₹${totalSpent.toLocaleString()}`, color: pct > 90 ? "#FF8888" : "#C9A13A" },
                { label: "Remaining", val: `₹${remaining.toLocaleString()}`, color: "#90EE90" },
              ].map(({ label, val, color }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: "#C9A13A88", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 4 }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#ffffff22", borderRadius: 6, height: 8 }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 6, background: pct > 90 ? "#FF6666" : "#C9A13A", transition: "width 0.4s" }} />
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: "#C9A13A88" }}>{pct}% of budget used</div>
          </div>

          {/* Expenses */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 22, margin: 0 }}>Expense Ledger</h2>
            <button onClick={() => setShowAddModal(true)} className="vendor-btn" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 14 }}>
              <Plus size={16} /> Add Expense
            </button>
          </div>

          {expLoading ? <p style={{ color: "#8B7355", textAlign: "center" }}>Loading expenses…</p> :
            expenses.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, background: "#FAF5EA", borderRadius: 12, border: "1px dashed #C9A13A55", color: "#8B7355" }}>
                No expenses recorded yet.
              </div>
            ) : (
              <div style={{ background: "#fff", border: "1px solid #E8DCC8", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto", gap: 0, fontSize: 11, fontWeight: 700, color: "#8B7355", padding: "10px 20px", background: "#FAF5EA", textTransform: "uppercase", letterSpacing: 0.8 }}>
                  <span>Item</span><span>Category</span><span>Status</span><span style={{ textAlign: "right" }}>Amount</span><span />
                </div>
                {expenses.map((exp, i) => (
                  <div key={exp._id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto", alignItems: "center", gap: 0, padding: "12px 20px", borderTop: i > 0 ? "1px solid #F0E8D8" : "none" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 500, fontSize: 14, color: "#2B1D12" }}>{exp.title}</p>
                      {exp.vendorName && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8B7355" }}>{exp.vendorName}</p>}
                    </div>
                    <span style={{ fontSize: 13, color: "#6B5240" }}>{exp.category}</span>
                    <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 20, background: exp.status === "Paid" ? "#E8F5EC" : "#FFF8E8", color: exp.status === "Paid" ? "#304B35" : "#C9A13A" }}>{exp.status}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#2B1D12", textAlign: "right", paddingRight: 16 }}>₹{Number(exp.amount).toLocaleString()}</span>
                    <button onClick={() => handleDelete(exp._id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#CC666677", padding: 4 }}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            )
          }
        </>
      )}

      {/* Add Expense Modal */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "#00000055", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 440 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 20, margin: 0 }}>Add Expense</h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} color="#6B5240" /></button>
            </div>
            {addError && <div style={{ background: "#FFF5F5", border: "1px solid #FFCCCC", borderRadius: 8, padding: "8px 12px", marginBottom: 14, color: "#CC0000", fontSize: 13 }}>{addError}</div>}
            <form onSubmit={handleAddExpense}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div><label style={labelStyle}>Item Title *</label><input value={newExpense.title} onChange={(e) => setNewExpense((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Catering advance" style={inputStyle} /></div>
                <div><label style={labelStyle}>Category</label>
                  <select value={newExpense.category} onChange={(e) => setNewExpense((p) => ({ ...p, category: e.target.value }))} style={inputStyle}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Amount (₹) *</label><input type="number" value={newExpense.amount} onChange={(e) => setNewExpense((p) => ({ ...p, amount: e.target.value }))} placeholder="0" min="0" style={inputStyle} /></div>
                <div><label style={labelStyle}>Status</label>
                  <select value={newExpense.status} onChange={(e) => setNewExpense((p) => ({ ...p, status: e.target.value }))} style={inputStyle}>
                    <option>Paid</option><option>Pending</option>
                  </select>
                </div>
                <div><label style={labelStyle}>Recipient / Service Provider</label><input value={newExpense.vendorName} onChange={(e) => setNewExpense((p) => ({ ...p, vendorName: e.target.value }))} placeholder="e.g. Banquet Hall, Flower Decor, etc." style={inputStyle} /></div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: "9px 20px", border: "1px solid #E8DCC8", borderRadius: 8, background: "#fff", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={addLoading} className="vendor-btn" style={{ padding: "9px 20px", opacity: addLoading ? 0.7 : 1 }}>{addLoading ? "Adding…" : "Add Expense"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetTracker;

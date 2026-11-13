import { useState, useEffect } from "react";
import { CreditCard, Download, CheckCircle2 } from "lucide-react";
import { paymentsAPI, adminAPI } from "../../services/api";
import { useToast } from "../../context/ToastContext";

const ManagePayments = () => {
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [totalVolume, setTotalVolume] = useState(0);
  const [platformFees, setPlatformFees] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState("all");

  const loadPayments = async () => {
    try {
      const res = await paymentsAPI.getAdminPayments();
      setPayments(res.payments || []);
      setTotalVolume(res.totalVolume || 0);
      setPlatformFees(res.platformFees || 0);
    } catch (err) {
      toast.error("Failed to load payments", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleExportCSV = async () => {
    try {
      const res = await adminAPI.exportReportData("payments");
      const csvRows = [
        ["Payment ID", "Transaction ID", "User", "Amount", "Mode", "Status", "Date"].join(","),
        ...res.data.map((p) =>
          [
            p._id,
            p.gatewayTransactionId || "DEMO-TXN",
            `"${p.userId?.fullName || "User"}"`,
            p.amount,
            p.mode,
            p.status,
            new Date(p.createdAt).toLocaleDateString(),
          ].join(",")
        ),
      ];

      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `evora_payments_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Export Complete", "Payments report CSV downloaded.");
    } catch (err) {
      toast.error("Export Error", err.message);
    }
  };

  const filtered = filterMode === "all" ? payments : payments.filter((p) => p.mode === filterMode);

  if (loading) {
    return (
      <div className="vendor-content" style={{ textAlign: "center", padding: "50px", color: "#8B7355" }}>
        Loading platform payments…
      </div>
    );
  }

  return (
    <div className="vendor-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "28px" }}>
        <div>
          <span style={{ fontSize: "11px", letterSpacing: "2px", color: "#C9A13A", fontWeight: 700, textTransform: "uppercase" }}>
            FINANCIAL AUDIT & SETTLEMENTS
          </span>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "28px", color: "#2B1D12", margin: "4px 0" }}>
            Platform Payments & Escrow
          </h1>
          <p style={{ color: "#766C67", fontSize: "13px", margin: 0 }}>
            Audit all booking advances, full balance settlements, and platform revenue.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="vendor-btn"
        >
          <Download size={16} /> Export Payments CSV
        </button>
      </div>

      {/* Metrics */}
      <div className="vendor-stats-grid" style={{ marginBottom: "28px" }}>
        <div className="vendor-card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "12px", color: "#766C67", fontWeight: 600 }}>TOTAL PROCESSED VOLUME</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#2B1D12", margin: "4px 0" }}>
            ₹{totalVolume.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "11px", color: "#8B7355" }}>100% verified settlement volume</div>
        </div>

        <div className="vendor-card" style={{ padding: "20px", borderLeft: "4px solid #C9A13A" }}>
          <div style={{ fontSize: "12px", color: "#C9A13A", fontWeight: 700 }}>EVORA PLATFORM FEES (5%)</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#C9A13A", margin: "4px 0" }}>
            ₹{platformFees.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "11px", color: "#8B7355" }}>Retained platform revenue</div>
        </div>

        <div className="vendor-card" style={{ padding: "20px" }}>
          <div style={{ fontSize: "12px", color: "#766C67", fontWeight: 600 }}>TRANSACTIONS COUNT</div>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#304B35", margin: "4px 0" }}>
            {payments.length}
          </div>
          <div style={{ fontSize: "11px", color: "#8B7355" }}>Advance + settlement records</div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="vendor-card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", color: "#2B1D12", margin: 0 }}>
            Recent Transactions ({filtered.length})
          </h3>

          <div style={{ display: "flex", gap: "8px" }}>
            {["all", "advance50", "full", "express"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setFilterMode(m)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: filterMode === m ? "1px solid #C9A13A" : "1px solid #EADBBE",
                  background: filterMode === m ? "#FAF5EA" : "#FFFDF9",
                  color: filterMode === m ? "#8C6435" : "#766C67",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {m === "all" ? "All Modes" : m === "advance50" ? "50% Advance" : m === "full" ? "Full Payment" : "Express"}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#8B7355" }}>
            <CreditCard size={36} color="#D5B36A" style={{ marginBottom: "8px" }} />
            <p style={{ margin: 0 }}>No payments match the selected filter.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "750px", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #EADBBE", textAlign: "left", color: "#766C67" }}>
                  <th style={{ padding: "12px 10px" }}>Payment Ref</th>
                  <th style={{ padding: "12px 10px" }}>Payer</th>
                  <th style={{ padding: "12px 10px" }}>Amount</th>
                  <th style={{ padding: "12px 10px" }}>Mode</th>
                  <th style={{ padding: "12px 10px" }}>Status</th>
                  <th style={{ padding: "12px 10px" }}>Gateway Txn</th>
                  <th style={{ padding: "12px 10px" }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p._id} style={{ borderBottom: "1px solid #FAF5EA" }}>
                    <td style={{ padding: "14px 10px", fontFamily: "monospace", fontSize: "12px", color: "#8C6435", fontWeight: 700 }}>
                      {p._id.slice(-8).toUpperCase()}
                    </td>
                    <td style={{ padding: "14px 10px" }}>
                      <div style={{ fontWeight: 600, color: "#2B1D12" }}>{p.userId?.fullName || "User"}</div>
                      <div style={{ fontSize: "11px", color: "#8B7355" }}>{p.userId?.email}</div>
                    </td>
                    <td style={{ padding: "14px 10px", fontWeight: 700, color: "#2B1D12" }}>
                      ₹{p.amount.toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "14px 10px" }}>
                      <span style={{ fontSize: "11px", background: "#FAF5EA", border: "1px solid #D5B36A", color: "#6B5240", padding: "2px 8px", borderRadius: "4px", fontWeight: 600 }}>
                        {p.mode === "advance50" ? "50% Advance" : p.mode === "full" ? "100% Full" : "Express"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 10px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#E8F5E9", color: "#2E7D32", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>
                        <CheckCircle2 size={12} /> {p.status}
                      </span>
                    </td>
                    <td style={{ padding: "14px 10px", fontFamily: "monospace", fontSize: "11px", color: "#766C67" }}>
                      {p.gatewayTransactionId}
                    </td>
                    <td style={{ padding: "14px 10px", color: "#766C67", fontSize: "12px" }}>
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagePayments;

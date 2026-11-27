import { useState } from "react";
import {
  X,
  CreditCard,
  QrCode,
  Building,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Smartphone,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { paymentsAPI } from "../../services/api";
import { useToast } from "../../context/ToastContext";

const POPULAR_BANKS = ["HDFC Bank", "State Bank of India", "ICICI Bank", "Axis Bank", "Kotak Mahindra", "Punjab National Bank"];

const PaymentGatewayModal = ({
  isOpen,
  onClose,
  bookingId,
  eventId,
  category,
  eventTitle,
  totalPrice = 0,
  mode = "advance50", // "advance50" | "full" | "balance"
  onPaymentSuccess,
}) => {
  const toast = useToast();
  const [methodTab, setMethodTab] = useState("upi"); // "upi" | "card" | "netbanking"
  const [upiApp, setUpiApp] = useState("gpay");
  const [upiId, setUpiId] = useState("");
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");

  // Card details state
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");

  const [processing, setProcessing] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const totalNum = Number(totalPrice) || 25000;
  const isAdvance = mode === "advance50";
  const payableAmount = isAdvance ? Math.round(totalNum * 0.5) : totalNum;
  const balanceAfter = isAdvance ? totalNum - payableAmount : 0;

  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 2) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  const handleSubmitPayment = async (e) => {
    e?.preventDefault();
    setErrorMsg("");
    setProcessing(true);

    let paymentMethodLabel = "UPI Demo";
    if (methodTab === "upi") {
      paymentMethodLabel = `UPI (${upiApp.toUpperCase()}${upiId ? ` - ${upiId}` : ""})`;
    } else if (methodTab === "card") {
      if (cardNumber.replace(/\s/g, "").length < 15) {
        setProcessing(false);
        setErrorMsg("Please enter a valid 16-digit card number.");
        return;
      }
      paymentMethodLabel = `Card (•••• ${cardNumber.slice(-4)})`;
    } else {
      paymentMethodLabel = `NetBanking (${selectedBank})`;
    }

    try {
      const payload = {
        bookingId,
        eventId,
        category,
        mode: isAdvance ? "advance50" : "full",
        method: paymentMethodLabel,
      };

      const result = await paymentsAPI.createPayment(payload);

      setSuccessData({
        transactionRef: result.payment?.transactionRef || `PAY-${Date.now()}`,
        amountPaid: payableAmount,
        mode,
        category,
      });

      toast.success(
        "Payment Processed! 💳",
        `₹${payableAmount.toLocaleString("en-IN")} received successfully. Transaction Ref: ${result.payment?.transactionRef || "Verified"}`
      );

      if (onPaymentSuccess) {
        onPaymentSuccess(result);
      }
    } catch (err) {
      setErrorMsg(err.message || "Payment gateway could not authorize transaction.");
      toast.error("Payment Failed", err.message || "Payment authorization failed.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(20, 14, 10, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 16,
          width: "100%",
          maxWidth: 540,
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.35)",
          overflow: "hidden",
          border: "1px solid #E8DCC8",
          animation: "fadeIn 0.2s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #2B1D12 0%, #4A3728 100%)",
            color: "#FAF5EA",
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(201, 161, 58, 0.2)",
                border: "1px solid #C9A13A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Lock size={18} color="#C9A13A" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontFamily: "Playfair Display, serif", color: "#FAF5EA" }}>
                EVORA Escrow Payment Gateway
              </h3>
              <span style={{ fontSize: 11, color: "#C9A13A", display: "flex", alignItems: "center", gap: 4 }}>
                <ShieldCheck size={12} /> 256-Bit SSL Secured · 100% Host Protection
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "#FAF5EA",
              borderRadius: "50%",
              width: 32,
              height: 32,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Success View */}
        {successData ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#E8F9EE",
                border: "2px solid #25D366",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <CheckCircle2 size={36} color="#1E8E46" />
            </div>

            <h3 style={{ fontSize: 22, color: "#1E8E46", margin: "0 0 6px", fontFamily: "Playfair Display, serif" }}>
              Payment Successful!
            </h3>
            <p style={{ fontSize: 13, color: "#6B5240", margin: "0 0 20px" }}>
              Your payment has been authorized and held securely in EVORA Escrow. Date is locked with the artisan.
            </p>

            <div
              style={{
                background: "#FAF6EF",
                border: "1px solid #E8DCC8",
                borderRadius: 12,
                padding: "16px 20px",
                marginBottom: 24,
                textAlign: "left",
                fontSize: 13,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#766C67" }}>Service / Category:</span>
                <strong>{successData.category || category}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#766C67" }}>Amount Paid:</span>
                <strong style={{ color: "#1E8E46", fontSize: 15 }}>₹{successData.amountPaid.toLocaleString("en-IN")}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#766C67" }}>Payment Mode:</span>
                <span>{isAdvance ? "50% Advance (Date Locked)" : "Full Settlement"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#766C67" }}>Transaction Ref:</span>
                <code style={{ background: "#FFF", padding: "2px 6px", borderRadius: 4, border: "1px solid #D5C2A5", fontSize: 11 }}>
                  {successData.transactionRef}
                </code>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#304B35",
                color: "#F8F4E9",
                border: "none",
                borderRadius: 10,
                padding: "11px 28px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                width: "100%",
              }}
            >
              Return to Celebration Hub
            </button>
          </div>
        ) : (
          <div>
            {/* Order Summary Strip */}
            <div
              style={{
                background: "#FAF6EF",
                borderBottom: "1px solid #E8DCC8",
                padding: "16px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#8C6435", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {eventTitle || "Celebration Booking"}
                </span>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#2B1D12" }}>
                  {category || "Verified Artisan Service"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 11, color: "#766C67" }}>Payable Now ({isAdvance ? "50% Advance" : "Full"}):</span>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#304B35" }}>
                  ₹{payableAmount.toLocaleString("en-IN")}
                </div>
                {isAdvance && (
                  <span style={{ fontSize: 10, color: "#8C6435" }}>
                    Remaining ₹{balanceAfter.toLocaleString("en-IN")} due on event day
                  </span>
                )}
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div
                style={{
                  margin: "14px 24px 0",
                  background: "#FEF2F2",
                  border: "1px solid #FCA5A5",
                  color: "#991B1B",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertCircle size={15} />
                {errorMsg}
              </div>
            )}

            {/* Payment Method Selector Tabs */}
            <div style={{ padding: "16px 24px 8px" }}>
              <div style={{ display: "flex", borderBottom: "1px solid #E8DCC8", gap: 8 }}>
                {[
                  { id: "upi", label: "Instant UPI / QR", icon: Smartphone },
                  { id: "card", label: "Debit / Credit Card", icon: CreditCard },
                  { id: "netbanking", label: "NetBanking", icon: Building },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setMethodTab(id); setErrorMsg(""); }}
                    style={{
                      background: "none",
                      border: "none",
                      borderBottom: methodTab === id ? "2.5px solid #304B35" : "2.5px solid transparent",
                      color: methodTab === id ? "#304B35" : "#766C67",
                      fontWeight: methodTab === id ? 700 : 500,
                      fontSize: 13,
                      padding: "8px 12px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Method Content */}
            <div style={{ padding: "12px 24px 20px" }}>
              {/* UPI Tab */}
              {methodTab === "upi" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#304B35", marginBottom: 6 }}>
                      CHOOSE UPI APP
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                      {[
                        { id: "gpay", name: "Google Pay", icon: "🌐" },
                        { id: "phonepe", name: "PhonePe", icon: "🟣" },
                        { id: "paytm", name: "Paytm", icon: "🔵" },
                        { id: "bhim", name: "BHIM UPI", icon: "🇮🇳" },
                      ].map((app) => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => setUpiApp(app.id)}
                          style={{
                            background: upiApp === app.id ? "#EAF0EA" : "#FAF6EF",
                            border: upiApp === app.id ? "1.5px solid #304B35" : "1px solid #E8DCC8",
                            borderRadius: 8,
                            padding: "8px 6px",
                            cursor: "pointer",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#2B1D12",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span style={{ fontSize: 18 }}>{app.icon}</span>
                          {app.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#304B35", marginBottom: 4 }}>
                      OR ENTER VIRTUAL PAYMENT ADDRESS (VPA / UPI ID)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. mobile@upi or username@okhdfcbank"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        fontSize: 13,
                        borderRadius: 8,
                        border: "1px solid #D5C2A5",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      background: "#F8F4E9",
                      border: "1px dashed #C9A13A",
                      borderRadius: 10,
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div style={{ background: "#FFF", padding: 6, borderRadius: 6, border: "1px solid #E8DCC8" }}>
                      <QrCode size={40} color="#304B35" />
                    </div>
                    <div style={{ fontSize: 12, color: "#6B5240" }}>
                      <strong>Instant QR Scanner:</strong> Scan via any UPI app to transfer ₹{payableAmount.toLocaleString("en-IN")} directly into EVORA Escrow.
                    </div>
                  </div>
                </div>
              )}

              {/* Card Tab */}
              {methodTab === "card" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#304B35", marginBottom: 4 }}>
                      CARD NUMBER
                    </label>
                    <input
                      type="text"
                      placeholder="XXXX XXXX XXXX XXXX"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        fontSize: 13,
                        borderRadius: 8,
                        border: "1px solid #D5C2A5",
                        letterSpacing: 2,
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#304B35", marginBottom: 4 }}>
                        VALID THRU (MM/YY)
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        style={{
                          width: "100%",
                          padding: "9px 12px",
                          fontSize: 13,
                          borderRadius: 8,
                          border: "1px solid #D5C2A5",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#304B35", marginBottom: 4 }}>
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="•••"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                        style={{
                          width: "100%",
                          padding: "9px 12px",
                          fontSize: 13,
                          borderRadius: 8,
                          border: "1px solid #D5C2A5",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#304B35", marginBottom: 4 }}>
                      NAME ON CARD
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Host Full Name"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        fontSize: 13,
                        borderRadius: 8,
                        border: "1px solid #D5C2A5",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* NetBanking Tab */}
              {methodTab === "netbanking" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#304B35", marginBottom: 4 }}>
                    SELECT YOUR BANK
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                    {POPULAR_BANKS.map((bank) => (
                      <button
                        key={bank}
                        type="button"
                        onClick={() => setSelectedBank(bank)}
                        style={{
                          background: selectedBank === bank ? "#EAF0EA" : "#FAF6EF",
                          border: selectedBank === bank ? "1.5px solid #304B35" : "1px solid #E8DCC8",
                          borderRadius: 8,
                          padding: "10px 12px",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#2B1D12",
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Building size={14} color="#8C6435" />
                        {bank}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Escrow Terms & Policy Disclaimer */}
              <div
                style={{
                  marginTop: 14,
                  fontSize: 11,
                  color: "#766C67",
                  background: "#FAF6EF",
                  border: "1px solid #E8DCC8",
                  padding: "8px 12px",
                  borderRadius: 8,
                  lineHeight: 1.4,
                }}
              >
                🔒 <strong>EVORA Escrow Guarantee:</strong> 50% advance locks your artisan date. Funds are securely held and disbursed only upon verified service execution. Cancelling an advance-paid booking incurs a 20% non-refundable deduction with 80% refunded.
              </div>

              {/* Submit Payment Button */}
              <button
                type="button"
                disabled={processing}
                onClick={handleSubmitPayment}
                style={{
                  marginTop: 16,
                  width: "100%",
                  background: processing ? "#8C6435" : "linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 20px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: processing ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(27, 94, 32, 0.3)",
                }}
              >
                {processing ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    Connecting to Bank Gateway…
                  </>
                ) : (
                  <>
                    Pay ₹{payableAmount.toLocaleString("en-IN")} Securely <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentGatewayModal;

import { useState, useEffect, useMemo } from "react";
import {
  WalletCards,
  TrendingUp,
  Clock,
  CalendarDays,
  User,
} from "lucide-react";
import { bookingsAPI } from "../../services/api";

const Earnings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingsAPI.getAll()
      .then((data) => setBookings(data || []))
      .catch((err) => console.error("Earnings load error:", err.message))
      .finally(() => setLoading(false));
  }, []);

  const financialData = useMemo(() => {
    const confirmed = bookings.filter(
      (b) => b.status === "Accepted" || b.status === "Completed"
    );

    const transactions = confirmed.map((b) => {
      const amount = Number(b.serviceId?.price) || Number(b.amount) || 0;
      return {
        id: b._id || b.id,
        eventName: b.eventName || b.serviceName || "Celebration Booking",
        organizer: b.organizer || b.organizerId?.fullName || "Client",
        date: b.eventDate || b.date || "",
        bookingStatus: b.bookingStatus || (b.status === "Completed" ? "Completed" : "Upcoming"),
        amount,
      };
    });

    const totalEarnings = transactions
      .filter((t) => t.bookingStatus === "Completed")
      .reduce((total, t) => total + t.amount, 0);

    const pendingPayments = transactions
      .filter((t) => t.bookingStatus !== "Completed")
      .reduce((total, t) => total + t.amount, 0);

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const thisMonthEarnings = transactions
      .filter((t) => {
        if (t.bookingStatus !== "Completed" || !t.date) return false;
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((total, t) => total + t.amount, 0);

    return {
      transactions,
      totalEarnings,
      pendingPayments,
      thisMonthEarnings,
    };
  }, [bookings]);

  const completedTransactions = financialData.transactions.filter(
    (transaction) => transaction.bookingStatus === "Completed"
  );

  const formatCurrency = (amount) => `₹${amount.toLocaleString("en-IN")}`;

  if (loading) {
    return (
      <div className="vendor-page" style={{ textAlign: "center", padding: 50, color: "#8B7355" }}>
        Loading financial overview…
      </div>
    );
  }

  return (
    <div className="vendor-page">
      <div className="vendor-page-header">
        <div>
          <span className="vendor-page-label">FINANCIAL OVERVIEW</span>
          <h1>Earnings</h1>
          <p>Track your celebration revenue and client payment schedules.</p>
        </div>
      </div>

      <div className="vendor-earnings-grid">
        <div className="vendor-finance-card">
          <WalletCards size={22} />
          <span>Total Realized Earnings</span>
          <strong>{formatCurrency(financialData.totalEarnings)}</strong>
        </div>

        <div className="vendor-finance-card">
          <Clock size={22} />
          <span>Committed Upcoming Payments</span>
          <strong>{formatCurrency(financialData.pendingPayments)}</strong>
        </div>

        <div className="vendor-finance-card">
          <TrendingUp size={22} />
          <span>This Month</span>
          <strong>{formatCurrency(financialData.thisMonthEarnings)}</strong>
        </div>
      </div>

      {completedTransactions.length === 0 ? (
        <div className="vendor-large-empty">
          <div className="vendor-large-empty-icon">
            <WalletCards size={32} />
          </div>
          <h2>No completed transactions yet</h2>
          <p>
            Your realized earnings and transaction history will appear here
            as confirmed bookings are fulfilled.
          </p>
        </div>
      ) : (
        <div className="vendor-transactions-list">
          {completedTransactions.map((transaction) => (
            <div className="vendor-transaction-card" key={transaction.id}>
              <div>
                <h2>{transaction.eventName}</h2>
                <p>
                  <User size={16} />
                  Organizer: {transaction.organizer}
                </p>
                <p>
                  <CalendarDays size={16} />
                  {transaction.date || "Date not specified"}
                </p>
              </div>
              <strong>{formatCurrency(transaction.amount)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Earnings;

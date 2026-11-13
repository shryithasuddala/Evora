import { useState, useEffect, useMemo } from "react";
import { Star, CalendarDays, User, MessageSquare } from "lucide-react";
import { reviewsAPI } from "../../services/api";

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reviewsAPI.getAll()
      .then((data) => setReviews(data || []))
      .catch((err) => console.error("Reviews load error:", err.message))
      .finally(() => setLoading(false));
  }, []);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return "5.0";
    const totalRating = reviews.reduce(
      (total, review) => total + Number(review.rating || 0),
      0
    );
    return (totalRating / reviews.length).toFixed(1);
  }, [reviews]);

  const renderStars = (rating) => {
    return [1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={18}
        fill={star <= Math.round(rating) ? "currentColor" : "none"}
      />
    ));
  };

  if (loading) {
    return (
      <div className="vendor-page" style={{ textAlign: "center", padding: 50, color: "#8B7355" }}>
        Loading reviews…
      </div>
    );
  }

  return (
    <div className="vendor-page">
      <div className="vendor-page-header">
        <div>
          <span className="vendor-page-label">CUSTOMER FEEDBACK</span>
          <h1>Reviews</h1>
          <p>See what event organizers think about your services.</p>
        </div>
      </div>

      <div className="vendor-review-summary">
        <div className="vendor-rating-number">{averageRating}</div>

        <div>
          <div className="vendor-stars">
            {renderStars(Number(averageRating))}
          </div>

          <span>
            {reviews.length === 0
              ? "No reviews yet"
              : `${reviews.length} review${reviews.length === 1 ? "" : "s"}`}
          </span>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="vendor-large-empty">
          <div className="vendor-large-empty-icon">
            <Star size={32} />
          </div>
          <h2>No reviews yet</h2>
          <p>
            Reviews from organizers will appear here after you complete events
            and receive client evaluations.
          </p>
        </div>
      ) : (
        <div className="vendor-reviews-list">
          {reviews.map((review) => {
            const revId = review._id || review.id;
            return (
              <div className="vendor-review-card" key={revId}>
                <div className="vendor-review-card-header">
                  <div>
                    <h2>{review.eventName || "Event Review"}</h2>
                    <p>
                      <User size={16} />
                      {review.reviewerName || review.reviewerId?.fullName || "Verified Organizer"}
                    </p>
                  </div>

                  <div className="vendor-review-rating">
                    {renderStars(Number(review.rating))}
                  </div>
                </div>

                {review.comment && (
                  <div className="vendor-review-comment">
                    <MessageSquare size={17} />
                    <p>{review.comment}</p>
                  </div>
                )}

                {review.createdAt && (
                  <p className="vendor-review-date">
                    <CalendarDays size={15} />
                    {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Reviews;

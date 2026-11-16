/**
 * Deterministic Charity Ranking & Food Safety Engine.
 * Evaluates charities based on distance, cooked food compatibility, daily capacity, and safe consumption margins.
 */

const calculateRankingScore = (charity, surplusDetails) => {
  const { quantity = 100, safeUntil } = surplusDetails;
  const distanceKm = charity.distanceKm !== undefined ? charity.distanceKm : 10;
  const capacity = charity.capacityPerDay || 150;
  const acceptsCooked = Boolean(charity.acceptsCookedFood);

  // 1. Distance Score (0 - 40 points)
  let distanceScore = 0;
  if (distanceKm <= 3) distanceScore = 40;
  else if (distanceKm <= 6) distanceScore = 34;
  else if (distanceKm <= 10) distanceScore = 28;
  else if (distanceKm <= 15) distanceScore = 20;
  else if (distanceKm <= 20) distanceScore = 14;
  else distanceScore = Math.max(2, Math.round(40 - distanceKm * 1.6));

  // 2. Accepts Cooked Food (0 or 25 points)
  const cookedScore = acceptsCooked ? 25 : 0;

  // 3. Capacity vs Quantity Match (0 - 20 points)
  let capacityScore = 0;
  const capacityRatio = capacity / Math.max(quantity, 1);
  if (capacityRatio >= 1.5) capacityScore = 20;
  else if (capacityRatio >= 1.0) capacityScore = 18;
  else if (capacityRatio >= 0.7) capacityScore = 14;
  else if (capacityRatio >= 0.4) capacityScore = 9;
  else capacityScore = 4;

  // 4. Time Window & Transit Margin (0 - 15 points)
  // Urban travel estimate in Hyderabad: 3 mins per km + 25 mins pickup/loading turnaround
  const estimatedTransitMins = Math.round(distanceKm * 3 + 25);
  const now = new Date();
  const safeUntilDate = safeUntil ? new Date(safeUntil) : new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const remainingMins = Math.max(0, Math.round((safeUntilDate.getTime() - now.getTime()) / (1000 * 60)));
  const safetyMarginMins = remainingMins - estimatedTransitMins;

  let timeScore = 0;
  if (safetyMarginMins >= 150) timeScore = 15;
  else if (safetyMarginMins >= 90) timeScore = 12;
  else if (safetyMarginMins >= 45) timeScore = 8;
  else if (safetyMarginMins >= 15) timeScore = 4;
  else timeScore = 0;

  // Total deterministic score (max 100)
  const totalScore = Math.min(100, distanceScore + cookedScore + capacityScore + timeScore);

  return {
    score: totalScore,
    breakdown: {
      distanceScore,
      cookedScore,
      capacityScore,
      timeScore,
    },
    distanceKm,
    estimatedTransitMins,
    remainingMins,
    safetyMarginMins,
  };
};

/**
 * Assesses overall food safety window for surplus food donation.
 */
const evaluateFoodSafety = (surplusDetails, nearestDistanceKm = 5) => {
  const now = new Date();
  const safeUntilDate = surplusDetails.safeUntil ? new Date(surplusDetails.safeUntil) : null;

  if (!safeUntilDate || isNaN(safeUntilDate.getTime())) {
    return {
      isSafe: true,
      isCritical: false,
      warningMessage: null,
      remainingMinutes: 240,
    };
  }

  const remainingMinutes = Math.round((safeUntilDate.getTime() - now.getTime()) / (1000 * 60));
  const minRequiredTransitMins = Math.round(nearestDistanceKm * 3 + 25);

  if (remainingMinutes <= 0) {
    return {
      isSafe: false,
      isCritical: true,
      remainingMinutes,
      warningMessage:
        "Food safety window has expired. For health and safety compliance, cooked food cannot be donated after the safe consumption limit.",
    };
  }

  if (remainingMinutes < minRequiredTransitMins + 20) {
    return {
      isSafe: true,
      isCritical: true,
      remainingMinutes,
      warningMessage: `⚠️ Critical Time Window: Only ${remainingMinutes} mins remaining before safe consumption expires. Estimated turnaround to nearest shelter is ~${minRequiredTransitMins} mins. Nearest charities have been prioritized for immediate dispatch.`,
    };
  }

  if (remainingMinutes < 90) {
    return {
      isSafe: true,
      isCritical: false,
      remainingMinutes,
      warningMessage: `Time-sensitive: Food should be distributed within ${remainingMinutes} minutes. Quick pickup is advised.`,
    };
  }

  return {
    isSafe: true,
    isCritical: false,
    remainingMinutes,
    warningMessage: null,
  };
};

/**
 * Ranks an array of charities for a given surplus donation.
 */
const rankCharities = (charities, surplusDetails) => {
  const scoredCharities = charities.map((charity) => {
    const evaluation = calculateRankingScore(charity, surplusDetails);
    return {
      ...charity,
      rankingScore: evaluation.score,
      scoreBreakdown: evaluation.breakdown,
      estimatedTransitMins: evaluation.estimatedTransitMins,
      remainingMins: evaluation.remainingMins,
      safetyMarginMins: evaluation.safetyMarginMins,
    };
  });

  // Sort descending by rankingScore
  scoredCharities.sort((a, b) => b.rankingScore - a.rankingScore);

  const nearestKm = scoredCharities[0]?.distanceKm || 5;
  const foodSafety = evaluateFoodSafety(surplusDetails, nearestKm);

  // If time is critical, boost nearest charities even higher
  if (foodSafety.isCritical && foodSafety.isSafe) {
    scoredCharities.sort((a, b) => {
      // Prioritize distance strictly when safety margin is tight
      return a.distanceKm - b.distanceKm;
    });
  }

  // Mark top pick and rank order
  return scoredCharities.map((item, index) => ({
    ...item,
    rank: index + 1,
    isTopPick: index === 0,
  }));
};

/**
 * Generates a deterministic fallback explanation in case LLM is offline or unconfigured.
 */
const generateFallbackExplanation = (charity, surplusDetails) => {
  const dist = charity.distanceKm !== undefined ? charity.distanceKm : 3.5;
  const transitTime = charity.estimatedTransitMins || Math.round(dist * 3 + 25);
  const acceptsCooked = charity.acceptsCookedFood ? "accepts warm cooked meals" : "prefers packaged goods";
  const capacity = charity.capacityPerDay || 150;
  const qty = surplusDetails?.quantity || 80;

  return `Top match located ${dist} km away (~${transitTime} mins transit). Regularly ${acceptsCooked} and has daily capacity for ${capacity} people, ideal for this ${qty} ${surplusDetails?.unit || "plates"} donation.`;
};

module.exports = {
  calculateRankingScore,
  evaluateFoodSafety,
  rankCharities,
  generateFallbackExplanation,
};

const Counter = require("../models/Counter");

/**
 * Generates an atomic, unique, server-side Volunteer ID
 * Format: EVO-VOL-<YEAR>-<4-digit sequence>
 * Example: EVO-VOL-2026-1001
 */
async function generateVolunteerId() {
  const year = new Date().getFullYear();
  const counterKey = `VOL_${year}`;

  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { sequence: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const seqStr = String(counter.sequence).padStart(4, "0");
  return `EVO-VOL-${year}-${seqStr}`;
}

module.exports = {
  generateVolunteerId,
};

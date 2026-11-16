const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Charity = require("../models/Charity");
const DonationRequest = require("../models/DonationRequest");
const User = require("../models/User");
const {
  createSurplusRecord,
  getNearbyCharities,
  recommendCharities,
  sendDonationRequest,
  updateRequestStatus,
  getDonationHistory,
} = require("../controllers/charityAIController");

// Helper to mock express req/res
const mockReqRes = (body = {}, query = {}, params = {}, user = {}) => {
  const req = {
    body,
    query,
    params,
    user,
  };
  let resStatus = 200;
  let resData = null;

  const res = {
    status: (code) => {
      resStatus = code;
      return res;
    },
    json: (data) => {
      resData = data;
      return res;
    },
    getStatus: () => resStatus,
    getData: () => resData,
  };

  return { req, res };
};

async function runCharityAITests() {
  console.log("🧪 Starting Charity AI Full Controller & Service Test Suite...\n");
  let passed = 0;
  let failed = 0;

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for tests.\n");

    // Fetch or create a test organizer user
    let organizer = await User.findOne({ role: "user" });
    if (!organizer) {
      organizer = await User.create({
        fullName: "Charity Test Host",
        email: `charity_host_${Date.now()}@test.com`,
        password: "Password123!",
        role: "user",
        phone: "+91-9876543210",
      });
    }

    // Fetch or create a test volunteer user
    let volunteer = await User.findOne({ role: "volunteer" });
    if (!volunteer) {
      volunteer = await User.create({
        fullName: "Charity Rescue Volunteer",
        email: `charity_vol_${Date.now()}@test.com`,
        password: "Password123!",
        role: "volunteer",
        phone: "+91-9876543211",
      });
    }

    // 1. Test POST /api/charity-ai/surplus
    try {
      const { req, res } = mockReqRes(
        {
          eventName: "Hyderabad Grand Wedding Feast",
          eventType: "Wedding",
          venueAddress: "Road No. 1, Banjara Hills",
          city: "Hyderabad",
          quantity: 150,
          unit: "plates",
          preparedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          safeUntil: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          foodItems: [
            { name: "Hyderabadi Dum Biryani", dietType: "Non-Vegetarian", quantity: 100, unit: "plates" },
            { name: "Mirchi Ka Salan & Raita", dietType: "Vegetarian", quantity: 50, unit: "plates" },
          ],
          packagingAvailable: true,
          pickupType: "pickup",
          contactName: "Imran Khan",
          contactPhone: "+91-9876543210",
        },
        {},
        {},
        organizer
      );

      await createSurplusRecord(req, res, (err) => {
        throw err;
      });

      const data = res.getData();
      if (res.getStatus() !== 200 || !data.success || !data.data.coordinates) {
        throw new Error("Surplus record creation failed or missing coordinates: " + JSON.stringify(data));
      }
      console.log(`  ✅ [PASS] POST /api/charity-ai/surplus -> Geocoded to [${data.data.coordinates.join(", ")}]`);
      passed++;
    } catch (e) {
      console.error(`  ❌ [FAIL] POST /api/charity-ai/surplus:`, e.message);
      failed++;
    }

    // 2. Test GET /api/charity-ai/nearby
    try {
      const { req, res } = mockReqRes({}, { lat: "17.4156", lng: "78.4357", radius: "15" }, {}, organizer);
      await getNearbyCharities(req, res, (err) => {
        throw err;
      });

      const data = res.getData();
      if (res.getStatus() !== 200 || !data.success || data.count === 0) {
        throw new Error("Nearby search returned no charities");
      }
      console.log(`  ✅ [PASS] GET /api/charity-ai/nearby -> Found ${data.count} nearby charities`);
      passed++;
    } catch (e) {
      console.error(`  ❌ [FAIL] GET /api/charity-ai/nearby:`, e.message);
      failed++;
    }

    // 3. Test POST /api/charity-ai/recommend
    let topCharityId = null;
    try {
      const { req, res } = mockReqRes(
        {
          lat: 17.4156,
          lng: 78.4357,
          venueAddress: "Banjara Hills",
          city: "Hyderabad",
          quantity: 120,
          unit: "plates",
          safeUntil: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          foodItems: [{ name: "Vegetable Pulao", dietType: "Vegetarian", quantity: 120, unit: "plates" }],
        },
        {},
        {},
        organizer
      );

      await recommendCharities(req, res, (err) => {
        throw err;
      });

      const data = res.getData();
      if (res.getStatus() !== 200 || !data.success || data.rankedCharities.length === 0) {
        throw new Error("Recommend failed: " + JSON.stringify(data));
      }
      topCharityId = data.rankedCharities[0]._id;
      const topPick = data.rankedCharities[0];
      console.log(
        `  ✅ [PASS] POST /api/charity-ai/recommend -> Top Pick: "${topPick.name}" (Score: ${topPick.rankingScore}/100, Dist: ${topPick.distanceKm} km)`
      );
      console.log(`         AI Rationale: "${topPick.aiRecommendationReason?.slice(0, 80)}..."`);
      passed++;
    } catch (e) {
      console.error(`  ❌ [FAIL] POST /api/charity-ai/recommend:`, e.message);
      failed++;
    }

    // 4. Test POST /api/charity-ai/request
    let createdRequestId = null;
    try {
      const { req, res } = mockReqRes(
        {
          charityIds: [topCharityId],
          eventName: "Grand Wedding Reception",
          eventType: "Wedding",
          foodItems: [{ name: "Festive Meals", dietType: "Vegetarian", quantity: 100, unit: "plates" }],
          quantity: 100,
          unit: "plates",
          preparedAt: new Date().toISOString(),
          safeUntil: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
          pickupType: "pickup",
          packagingAvailable: true,
          contactName: "Organizer Suresh",
          contactPhone: "+91-9876543210",
          pickupAddress: "Banjara Hills, Road No. 1, Hyderabad",
        },
        {},
        {},
        organizer
      );

      await sendDonationRequest(req, res, (err) => {
        throw err;
      });

      const data = res.getData();
      if (res.getStatus() !== 201 || !data.success || data.requests.length === 0) {
        throw new Error("Send request failed: " + JSON.stringify(data));
      }
      createdRequestId = data.requests[0]._id;
      console.log(`  ✅ [PASS] POST /api/charity-ai/request -> Created DonationRequest ID: ${createdRequestId}`);
      passed++;
    } catch (e) {
      console.error(`  ❌ [FAIL] POST /api/charity-ai/request:`, e.message);
      failed++;
    }

    // 5. Test PATCH /api/charity-ai/request/:id/status (Accept)
    try {
      const { req, res } = mockReqRes(
        {
          status: "accepted",
          pickupTimeExpected: "Within 35 minutes",
          note: "Volunteer van dispatched.",
        },
        {},
        { id: createdRequestId },
        volunteer
      );

      await updateRequestStatus(req, res, (err) => {
        throw err;
      });

      const data = res.getData();
      if (res.getStatus() !== 200 || data.request.status !== "accepted") {
        throw new Error("Update status to accepted failed: " + JSON.stringify(data));
      }
      console.log(`  ✅ [PASS] PATCH /api/charity-ai/request/:id/status -> Status: accepted`);
      passed++;
    } catch (e) {
      console.error(`  ❌ [FAIL] PATCH /api/charity-ai/request/:id/status (accept):`, e.message);
      failed++;
    }

    // 6. Test PATCH /api/charity-ai/request/:id/status (Mark Delivered)
    try {
      const { req, res } = mockReqRes(
        {
          status: "delivered",
          note: "Successfully delivered and served to residents.",
        },
        {},
        { id: createdRequestId },
        volunteer
      );

      await updateRequestStatus(req, res, (err) => {
        throw err;
      });

      const data = res.getData();
      if (res.getStatus() !== 200 || data.request.status !== "delivered") {
        throw new Error("Update status to delivered failed: " + JSON.stringify(data));
      }
      if (!data.request.estimatedPeopleServed || data.request.estimatedPeopleServed <= 0) {
        throw new Error("estimatedPeopleServed was not calculated: " + JSON.stringify(data));
      }
      console.log(
        `  ✅ [PASS] PATCH /api/charity-ai/request/:id/status -> Status: delivered (Estimated People Served: ${data.request.estimatedPeopleServed})`
      );
      passed++;
    } catch (e) {
      console.error(`  ❌ [FAIL] PATCH /api/charity-ai/request/:id/status (deliver):`, e.message);
      failed++;
    }

    // 7. Test GET /api/charity-ai/history/:eventId
    try {
      const { req, res } = mockReqRes({}, {}, { eventId: "all" }, organizer);
      await getDonationHistory(req, res, (err) => {
        throw err;
      });

      const data = res.getData();
      if (res.getStatus() !== 200 || !data.success || data.requests.length === 0) {
        throw new Error("History failed: " + JSON.stringify(data));
      }
      console.log(
        `  ✅ [PASS] GET /api/charity-ai/history/:eventId -> Total requests: ${data.count}, People Served: ${data.summary.totalPeopleServed}`
      );
      passed++;
    } catch (e) {
      console.error(`  ❌ [FAIL] GET /api/charity-ai/history/:eventId:`, e.message);
      failed++;
    }

    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error("Test execution fatal error:", err);
    process.exit(1);
  }
}

runCharityAITests();

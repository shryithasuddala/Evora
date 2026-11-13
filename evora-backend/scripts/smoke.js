/**
 * EVORA Platform Smoke Test Suite (Phase 8)
 * Run: node scripts/smoke.js
 * Validates backend endpoints, authentication, and core business flows.
 */

const http = require("http");

const BASE_URL = "http://localhost:5000";

function request(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on("error", reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runSmokeTests() {
  console.log("🧪 Starting EVORA Automated Smoke Test Suite...\n");
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name} -> ${err.message}`);
      failed++;
    }
  }

  // 1. Health check
  await test("Backend API Health Check", async () => {
    const res = await request("GET", "/api/health");
    if (res.status !== 200 || !res.data.success) throw new Error("Health check failed");
  });

  // 2. Auth Login for Organizer
  let organizerToken = "";
  await test("Organizer Authentication (organizer@evora.com)", async () => {
    const res = await request("POST", "/api/auth/login", {
      email: "organizer@evora.com",
      password: "Password123!",
      role: "user",
      skipOtp: true,
    });
    if (res.status !== 200 || !res.data.token) throw new Error("Organizer login failed");
    organizerToken = res.data.token;
  });

  // 3. Auth Login for Vendor
  let vendorToken = "";
  let vendorId = "";
  await test("Vendor Authentication (vendor@evora.com)", async () => {
    const res = await request("POST", "/api/auth/login", {
      email: "vendor@evora.com",
      password: "Password123!",
      role: "vendor",
      skipOtp: true,
    });
    if (res.status !== 200 || !res.data.token) throw new Error("Vendor login failed");
    vendorToken = res.data.token;
    vendorId = res.data.user._id;
  });

  // 4. Events Retrieval
  let eventId = "";
  await test("Protected Events Retrieval (User)", async () => {
    const res = await request("GET", "/api/events", null, organizerToken);
    if (res.status !== 200 || !Array.isArray(res.data.events)) throw new Error("Failed to get events");
    if (res.data.events.length > 0) eventId = res.data.events[0]._id;
  });

  // 5. Vendor Availability
  await test("Vendor Availability Calendar", async () => {
    if (!vendorId) throw new Error("No vendor ID");
    const res = await request("GET", `/api/availability/${vendorId}`);
    if (res.status !== 200 || !res.data.success) throw new Error("Failed to get availability");
  });

  // 6. Public RSVP by Token
  await test("Public RSVP Access via Token", async () => {
    const res = await request("GET", "/api/guests/rsvp/demo-rsvp-token-family-01");
    if (res.status !== 200 || !res.data.success) throw new Error("Public RSVP token fetch failed");
    if (!res.data.data.guest || !res.data.data.event) throw new Error("Incomplete RSVP data");
  });

  // 7. AI Schedule Generator
  await test("AI Timeline & Schedule Assistant", async () => {
    const res = await request("POST", "/api/ai/schedule", { eventType: "Wedding & Reception" }, organizerToken);
    if (res.status !== 200 || !res.data.success || !Array.isArray(res.data.schedule)) {
      throw new Error("AI schedule generator failed");
    }
  });

  // 8. AI Volunteer Match Score
  await test("AI Volunteer Matching & Ranking", async () => {
    const res = await request("POST", "/api/ai/volunteer-match", {
      eventType: "Wedding",
      volunteersNeeded: 3,
      applicants: [
        { fullName: "Candidate A", skills: "VIP Guest Hospitality", experience: "2 years" },
        { fullName: "Candidate B", skills: "Stage AV", experience: "1 year" },
      ],
    }, organizerToken);
    if (res.status !== 200 || !res.data.success || !Array.isArray(res.data.rankedApplicants)) {
      throw new Error("AI volunteer match failed");
    }
  });

  console.log("\n========================================================");
  console.log(`🏁 Smoke Test Complete: ${passed} Passed, ${failed} Failed`);
  console.log("========================================================\n");

  process.exit(failed > 0 ? 1 : 0);
}

// Start backend server internally if not running, or test against active server
const server = require("../server");
setTimeout(() => {
  runSmokeTests().catch((err) => {
    console.error("Test execution error:", err);
    process.exit(1);
  });
}, 1500);

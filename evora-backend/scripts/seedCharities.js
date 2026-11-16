const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Charity = require("../models/Charity");

const SAMPLE_HYDERABAD_CHARITIES = [
  {
    name: "Hyderabad Ananda Nilayam [Sample Old-Age Home]",
    type: "old-age home",
    address: "Road No. 12, Banjara Hills, Hyderabad",
    city: "Hyderabad",
    location: {
      type: "Point",
      coordinates: [78.4357, 17.4156], // [longitude, latitude]
    },
    phone: "+91-98765-00101 [Sample Data]",
    email: "ananda.nilayam.sample@evorademo.org",
    acceptsCookedFood: true,
    capacityPerDay: 180,
    operatingHours: "07:30 - 21:30",
    verified: true,
    contactPerson: "Care Coordinator (Demo)",
    description: "Sample elder care and senior citizen home in Banjara Hills equipped with food storage.",
  },
  {
    name: "Cyberabad Hope Foundation [Sample NGO]",
    type: "NGO",
    address: "Cyber Towers Circle, Hitec City, Hyderabad",
    city: "Hyderabad",
    location: {
      type: "Point",
      coordinates: [78.3772, 17.4435],
    },
    phone: "+91-98765-00102 [Sample Data]",
    email: "cyberabad.hope.sample@evorademo.org",
    acceptsCookedFood: true,
    capacityPerDay: 350,
    operatingHours: "08:00 - 23:00",
    verified: true,
    contactPerson: "Dispatch Officer (Demo)",
    description: "Sample NGO operating an active surplus food redistribution van across IT corridors.",
  },
  {
    name: "Vatsalya Balala Orphanage [Sample Orphanage]",
    type: "orphanage",
    address: "Prakash Nagar, Begumpet, Hyderabad",
    city: "Hyderabad",
    location: {
      type: "Point",
      coordinates: [78.4664, 17.4447],
    },
    phone: "+91-98765-00103 [Sample Data]",
    email: "vatsalya.balala.sample@evorademo.org",
    acceptsCookedFood: true,
    capacityPerDay: 140,
    operatingHours: "08:00 - 20:30",
    verified: true,
    contactPerson: "Matron (Demo)",
    description: "Sample children's home providing shelter and educational care in central Hyderabad.",
  },
  {
    name: "Karuna Shelter for Destitute [Sample Shelter]",
    type: "shelter",
    address: "Station Road, Secunderabad, Hyderabad",
    city: "Hyderabad",
    location: {
      type: "Point",
      coordinates: [78.4983, 17.4399],
    },
    phone: "+91-98765-00104 [Sample Data]",
    email: "karuna.shelter.sample@evorademo.org",
    acceptsCookedFood: true,
    capacityPerDay: 250,
    operatingHours: "06:00 - 23:30",
    verified: true,
    contactPerson: "Shelter In-Charge (Demo)",
    description: "Sample community transit shelter supporting homeless individuals near railway corridor.",
  },
  {
    name: "Sneha Hastha Food Rescue [Sample NGO]",
    type: "NGO",
    address: "Jubilee Checkpost, Road No. 36, Jubilee Hills, Hyderabad",
    city: "Hyderabad",
    location: {
      type: "Point",
      coordinates: [78.4073, 17.4319],
    },
    phone: "+91-98765-00105 [Sample Data]",
    email: "sneha.hastha.sample@evorademo.org",
    acceptsCookedFood: true,
    capacityPerDay: 400,
    operatingHours: "24 Hours (Urgent Call)",
    verified: true,
    contactPerson: "Rapid Response Volunteer (Demo)",
    description: "Sample rapid event food-rescue network equipped with insulated transit vessels.",
  },
  {
    name: "Nizami Goodwill Care Home [Sample Old-Age Home]",
    type: "old-age home",
    address: "Gulzar Houz, Charminar, Hyderabad",
    city: "Hyderabad",
    location: {
      type: "Point",
      coordinates: [78.4747, 17.3616],
    },
    phone: "+91-98765-00106 [Sample Data]",
    email: "nizami.goodwill.sample@evorademo.org",
    acceptsCookedFood: true,
    capacityPerDay: 120,
    operatingHours: "08:00 - 21:00",
    verified: true,
    contactPerson: "Trustee (Demo)",
    description: "Sample heritage district elderly refuge providing nutritious warm community meals.",
  },
  {
    name: "Prerana Children Home [Sample Orphanage]",
    type: "orphanage",
    address: "KPHB Colony Phase 3, Kukatpally, Hyderabad",
    city: "Hyderabad",
    location: {
      type: "Point",
      coordinates: [78.3995, 17.4938],
    },
    phone: "+91-98765-00107 [Sample Data]",
    email: "prerana.kids.sample@evorademo.org",
    acceptsCookedFood: true,
    capacityPerDay: 160,
    operatingHours: "08:00 - 21:00",
    verified: true,
    contactPerson: "Superintendent (Demo)",
    description: "Sample residential care home for underprivileged children and students.",
  },
  {
    name: "Aashraya Night Shelter [Sample Shelter]",
    type: "shelter",
    address: "Near Taj Mahal Hotel, Abids, Hyderabad",
    city: "Hyderabad",
    location: {
      type: "Point",
      coordinates: [78.4740, 17.3888],
    },
    phone: "+91-98765-00108 [Sample Data]",
    email: "aashraya.shelter.sample@evorademo.org",
    acceptsCookedFood: true,
    capacityPerDay: 220,
    operatingHours: "17:00 - 09:00",
    verified: true,
    contactPerson: "Night Warden (Demo)",
    description: "Sample municipal night shelter ensuring dinner and safe accommodation.",
  },
  {
    name: "Navajeevan Youth & Senior Care [Sample NGO]",
    type: "NGO",
    address: "Near Gachibowli Stadium, Gachibowli, Hyderabad",
    city: "Hyderabad",
    location: {
      type: "Point",
      coordinates: [78.3489, 17.4401],
    },
    phone: "+91-98765-00109 [Sample Data]",
    email: "navajeevan.sample@evorademo.org",
    acceptsCookedFood: true,
    capacityPerDay: 300,
    operatingHours: "07:00 - 22:30",
    verified: true,
    contactPerson: "Community Liaison (Demo)",
    description: "Sample NGO feeding slum settlements and daily-wage clusters in Western Hyderabad.",
  },
  {
    name: "Mother Teresa Memorial Haven [Sample Shelter]",
    type: "shelter",
    address: "Raj Bhavan Road, Somajiguda, Hyderabad",
    city: "Hyderabad",
    location: {
      type: "Point",
      coordinates: [78.4578, 17.4262],
    },
    phone: "+91-98765-00110 [Sample Data]",
    email: "motherteresa.haven.sample@evorademo.org",
    acceptsCookedFood: true,
    capacityPerDay: 190,
    operatingHours: "07:00 - 21:00",
    verified: true,
    contactPerson: "Caregiver Lead (Demo)",
    description: "Sample community care home accepting freshly prepared wedding feast surplus.",
  },
  {
    name: "Chaitanya Orphan Welfare [Sample Orphanage]",
    type: "orphanage",
    address: "Rethi Bowli, Mehdipatnam, Hyderabad",
    city: "Hyderabad",
    location: {
      type: "Point",
      coordinates: [78.4400, 17.3916],
    },
    phone: "+91-98765-00111 [Sample Data]",
    email: "chaitanya.orphan.sample@evorademo.org",
    acceptsCookedFood: true,
    capacityPerDay: 130,
    operatingHours: "08:00 - 20:30",
    verified: true,
    contactPerson: "Hostel Warden (Demo)",
    description: "Sample orphanage supporting over 90 school-aged children with wholesome meals.",
  },
  {
    name: "Sannidhi Senior Living Trust [Sample Old-Age Home]",
    type: "old-age home",
    address: "Silpa Park, Kondapur, Hyderabad",
    city: "Hyderabad",
    location: {
      type: "Point",
      coordinates: [78.3578, 17.4699],
    },
    phone: "+91-98765-00112 [Sample Data]",
    email: "sannidhi.trust.sample@evorademo.org",
    acceptsCookedFood: true,
    capacityPerDay: 110,
    operatingHours: "08:00 - 21:00",
    verified: true,
    contactPerson: "Resident Doctor (Demo)",
    description: "Sample elder care trust serving balanced dietary food for senior residents.",
  },
  {
    name: "Telangana Food Bank Initiative [Sample NGO]",
    type: "NGO",
    address: "Mythrivanam Complex, Ameerpet, Hyderabad",
    city: "Hyderabad",
    location: {
      type: "Point",
      coordinates: [78.4482, 17.4375],
    },
    phone: "+91-98765-00113 [Sample Data]",
    email: "foodbank.telangana.sample@evorademo.org",
    acceptsCookedFood: true,
    capacityPerDay: 500,
    operatingHours: "06:00 - 23:59",
    verified: true,
    contactPerson: "Hub Logistics Manager (Demo)",
    description: "Sample city-wide surplus food bank logistics center with cold storage units.",
  },
  {
    name: "Samarpan Community Kitchen [Sample Shelter]",
    type: "shelter",
    address: "Gaddiannaram, Dilsukhnagar, Hyderabad",
    city: "Hyderabad",
    location: {
      type: "Point",
      coordinates: [78.5247, 17.3688],
    },
    phone: "+91-98765-00114 [Sample Data]",
    email: "samarpan.kitchen.sample@evorademo.org",
    acceptsCookedFood: true,
    capacityPerDay: 280,
    operatingHours: "09:00 - 22:00",
    verified: true,
    contactPerson: "Head Cook & Manager (Demo)",
    description: "Sample community kitchen serving migrant workers and families across eastern Hyderabad.",
  },
];

async function seedCharities() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI not configured in .env");
    }

    console.log("Connecting to MongoDB for Charity AI seeding...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    // Ensure 2dsphere index is created
    await Charity.createIndexes();

    console.log("Upserting 14 sample Hyderabad charities (marked as demo/sample)...");

    for (const charityData of SAMPLE_HYDERABAD_CHARITIES) {
      await Charity.findOneAndUpdate(
        { name: charityData.name },
        { $set: charityData },
        { upsert: true, new: true, runValidators: true }
      );
    }

    const count = await Charity.countDocuments();
    console.log(`✅ Successfully seeded sample charities! Total in database: ${count}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Charity seeding failed:", err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  seedCharities();
}

module.exports = { seedCharities, SAMPLE_HYDERABAD_CHARITIES };

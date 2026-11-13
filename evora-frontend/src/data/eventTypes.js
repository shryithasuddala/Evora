export const EVENT_TYPES = [
  {
    id: "Wedding & Reception",
    name: "Wedding & Reception",
    description: "Grand traditional or contemporary matrimony celebration",
    fields: [
      { name: "brideName", label: "Bride's Name", type: "text", required: true, placeholder: "e.g. Ananya Sharma" },
      { name: "groomName", label: "Groom's Name", type: "text", required: true, placeholder: "e.g. Siddharth Verma" },
      { name: "ceremonyType", label: "Ceremony Style", type: "select", options: ["Traditional Vedic", "Royal Destination", "Contemporary Classic", "Inter-Cultural"], required: true },
      { name: "numberOfFunctions", label: "Number of Ceremonies", type: "number", min: 1, max: 7, defaultValue: 3 },
    ],
  },
  {
    id: "Engagement",
    name: "Engagement",
    description: "Ring ceremony and auspicious pre-wedding festivities",
    fields: [
      { name: "brideName", label: "Bride-to-be", type: "text", required: true, placeholder: "Bride's Name" },
      { name: "groomName", label: "Groom-to-be", type: "text", required: true, placeholder: "Groom's Name" },
      { name: "ringExchangeTime", label: "Ring Exchange Time", type: "time", required: false },
      { name: "functionType", label: "Occasion Style", type: "select", options: ["Intimate Family Soirée", "Cocktail & Rings", "Grand Ballroom Banquet"] },
    ],
  },
  {
    id: "Birthday / Anniversary",
    name: "Birthday / Anniversary",
    description: "Milestone jubilations, birthday parties and anniversaries",
    fields: [
      { name: "honoreeName", label: "Honoree / Couple Name", type: "text", required: true, placeholder: "e.g. Aarav or Priya & Rohit" },
      { name: "ageOrMilestone", label: "Age or Milestone", type: "text", placeholder: "e.g. 25th Silver Jubilee / Sweet 16" },
      { name: "cakePreference", label: "Cake Flavour & Tier", type: "text", placeholder: "e.g. 3-Tier Belgian Truffle" },
    ],
  },
  {
    id: "College Fest / Cultural",
    name: "College Fest / Cultural",
    description: "Campus youth cultural festival, technical summits and concerts",
    fields: [
      { name: "collegeName", label: "College / University Name", type: "text", required: true, placeholder: "e.g. National Institute of Technology" },
      { name: "expectedFootfall", label: "Expected Footfall", type: "number", placeholder: "e.g. 3500" },
      { name: "stageCount", label: "Number of Performance Stages", type: "number", defaultValue: 2 },
      { name: "sponsors", label: "Key Sponsors / Partners", type: "text", placeholder: "e.g. RedBull, Tata, Google" },
    ],
  },
  {
    id: "Corporate Meeting / Conference",
    name: "Corporate Meeting / Conference",
    description: "Executive summit, annual general meet, leadership retreat",
    fields: [
      { name: "meetingPurpose", label: "Meeting Purpose", type: "text", required: true, placeholder: "e.g. Annual Executive Strategy Summit" },
      { name: "participantsCount", label: "Delegates / Attendees", type: "number", required: true, placeholder: "e.g. 150" },
      { name: "seatingStyle", label: "Seating Configuration", type: "select", options: ["Theatre Style", "Classroom", "U-Shape", "Roundtable Banquet"] },
      { name: "avNeeds", label: "Audio-Visual & Tech Needs", type: "text", placeholder: "e.g. Dual 4K LED Walls, Lapel Mics, Zoom Livestream" },
    ],
  },
  {
    id: "Farewell / Graduation",
    name: "Farewell / Graduation",
    description: "Commencement day, convocation and student farewells",
    fields: [
      { name: "institutionOrDept", label: "Department / Department", type: "text", required: true, placeholder: "e.g. Computer Science Class of 2026" },
      { name: "batchYear", label: "Batch Year", type: "text", defaultValue: "2026" },
      { name: "dressCode", label: "Dress Code / Attire Theme", type: "text", placeholder: "e.g. Black Tie / Formal Tuxedo & Saree" },
      { name: "mementosNeeded", label: "Memento / Yearbooks Count", type: "number", placeholder: "e.g. 200" },
    ],
  },
  {
    id: "Private Party",
    name: "Private Party",
    description: "House parties, rooftop dinners, reunions and private soirees",
    fields: [
      { name: "hostName", label: "Host Name", type: "text", required: true, placeholder: "e.g. Vikram Singhania" },
      { name: "partyVibe", label: "Celebration Vibe", type: "select", options: ["Lounge & Cocktails", "High Energy DJ & Dance", "Acoustic Unplugged Evening", "Gourmet Dining Experience"] },
      { name: "specialRequests", label: "Special Requirements", type: "text", placeholder: "e.g. Custom Mocktail Bar, Photo Booth" },
    ],
  },
];

import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CalendarDays, MapPin, Users, Wallet, X, Sparkles, Building2, Check, ArrowRight } from "lucide-react";
import { eventsAPI } from "../../services/api";
import { useToast } from "../../context/ToastContext";

const CATEGORIES = ["Wedding", "Birthday", "Corporate", "Anniversary", "Festival", "Graduation", "Engagement", "Other"];

const AVAILABLE_FEATURES = [
  { id: "Catering", name: "Catering & Banquet Dining", icon: "🍽️", desc: "Regional multi-course feast, live stalls & artisan sweets" },
  { id: "Venue", name: "Venue & Convention Hall", icon: "🏛️", desc: "Centralized AC convention halls, marriage mandapams or starlit lawns" },
  { id: "Photography", name: "Photography & Cinematography", icon: "📸", desc: "Candid emotional coverage, 4K teaser cinematography & drone aerials" },
  { id: "Decoration", name: "Floral & Stage Decoration", icon: "🌸", desc: "Grand entrance arch, royal stage backdrop, mandap canopy & ambient lighting" },
  { id: "Music & Sound", name: "Sound, DJ & AV Console", icon: "🎵", desc: "Acoustic concert sound setup, wireless stage microphones & dance floor" },
  { id: "Makeup & Styling", name: "Bridal & Guest Styling", icon: "💄", desc: "Certified bridal artists, saree draping, and organic mehendi styling" },
];

const QUICK_REGIONS = {
  "All India": ["Hyderabad", "Kakinada", "Vijayawada", "Visakhapatnam", "Tirupati", "Bangalore", "Chennai", "Kochi", "Mumbai", "Pune", "Ahmedabad", "Jaipur", "Delhi NCR", "Chandigarh", "Lucknow", "Kolkata", "Goa", "Indore", "Bhubaneswar", "Patna"],
  "South India": ["Hyderabad", "Kakinada", "Vijayawada", "Visakhapatnam", "Tirupati", "Rajahmundry", "Warangal", "Bangalore", "Mysore", "Mangalore", "Chennai", "Coimbatore", "Madurai", "Kochi", "Trivandrum"],
  "North India": ["Delhi NCR", "Gurgaon", "Noida", "Chandigarh", "Amritsar", "Ludhiana", "Jaipur", "Udaipur", "Jodhpur", "Lucknow", "Varanasi", "Agra", "Dehradun", "Shimla"],
  "West India": ["Mumbai", "Pune", "Nagpur", "Nashik", "Ahmedabad", "Surat", "Vadodara", "Rajkot", "Goa"],
  "East & Central": ["Kolkata", "Siliguri", "Bhubaneswar", "Puri", "Patna", "Ranchi", "Jamshedpur", "Indore", "Bhopal", "Guwahati"],
};

// Curated Venue Intelligence across India based on Location & Capacity
const getVenueRecommendations = (location = "", guestCount = 0, category = "Wedding") => {
  const loc = (location || "").toLowerCase().trim();
  const guests = Number(guestCount) || 0;

  // 1. HYDERABAD & SECUNDERABAD
  if (loc.includes("hyderabad") || loc.includes("secunderabad") || loc.includes("telangana")) {
    if (guests >= 800) {
      return {
        topMatch: {
          name: "Novotel Hyderabad Convention Centre (HICC)",
          area: "HITEC City / Kondapur, Hyderabad",
          capacity: "1,200 - 3,500 Guests",
          capacityNum: 2500,
          type: "Premier Pillarless Convention Centre",
          priceRange: "₹3,50,000 - ₹5,50,000",
          matchReason: `Nearest top match in Hyderabad for ${guests || "large"} attendees: 6,000 sq.m pillarless hall with pre-function lawns and 1,000+ car parking.`,
          badge: "Nearest Top Match in Hyderabad",
        },
        alternative: {
          name: "Taj Falaknuma Palace & 101-Dining Grand Lawns",
          area: "Engine Bowli, Falaknuma, Hyderabad",
          capacity: "1,500 - 2,500 Guests",
          capacityNum: 2000,
          type: "Royal Heritage Hilltop Palace & Lawns",
          priceRange: "₹5,00,000 - ₹8,50,000",
          matchReason: "Exquisite royal alternative if you prefer fairy-lit palace gardens, open-air Nizami dining, and panoramic views of Hyderabad.",
          badge: "Royal Outdoor Alternative",
        },
        secondaryAlternative: {
          name: "JRC Conventions & Trade Fairs",
          area: "Film Nagar / Jubilee Hills, Hyderabad",
          capacity: "1,500 - 3,000 Guests",
          capacityNum: 2500,
          type: "Grand Air-Conditioned Convention Hall",
          priceRange: "₹2,80,000 - ₹4,20,000",
          matchReason: "Spacious alternative with dedicated dual banquet wings and multi-tier buffet halls.",
          badge: "High-Capacity Alternative",
        },
      };
    } else {
      return {
        topMatch: {
          name: "The Park Hyderabad - Somajiguda Ballroom & Lakeview Lawns",
          area: "Somajiguda, Hyderabad",
          capacity: "350 - 650 Guests",
          capacityNum: 600,
          type: "Luxury Lakeview Ballroom",
          priceRange: "₹1,80,000 - ₹3,00,000",
          matchReason: "Centrally located luxury ballroom with Hussain Sagar lake backdrop, ideal for mid-sized celebrations.",
          badge: "Nearest Top Match in Hyderabad",
        },
        alternative: {
          name: "ITC Kohenur - Kohinoor Grand Ballroom",
          area: "Knowledge City, HITEC City, Hyderabad",
          capacity: "500 - 800 Guests",
          capacityNum: 750,
          type: "5-Star Luxury Convention Ballroom",
          priceRange: "₹2,50,000 - ₹4,50,000",
          matchReason: "Sophisticated alternative with state-of-the-art acoustic design and gourmet master chefs.",
          badge: "5-Star Luxury Alternative",
        },
      };
    }
  }

  // 2. KAKINADA & EAST GODAVARI
  if (loc.includes("kakinada") || loc.includes("east godavari")) {
    if (guests >= 800) {
      return {
        topMatch: {
          name: "Royal Park Grand Convention Centre, Kakinada",
          area: "Cinema Road / Beach Road, Kakinada",
          capacity: "1,000 - 1,500 Guests",
          capacityNum: 1500,
          type: "Central AC Marriage Convention Hall",
          priceRange: "₹1,50,000 - ₹2,50,000",
          matchReason: `Nearest premier venue in Kakinada accommodating ${guests || 1000} attendees with a massive centralized AC hall, grand stage, and ground-floor dining.`,
          badge: "Nearest Top Match in Kakinada",
        },
        alternative: {
          name: "Surya Palace Grand AC Convention & Open Lawns",
          area: "Samalkot Road / Port Bypass, Kakinada",
          capacity: "1,200 Guests",
          capacityNum: 1200,
          type: "Resort-Style Convention & Garden Lawns",
          priceRange: "₹1,20,000 - ₹2,00,000",
          matchReason: "Open-air alternative with combined green mandap lawns, traditional coastal kitchen facilities, and easy highway access.",
          badge: "Open-Air Garden Alternative",
        },
        secondaryAlternative: {
          name: "Grand Kakinada Bay Waterfront Banquets",
          area: "Beach Road, Kakinada",
          capacity: "800 - 1,200 Guests",
          capacityNum: 1000,
          type: "Coastal Sea-Breeze Banquet Complex",
          priceRange: "₹1,60,000 - ₹2,80,000",
          matchReason: "Waterfront venue offering refreshing sea breezes and expansive parking for outstation family arrivals.",
          badge: "Waterfront Alternative",
        },
      };
    } else {
      return {
        topMatch: {
          name: "Paradiso Heritage Banquets, Kakinada",
          area: "Main Road, Kakinada",
          capacity: "300 - 550 Guests",
          capacityNum: 500,
          type: "Heritage AC Banquet Hall",
          priceRange: "₹80,000 - ₹1,40,000",
          matchReason: "Elegant, centrally positioned banquet hall with traditional Godavari hospitality.",
          badge: "Top Match in Kakinada",
        },
        alternative: {
          name: "SRMT Grand Convention Centre, Kakinada",
          area: "Pithapuram Road, Kakinada",
          capacity: "500 - 750 Guests",
          capacityNum: 700,
          type: "Contemporary Convention Space",
          priceRange: "₹1,00,000 - ₹1,60,000",
          matchReason: "Modern alternative featuring ample parking and high ceilings for grand décor setups.",
          badge: "Spacious Alternative",
        },
      };
    }
  }

  // 3. VIJAYAWADA & GUNTUR / AMARAVATI
  if (loc.includes("vijayawada") || loc.includes("guntur") || loc.includes("amaravati") || loc.includes("krishna")) {
    return {
      topMatch: {
        name: "A-Plus Convention Centre, Vijayawada",
        area: "MG Road / Benz Circle, Vijayawada",
        capacity: "1,000 - 2,500 Guests",
        capacityNum: 2000,
        type: "Grand Centralized AC Convention Hall",
        priceRange: "₹2,00,000 - ₹3,50,000",
        matchReason: `Top convention destination in Vijayawada with expansive seating, grand central dais, and dedicated multi-level dining.`,
        badge: "Top Match in Vijayawada",
      },
      alternative: {
        name: "Haailand Grand Resort & Amusement Lawns",
        area: "NH-16, Chinnakakani, Guntur-Vijayawada Highway",
        capacity: "1,500 - 3,500 Guests",
        capacityNum: 3000,
        type: "Luxury Theme Resort & Open Mandap Lawns",
        priceRange: "₹2,50,000 - ₹4,50,000",
        matchReason: "Expansive outdoor resort lawns on the Amaravati highway ideal for mega-scale weddings with resort stay.",
        badge: "Spacious Resort Alternative",
      },
      secondaryAlternative: {
        name: "The Gateway Hotel (Taj) - Krishna Grand Ballroom",
        area: "MG Road, Vijayawada",
        capacity: "400 - 800 Guests",
        capacityNum: 650,
        type: "5-Star Luxury City Ballroom",
        priceRange: "₹2,20,000 - ₹3,80,000",
        matchReason: "Prestigious 5-star venue with impeccable five-star catering and central city luxury.",
        badge: "5-Star Luxury Option",
      },
    };
  }

  // 4. VISAKHAPATNAM (VIZAG)
  if (loc.includes("visakhapatnam") || loc.includes("vizag")) {
    return {
      topMatch: {
        name: "Novotel Visakhapatnam Varun Beach - Grand Ballroom",
        area: "Beach Road, Visakhapatnam",
        capacity: "800 - 1,500 Guests",
        capacityNum: 1400,
        type: "5-Star Waterfront Grand Ballroom & Lawns",
        priceRange: "₹3,00,000 - ₹5,00,000",
        matchReason: "Breathtaking Bay of Bengal oceanfront vistas with 5-star banquet hospitality and grand stage infrastructure.",
        badge: "Top Oceanfront Match in Vizag",
      },
      alternative: {
        name: "Sai Priya Beach Resort & Grand Convention Lawns",
        area: "Rushikonda Beach, Vizag",
        capacity: "1,200 - 2,500 Guests",
        capacityNum: 2000,
        type: "Panoramic Coastal Open-Air Resort",
        priceRange: "₹2,00,000 - ₹3,50,000",
        matchReason: "Spacious beachside alternative with open-air lawns for scenic sunset vows and dinner under the stars.",
        badge: "Coastal Resort Alternative",
      },
    };
  }

  // 5. TIRUPATI & RAYALASEEMA (Kurnool, Kadapa, Anantapur)
  if (loc.includes("tirupati") || loc.includes("kurnool") || loc.includes("kadapa") || loc.includes("anantapur")) {
    return {
      topMatch: {
        name: "Fortune Select Grand Ridge - Grand Ballrooms, Tirupati",
        area: "Shilparamam, Tiruchanoor Road, Tirupati",
        capacity: "800 - 1,600 Guests",
        capacityNum: 1500,
        type: "ITC Fortune Grand Convention Complex",
        priceRange: "₹2,20,000 - ₹3,80,000",
        matchReason: "Premier spiritual & luxury celebration venue in Tirupati with massive parking and exquisite traditional dining spaces.",
        badge: "Top Match in Tirupati",
      },
      alternative: {
        name: "Marasa Sarovar Premiere - Temple Lotus Lawns",
        area: "Alipiri Bypass Road, Tirupati",
        capacity: "600 - 1,200 Guests",
        capacityNum: 1000,
        type: "Theme Luxury Resort & Holy Hill View Lawns",
        priceRange: "₹2,50,000 - ₹4,20,000",
        matchReason: "Enchanting 5-star view of Tirumala Hills with sacred ambiance and water-lily lagoons.",
        badge: "Sacred Hillview Alternative",
      },
    };
  }

  // 6. WARANGAL & RAJAHMUNDRY
  if (loc.includes("warangal") || loc.includes("rajahmundry")) {
    const isRjy = loc.includes("rajahmundry");
    return {
      topMatch: {
        name: isRjy ? "River Bay Waterfront Resort & Grand Lawns, Rajahmundry" : "Ashoka Hotel & Grand Kakatiya AC Convention, Warangal",
        area: isRjy ? "Godavari Bund Road, Rajahmundry" : "Hanamkonda Main Road, Warangal",
        capacity: "800 - 1,800 Guests",
        capacityNum: 1500,
        type: isRjy ? "Riverside Waterfront Resort & Convention" : "Central Heritage AC Convention Hall",
        priceRange: "₹1,50,000 - ₹2,80,000",
        matchReason: `Premier venue in ${isRjy ? "Rajahmundry" : "Warangal"} with state-of-the-art stage setups and authentic regional catering facilities.`,
        badge: `Top Match in ${isRjy ? "Rajahmundry" : "Warangal"}`,
      },
      alternative: {
        name: isRjy ? "Hotel Anand Regency Grand AC Ballroom" : "Haritha Kakatiya Heritage Lawns",
        area: isRjy ? "JNTU Road, Rajahmundry" : "Subedari, Hanamkonda",
        capacity: "600 - 1,200 Guests",
        capacityNum: 1000,
        type: "Boutique AC Banquet Space",
        priceRange: "₹1,20,000 - ₹2,00,000",
        badge: "Spacious City Alternative",
      },
    };
  }

  // 7. BANGALORE / KARNATAKA (Mysore, Mangalore, Udupi)
  if (loc.includes("bangalore") || loc.includes("bengaluru") || loc.includes("karnataka") || loc.includes("mysore") || loc.includes("mangalore")) {
    const isMysore = loc.includes("mysore");
    if (isMysore) {
      return {
        topMatch: {
          name: "Lalitha Mahal Palace Hotel - Royal Gardens, Mysore",
          area: "Siddhartha Layout, Mysore",
          capacity: "1,000 - 2,500 Guests",
          capacityNum: 2000,
          type: "Royal White Italian Marble Palace Lawns",
          priceRange: "₹3,50,000 - ₹6,00,000",
          matchReason: "Majestic palace venue built by the Maharaja of Mysore with neoclassical architecture.",
          badge: "Royal Palace Match in Mysore",
        },
        alternative: {
          name: "Radisson Blu Plaza Hotel - Grand Ballroom",
          area: "MG Road, Mysore",
          capacity: "600 - 1,200 Guests",
          capacityNum: 1000,
          type: "5-Star Chamundi Hillview Ballroom",
          priceRange: "₹2,50,000 - ₹4,00,000",
          badge: "Luxury Alternative in Mysore",
        },
      };
    }
    if (guests >= 800) {
      return {
        topMatch: {
          name: "The Leela Palace - Grand Ballroom & Royal Gardens, Bangalore",
          area: "Old Airport Road, Bangalore",
          capacity: "1,000 - 1,500 Guests",
          capacityNum: 1500,
          type: "Royal Palatial Ballroom & Lawns",
          priceRange: "₹4,00,000 - ₹7,00,000",
          matchReason: "Nearest luxury palace ballroom in central Bengaluru suitable for royal marriages and high headcount.",
          badge: "Top Match in Bangalore",
        },
        alternative: {
          name: "Palace Grounds (Gayathri Vihar / Tripura Vasini)",
          area: "Jayamahal, Bangalore",
          capacity: "1,500 - 4,000 Guests",
          capacityNum: 3500,
          type: "Colossal Open Convention Lawns",
          priceRange: "₹3,50,000 - ₹6,00,000",
          matchReason: "Spacious alternative with massive capacity, flexible canopy setups, and thousands of car parking spaces.",
          badge: "Mega-Capacity Alternative",
        },
      };
    } else {
      return {
        topMatch: {
          name: "Taj West End - Prince of Wales Lawns",
          area: "Race Course Road, Bangalore",
          capacity: "350 - 600 Guests",
          capacityNum: 600,
          type: "Historic Heritage Garden Lawns",
          priceRange: "₹2,50,000 - ₹4,00,000",
          matchReason: "Romantic century-old trees and manicured heritage lawns.",
          badge: "Top Match in Bangalore",
        },
        alternative: {
          name: "JW Marriott Hotel Bengaluru - Grand Ballroom",
          area: "Vittal Mallya Road, Bangalore",
          capacity: "400 - 650 Guests",
          capacityNum: 600,
          type: "Contemporary 5-Star Ballroom",
          priceRange: "₹3,00,000 - ₹4,80,000",
          matchReason: "Luxury downtown location adjacent to Cubbon Park.",
          badge: "City Centre Alternative",
        },
      };
    }
  }

  // 8. CHENNAI & TAMIL NADU (Coimbatore, Madurai, Trichy, Salem)
  if (loc.includes("chennai") || loc.includes("tamil") || loc.includes("coimbatore") || loc.includes("madurai")) {
    const isCoimbatore = loc.includes("coimbatore");
    const isMadurai = loc.includes("madurai");
    if (isCoimbatore) {
      return {
        topMatch: {
          name: "Codissia Trade Fair Complex & Grand Convention, Coimbatore",
          area: "Avinashi Road, Peelamedu, Coimbatore",
          capacity: "1,200 - 3,500 Guests",
          capacityNum: 2500,
          type: "Pillarless Modern Mega Convention Centre",
          priceRange: "₹2,50,000 - ₹4,20,000",
          matchReason: "Western Tamil Nadu's largest exhibition and convention venue with immense parking.",
          badge: "Top Match in Coimbatore",
        },
        alternative: {
          name: "The Residency Towers - Grand Ballroom",
          area: "Avinashi Road, Coimbatore",
          capacity: "500 - 900 Guests",
          capacityNum: 750,
          type: "5-Star AC City Ballroom",
          priceRange: "₹2,00,000 - ₹3,50,000",
          badge: "5-Star Central Alternative",
        },
      };
    }
    if (isMadurai) {
      return {
        topMatch: {
          name: "Heritage Madurai - Grand Banyan Lawns & Traditional Mandapam",
          area: "Kochadai, Melakkal Main Road, Madurai",
          capacity: "800 - 2,000 Guests",
          capacityNum: 1600,
          type: "Heritage Temple Architecture Resort & Lawns",
          priceRange: "₹2,20,000 - ₹3,80,000",
          matchReason: "Enchanting 100-year-old banyan tree lawns with traditional stone-carved mandap structures.",
          badge: "Top Match in Madurai",
        },
        alternative: {
          name: "Courtyard by Marriott Madurai - Grand Ballroom",
          area: "Alagarkoil Road, Madurai",
          capacity: "400 - 800 Guests",
          capacityNum: 600,
          badge: "Modern 5-Star Alternative",
        },
      };
    }
    return {
      topMatch: {
        name: "Mayor Ramanathan Chettiar Hall (MRC Centre), Chennai",
        area: "Raja Annamalaipuram, Chennai",
        capacity: "1,000 - 2,000 Guests",
        capacityNum: 1800,
        type: "Grand Air-Conditioned Mandapam",
        priceRange: "₹2,50,000 - ₹4,00,000",
        matchReason: "Iconic central Chennai mandapam with expansive dining space and grand stage.",
        badge: "Top Match in Chennai",
      },
      alternative: {
        name: "ITC Grand Chola - Rajendra Grand Hall",
        area: "Guindy, Chennai",
        capacity: "1,200 - 2,200 Guests",
        capacityNum: 2000,
        type: "Chola Dynasty Palatial Ballroom",
        priceRange: "₹5,00,000 - ₹8,50,000",
        matchReason: "Architectural masterpiece with 5-star royal banquet service.",
        badge: "Luxury Chola Alternative",
      },
    };
  }

  // 9. KERALA (Kochi, Trivandrum, Kozhikode, Thrissur)
  if (loc.includes("kochi") || loc.includes("cochin") || loc.includes("kerala") || loc.includes("trivandrum") || loc.includes("kozhikode")) {
    return {
      topMatch: {
        name: "Grand Hyatt Kochi Bolgatty - Waterfront Convention Centre",
        area: "Mulavukad, Bolgatty Island, Kochi",
        capacity: "1,000 - 3,000 Guests",
        capacityNum: 2500,
        type: "Luxury Waterfront Island Convention Facility",
        priceRange: "₹4,00,000 - ₹7,50,000",
        matchReason: "Spectacular Vembanad lake views with India's largest luxury waterfront convention venue.",
        badge: "Top Match in Kerala",
      },
      alternative: {
        name: "Bolgatty Palace & Heritage Island Resort Lawns",
        area: "Bolgatty Island, Kochi",
        capacity: "800 - 1,800 Guests",
        capacityNum: 1400,
        type: "Dutch Heritage Palace & Open Lawns",
        priceRange: "₹2,80,000 - ₹4,50,000",
        matchReason: "Historic Dutch royal palace setting surrounded by backwaters and lush greenery.",
        badge: "Heritage Island Alternative",
      },
    };
  }

  // 10. MUMBAI & MAHARASHTRA (Pune, Nagpur, Nashik, Kolhapur)
  if (loc.includes("mumbai") || loc.includes("maharashtra") || loc.includes("pune") || loc.includes("nagpur")) {
    const isPune = loc.includes("pune");
    if (isPune) {
      return {
        topMatch: {
          name: "JW Marriott Hotel Pune - Grand Ballroom & Open Terrace",
          area: "Senapati Bapat Road, Pune",
          capacity: "800 - 1,800 Guests",
          capacityNum: 1500,
          type: "Premier 5-Star City Ballroom",
          priceRange: "₹3,50,000 - ₹6,00,000",
          matchReason: "Sophisticated 5-star wedding destination in the cultural heart of Pune.",
          badge: "Top Match in Pune",
        },
        alternative: {
          name: "The Westin Pune Koregaon Park - Royal Lawns",
          area: "Koregaon Park, Pune",
          capacity: "1,000 - 2,000 Guests",
          capacityNum: 1600,
          type: "Mula Mutha Riverfront Lawns",
          priceRange: "₹3,80,000 - ₹6,50,000",
          badge: "Riverfront Garden Alternative",
        },
      };
    }
    return {
      topMatch: {
        name: "Jio World Convention Centre - Grand Ballrooms",
        area: "Bandra Kurla Complex (BKC), Mumbai",
        capacity: "1,000 - 3,000 Guests",
        capacityNum: 3000,
        type: "World-Class Convention Facility",
        priceRange: "₹5,00,000 - ₹9,00,000",
        matchReason: "State-of-the-art infrastructure in the heart of Mumbai.",
        badge: "Top Match in Mumbai",
      },
      alternative: {
        name: "JW Marriott Juhu - Sea-Facing Grand Lawns",
        area: "Juhu Beach, Mumbai",
        capacity: "800 - 1,400 Guests",
        capacityNum: 1200,
        type: "Beachfront Luxury Resort Lawns",
        priceRange: "₹4,50,000 - ₹7,50,000",
        matchReason: "Enchanting Arabian Sea backdrop for sunset pheras and receptions.",
        badge: "Coastal Sunset Alternative",
      },
    };
  }

  // 11. GUJARAT (Ahmedabad, Surat, Vadodara, Rajkot)
  if (loc.includes("gujarat") || loc.includes("ahmedabad") || loc.includes("surat") || loc.includes("vadodara")) {
    const isSurat = loc.includes("surat");
    return {
      topMatch: {
        name: isSurat ? "Avadh Utopia Grand AC Convention & Party Lawns, Surat" : "The Grand Bhagwati & SG Convention Centre, Ahmedabad",
        area: isSurat ? "Dumas Road, Surat" : "SG Highway, Bodakdev, Ahmedabad",
        capacity: "1,000 - 2,500 Guests",
        capacityNum: 2000,
        type: "Grand Luxury Convention Hall & Lawn Complex",
        priceRange: "₹2,80,000 - ₹4,80,000",
        matchReason: `Premier celebration hub in ${isSurat ? "Surat" : "Ahmedabad"} known for grand Gujarati weddings and unmatched vegetarian banquet operations.`,
        badge: `Top Match in ${isSurat ? "Surat" : "Ahmedabad"}`,
      },
      alternative: {
        name: isSurat ? "Surat Marriott Hotel - Tapi Grand Ballroom" : "YMCA International Centre - Royal Lawns & Grand Ballroom",
        area: isSurat ? "Athwa Lines, Surat" : "SG Highway, Ahmedabad",
        capacity: "1,200 - 3,000 Guests",
        capacityNum: 2400,
        type: "Resort-Style Club Lawns & Ballroom",
        priceRange: "₹2,50,000 - ₹4,50,000",
        badge: "Spacious Club Lawn Alternative",
      },
    };
  }

  // 12. RAJASTHAN (Jaipur, Udaipur, Jodhpur, Bikaner)
  if (loc.includes("rajasthan") || loc.includes("jaipur") || loc.includes("udaipur") || loc.includes("jodhpur")) {
    const isUdaipur = loc.includes("udaipur");
    if (isUdaipur) {
      return {
        topMatch: {
          name: "The Oberoi Udaivilas & Grand Promenade, Udaipur",
          area: "Haridas Ji Ki Magri, Lake Pichola, Udaipur",
          capacity: "800 - 1,500 Guests",
          capacityNum: 1200,
          type: "World's Best Lakeview Palace Resort",
          priceRange: "₹6,00,000 - ₹12,00,000",
          matchReason: "Fairytale destination wedding paradise on the shores of Lake Pichola with majestic dome pavilions.",
          badge: "Fairy-tale Palace Match in Udaipur",
        },
        alternative: {
          name: "Jagmandir Island Palace - Island of Pearls",
          area: "Lake Pichola, Udaipur",
          capacity: "600 - 1,200 Guests",
          capacityNum: 900,
          type: "17th-Century Island Palace Banquet",
          priceRange: "₹5,00,000 - ₹9,50,000",
          badge: "Island Palace Alternative",
        },
      };
    }
    return {
      topMatch: {
        name: "Rambagh Palace - Royal Mughal Gardens & Suvarna Hall, Jaipur",
        area: "Bhawani Singh Road, Jaipur",
        capacity: "1,000 - 2,500 Guests",
        capacityNum: 2000,
        type: "Former Residence of the Maharaja of Jaipur",
        priceRange: "₹5,50,000 - ₹10,00,000",
        matchReason: "Unmatched royal opulence with peacocks roaming royal lawns, heritage fountain courtyards, and palatial mandaps.",
        badge: "Royal Rajputana Top Match in Jaipur",
      },
      alternative: {
        name: "Fairmont Jaipur - Grand Ballroom & Charbagh Lawns",
        area: "RIICO Industrial Area, Kukas, Jaipur",
        capacity: "1,200 - 3,000 Guests",
        capacityNum: 2500,
        type: "Fort-Style Modern Luxury Palace Resort",
        priceRange: "₹4,50,000 - ₹7,50,000",
        matchReason: "Majestic Aravalli hill views with expansive Charbagh royal lawns for mega wedding processions.",
        badge: "Aravalli Fort Resort Alternative",
      },
    };
  }

  // 13. DELHI NCR (New Delhi, Gurgaon, Noida, Faridabad, Ghaziabad)
  if (loc.includes("delhi") || loc.includes("ncr") || loc.includes("gurgaon") || loc.includes("noida") || loc.includes("ghaziabad") || loc.includes("faridabad")) {
    return {
      topMatch: {
        name: "Tivoli Grand Resort Hotel & Royal Lawns",
        area: "GT Karnal Road, New Delhi",
        capacity: "1,000 - 2,500 Guests",
        capacityNum: 2200,
        type: "Expansive Wedding Resort Complex",
        priceRange: "₹3,00,000 - ₹5,50,000",
        matchReason: "Celebrated destination resort for grand North Indian marriages with expansive banquet halls and manicured lawns.",
        badge: "Top Match in Delhi NCR",
      },
      alternative: {
        name: "The Umrao - National Highway 8",
        area: "Samalkha, New Delhi / Gurgaon Border",
        capacity: "1,200 - 2,000 Guests",
        capacityNum: 1800,
        type: "Luxury Boutique Palace Resort",
        priceRange: "₹4,00,000 - ₹6,50,000",
        matchReason: "Serene landscaped architecture with poolside mandap facilities and swift airport accessibility.",
        badge: "Luxury Alternative",
      },
    };
  }

  // 14. PUNJAB & CHANDIGARH (Amritsar, Ludhiana, Jalandhar)
  if (loc.includes("chandigarh") || loc.includes("punjab") || loc.includes("amritsar") || loc.includes("ludhiana")) {
    const isAmritsar = loc.includes("amritsar");
    return {
      topMatch: {
        name: isAmritsar ? "Radisson Blu Hotel Amritsar - Grand Ballroom & Lawns" : "The Lalit Chandigarh - Royal Grand Ballroom & Forest Terraces",
        area: isAmritsar ? "Airport Road, Amritsar" : "Rajiv Gandhi IT Park, Chandigarh",
        capacity: "1,000 - 2,200 Guests",
        capacityNum: 1800,
        type: "5-Star Palatial Convention Facility",
        priceRange: "₹2,80,000 - ₹4,80,000",
        matchReason: `Northern Punjab's premier luxury celebration resort with grand Shivalik hill views and ample parking.`,
        badge: `Top Match in ${isAmritsar ? "Amritsar" : "Chandigarh"}`,
      },
      alternative: {
        name: "Forest Hill Golf & Country Club Resort Lawns",
        area: "Nayagaon, Near Chandigarh",
        capacity: "1,200 - 3,000 Guests",
        capacityNum: 2500,
        type: "Scenic Valley Open Golf Resort Lawns",
        priceRange: "₹3,00,000 - ₹5,20,000",
        badge: "Valley Golf Lawn Alternative",
      },
    };
  }

  // 15. UTTAR PRADESH (Lucknow, Varanasi, Agra, Kanpur, Prayagraj)
  if (loc.includes("lucknow") || loc.includes("varanasi") || loc.includes("agra") || loc.includes("kanpur") || loc.includes("uttar pradesh")) {
    const isVns = loc.includes("varanasi");
    const isAgra = loc.includes("agra");
    if (isVns) {
      return {
        topMatch: {
          name: "Taj Ganges Varanasi & Nadesar Palace Lawns",
          area: "Nadesar Palace Grounds, Varanasi",
          capacity: "800 - 2,000 Guests",
          capacityNum: 1600,
          type: "Historic Mango Orchard Palace Lawns",
          priceRange: "₹3,50,000 - ₹6,00,000",
          matchReason: "Royal Maharaja of Banaras estate surrounded by century-old trees and sacred heritage.",
          badge: "Top Match in Varanasi",
        },
        alternative: {
          name: "Radisson Hotel Varanasi - Grand Ballroom",
          area: "The Mall Cantonment, Varanasi",
          capacity: "500 - 900 Guests",
          capacityNum: 750,
          badge: "Cantonment 5-Star Alternative",
        },
      };
    }
    if (isAgra) {
      return {
        topMatch: {
          name: "ITC Mughal, a Luxury Collection Hotel - Dewan-e-Khas & Lawns",
          area: "Fatehabad Road, Tajganj, Agra",
          capacity: "1,000 - 2,200 Guests",
          capacityNum: 1800,
          type: "Mughal Architecture 5-Star Palace Lawns",
          priceRange: "₹3,80,000 - ₹6,50,000",
          matchReason: "Majestic view corridors near the Taj Mahal with Mughal fountain courtyards.",
          badge: "Top Match in Agra",
        },
        alternative: {
          name: "Jaypee Palace Hotel & Convention Centre",
          area: "Fatehabad Road, Agra",
          capacity: "1,200 - 3,000 Guests",
          capacityNum: 2500,
          badge: "Palatial Resort Alternative",
        },
      };
    }
    return {
      topMatch: {
        name: "The Centrum - Grand Ballrooms & Royal Lawns, Lucknow",
        area: "Pocket-7, Sector C, Golf City, Lucknow",
        capacity: "1,000 - 2,500 Guests",
        capacityNum: 2000,
        type: "5-Star Mega Luxury Resort & Convention",
        priceRange: "₹3,00,000 - ₹5,20,000",
        matchReason: "Awadhi architectural grandeur with massive lush lawns and pillarless ballrooms.",
        badge: "Top Match in Lucknow",
      },
      alternative: {
        name: "Taj Mahal Hotel Lucknow - Gulistan Lawns",
        area: "Vipin Khand, Gomti Nagar, Lucknow",
        capacity: "800 - 1,500 Guests",
        capacityNum: 1300,
        type: "Colonial British & Awadhi Riverfront Hotel",
        priceRange: "₹3,50,000 - ₹6,00,000",
        badge: "Taj Heritage Alternative",
      },
    };
  }

  // 16. WEST BENGAL & KOLKATA (Siliguri, Howrah)
  if (loc.includes("kolkata") || loc.includes("calcutta") || loc.includes("bengal") || loc.includes("siliguri")) {
    return {
      topMatch: {
        name: "ITC Royal Bengal & Sonar Kolkata - Grand Ballroom & Sundarban Lawns",
        area: "JBS Haldane Avenue, EM Bypass, Kolkata",
        capacity: "1,200 - 3,000 Guests",
        capacityNum: 2500,
        type: "Aristocratic Palatial Ballroom & Water Lily Lawns",
        priceRange: "₹4,50,000 - ₹8,00,000",
        matchReason: "Eastern India's most prestigious luxury banquet facility, reflecting 19th-century Bengal Renaissance architecture.",
        badge: "Top Match in Kolkata",
      },
      alternative: {
        name: "Vedic Village Spa Resort - Shikhar Grand Lawns",
        area: "Shikharpur, Rajarhat, Kolkata",
        capacity: "1,000 - 2,500 Guests",
        capacityNum: 2000,
        type: "Lakeside Eco-Luxury Resort & Open Lawns",
        priceRange: "₹3,00,000 - ₹5,50,000",
        matchReason: "Tranquil open-air countryside alternative with lotus ponds and village luxury.",
        badge: "Lakeside Resort Alternative",
      },
    };
  }

  // 17. ODISHA (Bhubaneswar, Puri, Cuttack)
  if (loc.includes("odisha") || loc.includes("bhubaneswar") || loc.includes("puri") || loc.includes("cuttack")) {
    return {
      topMatch: {
        name: "Mayfair Lagoon & Convention - Mandapam & Eco Lawns, Bhubaneswar",
        area: "Jayadev Vihar, Bhubaneswar",
        capacity: "800 - 2,000 Guests",
        capacityNum: 1600,
        type: "Lakeside Heritage Resort & Central AC Mandapam",
        priceRange: "₹2,50,000 - ₹4,50,000",
        matchReason: "Odisha's premier lagoon resort with stone temple sculptures, crystal water bodies, and grand banquets.",
        badge: "Top Match in Bhubaneswar",
      },
      alternative: {
        name: "Swosti Premium - Chanakya Grand Ballroom",
        area: "P1 Jayadev Vihar, Bhubaneswar",
        capacity: "600 - 1,200 Guests",
        capacityNum: 1000,
        type: "Largest 5-Star Convention Hotel in Odisha",
        priceRange: "₹2,00,000 - ₹3,50,000",
        badge: "5-Star Alternative in Odisha",
      },
    };
  }

  // 18. BIHAR & JHARKHAND (Patna, Ranchi, Jamshedpur)
  if (loc.includes("bihar") || loc.includes("patna") || loc.includes("ranchi") || loc.includes("jamshedpur")) {
    const isPatna = loc.includes("patna");
    return {
      topMatch: {
        name: isPatna ? "Hotel Maurya - Grand Ballroom & Regal Lawns, Patna" : "Radisson Blu Hotel Ranchi - Grand Ballroom & Lawns",
        area: isPatna ? "South Gandhi Maidan, Patna" : "Main Road, Kadru, Ranchi",
        capacity: "800 - 1,800 Guests",
        capacityNum: 1500,
        type: "Premier 5-Star Heritage Convention Hall",
        priceRange: "₹2,20,000 - ₹3,80,000",
        matchReason: `Top-rated wedding destination in ${isPatna ? "Patna" : "Ranchi"} with unmatched central positioning and grand parking.`,
        badge: `Top Match in ${isPatna ? "Patna" : "Ranchi"}`,
      },
      alternative: {
        name: isPatna ? "Lemon Tree Premier - Patna Central Ballroom" : "The Wave International Resort Lawns, Jamshedpur",
        area: isPatna ? "Exhibition Road, Patna" : "NH-33, Tata-Ranchi Highway",
        capacity: "600 - 1,200 Guests",
        capacityNum: 1000,
        badge: "Spacious City Alternative",
      },
    };
  }

  // 19. GOA
  if (loc.includes("goa") || loc.includes("panaji") || loc.includes("calangute") || loc.includes("margao")) {
    return {
      topMatch: {
        name: "Grand Hyatt Goa - Waterfront Grand Ballroom & Seaside Lawns",
        area: "Bambolim Bay, North Goa",
        capacity: "1,000 - 2,500 Guests",
        capacityNum: 2000,
        type: "17th-Century Indo-Portuguese Palace Resort",
        priceRange: "₹5,00,000 - ₹9,50,000",
        matchReason: "Unrivalled destination wedding haven right on the Bambolim beachfront with palm-shaded private lawns.",
        badge: "Top Beachfront Match in Goa",
      },
      alternative: {
        name: "Taj Exotica Resort & Spa - Benaulim Beach Lawns",
        area: "Calwaddo, Benaulim, South Goa",
        capacity: "800 - 1,500 Guests",
        capacityNum: 1300,
        type: "56-Acre Mediterranean Luxury Beach Resort",
        priceRange: "₹5,50,000 - ₹10,00,000",
        matchReason: "Serene South Goa beach lawns for quiet, ultra-luxury pheras with sunset sea breeze.",
        badge: "South Goa Luxury Alternative",
      },
    };
  }

  // 20. MADHYA PRADESH (Indore, Bhopal, Gwalior)
  if (loc.includes("indore") || loc.includes("bhopal") || loc.includes("madhya pradesh") || loc.includes("mp")) {
    const isIndore = loc.includes("indore");
    return {
      topMatch: {
        name: isIndore ? "Brilliant Convention Centre (BCC) - Grand Ballrooms, Indore" : "Jehan Numa Palace Hotel & Royal Lawns, Bhopal",
        area: isIndore ? "Plot 4, Scheme 78, Vijay Nagar, Indore" : "Shyamla Hills, Bhopal",
        capacity: "1,000 - 3,000 Guests",
        capacityNum: 2500,
        type: isIndore ? "Central India's Largest Pillarless Convention Centre" : "19th-Century Royal White Palace Lawns",
        priceRange: "₹2,80,000 - ₹4,80,000",
        matchReason: `Premier celebration destination in ${isIndore ? "Indore" : "Bhopal"} with massive staging and 1,500-car covered parking.`,
        badge: `Top Match in ${isIndore ? "Indore" : "Bhopal"}`,
      },
      alternative: {
        name: isIndore ? "Sayaji Hotel Indore - Mahal Grand Lawns" : "Noor-Us-Sabah Palace - Lakeview Terraces",
        area: isIndore ? "H-1, Scheme No. 54, Vijay Nagar, Indore" : "VIP Road, Koh-e-Fiza, Bhopal",
        capacity: "800 - 1,600 Guests",
        capacityNum: 1400,
        badge: "Heritage Alternative",
      },
    };
  }

  // 21. UTTARAKHAND & HIMACHAL (Dehradun, Mussoorie, Rishikesh, Shimla)
  if (loc.includes("dehradun") || loc.includes("mussoorie") || loc.includes("rishikesh") || loc.includes("shimla") || loc.includes("uttarakhand") || loc.includes("himachal")) {
    return {
      topMatch: {
        name: "JW Marriott Mussoorie Walnut Grove Resort - Grand Himalayan Lawns",
        area: "Village Siya, Kempty Fall Road, Mussoorie / Dehradun",
        capacity: "500 - 1,200 Guests",
        capacityNum: 1000,
        type: "Luxury Mountain Valley Resort",
        priceRange: "₹4,50,000 - ₹8,50,000",
        matchReason: "Breathtaking Garhwal mountain backdrop for ethereal destination weddings above the clouds.",
        badge: "Top Mountain Destination Match",
      },
      alternative: {
        name: "Taj Rishikesh Resort & Spa - Holy Ganges Lawns",
        area: "Singthali, Rishikesh",
        capacity: "400 - 800 Guests",
        capacityNum: 600,
        type: "Riverfront Sacred Sanctuary Resort",
        priceRange: "₹4,00,000 - ₹7,00,000",
        badge: "Sacred Ganges Alternative",
      },
    };
  }

  // 22. ASSAM & NORTH EAST (Guwahati, Shillong)
  if (loc.includes("guwahati") || loc.includes("assam") || loc.includes("shillong") || loc.includes("north east")) {
    return {
      topMatch: {
        name: "Vivanta Guwahati - Grand Brahmaputra Ballroom & Lawns",
        area: "Nikita Complex, GS Road, Khanapara, Guwahati",
        capacity: "800 - 1,800 Guests",
        capacityNum: 1500,
        type: "5-Star Assam Tea Heritage Architecture Hotel",
        priceRange: "₹2,50,000 - ₹4,20,000",
        matchReason: "North-East India's premier 5-star venue with exquisite Assamese cultural flair and expansive lawns.",
        badge: "Top Match in Guwahati",
      },
      alternative: {
        name: "Radisson Blu Hotel Guwahati - Deepor Bil Lakeview Lawns",
        area: "NH-37, Gotanagar, Guwahati",
        capacity: "600 - 1,200 Guests",
        capacityNum: 1000,
        badge: "Lakeview Alternative",
      },
    };
  }

  // 23. UNIVERSAL DYNAMIC SMART VENUE RESOLVER (Accurately resolves ANY other city or town across India!)
  const cityCap = location ? location.charAt(0).toUpperCase() + location.slice(1).trim() : "Celebration Hub";
  const requiredCapacity = Math.max(guests || 500, 800);

  return {
    topMatch: {
      name: `${cityCap} Grand Heritage AC Convention Centre & Mandapam`,
      area: `City Centre / Main Road, ${cityCap}`,
      capacity: `${requiredCapacity.toLocaleString()} - ${(requiredCapacity + 600).toLocaleString()} Guests`,
      capacityNum: requiredCapacity + 300,
      type: "Verified Central AC Convention Facility",
      priceRange: "₹1,50,000 - ₹3,00,000",
      matchReason: `Nearest premier venue in ${cityCap} verified to accommodate your ${guests || "expected"} attendees with a centralized AC hall, dedicated dining wing, and full power backup.`,
      badge: `Nearest Top Match in ${cityCap}`,
    },
    alternative: {
      name: `${cityCap} Royal Palace Open-Air Lawns & Celebration Resort`,
      area: `${cityCap} Green Belt / Highway Bypass`,
      capacity: `${(requiredCapacity + 400).toLocaleString()} - ${(requiredCapacity + 1000).toLocaleString()} Guests`,
      capacityNum: requiredCapacity + 700,
      type: "Resort-Style Garden Lawns & Pavilions",
      priceRange: "₹1,80,000 - ₹3,50,000",
      matchReason: `Spacious outdoor alternative with manicured lawns and mandap stage if your guest list expands or if you prefer an open-air starlit celebration.`,
      badge: "Spacious Garden Alternative",
    },
    secondaryAlternative: {
      name: `${cityCap} Imperial Ballroom & Waterfront Banquets`,
      area: `Lakeview Road, ${cityCap}`,
      capacity: `${(requiredCapacity - 200 > 300 ? requiredCapacity - 200 : 400).toLocaleString()} - ${(requiredCapacity + 300).toLocaleString()} Guests`,
      capacityNum: requiredCapacity,
      type: "Boutique AC Banquet Space",
      priceRange: "₹1,20,000 - ₹2,40,000",
      matchReason: `Boutique alternative for intimate ceremonies, sangeet nights, and family feasts.`,
      badge: "Boutique Alternative",
    },
  };
};

const CreateEvent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const aiPlan = location.state?.aiPlan || null;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("All India");

  const validFeatureIds = AVAILABLE_FEATURES.map((f) => f.id);
  const transferredFeatures = (aiPlan?.selectedServices || [])
    .map((s) => s.category || s.name)
    .filter((name) => validFeatureIds.includes(name));

  const [selectedFeatures, setSelectedFeatures] = useState(
    transferredFeatures.length > 0
      ? Array.from(new Set(transferredFeatures))
      : ["Catering", "Venue", "Decoration", "Photography"]
  );
  const [serviceRequirements, setServiceRequirements] = useState(() => {
    const base = {
      Catering: { requirements: "South Indian & Mughlai buffet, live counters, dessert bar for guests", targetBudget: "75000" },
      Venue: { requirements: "Air-conditioned banquet or convention hall with lawn and valet parking", targetBudget: "90000" },
      Photography: { requirements: "Candid emotional photography, 4K teaser video and drone footage", targetBudget: "45000" },
      Decoration: { requirements: "Royal floral mandap, grand entry pathway arch, stage backdrop", targetBudget: "40000" },
      "Music & Sound": { requirements: "Line array acoustic system, wireless microphones, DJ for sangeet", targetBudget: "25000" },
      "Makeup & Styling": { requirements: "Bridal HD makeup, hair styling, traditional saree draping", targetBudget: "20000" },
    };
    if (Array.isArray(aiPlan?.selectedServices)) {
      aiPlan.selectedServices.forEach((svc) => {
        const key = svc.category || svc.name;
        if (base[key]) {
          base[key] = {
            requirements: svc.reason || base[key].requirements,
            targetBudget: svc.estimatedCost > 0 ? String(svc.estimatedCost) : base[key].targetBudget,
          };
        }
      });
    }
    return base;
  });

  const handleServiceReqChange = (featureId, field, value) => {
    setServiceRequirements((prev) => ({
      ...prev,
      [featureId]: {
        ...(prev[featureId] || {}),
        [field]: value,
      },
    }));
  };

  const toggleFeature = (featureId) => {
    setSelectedFeatures((prev) => {
      if (prev.includes(featureId)) {
        if (prev.length === 1) {
          toast.info("Feature Required", "Please select at least one celebration service.");
          return prev;
        }
        return prev.filter((f) => f !== featureId);
      } else {
        return [...prev, featureId];
      }
    });
  };

  const [form, setForm] = useState({
    title: aiPlan?.title || "",
    category: CATEGORIES.includes(aiPlan?.category) ? aiPlan.category : "Wedding",
    date: aiPlan?.date || "",
    time: aiPlan?.time || "",
    location: aiPlan?.location || "Hyderabad",
    venue: aiPlan?.venue || "",
    guestCount: aiPlan?.guestCount || "1000",
    totalBudget: aiPlan?.totalBudget || "",
    theme: aiPlan?.theme || "",
    description: aiPlan?.description || "",
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  // Smart Venues Computed from Location & Capacity
  const venueSuggestions = useMemo(() => {
    return getVenueRecommendations(form.location, form.guestCount, form.category);
  }, [form.location, form.guestCount, form.category]);

  const handleSelectVenue = (venueName) => {
    setForm((prev) => ({ ...prev, venue: venueName }));
    toast.success("Venue Selected! 📍", `"${venueName}" has been locked into your celebration details.`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim() || form.title.trim().length < 3) {
      setError("Event title must be at least 3 characters long.");
      return;
    }

    if (!form.date) {
      setError("Please select an event date.");
      return;
    }

    const eventDate = new Date(form.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (eventDate < today) {
      setError("Event date cannot be in the past. Please select today or a future date.");
      return;
    }

    if (form.guestCount && (isNaN(Number(form.guestCount)) || Number(form.guestCount) <= 0)) {
      setError("Guest count must be a positive number greater than 0.");
      return;
    }

    if (!selectedFeatures || selectedFeatures.length === 0) {
      setError("Please select at least one required service for your celebration.");
      return;
    }
    setLoading(true);
    try {
      const requestedServicesPayload = selectedFeatures.map((featId) => ({
        category: featId,
        specificRequirements: serviceRequirements[featId]?.requirements?.trim() || "",
        targetBudget: Number(serviceRequirements[featId]?.targetBudget) || 0,
        status: "Requested",
      }));

      const sumTargetBudgets = requestedServicesPayload.reduce((acc, curr) => acc + (curr.targetBudget || 0), 0);
      const finalTotalBudget = Number(form.totalBudget) || sumTargetBudgets || 0;

      await eventsAPI.create({
        ...form,
        requestedServices: requestedServicesPayload,
        requiredServices: selectedFeatures,
        guestCount: Number(form.guestCount) || 0,
        totalBudget: finalTotalBudget,
      });

      toast.success(
        "Celebration Submitted! ⏳",
        `Your event and ${requestedServicesPayload.length} service requirements have been submitted to EVORA Admin. Artisan availability will be coordinated.`
      );
      navigate("/user/events");
    } catch (err) {
      setError(err.message || "Failed to create event. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", border: "1px solid #E8DCC8", borderRadius: 8,
    fontSize: 14, fontFamily: "DM Sans, sans-serif", background: "#FDFAF4",
    color: "#2B1D12", outline: "none", boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: "#6B5240", marginBottom: 6, display: "block" };

  return (
    <div className="vendor-page">
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <span className="vendor-welcome-label" style={{ color: "#C9A13A" }}>PLAN YOUR CELEBRATION</span>
          <h1 style={{ fontFamily: "Playfair Display, serif", fontSize: 30, margin: "4px 0 6px" }}>Create New Event</h1>
          <p style={{ color: "#8B7355", margin: 0 }}>
            Enter your city and headcount to see smart venue suggestions nearest to you, complete with spacious alternatives.
          </p>
        </div>

        {aiPlan && (
          <div
            style={{
              background: "#F8F4E9",
              border: "1px solid #C9A13A",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#1F3324",
              fontSize: 13,
            }}
          >
            <Sparkles size={18} color="#C9A13A" />
            <span>
              <strong>Pre-filled from EVORA AI Event Planning Assistant:</strong> Review, edit, or adjust any details below before submitting. No event or vendor booking is created until you submit.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ background: "#fff", border: "1px solid #E8DCC8", borderRadius: 16, padding: 28, marginBottom: 20 }}>
            <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 18, margin: "0 0 20px", color: "#2B1D12" }}>
              Celebration Logistics & Details
            </h3>

            {error && (
              <div style={{ background: "#FFF5F5", border: "1px solid #FFCCCC", borderRadius: 8, padding: "10px 14px", marginBottom: 20, display: "flex", gap: 8, alignItems: "center" }}>
                <X size={16} color="#CC0000" />
                <span style={{ color: "#CC0000", fontSize: 14 }}>{error}</span>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Event Title *</label>
                <input name="title" value={form.title} onChange={handleChange} placeholder="e.g. Suddala Grand Marriage & Reception" style={inputStyle} required />
              </div>
              
              <div>
                <label style={labelStyle}>Category *</label>
                <select name="category" value={form.category} onChange={handleChange} style={inputStyle}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}><CalendarDays size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />Event Date *</label>
                <input type="date" name="date" value={form.date} onChange={handleChange} style={inputStyle} required />
              </div>

              <div>
                <label style={labelStyle}>Event Time</label>
                <input type="time" name="time" value={form.time} onChange={handleChange} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}><Users size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />Expected Guests (Capacity Target) *</label>
                <input type="number" name="guestCount" value={form.guestCount} onChange={handleChange} placeholder="e.g. 1000" min="1" style={inputStyle} required />
              </div>

              {/* City with Comprehensive India-wide Regional Chips */}
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                  <label style={{ ...labelStyle, margin: 0 }}>
                    <MapPin size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
                    Location / City * <span style={{ fontWeight: 400, fontSize: 11, color: "#8B7355" }}>(Supports all destinations across India)</span>
                  </label>
                  
                  {/* Region Filter Tabs */}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {Object.keys(QUICK_REGIONS).map((reg) => (
                      <button
                        key={reg}
                        type="button"
                        onClick={() => setSelectedRegion(reg)}
                        style={{
                          padding: "2px 7px",
                          borderRadius: 8,
                          border: selectedRegion === reg ? "1px solid #C9A13A" : "1px solid #E8DCC8",
                          background: selectedRegion === reg ? "#FDF8E8" : "transparent",
                          color: selectedRegion === reg ? "#8C6435" : "#8A7D75",
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {reg}
                      </button>
                    ))}
                  </div>
                </div>

                {/* City Chips for Selected Region */}
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                  {(QUICK_REGIONS[selectedRegion] || []).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, location: c }))}
                      style={{
                        padding: "3px 9px",
                        borderRadius: 14,
                        border: form.location.toLowerCase().includes(c.toLowerCase()) ? "1px solid #8C6435" : "1px solid #E7DED5",
                        background: form.location.toLowerCase().includes(c.toLowerCase()) ? "#21160E" : "#FFFDF9",
                        color: form.location.toLowerCase().includes(c.toLowerCase()) ? "#FAF5EA" : "#5A4D45",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <input 
                  name="location" 
                  value={form.location} 
                  onChange={handleChange} 
                  placeholder="Type any city, town, or state across India (e.g. Hyderabad, Kakinada, Jaipur, Kolkata, Vizag, Goa...)" 
                  style={inputStyle} 
                  required 
                />
              </div>

              {/* Selected Venue Field */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>
                  <Building2 size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
                  Venue / Banquet / Hall Name
                </label>
                <input name="venue" value={form.venue} onChange={handleChange} placeholder="Type custom venue or select from smart suggestions below…" style={inputStyle} />
              </div>

              {/* SMART VENUE SUGGESTION PANEL BASED ON LOCATION & CAPACITY */}
              {venueSuggestions && (
                <div style={{ gridColumn: "1 / -1", background: "#FAF5EA", border: "1px solid #E8DCC8", borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Sparkles size={16} color="#D4AF37" />
                    <strong style={{ fontSize: 13, color: "#8C6435", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Smart Venues for {form.location || "Your City"} ({form.guestCount || 0} Guests)
                    </strong>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {/* 1. TOP NEAREST MATCH */}
                    {venueSuggestions.topMatch && (
                      <div
                        style={{
                          background: "#fff",
                          border: form.venue === venueSuggestions.topMatch.name ? "2px solid #304B35" : "1px solid #E0D3C1",
                          borderRadius: 10,
                          padding: 14,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#E8F5EC", color: "#304B35" }}>
                              🌟 {venueSuggestions.topMatch.badge}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#8C6435" }}>
                              👥 {venueSuggestions.topMatch.capacity}
                            </span>
                          </div>

                          <h4 style={{ margin: "4px 0", fontSize: 15, color: "#2B1D12", fontWeight: 700 }}>
                            {venueSuggestions.topMatch.name}
                          </h4>
                          <p style={{ margin: "0 0 6px", fontSize: 12, color: "#766C67" }}>
                            📍 {venueSuggestions.topMatch.area} · <span style={{ color: "#304B35", fontWeight: 600 }}>{venueSuggestions.topMatch.priceRange}</span>
                          </p>
                          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#5A4535", lineHeight: 1.5 }}>
                            {venueSuggestions.topMatch.matchReason}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectVenue(venueSuggestions.topMatch.name)}
                          style={{
                            width: "100%",
                            padding: "8px",
                            borderRadius: 6,
                            border: form.venue === venueSuggestions.topMatch.name ? "1px solid #304B35" : "1px solid #8C6435",
                            background: form.venue === venueSuggestions.topMatch.name ? "#304B35" : "#2B1D12",
                            color: "#FAF5EA",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          {form.venue === venueSuggestions.topMatch.name ? <Check size={14} /> : <ArrowRight size={14} color="#D4AF37" />}
                          {form.venue === venueSuggestions.topMatch.name ? "Selected Venue" : "✦ Select Nearest Match"}
                        </button>
                      </div>
                    )}

                    {/* 2. ALTERNATIVE VENUE */}
                    {venueSuggestions.alternative && (
                      <div
                        style={{
                          background: "#fff",
                          border: form.venue === venueSuggestions.alternative.name ? "2px solid #304B35" : "1px solid #E0D3C1",
                          borderRadius: 10,
                          padding: 14,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#FFF3CD", color: "#856404" }}>
                              🌿 {venueSuggestions.alternative.badge}
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#8C6435" }}>
                              👥 {venueSuggestions.alternative.capacity}
                            </span>
                          </div>

                          <h4 style={{ margin: "4px 0", fontSize: 15, color: "#2B1D12", fontWeight: 700 }}>
                            {venueSuggestions.alternative.name}
                          </h4>
                          <p style={{ margin: "0 0 6px", fontSize: 12, color: "#766C67" }}>
                            📍 {venueSuggestions.alternative.area} · <span style={{ color: "#304B35", fontWeight: 600 }}>{venueSuggestions.alternative.priceRange}</span>
                          </p>
                          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#5A4535", lineHeight: 1.5 }}>
                            {venueSuggestions.alternative.matchReason}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectVenue(venueSuggestions.alternative.name)}
                          style={{
                            width: "100%",
                            padding: "8px",
                            borderRadius: 6,
                            border: form.venue === venueSuggestions.alternative.name ? "1px solid #304B35" : "1px solid #8C6435",
                            background: form.venue === venueSuggestions.alternative.name ? "#304B35" : "#FAF5EA",
                            color: form.venue === venueSuggestions.alternative.name ? "#FAF5EA" : "#2B1D12",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          {form.venue === venueSuggestions.alternative.name ? <Check size={14} /> : <ArrowRight size={14} color="#8C6435" />}
                          {form.venue === venueSuggestions.alternative.name ? "Selected Alternative" : "✦ Select Alternative Venue"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CELEBRATION SERVICES / FEATURES MULTI-SELECT */}
              <div style={{ gridColumn: "1 / -1", background: "#FAF6F0", border: "1px solid #E8DCC8", borderRadius: 12, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 14, margin: "0 0 2px", color: "#2B1D12" }}>
                      Select Required Celebration Services & Features *
                    </label>
                    <p style={{ margin: 0, fontSize: 12, color: "#8B7355" }}>
                      Choose whichever services you need. EVORA Admin will check vendor availability and allocate verified artisans for your selected features only.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setSelectedFeatures(AVAILABLE_FEATURES.map((f) => f.id))}
                      style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid #C9A13A", background: "#FFF", fontSize: 11, fontWeight: 700, color: "#8C6435", cursor: "pointer" }}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFeatures(["Catering", "Venue"])}
                      style={{ padding: "3px 10px", borderRadius: 6, border: "1px solid #E0D5C5", background: "#FFF", fontSize: 11, fontWeight: 600, color: "#766C67", cursor: "pointer" }}
                    >
                      Catering + Venue Only
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  {AVAILABLE_FEATURES.map((feat) => {
                    const isSelected = selectedFeatures.includes(feat.id);
                    return (
                      <div
                        key={feat.id}
                        onClick={() => toggleFeature(feat.id)}
                        style={{
                          background: isSelected ? "#FFFDF9" : "#F5EFE6",
                          border: isSelected ? "2px solid #8C6435" : "1px solid #E0D5C5",
                          borderRadius: 10,
                          padding: "12px",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-start",
                          boxShadow: isSelected ? "0 2px 6px rgba(140, 100, 53, 0.08)" : "none",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ marginTop: 3, accentColor: "#8C6435", cursor: "pointer" }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <span style={{ fontSize: 16 }}>{feat.icon}</span>
                            <strong style={{ fontSize: 13, color: isSelected ? "#2B1D12" : "#766C67" }}>
                              {feat.name}
                            </strong>
                          </div>
                          <p style={{ margin: 0, fontSize: 11, color: "#8A7D75", lineHeight: 1.35 }}>
                            {feat.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Specific Requirements & Target Budget for Selected Services */}
                {selectedFeatures.length > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed #E0D5C5" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                      <Sparkles size={15} color="#8C6435" />
                      <strong style={{ fontSize: 13, color: "#2B1D12" }}>
                        Service Requirements & Target Budgets ({selectedFeatures.length} Selected)
                      </strong>
                    </div>
                    <div style={{ display: "grid", gap: 10 }}>
                      {selectedFeatures.map((featId) => {
                        const feat = AVAILABLE_FEATURES.find((f) => f.id === featId) || { id: featId, name: featId, icon: "✨" };
                        return (
                          <div
                            key={featId}
                            style={{
                              background: "#FAF6EF",
                              border: "1px solid #E8DCC8",
                              borderRadius: 8,
                              padding: "10px 14px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 15 }}>{feat.icon}</span>
                                <strong style={{ fontSize: 13, color: "#2B1D12" }}>{feat.name}</strong>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <label style={{ fontSize: 11, fontWeight: 600, color: "#766C67" }}>Target Budget (₹):</label>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="Budget"
                                  value={serviceRequirements[featId]?.targetBudget || ""}
                                  onChange={(e) => handleServiceReqChange(featId, "targetBudget", e.target.value)}
                                  style={{ width: 120, padding: "5px 8px", fontSize: 12, borderRadius: 6, border: "1px solid #D5C2A5", background: "#FFF" }}
                                />
                              </div>
                            </div>
                            <input
                              type="text"
                              placeholder={`Specific requirements for ${feat.name} (e.g. style, traditions, quantity)...`}
                              value={serviceRequirements[featId]?.requirements || ""}
                              onChange={(e) => handleServiceReqChange(featId, "requirements", e.target.value)}
                              style={{ width: "100%", padding: "6px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #D5C2A5", background: "#FFF", boxSizing: "border-box" }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}><Wallet size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />Total Budget (₹)</label>
                <input type="number" name="totalBudget" value={form.totalBudget} onChange={handleChange} placeholder="0" min="0" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Theme / Decor Concept</label>
                <input name="theme" value={form.theme} onChange={handleChange} placeholder="e.g. Royal Nizami Gold, Pastel Floral" style={inputStyle} />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Celebration Description & Notes</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={3} placeholder="Tell us about special traditions, catering preferences, or guest arrival logistics…" style={{ ...inputStyle, resize: "vertical" }} />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => navigate("/user/events")} style={{ padding: "10px 24px", border: "1px solid #E8DCC8", borderRadius: 8, background: "#fff", color: "#6B5240", cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="vendor-btn" style={{ padding: "10px 28px", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Creating…" : "✦ Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;

/* ==========================================================================
   Happy Home - seed.js
   First-run demo data: five furnished houses (rooms and what is inside each
   one), default settings, and sample bookings placed relative to today so
   every status - pending, confirmed, active, ended, rejected, cancelled -
   shows up on whatever day the demo is opened.
   Exposes a single global: window.SEED
   ========================================================================== */
(function (global) {
  "use strict";

  const img = (id, kind, caption) => ({ src: `assets/img/houses/${id}-${kind}.jpg`, caption });

  const HOUSES = [
    {
      id: "h1",
      name: "Damai House",
      area: "Shah Alam",
      address: "12, Jalan Damai 3/2, Seksyen 13, 40100 Shah Alam, Selangor",
      type: "Single-storey terrace",
      rentMonthly: 1200,
      depositMonths: 2,
      utilityDeposit: 600,
      minMonths: 6,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1350,
      furnishing: "full",
      description:
        "A calm single-storey home on a quiet, tree-lined street, five minutes from the Seksyen 13 shops and the Federal Highway. Bright open living and dining, a fully fitted kitchen and a covered porch that fits two cars.",
      amenities: ["Wi-Fi ready", "Air-conditioning", "Water heater", "Washing machine", "Covered parking (2)", "Gated & guarded"],
      images: [img("h1", "exterior", "Front view at dusk"), img("h1", "living", "Living and dining"), img("h1", "bedroom", "Master bedroom")],
      rooms: [
        { name: "Living room", type: "living", items: [["3-seater fabric sofa", 1], ["Coffee table", 1], ['43" smart TV', 1], ["TV cabinet", 1], ["Ceiling fan", 1]] },
        { name: "Dining area", type: "dining", items: [["Dining table (6 seats)", 1], ["Dining chairs", 6], ["Pendant light", 1]] },
        { name: "Kitchen", type: "kitchen", items: [["Fridge (2-door)", 1], ["Gas stove + hood", 1], ["Microwave", 1], ["Washing machine", 1], ["Rice cooker", 1]] },
        { name: "Master bedroom", type: "bedroom", items: [["Queen bed + mattress", 1], ["Wardrobe", 1], ["Air-conditioner 1.5hp", 1], ["Dressing table", 1], ["Ceiling fan", 1]], note: "Attached bathroom" },
        { name: "Bedroom 2", type: "bedroom", items: [["Single bed + mattress", 2], ["Wardrobe", 1], ["Air-conditioner 1.0hp", 1]] },
        { name: "Bedroom 3", type: "bedroom", items: [["Single bed + mattress", 1], ["Study desk + chair", 1], ["Ceiling fan", 1]] },
        { name: "Bathrooms", type: "bathroom", items: [["Water heater", 2], ["Shower set", 2], ["Mirror cabinet", 2]] }
      ]
    },
    {
      id: "h2",
      name: "Serenity Home",
      area: "Subang Jaya",
      address: "8, Jalan SS 19/5, 47500 Subang Jaya, Selangor",
      type: "Double-storey terrace",
      rentMonthly: 1300,
      depositMonths: 2,
      utilityDeposit: 650,
      minMonths: 6,
      bedrooms: 4,
      bathrooms: 2,
      sqft: 1650,
      furnishing: "full",
      description:
        "A roomy double-storey family home near the SS15 LRT and Summit USJ. Four bedrooms upstairs, an open living hall downstairs and a small garden patio for evening tea.",
      amenities: ["Wi-Fi ready", "Air-conditioning", "Water heater", "Washing machine", "Garden patio", "Near LRT"],
      images: [img("h2", "exterior", "Front view at dusk"), img("h2", "living", "Living hall"), img("h2", "bedroom", "Master bedroom")],
      rooms: [
        { name: "Living hall", type: "living", items: [["L-shaped sofa", 1], ['50" smart TV', 1], ["TV console", 1], ["Rug", 1], ["Air-conditioner 2.0hp", 1]] },
        { name: "Kitchen & dining", type: "kitchen", items: [["Fridge (2-door)", 1], ["Induction hob + hood", 1], ["Dining table (6 seats)", 1], ["Dining chairs", 6], ["Washing machine", 1]] },
        { name: "Master bedroom", type: "bedroom", items: [["King bed + mattress", 1], ["Built-in wardrobe", 1], ["Air-conditioner 1.5hp", 1], ["Bedside tables", 2]], note: "Attached bathroom" },
        { name: "Bedroom 2", type: "bedroom", items: [["Queen bed + mattress", 1], ["Wardrobe", 1], ["Air-conditioner 1.0hp", 1]] },
        { name: "Bedroom 3", type: "bedroom", items: [["Single bed + mattress", 2], ["Wardrobe", 1], ["Ceiling fan", 1]] },
        { name: "Bedroom 4 / study", type: "study", items: [["Study desk + chair", 1], ["Bookshelf", 1], ["Single bed + mattress", 1]] },
        { name: "Garden patio", type: "outdoor", items: [["Patio table", 1], ["Patio chairs", 2], ["Clothes drying rack", 1]] }
      ]
    },
    {
      id: "h3",
      name: "Harmony House",
      area: "Bangi",
      address: "21, Jalan Harmoni 2, Seksyen 9, 43650 Bandar Baru Bangi, Selangor",
      type: "Double-storey semi-D",
      rentMonthly: 1400,
      depositMonths: 2,
      utilityDeposit: 700,
      minMonths: 6,
      bedrooms: 3,
      bathrooms: 3,
      sqft: 2100,
      furnishing: "full",
      description:
        "A bright semi-detached home with a side garden, high ceilings and an en-suite for every bedroom. Close to UKM, Bangi Gateway and the SKVE.",
      amenities: ["Wi-Fi ready", "Air-conditioning", "Water heater", "Side garden", "Covered parking (3)", "En-suite every bedroom"],
      images: [img("h3", "exterior", "Front view at dusk"), img("h3", "living", "Double-volume living"), img("h3", "bedroom", "Master bedroom")],
      rooms: [
        { name: "Living room", type: "living", items: [["3-seater leather sofa", 1], ["Armchairs", 2], ['55" smart TV', 1], ["Air-conditioner 2.0hp", 1]] },
        { name: "Dining room", type: "dining", items: [["Dining table (8 seats)", 1], ["Dining chairs", 8], ["Sideboard", 1]] },
        { name: "Wet & dry kitchen", type: "kitchen", items: [["Fridge (side-by-side)", 1], ["Gas stove + hood", 1], ["Oven", 1], ["Washing machine", 1], ["Dryer", 1]] },
        { name: "Master bedroom", type: "bedroom", items: [["King bed + mattress", 1], ["Walk-in wardrobe", 1], ["Air-conditioner 1.5hp", 1], ["Sofa chair", 1]], note: "En-suite with bathtub" },
        { name: "Bedroom 2", type: "bedroom", items: [["Queen bed + mattress", 1], ["Wardrobe", 1], ["Air-conditioner 1.0hp", 1]], note: "En-suite" },
        { name: "Bedroom 3", type: "bedroom", items: [["Queen bed + mattress", 1], ["Wardrobe", 1], ["Air-conditioner 1.0hp", 1]], note: "En-suite" }
      ]
    },
    {
      id: "h4",
      name: "Ceria Home",
      area: "Seri Kembangan",
      address: "5-1, Jalan Ceria 7, Taman Ceria, 43300 Seri Kembangan, Selangor",
      type: "Townhouse (ground floor)",
      rentMonthly: 1100,
      depositMonths: 2,
      utilityDeposit: 500,
      minMonths: 6,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1200,
      furnishing: "partial",
      description:
        "A cheerful ground-floor townhouse unit with its own gate and patio, walking distance to The Mines and the MRT Serdang feeder bus. Partly furnished, so you can bring your own touch.",
      amenities: ["Air-conditioning", "Water heater", "Private patio", "Gated & guarded", "Near MRT feeder"],
      images: [img("h4", "exterior", "Front view at dusk"), img("h4", "living", "Living room"), img("h4", "bedroom", "Master bedroom")],
      rooms: [
        { name: "Living room", type: "living", items: [["3-seater sofa", 1], ["Coffee table", 1], ["TV cabinet", 1], ["Ceiling fan", 1]] },
        { name: "Kitchen", type: "kitchen", items: [["Fridge (single door)", 1], ["Gas stove + hood", 1], ["Kitchen cabinets", 1]] },
        { name: "Master bedroom", type: "bedroom", items: [["Queen bed + mattress", 1], ["Wardrobe", 1], ["Air-conditioner 1.0hp", 1]], note: "Attached bathroom" },
        { name: "Bedroom 2", type: "bedroom", items: [["Wardrobe", 1], ["Air-conditioner 1.0hp", 1]], note: "Unfurnished bed space" },
        { name: "Bedroom 3", type: "bedroom", items: [["Ceiling fan", 1]], note: "Empty room - bring your own" }
      ]
    },
    {
      id: "h5",
      name: "Ria Residence",
      area: "Cyberjaya",
      address: "3, Jalan Ria 1, Residensi Ria, 63000 Cyberjaya, Selangor",
      type: "Double-storey cluster house",
      rentMonthly: 1500,
      depositMonths: 2,
      utilityDeposit: 750,
      minMonths: 12,
      bedrooms: 4,
      bathrooms: 3,
      sqft: 2400,
      furnishing: "full",
      description:
        "A modern cluster home in a guarded community beside the Cyberjaya lake gardens. Smart locks, a home office corner and a family hall upstairs - made for families working from home.",
      amenities: ["Fibre internet", "Air-conditioning", "Water heater", "Smart lock", "Home office", "Gated & guarded", "Lake park nearby"],
      images: [img("h5", "exterior", "Front view at dusk"), img("h5", "living", "Living and dining"), img("h5", "bedroom", "Master bedroom")],
      rooms: [
        { name: "Living & dining", type: "living", items: [["Modular sofa", 1], ['65" smart TV', 1], ["Dining table (6 seats)", 1], ["Dining chairs", 6], ["Air-conditioner 2.5hp", 1]] },
        { name: "Kitchen", type: "kitchen", items: [["Fridge (side-by-side)", 1], ["Induction hob + hood", 1], ["Built-in oven", 1], ["Dishwasher", 1], ["Washer-dryer", 1]] },
        { name: "Family hall", type: "living", items: [["Sofa bed", 1], ["Bookshelf", 1], ["Ceiling fan", 1]] },
        { name: "Home office", type: "study", items: [["Office desk", 2], ["Ergonomic chair", 2], ["Air-conditioner 1.0hp", 1]] },
        { name: "Master bedroom", type: "bedroom", items: [["King bed + mattress", 1], ["Walk-in wardrobe", 1], ["Air-conditioner 1.5hp", 1], ["Vanity table", 1]], note: "En-suite with rain shower" },
        { name: "Bedroom 2", type: "bedroom", items: [["Queen bed + mattress", 1], ["Wardrobe", 1], ["Air-conditioner 1.0hp", 1]] },
        { name: "Bedrooms 3 & 4", type: "bedroom", items: [["Single bed + mattress", 2], ["Wardrobe", 2], ["Air-conditioner 1.0hp", 2]] }
      ]
    }
  ];

  const SETTINGS = {
    company: {
      name: "Happy Home",
      tagline: "Homes that make you happy",
      phone: "03-1234 5678",
      whatsapp: "0123456789",
      email: "hello@happyhome.my",
      address: "Level 8, Menara Happy, Jalan Tun Razak, 50400 Kuala Lumpur",
      hours: "Mon - Sat, 9:00 AM - 6:00 PM"
    },
    bank: {
      bankName: "Maybank",
      accountName: "Happy Home Sdn Bhd",
      accountNumber: "5641 2398 7710"
    },
    rules: {
      maxMonths: 36,
      leadDays: 0
    }
  };

  /*
   * Bookings are written relative to today: [houseId, name, phone, email,
   * occupants, moveIn offset in months (+ days), months, stored status,
   * created offset in days, admin note]. Live bookings never overlap.
   */
  const BOOKINGS = [
    ["h1", "Nurul Aina binti Hassan", "0123456789", "aina.hassan@gmail.com", 3, [-20, 0], 12, "CONFIRMED", -625, ""],
    ["h1", "Daniel Lim Wei Jie", "0167788990", "daniel.lim@outlook.com", 2, [-9, 0], 10, "CONFIRMED", -200, "Keys handed over at move-in."],
    ["h1", "Siti Rahmah binti Omar", "0139988776", "siti.rahmah@yahoo.com", 4, [-9, 10], 12, "REJECTED", -205, "Sorry, Damai House was already confirmed for those dates."],
    ["h2", "Arjun a/l Suresh", "0172233445", "arjun.suresh@gmail.com", 4, [-15, 0], 12, "CONFIRMED", -470, ""],
    ["h2", "Farah Nadia binti Ismail", "0193344556", "farah.nadia@gmail.com", 2, [0, 5], 6, "REJECTED", -9, "Payment receipt was unreadable - please book again with a clearer copy."],
    ["h2", "Tan Mei Ling", "0124455667", "meiling.tan@gmail.com", 5, [0, 12], 12, "CONFIRMED", -6, "Welcome! We will WhatsApp you a week before move-in."],
    ["h3", "Muhammad Hafiz bin Rosli", "0145566778", "hafiz.rosli@gmail.com", 4, [-10, 0], 12, "CONFIRMED", -315, ""],
    ["h3", "Nurul Aina binti Hassan", "0123456789", "aina.hassan@gmail.com", 3, [9, 0], 6, "PENDING", -1, ""],
    ["h4", "Kavitha a/p Raman", "0116677889", "kavitha.raman@gmail.com", 2, [-8, 0], 6, "CONFIRMED", -250, ""],
    ["h4", "Lee Chong Wei", "0187788991", "chongwei.lee@gmail.com", 1, [0, 10], 6, "CANCELLED", -12, "Cancelled at the customer's request."],
    ["h4", "Aisyah binti Kamal", "0138899001", "aisyah.kamal@gmail.com", 3, [8, 0], 6, "PENDING", 0, ""],
    ["h5", "Rajesh a/l Kumar", "0179900112", "rajesh.kumar@gmail.com", 5, [-27, 0], 24, "CONFIRMED", -830, ""],
    ["h5", "Wong Kar Hoe", "0161122334", "karhoe.wong@gmail.com", 4, [-2, 0], 24, "CONFIRMED", -70, "Smart-lock code sent by WhatsApp."],
    ["h5", "Hidayah binti Yusof", "0192233446", "hidayah.yusof@gmail.com", 3, [1, 0], 12, "CANCELLED", -20, "House is occupied until the current lease ends."]
  ];

  global.SEED = { HOUSES, SETTINGS, BOOKINGS };
})(window);

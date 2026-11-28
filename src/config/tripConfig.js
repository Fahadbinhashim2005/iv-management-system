// REPLACE BEFORE EVENT
// Central single source of truth for Industrial Visit trip configuration.
// Hotel, bus/train allocations, and any static fallback helplines can be updated here.

export const tripConfig = {
  trip: {
    displayName: "Industrial Visit 2026 — Rajasthan & Delhi",
    shortName: "Industrial Visit 2026",
    ivCode: "",
    description:
      "An 8-day educational & cultural tour from Kottayam covering Odoo India & Sense Electricals in Ahmedabad, IIT Delhi, and heritage sites across Udaipur, Pushkar, Jaipur, Agra, and Delhi.",
    destination: "Ahmedabad → Udaipur → Pushkar → Jaipur → Agra → Delhi",
    route:
      "Kottayam → Ahmedabad → Udaipur → Pushkar → Jaipur → Agra → Delhi → Chennai → Kottayam",
    dateRangeLabel: "5 – 14 December 2026",
    startDate: "2026-12-05",
    endDate: "2026-12-14",
    startingPoint: "Kottayam, Kerala (Saintgits)",
    academicYear: "2026-27",
    industries: [
      "Odoo India Pvt. Ltd., Infocity (Ahmedabad)",
      "Sense Electricals (Ahmedabad)",
      "IIT Delhi (Delhi)",
    ],
  },

  // Hotel details (leave empty until confirmed)
  hotel: {
    name: "",
    address: "",
    receptionPhone: "",
  },

  // Faculty coordinators on duty (names, optional role/dept).
  // When empty, UI will display registered coordinators or neutral copy.
  coordinators: [],

  // Static emergency helpline fallbacks (auto-merged with registered coordinators in EmergencyHelpModal)
  // Shape: { role: string, person: string, phone: string, display?: string }
  helplines: [],

  // Buses / transport units keyed by bus ID (e.g. "BUS-01")
  // Shape: { id, name, coachType, regNo, capacity, driverName, driverPhone, coordinatorName, coordinatorPhone, boardingPoint, boardingTime }
  buses: {},

  // Read-only fallback / seed itinerary for Rajasthan & Delhi (Day 0 to Day 9)
  defaultItineraryDays: [
    {
      day: "Day 0",
      date: "Dec 5, 2026",
      isoDate: "2026-12-05",
      title: "Kottayam — Departure",
      events: [
        {
          id: "d0-1",
          time: "06:30 PM",
          activity: "Board the Train (3 AC) from Kottayam Railway Station",
          location: "Kottayam Railway Station",
          category: "Travel",
          inCharge: "Coordinators",
          details:
            "Begin the journey towards Ahmedabad. Overnight journey by train.",
        },
      ],
    },
    {
      day: "Day 1",
      date: "Dec 6, 2026",
      isoDate: "2026-12-06",
      title: "Train Journey to Ahmedabad",
      events: [
        {
          id: "d1-1",
          time: "All Day",
          activity: "Full-day Train Journey towards Ahmedabad",
          location: "En route to Ahmedabad",
          category: "Travel",
          inCharge: "Coordinators",
          details: "Full day travelling by train towards Ahmedabad. Overnight journey by train.",
        },
      ],
    },
    {
      day: "Day 2",
      date: "Dec 7, 2026",
      isoDate: "2026-12-07",
      title: "Ahmedabad — Industrial Visit — Udaipur",
      events: [
        {
          id: "d2-1",
          time: "07:00 AM",
          activity: "Expected Arrival at Ahmedabad & Fresh-up",
          location: "Ahmedabad",
          category: "Travel",
          inCharge: "Coordinators",
          details: "Fresh-up and breakfast before industrial visit sessions.",
        },
        {
          id: "d2-2",
          time: "10:00 AM",
          activity: "Industrial Visit — Odoo India Pvt. Ltd.",
          location: "Odoo India Pvt. Ltd., Infocity, Ahmedabad",
          category: "Industry",
          inCharge: "Coordinators",
          details: "10:00 AM – 11:30 AM industrial visit session at Odoo India Pvt. Ltd., Infocity.",
        },
        {
          id: "d2-3",
          time: "11:30 AM",
          activity: "Industrial Visit — Sense Electricals",
          location: "Sense Electricals, Ahmedabad",
          category: "Industry",
          inCharge: "Coordinators",
          details: "11:30 AM – 12:00 PM industry visit at Sense Electricals.",
        },
        {
          id: "d2-4",
          time: "12:00 PM",
          activity: "Depart from Ahmedabad towards Udaipur",
          location: "Ahmedabad → Udaipur",
          category: "Travel",
          inCharge: "Coordinators",
          details: "Expected arrival at Udaipur by 04:00 PM.",
        },
        {
          id: "d2-5",
          time: "04:00 PM",
          activity: "Hotel Check-in & Evening Relaxation",
          location: "Udaipur",
          category: "Stay",
          inCharge: "Coordinators",
          details: "Hotel check-in, evening relaxation, and overnight stay at Udaipur.",
        },
      ],
    },
    {
      day: "Day 3",
      date: "Dec 8, 2026",
      isoDate: "2026-12-08",
      title: "Udaipur Sightseeing — Pushkar",
      events: [
        {
          id: "d3-1",
          time: "09:00 AM",
          activity: "Udaipur Heritage Sightseeing",
          location: "City Palace, Lake Pichola, Bagore Ki Haveli, Ambrai Ghat & Saheliyon Ki Bari",
          category: "Activity",
          inCharge: "Coordinators",
          details:
            "Explore the cultural heritage and scenic attractions of Udaipur: City Palace, Lake Pichola, Bagore Ki Haveli, Ambrai Ghat, and Saheliyon Ki Bari.",
        },
        {
          id: "d3-2",
          time: "03:00 PM",
          activity: "Pushkar Sightseeing & Desert Camp",
          location: "Pushkar",
          category: "Activity",
          inCharge: "Coordinators",
          details:
            "Explore local attractions in Pushkar, camel safari and desert activities, evening bonfire at the desert camp, and overnight stay at Pushkar.",
        },
      ],
    },
    {
      day: "Day 4",
      date: "Dec 9, 2026",
      isoDate: "2026-12-09",
      title: "Pushkar — Jaipur",
      events: [
        {
          id: "d4-1",
          time: "08:00 AM",
          activity: "Morning Breakfast & Departure to Jaipur",
          location: "Pushkar → Jaipur",
          category: "Travel",
          inCharge: "Coordinators",
          details: "Morning breakfast and departure towards Jaipur.",
        },
        {
          id: "d4-2",
          time: "11:00 AM",
          activity: "Jaipur Sightseeing (The Pink City)",
          location: "Hawa Mahal, Amber Fort, Jal Mahal, Patrika Gate",
          category: "Activity",
          inCharge: "Coordinators",
          details:
            "Explore Jaipur: Hawa Mahal, Amber Fort, Jal Mahal, Patrika Gate, plus optional stops at Albert Hall Museum and Bhangarh Fort.",
        },
        {
          id: "d4-3",
          time: "09:00 PM",
          activity: "Overnight Travel towards Agra",
          location: "Jaipur → Agra",
          category: "Travel",
          inCharge: "Coordinators",
          details: "Overnight road travel from Jaipur towards Agra.",
        },
      ],
    },
    {
      day: "Day 5",
      date: "Dec 10, 2026",
      isoDate: "2026-12-10",
      title: "Jaipur — Agra — Delhi",
      events: [
        {
          id: "d5-1",
          time: "06:00 AM",
          activity: "Early Morning Arrival & Agra Sightseeing",
          location: "Taj Mahal, Agra Fort & Mehtab Bagh (Optional)",
          category: "Activity",
          inCharge: "Coordinators",
          details:
            "Visit Taj Mahal, Agra Fort, and Mehtab Bagh (Optional). After sightseeing, depart towards Delhi.",
        },
        {
          id: "d5-2",
          time: "06:00 PM",
          activity: "Arrival at Delhi & Overnight Stay",
          location: "Delhi",
          category: "Stay",
          inCharge: "Coordinators",
          details: "Arrival at Delhi and overnight hotel stay.",
        },
      ],
    },
    {
      day: "Day 6",
      date: "Dec 11, 2026",
      isoDate: "2026-12-11",
      title: "Delhi Sightseeing — Departure to Chennai",
      events: [
        {
          id: "d6-1",
          time: "09:00 AM",
          activity: "Delhi Sightseeing & Local Markets",
          location: "Red Fort, Jama Masjid, Humayun's Tomb & Qutab Minar",
          category: "Activity",
          inCharge: "Coordinators",
          details:
            "Explore Red Fort, Jama Masjid, Humayun's Tomb, Qutab Minar, and local markets.",
        },
        {
          id: "d6-2",
          time: "02:00 PM",
          activity: "Industrial Visit — IIT Delhi",
          location: "IIT Delhi",
          category: "Industry",
          inCharge: "Coordinators",
          details: "Academic & technical industrial visit at IIT Delhi.",
        },
        {
          id: "d6-3",
          time: "09:00 PM",
          activity: "Board Train from Delhi towards Chennai",
          location: "Delhi Railway Station",
          category: "Travel",
          inCharge: "Coordinators",
          details: "9:00 PM departure by train from Delhi towards Chennai. Overnight journey by train.",
        },
      ],
    },
    {
      day: "Day 7",
      date: "Dec 12, 2026",
      isoDate: "2026-12-12",
      title: "Train Journey to Chennai",
      events: [
        {
          id: "d7-1",
          time: "All Day",
          activity: "Full-day Train Journey from Delhi towards Chennai",
          location: "En route to Chennai",
          category: "Travel",
          inCharge: "Coordinators",
          details: "Full day travelling by train from Delhi towards Chennai. Overnight journey by train.",
        },
      ],
    },
    {
      day: "Day 8",
      date: "Dec 13, 2026",
      isoDate: "2026-12-13",
      title: "Chennai Arrival & Return to Kottayam",
      events: [
        {
          id: "d8-1",
          time: "07:00 AM",
          activity: "Expected Arrival at Chennai & Fresh-up",
          location: "Chennai",
          category: "Travel",
          inCharge: "Coordinators",
          details: "7:00 AM expected arrival at Chennai. Fresh-up and breakfast.",
        },
        {
          id: "d8-2",
          time: "10:00 AM",
          activity: "Travel from Chennai towards Kottayam",
          location: "Chennai → Palakkad (Train) → Kottayam (Tourist Bus)",
          category: "Travel",
          inCharge: "Coordinators",
          details:
            "Travel from Chennai towards Kottayam: train till Palakkad and tourist bus for the rest of the journey.",
        },
      ],
    },
    {
      day: "Day 9",
      date: "Dec 14, 2026",
      isoDate: "2026-12-14",
      title: "Chennai — Kottayam (Saintgits)",
      events: [
        {
          id: "d9-1",
          time: "Early Morning",
          activity: "Arrival at Kottayam (Saintgits)",
          location: "Kottayam (Saintgits)",
          category: "Travel",
          inCharge: "Coordinators",
          details: "Early morning arrival at Kottayam (Saintgits). Tour concludes.",
        },
      ],
    },
  ],
};

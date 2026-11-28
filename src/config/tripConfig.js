// REPLACE BEFORE EVENT
// Central single source of truth for Industrial Visit trip configuration.
// Hotel, bus/train allocations, and any static fallback helplines can be updated here.

export const TRIP_TZ = "Asia/Kolkata";

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
};

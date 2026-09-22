import { Trip } from "../types";

const VAL_DORCIA_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500"><defs><linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="%23d4834b"/><stop offset="50%" stop-color="%23f4a261"/><stop offset="100%" stop-color="%23f9dcc4"/></linearGradient><linearGradient id="hill1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="%23606c38"/><stop offset="100%" stop-color="%23283618"/></linearGradient><linearGradient id="hill2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="%238f9779"/><stop offset="100%" stop-color="%23588157"/></linearGradient></defs><rect width="800" height="500" fill="url(%23sky)"/><circle cx="600" cy="110" r="55" fill="%23ffd166" opacity="0.9"/><path d="M0,300 Q280,240 800,320 L800,500 L0,500 Z" fill="url(%23hill1)"/><path d="M0,370 Q420,290 800,380 L800,500 L0,500 Z" fill="url(%23hill2)"/><g fill="%23212518"><rect x="180" y="200" width="14" height="130" rx="4"/><circle cx="187" cy="175" r="38"/><rect x="205" y="220" width="10" height="100" rx="3"/><circle cx="210" cy="200" r="30"/><rect x="155" y="230" width="11" height="90" rx="3"/><circle cx="160" cy="210" r="28"/><rect x="620" y="250" width="16" height="140" rx="4"/><circle cx="628" cy="220" r="45"/><rect x="648" y="270" width="11" height="110" rx="3"/><circle cx="653" cy="245" r="32"/></g><g transform="translate(340, 310)"><rect x="0" y="15" width="95" height="55" rx="8" fill="%23ffffff" stroke="%23333333" stroke-width="2"/><path d="M 95 30 L 125 30 Q 135 35 135 45 L 135 70 L 95 70 Z" fill="%23ffffff" stroke="%23333333" stroke-width="2"/><path d="M 105 35 L 122 35 Q 128 35 128 45 L 128 50 L 105 50 Z" fill="%23457b9d"/><rect x="15" y="22" width="22" height="22" rx="3" fill="%23457b9d"/><rect x="45" y="22" width="22" height="22" rx="3" fill="%23457b9d"/><circle cx="30" cy="72" r="12" fill="%232b2d42" stroke="%238d99ae" stroke-width="3"/><circle cx="110" cy="72" r="12" fill="%232b2d42" stroke="%238d99ae" stroke-width="3"/><rect x="10" y="15" width="80" height="6" fill="%23e63946"/></g><text x="400" y="465" font-family="system-ui, sans-serif" font-weight="900" font-size="26" fill="%23ffffff" text-anchor="middle" filter="drop-shadow(0px 2px 6px rgba(0,0,0,0.6))">Val d'Orcia • Autunno 2020</text></svg>`;

export const EXAMPLE_TRIP: Trip = {
  id: "trip-example-10-oct-2020",
  title: "ESEMPIO: Weekend d'Autunno in Val d'Orcia",
  startDate: "2020-10-10",
  endDate: "2020-10-12",
  description: "Questo è un viaggio di esempio per mostrarti come funziona il diario. Puoi modificarlo o cancellarlo in qualsiasi momento.\nAbbiamo visitato borghi stupendi e registrato qui i nostri appunti, costi e spese per tenere traccia di tutto.",
  startOdometer: 124500,
  endOdometer: 124820,
  status: "Completato",
  expenses: [
    { id: "te1", title: "Gasolio Eni Siena", amount: 55.0, category: "Carburante", date: "2020-10-10", liters: 30, pricePerLiter: 1.833, odometer: 124500, fuelCompany: "Eni" },
    { id: "te2", title: "Sosta Pienza comunale", amount: 12.0, category: "Sosta", date: "2020-10-11" },
    { id: "te3", title: "Pranzo Tipico Trattoria", amount: 48.0, category: "Cibo", date: "2020-10-11" }
  ],
  photos: [
    {
      id: "tp1",
      url: VAL_DORCIA_SVG,
      description: "Il nostro amato camper immerso nell'abbraccio dorato dei cipressi della Val d'Orcia.",
      date: "2020-10-11",
      locationName: "Val d'Orcia"
    }
  ],
  movements: [],
  routePoints: [
    { lat: 43.318, lng: 11.330, name: "Siena (Partenza) 🏰" },
    { lat: 43.058, lng: 11.606, name: "San Quirico d'Orcia 🌳" },
    { lat: 43.076, lng: 11.678, name: "Pienza (Borgo Storico) 🧀" },
    { lat: 43.092, lng: 11.782, name: "Montepulciano (Vigneti) 🍷" }
  ]
};

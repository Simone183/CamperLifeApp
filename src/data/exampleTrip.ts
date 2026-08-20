
import { Trip } from "../types";

export const EXAMPLE_TRIP: Trip = {
  id: "trip-example-10-oct-2025",
  title: "ESEMPIO: Weekend d'Autunno in Val d'Orcia",
  startDate: "2025-10-10",
  endDate: "2025-10-12",
  description:
    "Questo è un viaggio di esempio per mostrarti come funziona il diario. Puoi modificarlo o cancellarlo in qualsiasi momento.\nAbbiamo visitato borghi stupendi e registrato qui i nostri appunti, costi e spese per tenere traccia di tutto.",
  startOdometer: 124500,
  endOdometer: 124820,
  status: "Completato",
  expenses: [
    {
      id: "te1",
      title: "Gasolio Eni Siena",
      amount: 55.0,
      category: "Carburante",
      date: "2025-10-10",
      liters: 30,
      pricePerLiter: 1.833,
      odometer: 124500,
      fuelCompany: "Eni"
    },
    {
      id: "te2",
      title: "Sosta Pienza comunale",
      amount: 12.0,
      category: "Sosta",
      date: "2025-10-11",
    },
    {
      id: "te3",
      title: "Pranzo Tipico Trattoria",
      amount: 48.0,
      category: "Cibo",
      date: "2025-10-11",
    },
  ],
  photos: [
    {
      id: "tp1",
      url: "https://images.unsplash.com/photo-1523987355122-c348ebef72d4?auto=format&fit=crop&q=80&w=600",
      description:
        "Il nostro amato camper immerso nell'abbraccio dorato dei cipressi toscani.",
      date: "2025-10-11",
      locationName: "Val d'Orcia"
    },
  ],
  movements: [],
  routePoints: [
    { lat: 43.318, lng: 11.330, name: "Siena (Partenza) 🏰" },
    { lat: 43.058, lng: 11.606, name: "San Quirico d'Orcia 🌳" },
    { lat: 43.076, lng: 11.678, name: "Pienza (Borgo Storico) 🧀" },
    { lat: 43.092, lng: 11.782, name: "Montepulciano (Vigneti) 🍷" }
  ],
};

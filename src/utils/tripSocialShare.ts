import { Trip, CommunityMessage } from "../types";

/**
 * Generates a rich CommunityMessage of type 'social' for a trip.
 */
export function createSocialPostFromTrip(
  trip: Trip,
  currentUser?: { nickname?: string; email?: string; name?: string; profilePhoto?: string } | null
): CommunityMessage {
  const activeUserName =
    currentUser?.nickname ||
    currentUser?.name ||
    (currentUser?.email ? currentUser.email.split("@")[0] : "Camperista");
  const userPhoto = currentUser?.profilePhoto;

  // Calculate total distance for the trip
  const validMovements = (trip.movements || [])
    .filter((m) => typeof m.odometer === "number" && !isNaN(m.odometer))
    .map((m) => m.odometer!);
  const refuelOdometers = (trip.expenses || [])
    .filter((e) => e.category === "Carburante" && typeof e.odometer === "number" && !isNaN(e.odometer))
    .map((e) => e.odometer!);
  const allOdos = [...validMovements, ...refuelOdometers];
  if (typeof trip.startOdometer === "number" && !isNaN(trip.startOdometer)) allOdos.push(trip.startOdometer);
  if (typeof trip.endOdometer === "number" && !isNaN(trip.endOdometer)) allOdos.push(trip.endOdometer);

  let distanceKm = 0;
  if (allOdos.length >= 2) {
    distanceKm = Math.max(...allOdos) - Math.min(...allOdos);
  }

  const totalSpent = (trip.expenses || []).reduce((sum, e) => sum + e.amount, 0);

  // Dates formatting
  const dates: string[] = [];
  if (trip.startDate) dates.push(trip.startDate.split("-").reverse().join("/"));
  if (trip.endDate) dates.push(trip.endDate.split("-").reverse().join("/"));
  const dateStr = dates.length > 0 ? dates.join(" ➔ ") : "Iniziato di recente";

  // Waypoints / Stops
  const stopNames = (trip.routePoints || []).map((p) => p.name).filter(Boolean);
  const stopsSummary =
    stopNames.length > 0
      ? `📍 Tappe principali: ${stopNames.slice(0, 4).join(" ➔ ")}${stopNames.length > 4 ? "..." : ""}`
      : undefined;

  const isCompleted = trip.status === "Completato";

  const textLines = [
    `🎉 ${isCompleted ? "Ho completato e condiviso un viaggio in camper!" : "Ho condiviso un viaggio in camper!"} "${trip.title}" ${isCompleted ? "🏁" : "✨"}`,
    ``,
    `📅 Periodo: ${dateStr}`,
    distanceKm > 0 ? `🛣️ Chilometri percorsi: ${distanceKm} km` : undefined,
    trip.photos && trip.photos.length > 0 ? `📸 Foto scattate: ${trip.photos.length}` : undefined,
    totalSpent > 0 ? `💶 Spese registrate: ${totalSpent.toFixed(0)}€` : undefined,
    stopsSummary,
    trip.description ? `\n“${trip.description}”` : undefined,
    ``,
    `👉 Puoi esplorare la mappa e i dettagli nella sezione Viaggi Condivisi della Community! 🗺️`
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  const mainPhoto = trip.photos && trip.photos.length > 0 ? trip.photos[0].url : undefined;

  return {
    id: `m_trip_${trip.id}_${Date.now()}`,
    user: activeUserName,
    avatar: userPhoto || activeUserName[0]?.toUpperCase() || "🚐",
    avatarUrl: userPhoto,
    avatarColor: "bg-[#3E4A35]",
    title: `🗺️ Viaggio ${isCompleted ? "Completato" : "Condiviso"}: ${trip.title}`,
    text: textLines,
    timestamp: new Date().toISOString(),
    likes: 0,
    likedByCurrentUser: false,
    tag: "Generale",
    type: "social",
    locationName: stopNames[0] || trip.title,
    mediaUrl: mainPhoto,
    mediaType: mainPhoto ? "image" : undefined,
  };
}

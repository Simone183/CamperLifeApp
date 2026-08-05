import React from "react";
import {
  X,
  Download,
  Share2,
  Sparkles,
  Volume2,
  Tv,
  Film,
  Compass,
  Check,
  RotateCcw
} from "lucide-react";
import { Trip } from "../types";

interface TripVideoShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  finalCoords: any[]; // Array of L.LatLng
  photoPoints: Array<{ id: string; url: string; description: string; lat: number; lng: number; locationName: string }>;
  points: Array<{ lat: number; lng: number; name?: string }>;
}

type ThemeType = "slate" | "parchment" | "sunset" | "olive";
type AspectRatioType = "9_16" | "1_1";

const getDisplayDates = (trip: Trip) => {
  const allDates: string[] = [];
  if (trip.startDate) allDates.push(trip.startDate);
  if (trip.endDate) allDates.push(trip.endDate);

  (trip.movements || []).forEach((m) => {
    if (m.date) allDates.push(m.date.split("T")[0]);
  });
  
  (trip.expenses || []).forEach((e) => {
    if (e.date) allDates.push(e.date.split("T")[0]);
  });

  if (allDates.length === 0) {
    return { start: "Inizio", end: "Fine" };
  }

  allDates.sort();
  
  const format = (d: string) => {
    if (!d) return "";
    const parts = d.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return d;
  };
  
  return {
    start: format(allDates[0]),
    end: format(allDates[allDates.length - 1]),
  };
};

const getTripDistance = (trip: Trip) => {
  const movements = trip.movements || [];
  const validMovements = movements.filter(
    (m) => typeof m.odometer === "number" && !isNaN(m.odometer)
  ).map((m) => m.odometer);
  
  const refuelOdometers = (trip.expenses || [])
    .filter((e) => e.category === "Carburante" && typeof e.odometer === "number" && !isNaN(e.odometer))
    .map((e) => e.odometer as number);

  const allOdometers = [
    ...validMovements,
    ...refuelOdometers,
  ];

  if (typeof trip.startOdometer === "number" && !isNaN(trip.startOdometer)) {
    allOdometers.push(trip.startOdometer);
  }
  
  if (trip.status === "Completato" && typeof trip.endOdometer === "number" && !isNaN(trip.endOdometer)) {
    allOdometers.push(trip.endOdometer);
  }

  if (allOdometers.length < 2) {
    return 0;
  }
  
  const minOdo = Math.min(...allOdometers);
  const maxOdo = Math.max(...allOdometers);
  
  return maxOdo > minOdo ? maxOdo - minOdo : 0;
};

export default function TripVideoShareModal({
  isOpen,
  onClose,
  trip,
  finalCoords,
  photoPoints,
  points
}: TripVideoShareModalProps) {
  // Configurations
  const [customTitle, setCustomTitle] = React.useState(trip.title || "Il Mio Viaggio in Camper");
  const [selectedTheme, setSelectedTheme] = React.useState<ThemeType>("slate");
  const [aspectRatio, setAspectRatio] = React.useState<AspectRatioType>("9_16");
  const [duration, setDuration] = React.useState<number>(8); // default 8 seconds
  const [selectedAudio, setSelectedAudio] = React.useState<string>("camp");
  const [showExpenses, setShowExpenses] = React.useState<boolean>(false);

  // State
  const [isRendering, setIsRendering] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);
  const [showPreview, setShowPreview] = React.useState(true);
  const [imagePreloads, setImagePreloads] = React.useState<Record<string, HTMLImageElement>>({});
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Refs
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);

  const audioOptions = [
    { id: "camp", label: "🔥 Chitarra & Falò", subtitle: "Soundtrack d'atmosfera serale" },
    { id: "motor", label: "🔊 Ruggito Camper", subtitle: "Suono del motore diesel 2.5" },
    { id: "nature", label: "🌲 Cinguettio & Foresta", subtitle: "Natura selvaggia di sottofondo" },
    { id: "beach", label: "🌊 Onde del Mare", subtitle: "Per i tuoi viaggi costieri" }
  ];

  // Map limits and coordinate projection
  const mapProjection = React.useMemo(() => {
    if (finalCoords.length === 0) return null;

    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    finalCoords.forEach((c) => {
      if (c.lat < minLat) minLat = c.lat;
      if (c.lat > maxLat) maxLat = c.lat;
      if (c.lng < minLng) minLng = c.lng;
      if (c.lng > maxLng) maxLng = c.lng;
    });

    if (minLat === maxLat) { minLat -= 0.05; maxLat += 0.05; }
    if (minLng === maxLng) { minLng -= 0.05; maxLng += 0.05; }

    const w = aspectRatio === "9_16" ? 720 : 720;
    const h = aspectRatio === "9_16" ? 1280 : 720;
    
    const drawW = w * 0.82;
    const drawH = h * 0.52;
    const drawX = w * 0.09;
    const drawY = h * 0.24;

    const lon2x = (lon: number, z: number) => ((lon + 180) / 360) * Math.pow(2, z);
    const lat2y = (lat: number, z: number) => ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * Math.pow(2, z);

    const dx0 = lon2x(maxLng, 0) - lon2x(minLng, 0);
    const dy0 = Math.abs(lat2y(minLat, 0) - lat2y(maxLat, 0));

    let zoomX = Math.log2(drawW / 256 / Math.abs(dx0));
    let zoomY = Math.log2(drawH / 256 / dy0);
    let zoom = Math.floor(Math.min(zoomX, zoomY));
    
    // Slight padding reduction by zooming out 1 level if it's too tight
    zoom = zoom - 1; 

    if (zoom < 0) zoom = 0;
    if (zoom > 19) zoom = 19;
    if (isNaN(zoom) || zoom === Infinity || zoom === -Infinity) zoom = 13;

    const centerLng = (minLng + maxLng) / 2;
    const centerLat = (minLat + maxLat) / 2;
    const centerX = lon2x(centerLng, zoom);
    const centerY = lat2y(centerLat, zoom);

    return {
      zoom,
      centerX,
      centerY,
      drawW,
      drawH,
      drawX,
      drawY
    };
  }, [finalCoords, aspectRatio]);

    // Pre-calculate photo appearances along the route
  const photoMap = React.useMemo(() => {
    if (finalCoords.length === 0 || photoPoints.length === 0) return [];

    let selectedPhotos = photoPoints;
    if (photoPoints.length > 6) {
      selectedPhotos = [];
      const step = photoPoints.length / 6;
      for (let i = 0; i < 6; i++) {
        selectedPhotos.push(photoPoints[Math.floor(i * step)]);
      }
    }

    return selectedPhotos.map((ph, idx) => {
      let minDistance = Infinity;
      let closestIdx = 0;

      finalCoords.forEach((coord, fIdx) => {
        const d = Math.hypot(coord.lat - ph.lat, coord.lng - ph.lng);
        if (d < minDistance) {
          minDistance = d;
          closestIdx = fIdx;
        }
      });

      // Spread photos offset positions so they don't overlap too much
      const angle = (((idx * 73) % 20) - 10) * (Math.PI / 180); // random-ish tilt -10 to +10 deg
      const offsetSide = idx % 2 === 0 ? 1 : -1; // alternate left/right from path

      return {
        ...ph,
        triggerIndex: closestIdx,
        angle,
        offsetSide
      };
    });
  }, [photoPoints, finalCoords]);

  // Handle projection to Canvas coordinates
  const getCanvasCoords = (
    lat: number,
    lng: number,
    w: number,
    h: number,
    proj: NonNullable<typeof mapProjection>
  ) => {
    const lon2x = (lon: number, z: number) => ((lon + 180) / 360) * Math.pow(2, z);
    const lat2y = (lat: number, z: number) => ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * Math.pow(2, z);

    const x = lon2x(lng, proj.zoom);
    const y = lat2y(lat, proj.zoom);

    const centerDrawX = proj.drawX + proj.drawW / 2;
    const centerDrawY = proj.drawY + proj.drawH / 2;

    const dx = (x - proj.centerX) * 256;
    const dy = (y - proj.centerY) * 256;

    return {
      x: centerDrawX + dx,
      y: centerDrawY + dy
    };
  };

  // Preload photos with CORS support before starting video rendering
  const preloadTripPhotos = async () => {
    const loaded: Record<string, HTMLImageElement> = {};
    const promises = photoPoints.map((ph) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = ph.url;
        img.onload = () => {
          loaded[ph.id] = img;
          resolve();
        };
        img.onerror = () => {
          console.warn(`Failed to pre-load image: ${ph.url}`);
          resolve(); // Resolve anyway to avoid blocking the whole render
        };
      });
    });

    const loadedTiles: Record<string, HTMLImageElement> = {};
    if (mapProjection) {
      const w = aspectRatio === "9_16" ? 720 : 720;
      const h = aspectRatio === "9_16" ? 1280 : 720;
      const centerDrawX = mapProjection.drawX + mapProjection.drawW / 2;
      const centerDrawY = mapProjection.drawY + mapProjection.drawH / 2;
      
      const minTileX = Math.floor(mapProjection.centerX + (0 - centerDrawX) / 256);
      const maxTileX = Math.floor(mapProjection.centerX + (w - centerDrawX) / 256);
      const minTileY = Math.floor(mapProjection.centerY + (0 - centerDrawY) / 256);
      const maxTileY = Math.floor(mapProjection.centerY + (h - centerDrawY) / 256);

      for (let x = minTileX; x <= maxTileX; x++) {
        for (let y = minTileY; y <= maxTileY; y++) {
          const url = `https://a.tile.openstreetmap.org/${mapProjection.zoom}/${x}/${y}.png`;
          const key = `tile_${mapProjection.zoom}_${x}_${y}`;
          promises.push(new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = url;
            img.onload = () => { loadedTiles[key] = img; resolve(); };
            img.onerror = () => { resolve(); };
          }));
        }
      }
    }

    await Promise.all(promises);
    const merged = { ...loaded, ...loadedTiles };
    setImagePreloads(merged);
    return merged;
  };

  // Triggered on modal open
  React.useEffect(() => {
    if (isOpen && photoPoints.length > 0) {
      preloadTripPhotos();
    }
  }, [isOpen, photoPoints]);

  const handleStartRecording = async () => {
    if (finalCoords.length < 2 || !mapProjection) {
      setErrorMsg("Errore: Percorso del viaggio insufficiente.");
      return;
    }

    setIsRendering(true);
    setShowPreview(true);
    setProgress(0);
    setVideoUrl(null);
    setErrorMsg(null);

    // 1. Ensure all images are preloaded
    let images = imagePreloads;
    if (Object.keys(images).length === 0 && photoPoints.length > 0) {
      images = await preloadTripPhotos();
    }

    // 2. Setup canvas dimensions based on aspect ratio
    const canvas = canvasRef.current;
    if (!canvas) {
      setErrorMsg("Canvas non disponibile.");
      setIsRendering(false);
      return;
    }

    const w = aspectRatio === "9_16" ? 720 : 720;
    const h = aspectRatio === "9_16" ? 1280 : 720;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setErrorMsg("Impossibile caricare il contesto grafica del Canvas.");
      setIsRendering(false);
      return;
    }

    // 3. Setup Media Recorder
    const stream = canvas.captureStream(30); // Capture at 30 frames per second
    const recordedChunks: Blob[] = [];

    // Check codec compatibility
    let options = { mimeType: "video/webm;codecs=vp9" };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: "video/webm;codecs=vp8" };
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: "video/webm" };
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: "" };
    }

    try {
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setIsRendering(false);
        setProgress(100);
      };

      mediaRecorder.start();

      // 4. Run the frame loop
      const totalFrames = duration * 30; // e.g. 8 * 30 = 240 frames
      let currentFrame = 0;

      const renderFrame = () => {
        if (currentFrame > totalFrames) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
          }
          return;
        }

        // Draw Frame
        drawFrameAtProgress(ctx, w, h, currentFrame / totalFrames, images);
        setProgress(Math.min(99, Math.round((currentFrame / totalFrames) * 100)));

        currentFrame++;
        animationFrameRef.current = requestAnimationFrame(renderFrame);
      };

      animationFrameRef.current = requestAnimationFrame(renderFrame);

    } catch (e: any) {
      console.error("MediaRecorder failure:", e);
      setErrorMsg(`Errore nella registrazione video: ${e.message || e}`);
      setIsRendering(false);
    }
  };

  const handleExportImage = async () => {
    if (finalCoords.length < 2 || !mapProjection) {
      setErrorMsg("Errore: Percorso del viaggio insufficiente.");
      return;
    }

    setIsRendering(true);
    setShowPreview(true);
    setProgress(0);
    setVideoUrl(null);
    setErrorMsg(null);

    let images = imagePreloads;
    if (Object.keys(images).length === 0 && photoPoints.length > 0) {
      images = await preloadTripPhotos();
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      setErrorMsg("Canvas non disponibile.");
      setIsRendering(false);
      return;
    }

    const w = aspectRatio === "9_16" ? 720 : 720;
    const h = aspectRatio === "9_16" ? 1280 : 720;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setErrorMsg("Impossibile caricare il contesto grafica del Canvas.");
      setIsRendering(false);
      return;
    }

    drawFrameAtProgress(ctx, w, h, 1.0, images);

    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const link = document.createElement("a");
      link.download = `Cartolina_${trip.title?.replace(/[^a-zA-Z0-9]/g, "_") || "Viaggio"}.jpg`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setProgress(100);
      setIsRendering(false);
      
      window.dispatchEvent(
        new CustomEvent("show-toast", {
          detail: { message: "🖼️ Cartolina salvata con successo!" }
        })
      );
    } catch (e: any) {
      console.error("Export image failure:", e);
      setErrorMsg(`Errore nell'esportazione cartolina: ${e.message || e}`);
      setIsRendering(false);
    }
  };

  // Main Canvas drawing routine for a single frame
  const drawFrameAtProgress = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    progressFactor: number,
    images: Record<string, HTMLImageElement>
  ) => {
    if (!mapProjection) return;

    // 1. Draw Background Style
    ctx.restore();
    ctx.save();

    // Draw Map Tiles
    ctx.fillStyle = "#E5E7EB"; // Base fallback color
    ctx.fillRect(0, 0, w, h);

    const centerDrawX = mapProjection.drawX + mapProjection.drawW / 2;
    const centerDrawY = mapProjection.drawY + mapProjection.drawH / 2;
    
    const minTileX = Math.floor(mapProjection.centerX + (0 - centerDrawX) / 256);
    const maxTileX = Math.floor(mapProjection.centerX + (w - centerDrawX) / 256);
    const minTileY = Math.floor(mapProjection.centerY + (0 - centerDrawY) / 256);
    const maxTileY = Math.floor(mapProjection.centerY + (h - centerDrawY) / 256);

    for (let x = minTileX; x <= maxTileX; x++) {
      for (let y = minTileY; y <= maxTileY; y++) {
        const key = `tile_${mapProjection.zoom}_${x}_${y}`;
        const img = images[key];
        if (img) {
          const drawX = centerDrawX + (x - mapProjection.centerX) * 256;
          const drawY = centerDrawY + (y - mapProjection.centerY) * 256;
          ctx.drawImage(img, drawX, drawY, 256, 256);
        }
      }
    }

    // Map Theme Overlay
    if (selectedTheme === "slate") {
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    } else if (selectedTheme === "parchment") {
      ctx.fillStyle = "rgba(250, 246, 238, 0.65)";
    } else if (selectedTheme === "sunset") {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "rgba(225, 29, 72, 0.4)");
      grad.addColorStop(0.5, "rgba(249, 115, 22, 0.3)");
      grad.addColorStop(1, "rgba(245, 158, 11, 0.4)");
      ctx.fillStyle = grad;
    } else if (selectedTheme === "olive") {
      ctx.fillStyle = "rgba(45, 61, 38, 0.65)";
    }
    ctx.fillRect(0, 0, w, h);

    // 2. Title & Header Typography
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Subtitle Tag
    ctx.font = "black 22px sans-serif";
    ctx.letterSpacing = "2px";
    if (selectedTheme === "parchment") {
      ctx.fillStyle = "#8B5A2B";
    } else if (selectedTheme === "sunset") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    } else {
      ctx.fillStyle = "#A7F3D0"; // Soft Mint
    }
    ctx.fillText("CAMPER LIFE ADVENTURE 🗺️", w / 2, h * 0.06);

    // Main Title
    ctx.font = `bold ${aspectRatio === "9_16" ? "54px" : "45px"} sans-serif`;
    ctx.letterSpacing = "0px";
    if (selectedTheme === "parchment") {
      ctx.fillStyle = "#2D1A08";
    } else {
      ctx.fillStyle = "#FFFFFF";
    }
    ctx.fillText(customTitle, w / 2, h * 0.10, w * 0.9);

    // Dates & Vehicle Badge
    ctx.font = "500 24px sans-serif";
    const dates = getDisplayDates(trip);
    const dateText = `${dates.start}  ➔  ${dates.end}`;
    if (selectedTheme === "parchment") {
      ctx.fillStyle = "#5C4033";
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    }
    ctx.fillText(`${dateText}  •  🚐 Camper`, w / 2, h * 0.14, w * 0.9);

    // Decorative Separator Line
    ctx.lineWidth = 1.5;
    if (selectedTheme === "parchment") {
      ctx.strokeStyle = "rgba(139, 92, 26, 0.18)";
    } else {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    }
    ctx.beginPath();
    ctx.moveTo(w * 0.35, h * 0.17);
    ctx.lineTo(w * 0.65, h * 0.17);
    ctx.stroke();

    // 3. Draw Route Path and Coordinates
    const totalPoints = finalCoords.length;
    const activeRouteIndex = Math.min(
      totalPoints - 1,
      Math.floor(progressFactor * (totalPoints - 1))
    );

    // A. Draw full scheduled trace (dashed light line)
    ctx.beginPath();
    finalCoords.forEach((coord, index) => {
      const canvasPos = getCanvasCoords(coord.lat, coord.lng, w, h, mapProjection);
      if (index === 0) {
        ctx.moveTo(canvasPos.x, canvasPos.y);
      } else {
        ctx.lineTo(canvasPos.x, canvasPos.y);
      }
    });
    ctx.lineWidth = 3;
    if (selectedTheme === "parchment") {
      ctx.strokeStyle = "rgba(139, 92, 26, 0.25)";
      ctx.setLineDash([4, 4]);
    } else {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.setLineDash([6, 4]);
    }
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // B. Draw passed glowing path up to current index
    if (activeRouteIndex > 0) {
      ctx.beginPath();
      for (let i = 0; i <= activeRouteIndex; i++) {
        const coord = finalCoords[i];
        const canvasPos = getCanvasCoords(coord.lat, coord.lng, w, h, mapProjection);
        if (i === 0) {
          ctx.moveTo(canvasPos.x, canvasPos.y);
        } else {
          ctx.lineTo(canvasPos.x, canvasPos.y);
        }
      }

      ctx.lineWidth = 5.5;
      if (selectedTheme === "slate") {
        ctx.strokeStyle = "#F59E0B"; // Neon Amber
        ctx.shadowColor = "#F59E0B";
        ctx.shadowBlur = 8;
      } else if (selectedTheme === "parchment") {
        ctx.strokeStyle = "#78350F"; // Deep Rust Sepia
        ctx.shadowBlur = 0;
      } else if (selectedTheme === "sunset") {
        ctx.strokeStyle = "#FFFFFF"; // Clean contrast white
        ctx.shadowColor = "rgba(255, 255, 255, 0.6)";
        ctx.shadowBlur = 10;
      } else if (selectedTheme === "olive") {
        ctx.strokeStyle = "#F59E0B"; // Amber
        ctx.shadowBlur = 0;
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow
    }

    // 4. Draw Stop Node Markers on Map
    points.forEach((pt, index) => {
      const pos = getCanvasCoords(pt.lat, pt.lng, w, h, mapProjection);
      const isStart = index === 0;
      const isEnd = index === points.length - 1;

      // Outer Glow/Ring
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 16, 0, Math.PI * 2);
      if (selectedTheme === "parchment") {
        ctx.fillStyle = "rgba(139, 92, 26, 0.12)";
        ctx.strokeStyle = "#8B5C2B";
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
        ctx.strokeStyle = "#FFFFFF";
      }
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();

      // Inner Solid Circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
      if (isStart) {
        ctx.fillStyle = "#10B981"; // Emerald Start
      } else if (isEnd) {
        ctx.fillStyle = "#EF4444"; // Rose/Red End
      } else {
        ctx.fillStyle = selectedTheme === "parchment" ? "#5C4033" : "#3B82F6";
      }
      ctx.fill();

      // Number text
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 20px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText((index + 1).toString(), pos.x, pos.y + 1);
    });

    // 5. Draw popped up Polaroids
    photoMap.forEach((photo, idx) => {
      // Show photo if camper passed its trigger coordinates
      if (activeRouteIndex >= photo.triggerIndex) {
        const pCoords = getCanvasCoords(photo.lat, photo.lng, w, h, mapProjection);
        const imgObj = images[photo.id];

        // Animated pop-in scaling factor with small bounce
        const ageInFrames = activeRouteIndex - photo.triggerIndex;
        const animationFrames = 14;
        const t = Math.min(1.0, ageInFrames / animationFrames);
        // Spring bounce formula
        const scale = t === 1.0 ? 1.0 : Math.sin(t * Math.PI * 1.15) * 1.08;

        // Use fixed, predefined positions to guarantee no overlap
        let px = 0;
        let py = 0;
        
        if (aspectRatio === "9_16") {
          const slots916 = [
            { px: 120, py: 360 }, // 0: Top Left
            { px: w - 120, py: 660 }, // 1: Mid Right
            { px: 120, py: 970 }, // 2: Bottom Left
            { px: w - 120, py: 360 }, // 3: Top Right
            { px: 120, py: 660 }, // 4: Mid Left
            { px: w - 120, py: 970 }  // 5: Bottom Right
          ];
          const slot = slots916[idx % 6];
          px = slot.px;
          py = slot.py;
        } else {
          const slots11 = [
            { px: 100, py: 280 },
            { px: w - 100, py: 480 },
            { px: 100, py: 480 },
            { px: w - 100, py: 280 },
            { px: w / 2, py: h - 220 },
            { px: w / 2, py: 280 }
          ];
          const slot = slots11[idx % 6];
          px = slot.px;
          py = slot.py;
        }

        drawPolaroidCard(ctx, imgObj, photo.description || photo.locationName, px, py, scale, photo.angle);
      }
    });

    // 6. Draw Moving Camper 🚐
    if (activeRouteIndex >= 0 && activeRouteIndex < totalPoints) {
      const currentCoord = finalCoords[activeRouteIndex];
      const camperPos = getCanvasCoords(currentCoord.lat, currentCoord.lng, w, h, mapProjection);

      // Pulse Glow Behind Camper
      const pulseRadius = 22 + Math.sin(progressFactor * Math.PI * 14) * 4;
      ctx.beginPath();
      ctx.arc(camperPos.x, camperPos.y, pulseRadius, 0, Math.PI * 2);
      if (selectedTheme === "parchment") {
        ctx.fillStyle = "rgba(139, 92, 26, 0.15)";
      } else {
        ctx.fillStyle = "rgba(245, 158, 11, 0.25)";
      }
      ctx.fill();

      // Draw Camper Icon Circle background
      ctx.beginPath();
      ctx.arc(camperPos.x, camperPos.y, 18, 0, Math.PI * 2);
      ctx.fillStyle = selectedTheme === "parchment" ? "#8B5C2B" : "#F59E0B";
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // Camper Emoji string
      ctx.font = "30px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🚐", camperPos.x, camperPos.y - 1);
    }

    // 8. Lower Interactive HUD Panel Card (Glassmorphism look)
    const hudW = w * 0.86;
    const hudH = aspectRatio === "9_16" ? 140 : 125;
    const hudX = (w - hudW) / 2;
    const hudY = h * 0.95 - hudH + (hudH * 0.25);

    // Draw HUD card
    ctx.shadowColor = "rgba(0,0,0,0.15)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    if (selectedTheme === "parchment") {
      ctx.fillStyle = "#FFFFFF";
      ctx.strokeStyle = "#E2D3BE";
      ctx.lineWidth = 1.5;
    } else {
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)"; // Slate Dark Card
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
    }

    ctx.beginPath();
    ctx.roundRect(hudX, hudY, hudW, hudH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0; // reset shadow
    ctx.shadowOffsetY = 0;

    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // B. Trip Info Stats (Odometer counting)
    const tripTotalDist = getTripDistance(trip);
    const simulatedDistance = Math.round(progressFactor * tripTotalDist); 

    ctx.font = "bold 22px sans-serif";
    if (selectedTheme === "parchment") {
      ctx.fillStyle = "#6B7280";
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    }
    ctx.fillText("CHILOMETRI PERCORSI", hudX + 24, hudY + 25);

    ctx.font = "bold 40px sans-serif";
    ctx.fillStyle = selectedTheme === "parchment" ? "#374151" : "#10B981";
    ctx.fillText(`${simulatedDistance} km`, hudX + 24, hudY + 55);

    // C. Speed Badge / Expenses Breakdown
    if (showExpenses) {
      ctx.textAlign = "right";
      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = selectedTheme === "parchment" ? "#6B7280" : "rgba(255, 255, 255, 0.7)";
      ctx.fillText("SPESE VIAGGIO", hudX + hudW - 24, hudY + 25);

      const expenses = trip.expenses || [];
      const totalAmount = Math.round(progressFactor * expenses.reduce((s, e) => s + e.amount, 0));
      
      const byCat = expenses.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + e.amount;
        return acc;
      }, {} as Record<string, number>);

      ctx.font = "bold 26px sans-serif";
      ctx.fillStyle = selectedTheme === "parchment" ? "#374151" : "#10B981";
      ctx.fillText(`€ ${totalAmount}`, hudX + hudW - 24, hudY + 50);

      const fuel = Math.round(progressFactor * (byCat['Carburante'] || 0));
      const sosta = Math.round(progressFactor * (byCat['Sosta'] || 0));
      const autostrada = Math.round(progressFactor * (byCat['Autostrada'] || 0));
      const cibo = Math.round(progressFactor * (byCat['Cibo'] || 0));
      const altro = Math.round(progressFactor * (byCat['Altro'] || 0));

      let catStr = "";
      if (fuel > 0) catStr += `⛽ ${fuel}€ `;
      if (sosta > 0) catStr += `🏕️ ${sosta}€ `;
      if (autostrada > 0) catStr += `🛣️ ${autostrada}€ `;
      if (cibo > 0) catStr += `🛒 ${cibo}€ `;
      if (altro > 0) catStr += `🏷️ ${altro}€`;

      ctx.font = "bold 21px sans-serif";
      ctx.fillStyle = selectedTheme === "parchment" ? "#4B5563" : "rgba(255, 255, 255, 0.95)";
      ctx.fillText(catStr.trim() || "Nessuna spesa", hudX + hudW - 24, hudY + 80);
    } else {
      ctx.textAlign = "right";
      ctx.font = "bold 27px monospace";
      ctx.fillStyle = selectedTheme === "parchment" ? "#1F2937" : "#FFFFFF";
      ctx.fillText("🚐 90 km/h", hudX + hudW - 24, hudY + 55);
    }

    // D. Progress percentage bar inside HUD
    const barW = hudW - 36;
    const barH = 5;
    const barX = hudX + 18;
    const barY = hudY + hudH - 18;

    // Bar background
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 2.5);
    ctx.fillStyle = selectedTheme === "parchment" ? "#F3F4F6" : "rgba(255, 255, 255, 0.1)";
    ctx.fill();

    // Bar active
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * progressFactor, barH, 2.5);
    if (selectedTheme === "parchment") {
      ctx.fillStyle = "#8B5A2B";
    } else {
      ctx.fillStyle = "#10B981"; // Emerald green
    }
    ctx.fill();

    // E. ViaCamper watermarked brand
    ctx.font = "italic bold 11px sans-serif";
    ctx.fillStyle = selectedTheme === "parchment" ? "#9CA3AF" : "rgba(255, 255, 255, 0.35)";
    ctx.fillText("Realizzato con ViaCamper App", hudX + hudW - 18, hudY + hudH - 32);

    ctx.restore();
  };

  // Helper routine to draw photographic card at (x, y) coordinates with zoom-scale
  const drawPolaroidCard = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement | undefined,
    caption: string,
    x: number,
    y: number,
    scale: number,
    angle: number
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale * 0.8, scale * 0.8);
    ctx.rotate(angle);

    // Polaroid dimensions
    const w = 287;
    const h = 344;
    const px = -w / 2;
    const py = -h / 2;

    // Drop Shadow
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 4;

    // Polaroid White Background
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(px, py, w, h, 6);
    ctx.fill();

    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Image Area dimensions
    const m = 20;
    const imgW = w - m * 2;
    const imgH = h - m * 2 - 40;

    ctx.fillStyle = "#F3F4F6";
    ctx.fillRect(px + m, py + m, imgW, imgH);

    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(px + m, py + m, imgW, imgH, 4);
      ctx.clip();

      const imgScale = Math.min(imgW / img.width, imgH / img.height);
      const drawImgW = img.width * imgScale;
      const drawImgH = img.height * imgScale;
      const drawX = px + m + (imgW - drawImgW) / 2;
      const drawY = py + m + (imgH - drawImgH) / 2;

      ctx.drawImage(img, drawX, drawY, drawImgW, drawImgH);
      ctx.restore();
    } else {
      // Camera fallback icon
      ctx.font = "27px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("📸", px + w / 2, py + m + imgH / 2);
    }

    // Border line inside photo
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 1;
    ctx.strokeRect(px + m, py + m, imgW, imgH);

    // Caption title
    ctx.fillStyle = "#374151";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    let text = caption;
    if (text.length > 20) {
      text = text.substring(0, 18) + "...";
    }
    ctx.fillText(text, px + w / 2, py + h - 14);

    ctx.restore();
  };

  // Safe cancel / closing cleanup
  const handleCancelAndClose = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRendering(false);
    onClose();
  };

  const handleShareVideo = async () => {
    if (!videoUrl) return;

    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const file = new File([blob], `${trip.title.replace(/\s+/g, "_")}_itinerary.webm`, {
        type: "video/webm"
      });

      // Automatically open trip share modal/publish trip summary
      window.dispatchEvent(
        new CustomEvent("open-trip-share-modal", {
          detail: { trip }
        })
      );

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Percorso: ${trip.title}`,
          text: `Ecco un video del tracciato del mio viaggio: ${trip.title} 🚐🗺️`
        });
      } else {
        // Fallback
        const link = document.createElement("a");
        link.href = videoUrl;
        link.download = `${trip.title.replace(/\s+/g, "_")}_itinerary.webm`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.dispatchEvent(
          new CustomEvent("show-toast", {
            detail: { message: "📥 Video salvato! Condividilo manualmente sui tuoi social preferiti!" }
          })
        );
      }
    } catch (err) {
      console.error("Sharing failed", err);
      // Fallback download
      const link = document.createElement("a");
      link.href = videoUrl;
      link.download = `${trip.title.replace(/\s+/g, "_")}_itinerary.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className={`bg-white rounded-3xl w-full ${isRendering || videoUrl ? 'max-w-4xl' : 'max-w-md'} shadow-2xl border border-slate-100 flex flex-col md:flex-row overflow-hidden max-h-[90vh] md:max-h-[85vh] relative`}>
        
        {/* LEFT PANEL - SETTINGS & EXPORT ACTIONS */}
        <div className={`w-full ${isRendering || videoUrl ? 'md:w-[45%]' : ''} bg-slate-50 border-r border-slate-100 p-5 overflow-y-auto flex flex-col justify-between`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-550/10 rounded-lg">
                  <Film className="w-4 h-4 text-indigo-600" />
                </div>
                <h2 className="font-black text-slate-800 text-sm uppercase tracking-wide">
                  Video e Cartoline Viaggio 🎬
                </h2>
              </div>
              <button
                onClick={handleCancelAndClose}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[10.5px] text-slate-500 leading-relaxed font-sans">
              Personalizza ed esporta un fantastico video animato in alta definizione o una cartolina del tuo tragitto da pubblicare su <strong>Instagram, TikTok, WhatsApp</strong> o scaricare!
            </p>

            <div className="space-y-3 pt-2 font-sans">
              {/* Title override */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">
                  Titolo Personalizzato
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Scrivi un titolo per il video"
                  className="w-full text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 focus:border-indigo-500 outline-none text-slate-700 bg-white"
                />
              </div>

              {/* Theme Selector */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">
                  Stile Grafico (Tema)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["slate", "parchment", "sunset", "olive"] as const).map((thm) => {
                    const titles: Record<ThemeType, string> = {
                      slate: "🌌 Slate Space",
                      parchment: "📜 Carta Epoca",
                      sunset: "🌅 Tramonto d'Oro",
                      olive: "🌲 Forest Explorer"
                    };
                    return (
                      <button
                        key={thm}
                        onClick={() => setSelectedTheme(thm)}
                        className={`text-[10.5px] font-bold py-2 px-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                          selectedTheme === thm
                            ? "border-indigo-600 bg-indigo-50/45 text-indigo-700 font-black shadow-2xs"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100/50"
                        }`}
                      >
                        <span>{titles[thm]}</span>
                        {selectedTheme === thm && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Format / Aspect Ratio */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">
                  Formato Video
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setAspectRatio("9_16")}
                    className={`text-[10.5px] font-bold py-2 px-2.5 rounded-xl border text-left transition-all flex items-center gap-1.5 ${
                      aspectRatio === "9_16"
                        ? "border-indigo-600 bg-indigo-50/45 text-indigo-700 font-black shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <Tv className="w-3.5 h-3.5" />
                    Story / TikTok (9:16)
                  </button>
                  <button
                    onClick={() => setAspectRatio("1_1")}
                    className={`text-[10.5px] font-bold py-2 px-2.5 rounded-xl border text-left transition-all flex items-center gap-1.5 ${
                      aspectRatio === "1_1"
                        ? "border-indigo-600 bg-indigo-50/45 text-indigo-700 font-black shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    <Tv className="w-3.5 h-3.5 transform rotate-90" />
                    Post Quadrato (1:1)
                  </button>
                </div>
              </div>

              {/* Video Duration */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block flex justify-between">
                  <span>Durata Animazione</span>
                  <span className="text-indigo-600 font-bold">{duration} secondi</span>
                </label>
                <input
                  type="range"
                  min={4}
                  max={16}
                  step={1}
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* SoundFX Overlay */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">
                  Tag Audio / Effetto Di Sottofondo
                </label>
                <div className="space-y-1 max-h-[140px] overflow-y-auto pr-0.5">
                  {audioOptions.map((audio) => (
                    <button
                      key={audio.id}
                      onClick={() => setSelectedAudio(audio.id)}
                      className={`w-full text-left p-2 rounded-xl border transition-all flex items-center justify-between ${
                        selectedAudio === audio.id
                          ? "border-indigo-600 bg-indigo-50/30 text-indigo-700"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <p className="text-[10.5px] font-black">{audio.label}</p>
                        <p className="text-[8.5px] text-slate-400">{audio.subtitle}</p>
                      </div>
                      <Volume2 className={`w-3.5 h-3.5 ${selectedAudio === audio.id ? "text-indigo-600" : "text-slate-300"}`} />
                    </button>
                  ))}
                </div>
              </div>
              {/* Show Expenses Switch */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest block">
                  Dati Aggiuntivi
                </label>
                <button
                  onClick={() => setShowExpenses(!showExpenses)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                    showExpenses
                      ? "border-indigo-600 bg-indigo-50/45 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <p className="text-[10.5px] font-bold">Ripartizione delle Spese</p>
                    <p className="text-[8.5px] text-slate-400 mt-0.5">Mostra i costi invece della velocità media</p>
                  </div>
                  <div className={`w-8 h-4.5 rounded-full relative transition-colors ${showExpenses ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                    <div className={`absolute top-0.5 left-0.5 bg-white w-3.5 h-3.5 rounded-full transition-transform ${showExpenses ? 'translate-x-3.5' : ''}`} />
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* RENDER BUTTONS */}
          <div className="pt-4 border-t border-slate-100/60 mt-4 space-y-2">
            {errorMsg && (
              <p className="text-[9.5px] font-bold text-rose-500 bg-rose-50 border border-rose-100 p-2 rounded-lg">
                ⚠️ {errorMsg}
              </p>
            )}

            {!videoUrl ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportImage}
                  disabled={isRendering}
                  className={`w-full py-2.5 rounded-xl text-xs font-black uppercase text-white shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isRendering
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  <Download className={`w-4 h-4 ${isRendering ? "animate-pulse" : ""}`} />
                  Cartolina 🖼️
                </button>
                <button
                  onClick={handleStartRecording}
                  disabled={isRendering}
                  className={`w-full py-2.5 rounded-xl text-xs font-black uppercase text-white shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isRendering
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-850"
                  }`}
                >
                  <Sparkles className={`w-4 h-4 ${isRendering ? "animate-spin" : ""}`} />
                  {isRendering ? `ATTENDI (${progress}%)` : "Video 🎬"}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleShareVideo}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  Condividi 🚀
                </button>
                <button
                  onClick={handleShareVideo} // download triggers on same function if unsupported
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Scarica 📥
                </button>

                <button
                  onClick={() => setVideoUrl(null)}
                  className="col-span-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] uppercase py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Riavvia Creazione
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Hidden/Active Canvas used for frame capture */}
        <canvas
          ref={canvasRef}
          className={`hidden`}
        />

        {/* RIGHT PANEL - LIVE EXPORT STAGE PREVIEW */}
        {(isRendering || videoUrl) && showPreview && (
          <div className="absolute inset-0 z-50 bg-slate-900 p-4 md:p-5 flex flex-col items-center justify-center min-h-full">
            {/* Close button for preview */}
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-4 right-4 p-1.5 bg-slate-800 text-white rounded-full hover:bg-slate-700 transition-all z-50"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header indicator */}
            <div className="absolute top-3 left-4 text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
              <Compass className="w-3.5 h-3.5 animate-spin text-amber-500" style={{ animationDuration: "5s" }} />
              Anteprima Video Esportazione HD
            </div>

            {/* Visual Presentation Area */}
            <div className="w-full flex items-center justify-center">
              {isRendering ? (
                <div className="flex flex-col items-center text-center space-y-3 font-sans">
                  {/* Simulated live-drawing scaled canvas overlay for user feedback */}
                  <div className="w-40 h-40 bg-indigo-500/10 border-2 border-indigo-500/35 border-dashed rounded-full flex items-center justify-center relative animate-pulse">
                    <span className="text-3xl">🎬</span>
                    <div className="absolute inset-0 border-t-2 border-indigo-500 rounded-full animate-spin"></div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-white">Disegno dei frame in corso...</p>
                    <p className="text-[10px] text-slate-400">Rendering tracciato camper, fermate e Polaroids</p>
                    <div className="w-48 bg-slate-800 rounded-full h-2 mt-1 mx-auto overflow-hidden">
                      <div
                        className="bg-indigo-500 h-2 rounded-full transition-all duration-150"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs font-bold text-indigo-400 mt-1">{progress}% completato</p>
                  </div>
                </div>
              ) : videoUrl ? (
                <div className="flex flex-col items-center space-y-3 w-full max-w-[280px]">
                  {/* Playable Real Video Output */}
                  <div
                    className={`relative bg-black rounded-2xl border border-slate-700 shadow-xl overflow-hidden ${
                      aspectRatio === "9_16" ? "aspect-[9/16] w-[200px]" : "aspect-square w-[240px]"
                    }`}
                  >
                    <video
                      src={videoUrl}
                      controls
                      loop
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[8px] font-black py-0.5 px-2 rounded-lg uppercase tracking-wider shadow-sm select-none">
                      Pronto! 🎥
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center leading-normal">
                    Fai clic su Play per guardare il video generato. Puoi scaricarlo subito o condividerlo!
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

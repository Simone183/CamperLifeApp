import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  X,
  MousePointerClick,
  Play,
  Square,
  Download,
  Share2,
  CheckCircle2,
} from "lucide-react";

export interface VideoScenario {
  id: string;
  title: string;
  badge: string;
  targetTab: "map_nav" | "diary" | "settings_tools";
  targetSubTab?: string;
  captions: string[];
}

export const VIDEO_SCENARIOS: VideoScenario[] = [
  {
    id: "mappa_nav",
    title: "Video 1: Mappa & Navigatore Camper",
    badge: "🗺️ MAPPA & SOSTE",
    targetTab: "map_nav",
    targetSubTab: "map",
    captions: [
      "📍 Quasi 30.000 Aree Sosta, Agricamper e Camper Service verificati",
      "🔍 Filtra in un tocco per Carico/Scarico, Elettricità e Soste Gratuite",
      "🚐 Navigatore vocale sagomato sulle misure reali del tuo Camper",
      "⚠️ Avvisi automatici per sottopassi bassi, divieti e strade strette",
    ],
  },
  {
    id: "sagre_eventi",
    title: "Video 2: Sagre & Eventi in Italia",
    badge: "🎪 SAGRE & FIERE",
    targetTab: "settings_tools",
    targetSubTab: "events",
    captions: [
      "🍷 Scopri le Sagre, Fiere e Feste tradizionali vicino a te o in tutta Italia",
      "🖼️ Apri la locandina ufficiale a schermo intero con date e programma",
      "🅿️ Consulta l'area sosta camper consigliata per ogni evento",
      "🧭 Premi 'Naviga' per avviare subito il percorso camper verso la Sagra",
    ],
  },
  {
    id: "strumenti_camper",
    title: "Video 3: Strumenti Tecnici Camper",
    badge: "🛠️ STRUMENTI CAMPER",
    targetTab: "settings_tools",
    targetSubTab: "hub",
    captions: [
      "📐 Livella a bolla digitale con calcolo automatico dell'altezza cunei",
      "✅ Checklist di Sicurezza pre-partenza per non dimenticare nulla",
      "⚖️ Calcolatore Pesi a bordo, Autonomia Off-Grid e Scadenziario Mezzo",
      "⛽ Scheda Carburante per monitorare consumi medi e spese di viaggio",
    ],
  },
  {
    id: "diario_viaggio",
    title: "Video 4: Diario di Viaggio & Tappe",
    badge: "📖 DIARIO DI VIAGGIO",
    targetTab: "diary",
    captions: [
      "📸 Crea il tuo Diario di Viaggio con tappe, foto e posizione GPS",
      "💶 Registra spese di sosta, carburante, pedaggi e ristoranti",
      "🌍 Esporta o condividi il tuo itinerario con gli altri camperisti",
    ],
  },
  {
    id: "community_sos",
    title: "Video 5: Community & SOS Camperisti",
    badge: "👥 COMMUNITY & SOS",
    targetTab: "settings_tools",
    targetSubTab: "community",
    captions: [
      "💬 Bacheca Social in tempo reale per scambiare consigli tra camperisti",
      "🆘 Sistema SOS integrato per chiedere o offrire aiuto nel raggio di 50 km",
      "➕ Segnala nuove aree di sosta o sagre con foto direttamente dall'app",
    ],
  },
];

interface TouchPoint {
  id: number;
  x: number;
  y: number;
  createdAt: number;
}

interface VideoRecordingModeOverlayProps {
  isActive: boolean;
  onClose: () => void;
  hideTopBanners: boolean;
  onToggleHideTopBanners: (val: boolean) => void;
  onNavigateToSection: (
    tab: "map_nav" | "diary" | "settings_tools",
    subTab?: string
  ) => void;
}

// Cache whether an image src is CORS-clean so we never taint the recording canvas
const cleanImageCache = new WeakMap<HTMLImageElement, boolean>();
let scratchTestCanvas: HTMLCanvasElement | null = null;
let scratchTestCtx: CanvasRenderingContext2D | null = null;

function isImageCorsClean(img: HTMLImageElement): boolean {
  if (!img.complete || img.naturalWidth === 0) return false;
  const cached = cleanImageCache.get(img);
  if (cached !== undefined) return cached;

  try {
    if (!scratchTestCanvas) {
      scratchTestCanvas = document.createElement("canvas");
      scratchTestCanvas.width = 2;
      scratchTestCanvas.height = 2;
      scratchTestCtx = scratchTestCanvas.getContext("2d", {
        willReadFrequently: true,
      });
    }
    if (!scratchTestCtx) return false;
    scratchTestCtx.clearRect(0, 0, 2, 2);
    scratchTestCtx.drawImage(img, 0, 0, 2, 2);
    scratchTestCtx.getImageData(0, 0, 1, 1);
    cleanImageCache.set(img, true);
    return true;
  } catch {
    cleanImageCache.set(img, false);
    return false;
  }
}

/**
 * Synchronous, zero-latency DOM-to-Canvas renderer (<8ms per frame).
 * Never makes network requests, never hangs, and never taints the canvas.
 */
function renderLiveViewportToCanvas(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  scale: number
) {
  const vw = cw / scale;
  const vh = ch / scale;

  ctx.save();
  ctx.scale(scale, scale);

  // Base background
  ctx.fillStyle = "#F4F6F0";
  ctx.fillRect(0, 0, vw, vh);

  const rootEl = document.body;
  const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_ELEMENT, {
    acceptNode(node) {
      const el = node as HTMLElement;
      if (el.dataset?.recordingIgnore === "true") {
        return NodeFilter.FILTER_REJECT;
      }
      const tag = el.tagName;
      if (
        tag === "SCRIPT" ||
        tag === "STYLE" ||
        tag === "NOSCRIPT" ||
        tag === "HEAD"
      ) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let currentNode: Node | null = walker.currentNode;
  while (currentNode) {
    const el = currentNode as HTMLElement;
    const rect = el.getBoundingClientRect();

    // Only process visible elements within the viewport
    if (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.top < vh &&
      rect.right > 0 &&
      rect.left < vw
    ) {
      const style = window.getComputedStyle(el);
      if (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        parseFloat(style.opacity || "1") > 0.02
      ) {
        const radius = Math.min(
          rect.width / 2,
          rect.height / 2,
          parseFloat(style.borderTopLeftRadius || "0") || 0
        );

        // 1. Background color
        const bg = style.backgroundColor;
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
          ctx.fillStyle = bg;
          ctx.beginPath();
          if (radius > 0 && typeof ctx.roundRect === "function") {
            ctx.roundRect(rect.left, rect.top, rect.width, rect.height, radius);
          } else {
            ctx.rect(rect.left, rect.top, rect.width, rect.height);
          }
          ctx.fill();
        }

        // 2. Border
        const bw = parseFloat(style.borderTopWidth || "0");
        const bc = style.borderTopColor;
        if (
          bw > 0 &&
          style.borderTopStyle !== "none" &&
          bc &&
          bc !== "rgba(0, 0, 0, 0)" &&
          bc !== "transparent"
        ) {
          ctx.strokeStyle = bc;
          ctx.lineWidth = Math.min(4, bw);
          ctx.beginPath();
          if (radius > 0 && typeof ctx.roundRect === "function") {
            ctx.roundRect(rect.left, rect.top, rect.width, rect.height, radius);
          } else {
            ctx.rect(rect.left, rect.top, rect.width, rect.height);
          }
          ctx.stroke();
        }

        // 3. Images (Sagra flyers, map tiles, avatars)
        if (el.tagName === "IMG") {
          const imgEl = el as HTMLImageElement;
          if (isImageCorsClean(imgEl)) {
            ctx.save();
            if (radius > 0 && typeof ctx.roundRect === "function") {
              ctx.beginPath();
              ctx.roundRect(
                rect.left,
                rect.top,
                rect.width,
                rect.height,
                radius
              );
              ctx.clip();
            }
            try {
              ctx.drawImage(imgEl, rect.left, rect.top, rect.width, rect.height);
            } catch {
              // ignore
            }
            ctx.restore();
          } else if (rect.width > 40 && rect.height > 40) {
            // Subtle map/image placeholder if cross-origin image has no CORS header
            ctx.fillStyle = "#E5EAE0";
            ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
          }
        }

        // 4. Direct child text nodes & input values
        if (
          el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT"
        ) {
          const val =
            (el as HTMLInputElement).value ||
            (el as HTMLInputElement).placeholder ||
            "";
          if (val) {
            ctx.fillStyle = style.color || "#1E293B";
            const fontSize = parseFloat(style.fontSize || "12") || 12;
            const fontWeight = style.fontWeight || "600";
            ctx.font = `${fontWeight} ${fontSize}px sans-serif`;
            ctx.textBaseline = "middle";
            ctx.fillText(
              val.slice(0, 65),
              rect.left + 8,
              rect.top + rect.height / 2,
              Math.max(10, rect.width - 16)
            );
          }
        } else if (el.childNodes && el.childNodes.length > 0) {
          let directText = "";
          for (let i = 0; i < el.childNodes.length; i++) {
            const cn = el.childNodes[i];
            if (cn.nodeType === Node.TEXT_NODE) {
              const t = cn.textContent?.replace(/\s+/g, " ").trim();
              if (t) {
                directText += (directText ? " " : "") + t;
              }
            }
          }
          if (directText) {
            ctx.fillStyle = style.color || "#1E293B";
            const fontSize = parseFloat(style.fontSize || "12") || 12;
            const fontWeight = style.fontWeight || "600";
            ctx.font = `${fontWeight} ${fontSize}px sans-serif`;
            ctx.textBaseline = "middle";

            const padL = parseFloat(style.paddingLeft || "0") || 0;
            const padR = parseFloat(style.paddingRight || "0") || 0;
            const availW = Math.max(12, rect.width - padL - padR);
            const align = style.textAlign;
            let tx = rect.left + padL;
            if (align === "center") {
              const measured = Math.min(
                availW,
                ctx.measureText(directText).width
              );
              tx = rect.left + (rect.width - measured) / 2;
            }
            ctx.fillText(
              directText.slice(0, 90),
              tx,
              rect.top + rect.height / 2,
              availW
            );
          }
        }
      }
    }

    currentNode = walker.nextNode();
  }

  ctx.restore();
}

export const VideoRecordingModeOverlay: React.FC<
  VideoRecordingModeOverlayProps
> = ({
  isActive,
  onClose,
  hideTopBanners,
  onToggleHideTopBanners,
  onNavigateToSection,
}) => {
  const [isDirectorMinimized, setIsDirectorMinimized] = useState(false);
  const [showCaptionBanner, setShowCaptionBanner] = useState(true);
  const [bannerPosition, setBannerPosition] = useState<
    "top" | "middle_top" | "bottom"
  >("middle_top");
  const [showTouchHighlighter, setShowTouchHighlighter] = useState(true);
  const [selectedScenarioId, setSelectedScenarioId] =
    useState<string>("mappa_nav");
  const [captionIndex, setCaptionIndex] = useState(0);
  const [customCaption, setCustomCaption] = useState("");
  const [customBadge, setCustomBadge] = useState("VIACAMPER APP");
  const [useCustomText, setUseCustomText] = useState(false);
  const [touchPoints, setTouchPoints] = useState<TouchPoint[]>([]);

  // Built-in In-App Video Recorder states
  const [isCapturingVideo, setIsCapturingVideo] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const [recordedMimeType, setRecordedMimeType] = useState<string>("video/webm");
  const [recorderStatusMsg, setRecorderStatusMsg] = useState<string | null>(
    null
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const renderIntervalRef = useRef<any>(null);
  const isCapturingRef = useRef<boolean>(false);

  // Refs for live overlay drawing inside the recorded video canvas
  const touchPointsRef = useRef<TouchPoint[]>([]);
  const showTouchRef = useRef<boolean>(showTouchHighlighter);
  const showBannerRef = useRef<boolean>(showCaptionBanner);
  const bannerPosRef = useRef<"top" | "middle_top" | "bottom">(bannerPosition);
  const activeBadgeRef = useRef<string>("");
  const activeCaptionRef = useRef<string>("");

  const currentScenario =
    VIDEO_SCENARIOS.find((s) => s.id === selectedScenarioId) ||
    VIDEO_SCENARIOS[0];

  const activeCaptionText = useCustomText
    ? customCaption
    : currentScenario.captions[captionIndex] || currentScenario.captions[0];

  const activeBadgeText = useCustomText ? customBadge : currentScenario.badge;

  useEffect(() => {
    touchPointsRef.current = touchPoints;
  }, [touchPoints]);

  useEffect(() => {
    showTouchRef.current = showTouchHighlighter;
  }, [showTouchHighlighter]);

  useEffect(() => {
    showBannerRef.current = showCaptionBanner;
  }, [showCaptionBanner]);

  useEffect(() => {
    bannerPosRef.current = bannerPosition;
  }, [bannerPosition]);

  useEffect(() => {
    activeBadgeRef.current = activeBadgeText;
    activeCaptionRef.current = activeCaptionText;
  }, [activeBadgeText, activeCaptionText]);

  // Timer during active video capture
  useEffect(() => {
    if (!isCapturingVideo) {
      setRecordingSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setRecordingSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isCapturingVideo]);

  // Global touch / click highlighter effect while active
  useEffect(() => {
    if (!isActive || !showTouchHighlighter) return;

    const handlePointerDown = (e: PointerEvent) => {
      const now = Date.now();
      const id = now + Math.random();
      setTouchPoints((prev) => [
        ...prev.slice(-4),
        { id, x: e.clientX, y: e.clientY, createdAt: now },
      ]);
      setTimeout(() => {
        setTouchPoints((prev) => prev.filter((p) => p.id !== id));
      }, 650);
    };

    window.addEventListener("pointerdown", handlePointerDown, {
      passive: true,
      capture: true,
    });
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, {
        capture: true,
      });
    };
  }, [isActive, showTouchHighlighter]);

  // Keyboard shortcuts during screen recording on PC
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.key === "ArrowRight") {
        setCaptionIndex((prev) =>
          prev + 1 < currentScenario.captions.length ? prev + 1 : 0
        );
      } else if (e.key === "ArrowLeft") {
        setCaptionIndex((prev) =>
          prev - 1 >= 0 ? prev - 1 : currentScenario.captions.length - 1
        );
      } else if (e.key === "Escape") {
        setIsDirectorMinimized((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, currentScenario]);

  const stopScreenCapture = () => {
    isCapturingRef.current = false;
    if (renderIntervalRef.current) {
      clearInterval(renderIntervalRef.current);
      renderIntervalRef.current = null;
    }
    try {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    } catch {
      // ignore
    }
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    } catch {
      // ignore
    }
    setIsCapturingVideo(false);
  };

  /**
   * Starts instant, zero-delay In-App Video Recording.
   * Immediately switches UI to recording state with top red REC timer bar.
   */
  const startInAppVideoCapture = () => {
    setRecorderStatusMsg(null);

    try {
      const vw = Math.max(320, window.innerWidth);
      const vh = Math.max(480, window.innerHeight);
      const scaleFactor = Math.min(1, 880 / Math.max(vw, vh));
      const cw = Math.round(vw * scaleFactor) & ~1;
      const ch = Math.round(vh * scaleFactor) & ~1;

      const recCanvas = document.createElement("canvas");
      recCanvas.width = cw;
      recCanvas.height = ch;
      const ctx = recCanvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas 2D non disponibile");
      }

      const preferredTypes = [
        "video/mp4",
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
      ];
      let chosenMime = "";
      for (const t of preferredTypes) {
        if (
          typeof MediaRecorder !== "undefined" &&
          typeof MediaRecorder.isTypeSupported === "function" &&
          MediaRecorder.isTypeSupported(t)
        ) {
          chosenMime = t;
          break;
        }
      }

      const canvasStream = recCanvas.captureStream(15);
      streamRef.current = canvasStream;
      recordedChunksRef.current = [];

      const recorder = chosenMime
        ? new MediaRecorder(canvasStream, {
            mimeType: chosenMime,
            videoBitsPerSecond: 2200000,
          })
        : new MediaRecorder(canvasStream);

      const effectiveMime = recorder.mimeType || chosenMime || "video/webm";
      setRecordedMimeType(effectiveMime);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recordedChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: effectiveMime,
        });
        if (blob.size > 0) {
          if (recordedVideoUrl) {
            URL.revokeObjectURL(recordedVideoUrl);
          }
          const url = URL.createObjectURL(blob);
          setRecordedVideoBlob(blob);
          setRecordedVideoUrl(url);
          setRecorderStatusMsg(
            "✅ Video registrato con successo! Puoi rivederlo nel lettore qui sotto o salvarlo sul dispositivo."
          );

          // Auto-download
          try {
            const ext = effectiveMime.includes("mp4") ? "mp4" : "webm";
            const a = document.createElement("a");
            a.href = url;
            a.download = `viacamper-${selectedScenarioId}-${Date.now()}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          } catch {
            // ignore
          }
        }
        setIsCapturingVideo(false);
        setIsDirectorMinimized(false);
      };

      // IMMEDIATELY navigate to the selected scenario screen (defaults to Main Map tab), hide modal, and show the red REC bar!
      onNavigateToSection(
        currentScenario.targetTab,
        currentScenario.targetSubTab
      );
      isCapturingRef.current = true;
      setIsCapturingVideo(true);
      setIsDirectorMinimized(true);

      // Start recording stream immediately
      recorder.start(250);

      // Render frames at 15 FPS
      renderIntervalRef.current = setInterval(() => {
        if (!isCapturingRef.current) return;

        // 1. Render live app viewport synchronously (<8ms)
        renderLiveViewportToCanvas(ctx, cw, ch, scaleFactor);

        // 2. Draw Touch Highlighter Ripples
        if (showTouchRef.current && touchPointsRef.current.length > 0) {
          const now = Date.now();
          for (const pt of touchPointsRef.current) {
            const age = Math.min(1, Math.max(0, (now - pt.createdAt) / 650));
            const tx = pt.x * scaleFactor;
            const ty = pt.y * scaleFactor;
            const radius = (16 + age * 22) * scaleFactor;

            ctx.save();
            ctx.beginPath();
            ctx.arc(tx, ty, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(251, 191, 36, ${0.55 * (1 - age)})`;
            ctx.fill();
            ctx.lineWidth = Math.max(2, 3 * scaleFactor);
            ctx.strokeStyle = `rgba(5, 150, 105, ${0.9 * (1 - age)})`;
            ctx.stroke();
            ctx.restore();
          }
        }

        // 3. Draw TV Broadcast Caption Banner
        if (showBannerRef.current && activeCaptionRef.current) {
          ctx.save();
          const padX = 14 * scaleFactor;
          const bannerW = Math.min(cw * 0.92, 500 * scaleFactor);
          const bannerH = 54 * scaleFactor;
          const bannerX = (cw - bannerW) / 2;
          const pos = bannerPosRef.current;
          const bannerY =
            pos === "top"
              ? 52 * scaleFactor
              : pos === "middle_top"
              ? 98 * scaleFactor
              : ch - bannerH - 72 * scaleFactor;

          ctx.fillStyle = "rgba(35, 43, 30, 0.94)";
          ctx.strokeStyle = "rgba(251, 191, 36, 0.95)";
          ctx.lineWidth = Math.max(1.5, 2 * scaleFactor);
          ctx.beginPath();
          if (typeof ctx.roundRect === "function") {
            ctx.roundRect(
              bannerX,
              bannerY,
              bannerW,
              bannerH,
              12 * scaleFactor
            );
          } else {
            ctx.rect(bannerX, bannerY, bannerW, bannerH);
          }
          ctx.fill();
          ctx.stroke();

          const badgeText = (activeBadgeRef.current || "VIACAMPER").toUpperCase();
          ctx.font = `900 ${Math.round(9.5 * scaleFactor)}px sans-serif`;
          const badgeW = ctx.measureText(badgeText).width + 12 * scaleFactor;
          const badgeH = 18 * scaleFactor;
          const badgeX = bannerX + padX;
          const badgeY = bannerY + (bannerH - badgeH) / 2;

          ctx.fillStyle = "#FBBF24";
          ctx.beginPath();
          if (typeof ctx.roundRect === "function") {
            ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 5 * scaleFactor);
          } else {
            ctx.rect(badgeX, badgeY, badgeW, badgeH);
          }
          ctx.fill();

          ctx.fillStyle = "#232B1E";
          ctx.textBaseline = "middle";
          ctx.fillText(
            badgeText,
            badgeX + 6 * scaleFactor,
            badgeY + badgeH / 2
          );

          const textX = badgeX + badgeW + 10 * scaleFactor;
          const maxTextW = bannerX + bannerW - textX - padX;
          ctx.fillStyle = "#FFFFFF";
          ctx.font = `800 ${Math.round(11.5 * scaleFactor)}px sans-serif`;

          const words = activeCaptionRef.current.split(" ");
          let line1 = "";
          let line2 = "";
          for (const w of words) {
            const test = line1 ? `${line1} ${w}` : w;
            if (ctx.measureText(test).width <= maxTextW || !line1) {
              if (!line2) {
                line1 = test;
              } else {
                line2 = `${line2} ${w}`;
              }
            } else {
              line2 = line2 ? `${line2} ${w}` : w;
            }
          }

          if (!line2) {
            ctx.fillText(line1, textX, bannerY + bannerH / 2, maxTextW);
          } else {
            ctx.fillText(
              line1,
              textX,
              bannerY + bannerH / 2 - 7 * scaleFactor,
              maxTextW
            );
            ctx.fillText(
              line2,
              textX,
              bannerY + bannerH / 2 + 8 * scaleFactor,
              maxTextW
            );
          }
          ctx.restore();
        }
      }, 66);
    } catch (err: any) {
      setIsCapturingVideo(false);
      setIsDirectorMinimized(false);
      setRecorderStatusMsg(
        `⚠️ Il tuo dispositivo non supporta MediaRecorder su Canvas (${
          err?.message || "errore"
        }). Premi 'Solo Schermo Pulito' e usa la Registrazione Schermo del telefono.`
      );
    }
  };

  const handleShareOrSaveVideo = async () => {
    if (!recordedVideoBlob || !recordedVideoUrl) return;
    const ext = recordedMimeType.includes("mp4") ? "mp4" : "webm";
    const fileName = `viacamper-${selectedScenarioId}-${Date.now()}.${ext}`;

    try {
      const file = new File([recordedVideoBlob], fileName, {
        type: recordedMimeType,
      });
      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: "Video Tutorial ViaCamper",
          files: [file],
        });
        return;
      }
    } catch {
      // fallback to standard download
    }

    const a = document.createElement("a");
    a.href = recordedVideoUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isActive) return null;

  const handleSelectScenario = (scenario: VideoScenario) => {
    setSelectedScenarioId(scenario.id);
    setCaptionIndex(0);
    setUseCustomText(false);
    onNavigateToSection(scenario.targetTab, scenario.targetSubTab);
  };

  const nextCaption = () => {
    setCaptionIndex((prev) =>
      prev + 1 < currentScenario.captions.length ? prev + 1 : 0
    );
  };

  const prevCaption = () => {
    setCaptionIndex((prev) =>
      prev - 1 >= 0 ? prev - 1 : currentScenario.captions.length - 1
    );
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div data-recording-ignore="true">
      {/* 1. Touch / Click Highlighter Ripples (100% click-through) */}
      {showTouchHighlighter &&
        touchPoints.map((pt) => (
          <div
            key={pt.id}
            style={{
              left: pt.x - 24,
              top: pt.y - 24,
            }}
            className="fixed w-12 h-12 rounded-full bg-amber-400/45 border-3 border-white ring-4 ring-emerald-600/80 pointer-events-none z-[200000] animate-ping"
          />
        ))}

      {/* 2. TV Broadcast Caption Banner — 100% CLICK-THROUGH (pointer-events-none) so it NEVER blocks any button! */}
      {showCaptionBanner && activeCaptionText && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 z-[150000] w-[92%] max-w-lg pointer-events-none select-none transition-all duration-300 ${
            bannerPosition === "top"
              ? "top-13 sm:top-15"
              : bannerPosition === "middle_top"
              ? "top-24 sm:top-28"
              : "bottom-20 md:bottom-8"
          }`}
        >
          <div className="bg-[#232B1E]/88 backdrop-blur-xs text-white px-3.5 py-2 rounded-2xl shadow-xl border border-amber-400/80 flex items-center gap-2.5">
            <span className="inline-block px-2 py-0.5 rounded-md bg-amber-400 text-[#232B1E] text-[9px] sm:text-[10px] font-black uppercase tracking-wider shrink-0">
              {activeBadgeText}
            </span>
            <p className="text-[11px] sm:text-xs md:text-sm font-black text-white leading-snug flex-1">
              {activeCaptionText}
            </p>
          </div>
        </div>
      )}

      {/* 3. Compact Top Recording Control Bar — Always fits 100% inside mobile screen width */}
      {isDirectorMinimized ? (
        <div
          data-recording-ignore="true"
          className="fixed top-1.5 inset-x-2 max-w-[350px] mx-auto z-[160000] flex items-center justify-between gap-1 bg-slate-950/95 backdrop-blur-md px-2.5 py-1 rounded-full border-2 border-rose-500 shadow-2xl"
        >
          {isCapturingVideo ? (
            <div className="flex items-center gap-1 shrink-0">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span className="text-[10px] font-black text-white whitespace-nowrap">
                REC {formatDuration(recordingSeconds)}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={startInAppVideoCapture}
              className="px-2 py-0.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>REC</span>
            </button>
          )}

          {showCaptionBanner && !useCustomText && (
            <div className="flex items-center gap-0.5 border-x border-white/20 px-1.5 shrink-0">
              <button
                type="button"
                onClick={prevCaption}
                title="Frase precedente"
                className="w-5 h-5 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <span className="text-[9.5px] font-black text-amber-300 px-1 whitespace-nowrap">
                {captionIndex + 1}/{currentScenario.captions.length}
              </span>
              <button
                type="button"
                onClick={nextCaption}
                title="Frase successiva"
                className="w-5 h-5 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 shrink-0">
            {isCapturingVideo && (
              <button
                type="button"
                onClick={stopScreenCapture}
                className="px-2 py-0.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black flex items-center gap-1 cursor-pointer shadow-md whitespace-nowrap"
              >
                <Square className="w-2.5 h-2.5 fill-current" />
                <span>SALVA</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDirectorMinimized(false)}
              className="px-2 py-0.5 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white text-[9.5px] font-black cursor-pointer whitespace-nowrap"
            >
              REGIA
            </button>
          </div>
        </div>
      ) : (
        /* 4. Full Video Director Setup & Recorded Video Preview Panel */
        <div
          data-recording-ignore="true"
          className="fixed inset-0 z-[160000] bg-black/65 backdrop-blur-xs flex items-center justify-center p-3"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] overflow-hidden shadow-2xl border-2 border-[#3E4A35] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#2D3726] to-[#3E4A35] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center shadow-md">
                  <Video className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base leading-tight">
                    Studio Registrazione Video • ViaCamper
                  </h3>
                  <p className="text-[11px] text-emerald-100/90">
                    Registra il video direttamente nell&apos;app e scaricalo
                    subito
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isCapturingVideo) stopScreenCapture();
                  onClose();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Esci</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-3.5 text-xs flex-1">
              {/* Instant Video Player & Download Box when a video has been recorded */}
              {recordedVideoUrl && (
                <div className="bg-emerald-950 text-white rounded-2xl p-3.5 space-y-2.5 border-2 border-emerald-400 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        🎬 Ecco il tuo Video Registrato! Guardalo o salvalo:
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setRecordedVideoUrl(null)}
                      className="text-[10.5px] text-emerald-200 underline cursor-pointer"
                    >
                      Chiudi video
                    </button>
                  </div>
                  <video
                    src={recordedVideoUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full max-h-60 rounded-xl bg-black border border-white/20"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleShareOrSaveVideo}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>💾 Salva / Scarica Video</span>
                    </button>
                    <a
                      href={recordedVideoUrl}
                      download={`viacamper-${selectedScenarioId}-${Date.now()}.${
                        recordedMimeType.includes("mp4") ? "mp4" : "webm"
                      }`}
                      className="py-2.5 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Download Diretto</span>
                    </a>
                  </div>
                </div>
              )}

              {recorderStatusMsg && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-xl p-2.5 text-[11px] font-bold">
                  {recorderStatusMsg}
                </div>
              )}

              {/* Step 1: Choose which video to record */}
              <div className="space-y-1.5">
                <label className="block font-black text-slate-800 text-xs uppercase tracking-wider">
                  1. Scegli il Video (ti porta subito nella schermata giusta):
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {VIDEO_SCENARIOS.map((sc) => {
                    const isSelected =
                      !useCustomText && selectedScenarioId === sc.id;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => handleSelectScenario(sc)}
                        className={`w-full text-left px-3 py-2 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? "bg-[#3E4A35] text-white border-[#3E4A35] shadow-md"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-black text-xs truncate">
                            {sc.title}
                          </div>
                          <div
                            className={`text-[10.5px] truncate ${
                              isSelected ? "text-emerald-100" : "text-slate-500"
                            }`}
                          >
                            {sc.captions[0]}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0 ${
                            isSelected
                              ? "bg-amber-400 text-[#232B1E]"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {sc.captions.length} frasi
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Caption selection or Custom text */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-800 text-xs">
                    2. Banner Sottotitolo (non blocca mai i pulsanti sotto!)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCaptionBanner(!showCaptionBanner)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-black cursor-pointer ${
                      showCaptionBanner
                        ? "bg-emerald-700 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {showCaptionBanner ? "Banner ATTIVO" : "Banner NASCOSTO"}
                  </button>
                </div>

                {showCaptionBanner && (
                  <>
                    {/* Position selector */}
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600">
                        Posizione del Banner:
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setBannerPosition("top")}
                          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black cursor-pointer ${
                            bannerPosition === "top"
                              ? "bg-slate-800 text-white"
                              : "bg-white border border-slate-300 text-slate-700"
                          }`}
                        >
                          In Alto
                        </button>
                        <button
                          type="button"
                          onClick={() => setBannerPosition("middle_top")}
                          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black cursor-pointer ${
                            bannerPosition === "middle_top"
                              ? "bg-slate-800 text-white"
                              : "bg-white border border-slate-300 text-slate-700"
                          }`}
                        >
                          Centro-Alto
                        </button>
                        <button
                          type="button"
                          onClick={() => setBannerPosition("bottom")}
                          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black cursor-pointer ${
                            bannerPosition === "bottom"
                              ? "bg-slate-800 text-white"
                              : "bg-white border border-slate-300 text-slate-700"
                          }`}
                        >
                          In Basso
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setUseCustomText(false)}
                        className={`flex-1 py-1.5 rounded-xl font-black text-[11px] cursor-pointer ${
                          !useCustomText
                            ? "bg-[#3E4A35] text-white"
                            : "bg-white border border-slate-200 text-slate-700"
                        }`}
                      >
                        Frasi Guidate ({captionIndex + 1}/
                        {currentScenario.captions.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUseCustomText(true);
                          if (!customCaption) {
                            setCustomCaption(activeCaptionText);
                          }
                        }}
                        className={`flex-1 py-1.5 rounded-xl font-black text-[11px] cursor-pointer ${
                          useCustomText
                            ? "bg-[#3E4A35] text-white"
                            : "bg-white border border-slate-200 text-slate-700"
                        }`}
                      >
                        ✏️ Scrivi Testo Tuo
                      </button>
                    </div>

                    {!useCustomText ? (
                      <div className="space-y-1">
                        {currentScenario.captions.map((cap, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setCaptionIndex(idx)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-2 ${
                              captionIndex === idx
                                ? "bg-amber-100 border-2 border-amber-500 text-slate-900"
                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <span className="w-4.5 h-4.5 rounded-full bg-[#3E4A35] text-white text-[9.5px] font-black flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="flex-1">{cap}</span>
                          </button>
                        ))}
                        <p className="text-[10px] text-slate-500">
                          💡 Durante il video usa le freccette{" "}
                          <strong>◀ ▶</strong> nella barra in alto per cambiare
                          frase.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-600 mb-0.5">
                            Etichetta Gialla (es. MAPPA & SOSTE):
                          </label>
                          <input
                            type="text"
                            value={customBadge}
                            onChange={(e) => setCustomBadge(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-bold text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-600 mb-0.5">
                            Frase Sottotitolo da mostrare nel video:
                          </label>
                          <input
                            type="text"
                            value={customCaption}
                            onChange={(e) => setCustomCaption(e.target.value)}
                            placeholder="Scrivi qui la frase da mostrare nel video..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Step 3: Extra Visual Helpers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowTouchHighlighter(!showTouchHighlighter)}
                  className={`p-2 rounded-2xl border text-left flex items-center justify-between cursor-pointer ${
                    showTouchHighlighter
                      ? "bg-amber-50 border-amber-300 text-amber-950"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MousePointerClick className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <div className="font-black text-[11px]">
                        Evidenzia Tocco
                      </div>
                      <div className="text-[10px] opacity-80">
                        Cerchio luminoso sui clic
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white border">
                    {showTouchHighlighter ? "ON" : "OFF"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleHideTopBanners(!hideTopBanners)}
                  className={`p-2 rounded-2xl border text-left flex items-center justify-between cursor-pointer ${
                    hideTopBanners
                      ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                      : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-emerald-700 shrink-0" />
                    <div>
                      <div className="font-black text-[11px]">
                        Nascondi Avvisi Top
                      </div>
                      <div className="text-[10px] opacity-80">
                        Barra arancione checklist
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-white border">
                    {hideTopBanners ? "ON" : "OFF"}
                  </span>
                </button>
              </div>
            </div>

            {/* Footer CTA: Start In-App Recording OR Hide Director Panel */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isCapturingVideo) stopScreenCapture();
                  onClose();
                }}
                className="px-3 py-2.5 rounded-2xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-black text-xs cursor-pointer"
              >
                Disattiva
              </button>

              <div className="flex items-center gap-1.5 flex-1 justify-end">
                <button
                  type="button"
                  onClick={startInAppVideoCapture}
                  className="flex-1 py-2.5 px-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Video className="w-4 h-4 animate-pulse" />
                  <span>🔴 Registra e Salva File Video</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onNavigateToSection(
                      currentScenario.targetTab,
                      currentScenario.targetSubTab
                    );
                    setIsDirectorMinimized(true);
                  }}
                  className="py-2.5 px-3 rounded-2xl bg-[#3E4A35] hover:bg-[#2D3726] text-white font-black text-xs shadow-md flex items-center justify-center gap-1 cursor-pointer"
                  title="Nasconde solo la regia (se usi il registratore dello smartphone)"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Solo Schermo Pulito</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

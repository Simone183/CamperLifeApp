import { jsPDF } from "jspdf";
import { Trip, AppSettings, AIItineraryResult, VehicleDimensions } from "../types";

// Helper to convert date from YYYY-MM-DD to DD/MM/YYYY
const formatDate = (dateStr: string): string => {
  if (!dateStr) return "";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// Helper to load an image URL as base64 and return its dimensions for aspect-ratio preservation
const loadImage = (url: string): Promise<{ dataUrl: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!url.startsWith("data:image")) {
      img.crossOrigin = "Anonymous";
    }
    img.src = url;
    img.onload = () => {
      try {
        if (url.startsWith("data:image")) {
          // If it's already a base64 data URL, return it directly with dimensions to avoid re-compression degradation
          resolve({
            dataUrl: url,
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
          });
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve({
            dataUrl: canvas.toDataURL("image/jpeg", 0.75),
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
          });
        } else {
          reject(new Error("Failed to get canvas context"));
        }
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = (e) => reject(e);
  });
};

export const generateTripPDF = async (
  trip: Trip,
  paperSize: "a4" | "a5",
  settings: AppSettings,
  options: {
    includeMovements: boolean;
    includeExpenses: boolean;
    includePhotos: boolean;
    ringBinderMargin?: boolean;
    showHoleGuides?: boolean;
  }
): Promise<void> => {
  // Dimensions in mm
  const isA4 = paperSize === "a4";
  const pageWidth = isA4 ? 210 : 148;
  const pageHeight = isA4 ? 297 : 210;

  const useBinderMargin = options.ringBinderMargin !== false;
  const showGuides = options.showHoleGuides !== false && useBinderMargin;

  // Margin allocation: 25mm left gutter on A4 (20mm on A5) gives ample room for 2-hole and 4-hole punches without clipping content
  const marginLeft = useBinderMargin ? (isA4 ? 25 : 20) : (isA4 ? 15 : 10);
  const marginRight = useBinderMargin ? (isA4 ? 12 : 9) : (isA4 ? 15 : 10);
  const marginTop = isA4 ? 14 : 11;
  const marginBottom = isA4 ? 14 : 11;

  const usableWidth = pageWidth - marginLeft - marginRight;

  // Colors (RGB)
  const cPrimary = [62, 74, 53];     // Deep Olive (#3E4A35)
  const cSecondary = [90, 107, 78];  // Light Olive
  const cAccent = [217, 119, 6];     // Orange/Terracotta (#D97706)
  const cTextDark = [51, 65, 85];    // Slate 700 (#334155)
  const cTextLight = [100, 116, 139] // Slate 500 (#64748B)
  const cBackground = [245, 242, 237] // Warm Amber/Sand (#F5F2ED)
  const cWhite = [255, 255, 255];
  const cBorder = [226, 232, 240];  // Slate 200

  const doc = new jsPDF({
    format: paperSize,
    unit: "mm",
    orientation: "portrait",
  });

  let pageNum = 1;
  let y = marginTop;

  // Add metadata
  doc.setProperties({
    title: `Diario di Viaggio - ${trip.title}`,
    subject: "ViaCamper Trip Diary",
    author: "ViaCamper",
    keywords: "camper, viaggio, diario, viacamper",
    creator: "ViaCamper"
  });

  // Footer/Header Draw Function with Binder Hole Guides
  const drawPageDecorations = () => {
    // Top running header
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(cTextLight[0], cTextLight[1], cTextLight[2]);
    doc.text("ViaCamper - Diario di Bordo", marginLeft, marginTop - 4);
    
    // Header divider line
    doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
    doc.setLineWidth(0.2);
    doc.line(marginLeft, marginTop - 2, pageWidth - marginRight, marginTop - 2);

    // Footer divider line
    doc.line(marginLeft, pageHeight - marginBottom + 4, pageWidth - marginRight, pageHeight - marginBottom + 4);

    // Footer page number
    doc.text(`Pagina ${pageNum}`, pageWidth - marginRight, pageHeight - marginBottom + 8, { align: "right" });
    doc.text(`Generato il ${new Date().toLocaleDateString("it-IT")}`, marginLeft, pageHeight - marginBottom + 8);

    // Optional discreet hole punch guide marks on left margin
    if (showGuides) {
      doc.setDrawColor(203, 213, 225); // Slate 300 - soft, elegant guide color
      doc.setLineWidth(0.15);

      // Center alignment notch on the very left sheet edge
      const midY = pageHeight / 2;
      doc.line(0, midY, 3, midY);

      const punchX = isA4 ? 12 : 9.5; // Standard 12mm hole center distance from left edge

      if (isA4) {
        // Standard ISO 838 4-hole positions (80mm spacing, centered)
        const holePositionsA4 = [28.5, 108.5, 188.5, 268.5];
        holePositionsA4.forEach((hY) => {
          // Draw subtle crosshair and faint circle for punching guidance
          doc.circle(punchX, hY, 2.2);
          doc.line(punchX - 1.2, hY, punchX + 1.2, hY);
          doc.line(punchX, hY - 1.2, punchX, hY + 1.2);
        });
      } else {
        // A5 2-hole positions (80mm spacing centered: 65mm and 145mm)
        const holePositionsA5 = [65, 145];
        holePositionsA5.forEach((hY) => {
          doc.circle(punchX, hY, 2.0);
          doc.line(punchX - 1.0, hY, punchX + 1.0, hY);
          doc.line(punchX, hY - 1.0, punchX, hY + 1.0);
        });
      }
    }
  };

  const checkPageBreak = (heightNeeded: number) => {
    if (y + heightNeeded > pageHeight - marginBottom - 10) {
      doc.addPage(paperSize, "portrait");
      pageNum++;
      y = marginTop + 5; // offset slightly for top header spacing
      drawPageDecorations();
    }
  };

  // Start on page 1 with page decorations
  drawPageDecorations();

  // --- COVER / HEADER AREA ---
  // Circle Icon emblem
  doc.setFillColor(cPrimary[0], cPrimary[1], cPrimary[2]);
  doc.circle(marginLeft + 6, y + 6, 6, "F");
  
  // Custom tiny tent design inside circle
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.line(marginLeft + 3.5, y + 8, marginLeft + 6, y + 4); // left slope
  doc.line(marginLeft + 6, y + 4, marginLeft + 8.5, y + 8); // right slope
  doc.line(marginLeft + 4.5, y + 8, marginLeft + 7.5, y + 8); // ground line
  doc.line(marginLeft + 6, y + 4, marginLeft + 6, y + 8);   // center post

  doc.setFont("helvetica", "bold");
  doc.setFontSize(isA4 ? 11 : 9);
  doc.setTextColor(cSecondary[0], cSecondary[1], cSecondary[2]);
  doc.text("DIARIO DI VIAGGIO", marginLeft + 15, y + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(isA4 ? 20 : 15);
  doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
  const splitTitle = doc.splitTextToSize(trip.title, usableWidth - 20);
  doc.text(splitTitle, marginLeft + 15, y + 12);
  
  y += 12 + (splitTitle.length * (isA4 ? 7 : 5.5));

  // Trip Dates Subheader
  doc.setFont("helvetica", "normal");
  doc.setFontSize(isA4 ? 10 : 8);
  doc.setTextColor(cTextLight[0], cTextLight[1], cTextLight[2]);
  
  const tripStartDate = formatDate(trip.startDate);
  const tripEndDate = formatDate(trip.endDate);
  doc.text(`Periodo: dal ${tripStartDate} al ${tripEndDate}`, marginLeft + 15, y);
  
  y += isA4 ? 8 : 6;

  // Stat Indicators Grid (Distanza, Spese, Tappe)
  checkPageBreak(isA4 ? 28 : 22);
  
  const colWidth = usableWidth / 3;
  
  // Total Distance calculation
  const totalDistance = (() => {
    const movements = trip.movements || [];
    const validMovements = movements.filter(
      (m) => typeof m.odometer === "number" && !isNaN(m.odometer)
    ).map((m) => m.odometer);
    
    const refuelOdometers = (trip.expenses || [])
      .filter((e) => e.category === "Carburante" && typeof e.odometer === "number" && !isNaN(e.odometer))
      .map((e) => e.odometer as number);

    const allOdometers = [...validMovements, ...refuelOdometers];
    if (typeof trip.startOdometer === "number" && !isNaN(trip.startOdometer)) {
      allOdometers.push(trip.startOdometer);
    }
    if (typeof trip.endOdometer === "number" && !isNaN(trip.endOdometer)) {
      allOdometers.push(trip.endOdometer);
    }

    if (allOdometers.length < 2) return 0;
    const minOdo = Math.min(...allOdometers);
    const maxOdo = Math.max(...allOdometers);
    return maxOdo > minOdo ? maxOdo - minOdo : 0;
  })();

  const totalSpent = (trip.expenses || []).reduce((sum, e) => sum + e.amount, 0);
  const totalMovements = (trip.movements || []).length;

  const distanceUnit = settings.metric ? "km" : "mi";
  const currencySymbol = settings.currency === "USD" ? "$" : settings.currency === "GBP" ? "£" : "€";

  // Box 1: Distance
  doc.setFillColor(cBackground[0], cBackground[1], cBackground[2]);
  doc.rect(marginLeft, y, colWidth - 2, isA4 ? 18 : 15, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(cTextLight[0], cTextLight[1], cTextLight[2]);
  doc.text("DISTANZA TOTALI", marginLeft + 4, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(isA4 ? 14 : 11);
  doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
  doc.text(`${totalDistance} ${distanceUnit}`, marginLeft + 4, y + 12);

  // Box 2: Expenses
  doc.setFillColor(cBackground[0], cBackground[1], cBackground[2]);
  doc.rect(marginLeft + colWidth, y, colWidth - 2, isA4 ? 18 : 15, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(cTextLight[0], cTextLight[1], cTextLight[2]);
  doc.text("BUDGET SPESO", marginLeft + colWidth + 4, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(isA4 ? 14 : 11);
  doc.setTextColor(cAccent[0], cAccent[1], cAccent[2]);
  doc.text(`${totalSpent.toFixed(2)} ${currencySymbol}`, marginLeft + colWidth + 4, y + 12);

  // Box 3: Movements
  doc.setFillColor(cBackground[0], cBackground[1], cBackground[2]);
  doc.rect(marginLeft + colWidth * 2, y, colWidth, isA4 ? 18 : 15, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(cTextLight[0], cTextLight[1], cTextLight[2]);
  doc.text("TAPPE & SPOSTAMENTI", marginLeft + colWidth * 2 + 4, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(isA4 ? 14 : 11);
  doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
  doc.text(`${totalMovements} tappe`, marginLeft + colWidth * 2 + 4, y + 12);

  y += (isA4 ? 18 : 15) + 10;

  // --- RACCONTO / DESCRIPTION SECTION ---
  if (trip.description) {
    checkPageBreak(isA4 ? 20 : 16);
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isA4 ? 12 : 10);
    doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
    doc.text("IL RACCONTO DI VIAGGIO", marginLeft, y);
    
    // Line decoration under header
    doc.setDrawColor(cAccent[0], cAccent[1], cAccent[2]);
    doc.setLineWidth(1);
    doc.line(marginLeft, y + 2, marginLeft + 25, y + 2);
    
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(isA4 ? 9.5 : 8);
    doc.setTextColor(cTextDark[0], cTextDark[1], cTextDark[2]);
    
    // Split the text to lines to respect margins
    const descLines: string[] = doc.splitTextToSize(trip.description, usableWidth);
    const lineHeight = isA4 ? 4.8 : 3.8;

    for (let i = 0; i < descLines.length; i++) {
      checkPageBreak(lineHeight);
      doc.text(descLines[i], marginLeft, y);
      y += lineHeight;
    }
    y += 8;
  }

  // --- SPOSTAMENTI / MOVEMENTS SECTION ---
  if (options.includeMovements && trip.movements && trip.movements.length > 0) {
    checkPageBreak(isA4 ? 25 : 20);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isA4 ? 12 : 10);
    doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
    doc.text("TAPPE & SPOSTAMENTI CRONOLOGICI", marginLeft, y);
    
    doc.setDrawColor(cAccent[0], cAccent[1], cAccent[2]);
    doc.setLineWidth(1);
    doc.line(marginLeft, y + 2, marginLeft + 25, y + 2);
    
    y += 7;

    // Define columns
    const colDateW = isA4 ? 22 : 18;
    const colOdoW = isA4 ? 23 : 18;
    const colLocW = isA4 ? 45 : 32;
    const colNotesW = usableWidth - colDateW - colOdoW - colLocW;

    // Table Header
    doc.setFillColor(cPrimary[0], cPrimary[1], cPrimary[2]);
    doc.rect(marginLeft, y, usableWidth, isA4 ? 8 : 7, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isA4 ? 8.5 : 7);
    doc.setTextColor(255, 255, 255);
    
    doc.text("DATA", marginLeft + 2, y + (isA4 ? 5 : 4.5));
    doc.text("KM/ODO", marginLeft + colDateW + 2, y + (isA4 ? 5 : 4.5));
    doc.text("LOCALITÀ / TAPPA", marginLeft + colDateW + colOdoW + 2, y + (isA4 ? 5 : 4.5));
    doc.text("NOTE / DETTAGLI", marginLeft + colDateW + colOdoW + colLocW + 2, y + (isA4 ? 5 : 4.5));
    
    y += isA4 ? 8 : 7;

    // Sort movements chronologically
    const sortedMovements = [...trip.movements].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Draw rows
    let altRow = false;
    for (const m of sortedMovements) {
      const dateText = m.date ? formatDate(m.date) : "-";
      const odoText = m.odometer ? `${m.odometer} ${distanceUnit}` : "-";
      const locText = m.location || "-";
      const notesText = m.notes || "-";

      // Wrap text
      const wrappedLoc = doc.splitTextToSize(locText, colLocW - 4);
      const wrappedNotes = doc.splitTextToSize(notesText, colNotesW - 4);

      // Determine required row height
      const linesNum = Math.max(wrappedLoc.length, wrappedNotes.length, 1);
      const rowHeight = (linesNum * (isA4 ? 4.5 : 3.5)) + (isA4 ? 4 : 3);

      checkPageBreak(rowHeight);

      // Row background
      if (altRow) {
        doc.setFillColor(248, 250, 252); // Slate 50
        doc.rect(marginLeft, y, usableWidth, rowHeight, "F");
      }
      altRow = !altRow;

      // Draw bottom line
      doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
      doc.setLineWidth(0.15);
      doc.line(marginLeft, y + rowHeight, marginLeft + usableWidth, y + rowHeight);

      // Render cell text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(isA4 ? 8 : 7);
      doc.setTextColor(cTextDark[0], cTextDark[1], cTextDark[2]);

      doc.text(dateText, marginLeft + 2, y + (isA4 ? 5.5 : 4.5));
      doc.text(odoText, marginLeft + colDateW + 2, y + (isA4 ? 5.5 : 4.5));

      // Multiline cell support
      let currentY = y + (isA4 ? 5.5 : 4.5);
      for (let i = 0; i < wrappedLoc.length; i++) {
        doc.text(wrappedLoc[i], marginLeft + colDateW + colOdoW + 2, currentY);
        currentY += isA4 ? 4.5 : 3.5;
      }

      currentY = y + (isA4 ? 5.5 : 4.5);
      for (let i = 0; i < wrappedNotes.length; i++) {
        doc.text(wrappedNotes[i], marginLeft + colDateW + colOdoW + colLocW + 2, currentY);
        currentY += isA4 ? 4.5 : 3.5;
      }

      y += rowHeight;
    }
    y += 8;
  }

  // --- SPESE SECTION ---
  if (options.includeExpenses && trip.expenses && trip.expenses.length > 0) {
    checkPageBreak(isA4 ? 25 : 20);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isA4 ? 12 : 10);
    doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
    doc.text("RENDICONTO DELLE SPESE", marginLeft, y);
    
    doc.setDrawColor(cAccent[0], cAccent[1], cAccent[2]);
    doc.setLineWidth(1);
    doc.line(marginLeft, y + 2, marginLeft + 25, y + 2);
    
    y += 7;

    // Col width allocation
    const colDateW = isA4 ? 25 : 20;
    const colCatW = isA4 ? 35 : 25;
    const colAmountW = isA4 ? 30 : 25;
    const colDescW = usableWidth - colDateW - colCatW - colAmountW;

    // Table Header
    doc.setFillColor(cPrimary[0], cPrimary[1], cPrimary[2]);
    doc.rect(marginLeft, y, usableWidth, isA4 ? 8 : 7, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isA4 ? 8.5 : 7);
    doc.setTextColor(255, 255, 255);
    
    doc.text("DATA", marginLeft + 2, y + (isA4 ? 5 : 4.5));
    doc.text("CATEGORIA", marginLeft + colDateW + 2, y + (isA4 ? 5 : 4.5));
    doc.text("DESCRIZIONE", marginLeft + colDateW + colCatW + 2, y + (isA4 ? 5 : 4.5));
    doc.text("IMPORTO", marginLeft + colDateW + colCatW + colDescW + 2, y + (isA4 ? 5 : 4.5));
    
    y += isA4 ? 8 : 7;

    // Sort expenses
    const sortedExpenses = [...trip.expenses].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    let altRow = false;
    for (const exp of sortedExpenses) {
      const dateText = exp.date ? formatDate(exp.date) : "-";
      const catText = exp.category || "Altro";
      const descText = exp.title || "-";
      const amountText = `${exp.amount.toFixed(2)} ${currencySymbol}`;

      // Wrap desc
      const wrappedDesc = doc.splitTextToSize(descText, colDescW - 4);
      const rowHeight = (wrappedDesc.length * (isA4 ? 4.5 : 3.5)) + (isA4 ? 4 : 3);

      checkPageBreak(rowHeight);

      if (altRow) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginLeft, y, usableWidth, rowHeight, "F");
      }
      altRow = !altRow;

      doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
      doc.setLineWidth(0.15);
      doc.line(marginLeft, y + rowHeight, marginLeft + usableWidth, y + rowHeight);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(isA4 ? 8 : 7);
      doc.setTextColor(cTextDark[0], cTextDark[1], cTextDark[2]);

      doc.text(dateText, marginLeft + 2, y + (isA4 ? 5.5 : 4.5));
      doc.text(catText, marginLeft + colDateW + 2, y + (isA4 ? 5.5 : 4.5));
      
      // Amount text: bold and right aligned or colored if fuel
      if (exp.category === "Carburante") {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(cTextDark[0], cTextDark[1], cTextDark[2]);
      }
      doc.text(amountText, marginLeft + colDateW + colCatW + colDescW + 2, y + (isA4 ? 5.5 : 4.5));
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(cTextDark[0], cTextDark[1], cTextDark[2]);

      let currentY = y + (isA4 ? 5.5 : 4.5);
      for (let i = 0; i < wrappedDesc.length; i++) {
        doc.text(wrappedDesc[i], marginLeft + colDateW + colCatW + 2, currentY);
        currentY += isA4 ? 4.5 : 3.5;
      }

      y += rowHeight;
    }

    // Spend sum row
    checkPageBreak(isA4 ? 10 : 8);
    doc.setFillColor(cBackground[0], cBackground[1], cBackground[2]);
    doc.rect(marginLeft, y, usableWidth, isA4 ? 8 : 7, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isA4 ? 9 : 7.5);
    doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
    doc.text("TOTALE SPESO:", marginLeft + 2, y + (isA4 ? 5.5 : 4.5));
    
    doc.setTextColor(cAccent[0], cAccent[1], cAccent[2]);
    doc.text(`${totalSpent.toFixed(2)} ${currencySymbol}`, marginLeft + colDateW + colCatW + colDescW + 2, y + (isA4 ? 5.5 : 4.5));
    
    y += (isA4 ? 8 : 7) + 8;
  }

  // --- FOTO & RICORDI SECTION ---
  if (options.includePhotos && trip.photos && trip.photos.length > 0) {
    checkPageBreak(isA4 ? 25 : 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(isA4 ? 12 : 10);
    doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
    doc.text("GALLERIA FOTOGRAFICA & RICORDI", marginLeft, y);
    
    doc.setDrawColor(cAccent[0], cAccent[1], cAccent[2]);
    doc.setLineWidth(1);
    doc.line(marginLeft, y + 2, marginLeft + 25, y + 2);
    
    y += 7;

    // Load and render photos in 2 columns
    const gap = isA4 ? 8 : 6;
    const colWidth = (usableWidth - gap) / 2;
    const maxW = colWidth;
    const maxH = isA4 ? 50 : 35;

    for (let index = 0; index < trip.photos.length; index += 2) {
      const photo1 = trip.photos[index];
      const photo2 = trip.photos[index + 1]; // might be undefined

      // Load image data for photo1
      let imageData1: { dataUrl: string; width: number; height: number } | null = null;
      try {
        imageData1 = await loadImage(photo1.url);
      } catch (err) {
        console.warn("Failed to load photo for PDF:", photo1.url, err);
      }

      // Load image data for photo2
      let imageData2: { dataUrl: string; width: number; height: number } | null = null;
      if (photo2) {
        try {
          imageData2 = await loadImage(photo2.url);
        } catch (err) {
          console.warn("Failed to load photo for PDF:", photo2.url, err);
        }
      }

      // Determine the height needed for this row
      let p1TextHeight = 0;
      p1TextHeight += isA4 ? 5 : 4; // Title
      if (photo1.date) p1TextHeight += isA4 ? 4.5 : 3.5;
      if (photo1.locationName) p1TextHeight += isA4 ? 4.5 : 3.5;
      if (photo1.description) {
        const wrapped = doc.splitTextToSize(`"${photo1.description}"`, colWidth);
        p1TextHeight += wrapped.length * (isA4 ? 4.5 : 3.5);
      }

      let p2TextHeight = 0;
      if (photo2) {
        p2TextHeight += isA4 ? 5 : 4; // Title
        if (photo2.date) p2TextHeight += isA4 ? 4.5 : 3.5;
        if (photo2.locationName) p2TextHeight += isA4 ? 4.5 : 3.5;
        if (photo2.description) {
          const wrapped = doc.splitTextToSize(`"${photo2.description}"`, colWidth);
          p2TextHeight += wrapped.length * (isA4 ? 4.5 : 3.5);
        }
      }

      // Compute image heights based on aspect ratio
      let p1ImgHeight = maxH;
      if (imageData1) {
        const ratio = imageData1.width / imageData1.height;
        const boxRatio = maxW / maxH;
        if (ratio > boxRatio) {
          p1ImgHeight = maxW / ratio;
        } else {
          p1ImgHeight = maxH;
        }
      }

      let p2ImgHeight = photo2 ? maxH : 0;
      if (photo2 && imageData2) {
        const ratio = imageData2.width / imageData2.height;
        const boxRatio = maxW / maxH;
        if (ratio > boxRatio) {
          p2ImgHeight = maxW / ratio;
        } else {
          p2ImgHeight = maxH;
        }
      }

      const item1Height = p1ImgHeight + 4 + p1TextHeight;
      const item2Height = photo2 ? (p2ImgHeight + 4 + p2TextHeight) : 0;
      const rowHeight = Math.max(item1Height, item2Height);

      // Check dynamic page break for the entire row height
      checkPageBreak(rowHeight + 10);

      // Render Photo 1
      const x1 = marginLeft;
      let img1Width = maxW;
      let img1Height = maxH;
      if (imageData1) {
        const ratio = imageData1.width / imageData1.height;
        const boxRatio = maxW / maxH;
        if (ratio > boxRatio) {
          img1Width = maxW;
          img1Height = maxW / ratio;
        } else {
          img1Height = maxH;
          img1Width = maxH * ratio;
        }
      }

      const img1X = x1 + (colWidth - img1Width) / 2;
      if (imageData1) {
        try {
          doc.addImage(imageData1.dataUrl, "JPEG", img1X, y, img1Width, img1Height);
        } catch (addImgErr) {
          console.error("Failed to add image 1 to PDF:", addImgErr);
          // Fallback to placeholder box
          doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
          doc.setFillColor(cBackground[0], cBackground[1], cBackground[2]);
          doc.rect(x1, y, colWidth, maxH, "FD");
          doc.setFont("helvetica", "italic");
          doc.setFontSize(7);
          doc.setTextColor(cTextLight[0], cTextLight[1], cTextLight[2]);
          doc.text("[Immagine non caricabile]", x1 + 5, y + (maxH / 2), { maxWidth: colWidth - 10 });
          img1Height = maxH;
        }
      } else {
        // Fallback placeholder box
        doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
        doc.setFillColor(cBackground[0], cBackground[1], cBackground[2]);
        doc.rect(x1, y, colWidth, maxH, "FD");
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(isA4 ? 10 : 8);
        doc.setTextColor(cSecondary[0], cSecondary[1], cSecondary[2]);
        doc.text("FOTO", x1 + (colWidth / 2) - 5, y + (maxH / 2) - 2);
        
        doc.setFont("helvetica", "italic");
        doc.setFontSize(6);
        doc.setTextColor(cTextLight[0], cTextLight[1], cTextLight[2]);
        doc.text("Scatto registrato", x1 + (colWidth / 2) - 8, y + (maxH / 2) + 4);
        img1Height = maxH;
      }

      // Render Text 1 details below photo 1
      let text1Y = y + img1Height + 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(isA4 ? 9.5 : 7.5);
      doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
      doc.text(`Ricordo #${index + 1}`, x1, text1Y);
      text1Y += isA4 ? 4.5 : 3.5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(isA4 ? 8 : 6.5);
      doc.setTextColor(cTextDark[0], cTextDark[1], cTextDark[2]);
      if (photo1.date) {
        doc.text(`Data: ${formatDate(photo1.date)}`, x1, text1Y);
        text1Y += isA4 ? 4 : 3;
      }
      if (photo1.locationName) {
        doc.text(`Tappa: ${photo1.locationName}`, x1, text1Y);
        text1Y += isA4 ? 4 : 3;
      }
      if (photo1.description) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(cTextLight[0], cTextLight[1], cTextLight[2]);
        const wrappedDesc = doc.splitTextToSize(`"${photo1.description}"`, colWidth);
        for (const line of wrappedDesc) {
          doc.text(line, x1, text1Y);
          text1Y += isA4 ? 4 : 3;
        }
      }

      // Render Photo 2 (if exists)
      if (photo2) {
        const x2 = marginLeft + colWidth + gap;
        let img2Width = maxW;
        let img2Height = maxH;
        if (imageData2) {
          const ratio = imageData2.width / imageData2.height;
          const boxRatio = maxW / maxH;
          if (ratio > boxRatio) {
            img2Width = maxW;
            img2Height = maxW / ratio;
          } else {
            img2Height = maxH;
            img2Width = maxH * ratio;
          }
        }

        const img2X = x2 + (colWidth - img2Width) / 2;
        if (imageData2) {
          try {
            doc.addImage(imageData2.dataUrl, "JPEG", img2X, y, img2Width, img2Height);
          } catch (addImgErr) {
            console.error("Failed to add image 2 to PDF:", addImgErr);
            // Fallback to placeholder box
            doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
            doc.setFillColor(cBackground[0], cBackground[1], cBackground[2]);
            doc.rect(x2, y, colWidth, maxH, "FD");
            doc.setFont("helvetica", "italic");
            doc.setFontSize(7);
            doc.setTextColor(cTextLight[0], cTextLight[1], cTextLight[2]);
            doc.text("[Immagine non caricabile]", x2 + 5, y + (maxH / 2), { maxWidth: colWidth - 10 });
            img2Height = maxH;
          }
        } else {
          // Fallback placeholder box
          doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
          doc.setFillColor(cBackground[0], cBackground[1], cBackground[2]);
          doc.rect(x2, y, colWidth, maxH, "FD");
          
          doc.setFont("helvetica", "bold");
          doc.setFontSize(isA4 ? 10 : 8);
          doc.setTextColor(cSecondary[0], cSecondary[1], cSecondary[2]);
          doc.text("FOTO", x2 + (colWidth / 2) - 5, y + (maxH / 2) - 2);
          
          doc.setFont("helvetica", "italic");
          doc.setFontSize(6);
          doc.setTextColor(cTextLight[0], cTextLight[1], cTextLight[2]);
          doc.text("Scatto registrato", x2 + (colWidth / 2) - 8, y + (maxH / 2) + 4);
          img2Height = maxH;
        }

        // Render Text 2 details below photo 2
        let text2Y = y + img2Height + 4;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(isA4 ? 9.5 : 7.5);
        doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
        doc.text(`Ricordo #${index + 2}`, x2, text2Y);
        text2Y += isA4 ? 4.5 : 3.5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(isA4 ? 8 : 6.5);
        doc.setTextColor(cTextDark[0], cTextDark[1], cTextDark[2]);
        if (photo2.date) {
          doc.text(`Data: ${formatDate(photo2.date)}`, x2, text2Y);
          text2Y += isA4 ? 4 : 3;
        }
        if (photo2.locationName) {
          doc.text(`Tappa: ${photo2.locationName}`, x2, text2Y);
          text2Y += isA4 ? 4 : 3;
        }
        if (photo2.description) {
          doc.setFont("helvetica", "italic");
          doc.setTextColor(cTextLight[0], cTextLight[1], cTextLight[2]);
          const wrappedDesc = doc.splitTextToSize(`"${photo2.description}"`, colWidth);
          for (const line of wrappedDesc) {
            doc.text(line, x2, text2Y);
            text2Y += isA4 ? 4 : 3;
          }
        }
      }

      // Row advance spacing based on maximum row elements height
      y += rowHeight + 10;
    }
  }

  // Save the generated document
  const safeTitle = trip.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`diario_viaggio_${safeTitle}_${paperSize}.pdf`);
};

export const exportAIItineraryToPDF = async (
  itinerary: AIItineraryResult,
  vehicleDimensions?: VehicleDimensions
): Promise<void> => {
  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 25; // 25mm left margin for ring binder hole punch
  const marginRight = 12;
  const marginTop = 14;
  const marginBottom = 14;
  const usableWidth = pageWidth - marginLeft - marginRight;

  const cPrimary = [62, 74, 53];     // Deep Olive (#3E4A35)
  const cSecondary = [90, 107, 78];  // Light Olive
  const cAccent = [217, 119, 6];     // Orange/Terracotta (#D97706)
  const cTextDark = [51, 65, 85];    // Slate 700 (#334155)
  const cTextLight = [100, 116, 139]; // Slate 500 (#64748B)
  const cBackground = [245, 242, 237]; // Warm Amber/Sand (#F5F2ED)
  const cBorder = [226, 232, 240];  // Slate 200

  // Helper to remove emojis, unsupported unicode symbols, curly quotes and non-latin1 characters that cause corrupted text in jsPDF standard fonts
  const sanitizePDFText = (str: string): string => {
    if (!str) return "";
    return str
      .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[\u2022\u25AA\u25BA\u25B6]/g, "-")
      .replace(/\u2026/g, "...")
      .replace(/\u00A0/g, " ")
      .replace(/\u200B/g, "")
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{200D}\u{FE0F}]/gu, '')
      .replace(/[^\x20-\xFF\n\r\t]/g, '')
      .trim();
  };

  const doc = new jsPDF({
    format: "a4",
    unit: "mm",
    orientation: "portrait",
  });

  let pageNum = 1;
  let y = marginTop;

  const cleanMainTitle = sanitizePDFText(itinerary.title || "Itinerario Camper AI");

  doc.setProperties({
    title: `Itinerario AI - ${cleanMainTitle}`,
    subject: "ViaCamper AI Itinerary",
    author: "ViaCamper AI",
    creator: "ViaCamper"
  });

  const drawPageDecorations = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(cTextLight[0], cTextLight[1], cTextLight[2]);
    doc.text("ViaCamper AI - Itinerario di Viaggio Personalizzato", marginLeft, marginTop - 4);
    
    doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
    doc.setLineWidth(0.2);
    doc.line(marginLeft, marginTop - 2, pageWidth - marginRight, marginTop - 2);

    doc.line(marginLeft, pageHeight - marginBottom + 4, pageWidth - marginRight, pageHeight - marginBottom + 4);

    doc.text(`Pagina ${pageNum}`, pageWidth - marginRight, pageHeight - marginBottom + 8, { align: "right" });
    doc.text(`Generato il ${new Date().toLocaleDateString("it-IT")}`, marginLeft, pageHeight - marginBottom + 8);

    // Discreet hole punch guides on left margin
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.15);
    const midY = pageHeight / 2;
    doc.line(0, midY, 3, midY); // center notch

    const punchX = 12; // 12mm standard
    const holePositionsA4 = [28.5, 108.5, 188.5, 268.5];
    holePositionsA4.forEach((hY) => {
      doc.circle(punchX, hY, 2.2);
      doc.line(punchX - 1.2, hY, punchX + 1.2, hY);
      doc.line(punchX, hY - 1.2, punchX, hY + 1.2);
    });
  };

  const checkPageBreak = (heightNeeded: number) => {
    if (y + heightNeeded > pageHeight - marginBottom - 10) {
      doc.addPage("a4", "portrait");
      pageNum++;
      y = marginTop + 5;
      drawPageDecorations();
    }
  };

  drawPageDecorations();

  // Cover Emblem & Header
  doc.setFillColor(cPrimary[0], cPrimary[1], cPrimary[2]);
  doc.circle(marginLeft + 6, y + 6, 6, "F");

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.line(marginLeft + 3.5, y + 8, marginLeft + 6, y + 4);
  doc.line(marginLeft + 6, y + 4, marginLeft + 8.5, y + 8);
  doc.line(marginLeft + 4.5, y + 8, marginLeft + 7.5, y + 8);
  doc.line(marginLeft + 6, y + 4, marginLeft + 6, y + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(cSecondary[0], cSecondary[1], cSecondary[2]);
  doc.text("ITINERARIO AI GENERATO", marginLeft + 15, y + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
  const splitTitle = doc.splitTextToSize(cleanMainTitle, usableWidth - 20);
  doc.text(splitTitle, marginLeft + 15, y + 12);

  y += 12 + (splitTitle.length * 6.5);

  if (itinerary.description) {
    const cleanDesc = sanitizePDFText(itinerary.description);
    if (cleanDesc) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(cTextDark[0], cTextDark[1], cTextDark[2]);
      const splitDesc = doc.splitTextToSize(cleanDesc, usableWidth);
      for (const line of splitDesc) {
        checkPageBreak(4.5);
        doc.text(line, marginLeft, y);
        y += 4.5;
      }
      y += 4;
    }
  }

  // General Stats Grid (3 boxes)
  checkPageBreak(20);
  const colWidth = usableWidth / 3;

  // Box 1: Distance
  doc.setFillColor(cBackground[0], cBackground[1], cBackground[2]);
  doc.rect(marginLeft, y, colWidth - 2, 16, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(cTextLight[0], cTextLight[1], cTextLight[2]);
  doc.text("DISTANZA STIMATA", marginLeft + 4, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
  doc.text(sanitizePDFText(itinerary.totalKm || "N/D"), marginLeft + 4, y + 12);

  // Box 2: Driving Time
  doc.setFillColor(cBackground[0], cBackground[1], cBackground[2]);
  doc.rect(marginLeft + colWidth, y, colWidth - 2, 16, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(cTextLight[0], cTextLight[1], cTextLight[2]);
  doc.text("TEMPO AL VOLANTE", marginLeft + colWidth + 4, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(cAccent[0], cAccent[1], cAccent[2]);
  doc.text(sanitizePDFText(itinerary.totalDrivingTime || "N/D"), marginLeft + colWidth + 4, y + 12);

  // Box 3: Total Days / Vehicle
  doc.setFillColor(cBackground[0], cBackground[1], cBackground[2]);
  doc.rect(marginLeft + colWidth * 2, y, colWidth, 16, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(cTextLight[0], cTextLight[1], cTextLight[2]);
  doc.text("DURATA TAPPE", marginLeft + colWidth * 2 + 4, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
  doc.text(`${itinerary.days?.length || 0} Giorni`, marginLeft + colWidth * 2 + 4, y + 12);

  y += 22;

  // Vehicle info line if provided
  if (vehicleDimensions) {
    const vehText = sanitizePDFText(`VEICOLO APPLICATO: ${vehicleDimensions.modelName || 'Camper'} - Altezza: ${vehicleDimensions.height}m | Lunghezza: ${vehicleDimensions.length}m | Peso: ${vehicleDimensions.weight}t`);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const vehLines = doc.splitTextToSize(vehText, usableWidth - 8);
    const vehBoxH = Math.max(10, vehLines.length * 4.5 + 4);

    checkPageBreak(vehBoxH + 2);
    doc.setFillColor(231, 235, 220); // #E7EBDC
    doc.rect(marginLeft, y, usableWidth, vehBoxH, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
    let vY = y + 5.5;
    for (const line of vehLines) {
      doc.text(line, marginLeft + 4, vY);
      vY += 4.5;
    }
    y += vehBoxH + 4;
  }

  // Cronologia Tappe
  checkPageBreak(15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
  doc.text("CRONOLOGIA TAPPE GIORNO PER GIORNO", marginLeft, y);

  doc.setDrawColor(cAccent[0], cAccent[1], cAccent[2]);
  doc.setLineWidth(1);
  doc.line(marginLeft, y + 2, marginLeft + 30, y + 2);
  y += 8;

  // Render each day
  for (const day of itinerary.days || []) {
    const dayTitle = sanitizePDFText(`GIORNO ${day.dayNumber}: ${day.title}`);
    const drivingSeg = sanitizePDFText(day.drivingSegment || "");

    // Calculate max width for day title to avoid overlapping drivingSegment
    const maxTitleW = drivingSeg ? usableWidth - 50 : usableWidth - 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const titleLines = doc.splitTextToSize(dayTitle, maxTitleW);
    const barH = Math.max(8, titleLines.length * 4.5 + 3.5);

    checkPageBreak(barH + 2);

    // Day title bar
    doc.setFillColor(cPrimary[0], cPrimary[1], cPrimary[2]);
    doc.rect(marginLeft, y, usableWidth, barH, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    let tY = y + 5.5;
    for (const line of titleLines) {
      doc.text(line, marginLeft + 4, tY);
      tY += 4.5;
    }

    if (drivingSeg) {
      doc.setFontSize(8);
      doc.text(drivingSeg, pageWidth - marginRight - 4, y + 5.5, { align: "right" });
    }

    y += barH + 3;

    // Day description
    if (day.description) {
      const cleanDesc = sanitizePDFText(day.description);
      if (cleanDesc) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(cTextDark[0], cTextDark[1], cTextDark[2]);
        const descLines = doc.splitTextToSize(cleanDesc, usableWidth);
        for (const line of descLines) {
          checkPageBreak(4.5);
          doc.text(line, marginLeft, y);
          y += 4.5;
        }
        y += 2;
      }
    }

    // Recommended Sosta Box
    if (day.stopPlaceName || day.stopCoordinate) {
      const stopName = sanitizePDFText(day.stopPlaceName || 'Sosta consigliata');
      const stopCoordText = day.stopCoordinate 
        ? `GPS: ${Number(day.stopCoordinate.lat).toFixed(5)}, ${Number(day.stopCoordinate.lng).toFixed(5)}${day.stopCoordinate.label ? ` (${sanitizePDFText(day.stopCoordinate.label)})` : ''}`
        : '';

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      const sostaTitleText = `Area Sosta Consigliata: ${stopName}`;
      const sostaTitleLines = doc.splitTextToSize(sostaTitleText, usableWidth - 8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      const sostaCoordLines = stopCoordText ? doc.splitTextToSize(stopCoordText, usableWidth - 8) : [];

      const boxH = (sostaTitleLines.length * 4.5) + (sostaCoordLines.length * 4) + 4;

      checkPageBreak(boxH + 3);

      doc.setFillColor(cBackground[0], cBackground[1], cBackground[2]);
      doc.rect(marginLeft, y, usableWidth, boxH, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
      let sY = y + 5;
      for (const line of sostaTitleLines) {
        doc.text(line, marginLeft + 4, sY);
        sY += 4.5;
      }

      if (sostaCoordLines.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(cTextLight[0], cTextLight[1], cTextLight[2]);
        sY += 0.5;
        for (const line of sostaCoordLines) {
          doc.text(line, marginLeft + 4, sY);
          sY += 4;
        }
      }

      y += boxH + 3;
    }

    // Activities
    if (day.activities && day.activities.length > 0) {
      const cleanActivities = day.activities
        .map((act) => sanitizePDFText(act))
        .filter((act) => act.length > 0);

      if (cleanActivities.length > 0) {
        checkPageBreak(10);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(cSecondary[0], cSecondary[1], cSecondary[2]);
        doc.text("Attivita suggerite:", marginLeft, y);
        y += 4.5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(cTextDark[0], cTextDark[1], cTextDark[2]);
        for (const act of cleanActivities) {
          const actLines = doc.splitTextToSize(`- ${act}`, usableWidth - 4);
          for (const line of actLines) {
            checkPageBreak(4.5);
            doc.text(line, marginLeft + 2, y);
            y += 4.5;
          }
        }
        y += 2;
      }
    }

    // Camper tips box
    if (day.camperTips) {
      const cleanTips = sanitizePDFText(day.camperTips);
      if (cleanTips) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        const fullTipStr = `Consiglio Camper: ${cleanTips}`;
        const innerWidth = usableWidth - 10;
        const tipLines = doc.splitTextToSize(fullTipStr, innerWidth);
        const boxHeight = tipLines.length * 4.5 + 6;

        checkPageBreak(Math.min(boxHeight, 25));

        doc.setFillColor(254, 243, 199); // Amber 100
        doc.rect(marginLeft, y, usableWidth, boxHeight, "F");

        doc.setDrawColor(217, 119, 6); // Amber accent border
        doc.setLineWidth(0.6);
        doc.line(marginLeft, y, marginLeft, y + boxHeight); // Left accent border

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(180, 83, 9); // Amber 700

        let tipY = y + 5;
        for (const line of tipLines) {
          if (tipY + 4.5 > pageHeight - marginBottom - 10) {
            checkPageBreak(12);
            tipY = y + 5;
          }
          doc.text(line, marginLeft + 5, tipY);
          tipY += 4.5;
        }
        y += boxHeight + 4;
      }
    }

    y += 3; // Space between days
  }

  // Save the PDF
  const safeTitle = (cleanMainTitle || "itinerario_ai").replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`itinerario_camper_${safeTitle}.pdf`);
};

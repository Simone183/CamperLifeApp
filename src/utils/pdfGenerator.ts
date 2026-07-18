import { jsPDF } from "jspdf";
import { Trip, AppSettings } from "../types";

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
  }
): Promise<void> => {
  // Dimensions in mm
  const isA4 = paperSize === "a4";
  const pageWidth = isA4 ? 210 : 148;
  const pageHeight = isA4 ? 297 : 210;

  const margin = isA4 ? 15 : 10;
  const usableWidth = pageWidth - margin * 2;

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
  let y = margin;

  // Add metadata
  doc.setProperties({
    title: `Diario di Viaggio - ${trip.title}`,
    subject: "CamperLifeApp Trip Diary",
    author: "CamperLifeApp",
    keywords: "camper, viaggio, diario, camperlife",
    creator: "CamperLifeApp"
  });

  // Footer/Header Draw Function
  const drawPageDecorations = () => {
    // Top running header
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(cTextLight[0], cTextLight[1], cTextLight[2]);
    doc.text("CamperLifeApp - Diario di Bordo", margin, margin - 4);
    
    // Header divider line
    doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
    doc.setLineWidth(0.2);
    doc.line(margin, margin - 2, pageWidth - margin, margin - 2);

    // Footer divider line
    doc.line(margin, pageHeight - margin + 4, pageWidth - margin, pageHeight - margin + 4);

    // Footer page number
    doc.text(`Pagina ${pageNum}`, pageWidth - margin, pageHeight - margin + 8, { align: "right" });
    doc.text(`Generato il ${new Date().toLocaleDateString("it-IT")}`, margin, pageHeight - margin + 8);
  };

  const checkPageBreak = (heightNeeded: number) => {
    if (y + heightNeeded > pageHeight - margin - 12) {
      doc.addPage(paperSize, "portrait");
      pageNum++;
      y = margin + 5; // offset slightly for top header spacing
      drawPageDecorations();
    }
  };

  // Start on page 1 with page decorations
  drawPageDecorations();

  // --- COVER / HEADER AREA ---
  // Circle Icon emblem
  doc.setFillColor(cPrimary[0], cPrimary[1], cPrimary[2]);
  doc.circle(margin + 6, y + 6, 6, "F");
  
  // Custom tiny tent design inside circle
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.line(margin + 3.5, y + 8, margin + 6, y + 4); // left slope
  doc.line(margin + 6, y + 4, margin + 8.5, y + 8); // right slope
  doc.line(margin + 4.5, y + 8, margin + 7.5, y + 8); // ground line
  doc.line(margin + 6, y + 4, margin + 6, y + 8);   // center post

  doc.setFont("helvetica", "bold");
  doc.setFontSize(isA4 ? 11 : 9);
  doc.setTextColor(cSecondary[0], cSecondary[1], cSecondary[2]);
  doc.text("DIARIO DI VIAGGIO", margin + 15, y + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(isA4 ? 20 : 15);
  doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
  const splitTitle = doc.splitTextToSize(trip.title, usableWidth - 20);
  doc.text(splitTitle, margin + 15, y + 12);
  
  y += 12 + (splitTitle.length * (isA4 ? 7 : 5.5));

  // Trip Dates Subheader
  doc.setFont("helvetica", "normal");
  doc.setFontSize(isA4 ? 10 : 8);
  doc.setTextColor(cTextLight[0], cTextLight[1], cTextLight[2]);
  
  const tripStartDate = formatDate(trip.startDate);
  const tripEndDate = formatDate(trip.endDate);
  doc.text(`Periodo: dal ${tripStartDate} al ${tripEndDate}`, margin + 15, y);
  
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
  doc.rect(margin, y, colWidth - 2, isA4 ? 18 : 15, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(cTextLight[0], cTextLight[1], cTextLight[2]);
  doc.text("DISTANZA TOTALI", margin + 4, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(isA4 ? 14 : 11);
  doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
  doc.text(`${totalDistance} ${distanceUnit}`, margin + 4, y + 12);

  // Box 2: Expenses
  doc.setFillColor(cBackground[0], cBackground[1], cBackground[2]);
  doc.rect(margin + colWidth, y, colWidth - 2, isA4 ? 18 : 15, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(cTextLight[0], cTextLight[1], cTextLight[2]);
  doc.text("BUDGET SPESO", margin + colWidth + 4, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(isA4 ? 14 : 11);
  doc.setTextColor(cAccent[0], cAccent[1], cAccent[2]);
  doc.text(`${totalSpent.toFixed(2)} ${currencySymbol}`, margin + colWidth + 4, y + 12);

  // Box 3: Movements
  doc.setFillColor(cBackground[0], cBackground[1], cBackground[2]);
  doc.rect(margin + colWidth * 2, y, colWidth, isA4 ? 18 : 15, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(cTextLight[0], cTextLight[1], cTextLight[2]);
  doc.text("TAPPE & SPOSTAMENTI", margin + colWidth * 2 + 4, y + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(isA4 ? 14 : 11);
  doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
  doc.text(`${totalMovements} tappe`, margin + colWidth * 2 + 4, y + 12);

  y += (isA4 ? 18 : 15) + 10;

  // --- RACCONTO / DESCRIPTION SECTION ---
  if (trip.description) {
    checkPageBreak(isA4 ? 20 : 16);
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isA4 ? 12 : 10);
    doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
    doc.text("IL RACCONTO DI VIAGGIO", margin, y);
    
    // Line decoration under header
    doc.setDrawColor(cAccent[0], cAccent[1], cAccent[2]);
    doc.setLineWidth(1);
    doc.line(margin, y + 2, margin + 25, y + 2);
    
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(isA4 ? 9.5 : 8);
    doc.setTextColor(cTextDark[0], cTextDark[1], cTextDark[2]);
    
    // Split the text to lines to respect margins
    const descLines: string[] = doc.splitTextToSize(trip.description, usableWidth);
    const lineHeight = isA4 ? 4.8 : 3.8;

    for (let i = 0; i < descLines.length; i++) {
      checkPageBreak(lineHeight);
      doc.text(descLines[i], margin, y);
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
    doc.text("TAPPE & SPOSTAMENTI CRONOLOGICI", margin, y);
    
    doc.setDrawColor(cAccent[0], cAccent[1], cAccent[2]);
    doc.setLineWidth(1);
    doc.line(margin, y + 2, margin + 25, y + 2);
    
    y += 7;

    // Define columns
    const colDateW = isA4 ? 22 : 18;
    const colOdoW = isA4 ? 23 : 18;
    const colLocW = isA4 ? 45 : 32;
    const colNotesW = usableWidth - colDateW - colOdoW - colLocW;

    // Table Header
    doc.setFillColor(cPrimary[0], cPrimary[1], cPrimary[2]);
    doc.rect(margin, y, usableWidth, isA4 ? 8 : 7, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isA4 ? 8.5 : 7);
    doc.setTextColor(255, 255, 255);
    
    doc.text("DATA", margin + 2, y + (isA4 ? 5 : 4.5));
    doc.text("KM/ODO", margin + colDateW + 2, y + (isA4 ? 5 : 4.5));
    doc.text("LOCALITÀ / TAPPA", margin + colDateW + colOdoW + 2, y + (isA4 ? 5 : 4.5));
    doc.text("NOTE / DETTAGLI", margin + colDateW + colOdoW + colLocW + 2, y + (isA4 ? 5 : 4.5));
    
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
        doc.rect(margin, y, usableWidth, rowHeight, "F");
      }
      altRow = !altRow;

      // Draw bottom line
      doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
      doc.setLineWidth(0.15);
      doc.line(margin, y + rowHeight, margin + usableWidth, y + rowHeight);

      // Render cell text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(isA4 ? 8 : 7);
      doc.setTextColor(cTextDark[0], cTextDark[1], cTextDark[2]);

      doc.text(dateText, margin + 2, y + (isA4 ? 5.5 : 4.5));
      doc.text(odoText, margin + colDateW + 2, y + (isA4 ? 5.5 : 4.5));

      // Multiline cell support
      let currentY = y + (isA4 ? 5.5 : 4.5);
      for (let i = 0; i < wrappedLoc.length; i++) {
        doc.text(wrappedLoc[i], margin + colDateW + colOdoW + 2, currentY);
        currentY += isA4 ? 4.5 : 3.5;
      }

      currentY = y + (isA4 ? 5.5 : 4.5);
      for (let i = 0; i < wrappedNotes.length; i++) {
        doc.text(wrappedNotes[i], margin + colDateW + colOdoW + colLocW + 2, currentY);
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
    doc.text("RENDICONTO DELLE SPESE", margin, y);
    
    doc.setDrawColor(cAccent[0], cAccent[1], cAccent[2]);
    doc.setLineWidth(1);
    doc.line(margin, y + 2, margin + 25, y + 2);
    
    y += 7;

    // Col width allocation
    const colDateW = isA4 ? 25 : 20;
    const colCatW = isA4 ? 35 : 25;
    const colAmountW = isA4 ? 30 : 25;
    const colDescW = usableWidth - colDateW - colCatW - colAmountW;

    // Table Header
    doc.setFillColor(cPrimary[0], cPrimary[1], cPrimary[2]);
    doc.rect(margin, y, usableWidth, isA4 ? 8 : 7, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isA4 ? 8.5 : 7);
    doc.setTextColor(255, 255, 255);
    
    doc.text("DATA", margin + 2, y + (isA4 ? 5 : 4.5));
    doc.text("CATEGORIA", margin + colDateW + 2, y + (isA4 ? 5 : 4.5));
    doc.text("DESCRIZIONE", margin + colDateW + colCatW + 2, y + (isA4 ? 5 : 4.5));
    doc.text("IMPORTO", margin + colDateW + colCatW + colDescW + 2, y + (isA4 ? 5 : 4.5));
    
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
        doc.rect(margin, y, usableWidth, rowHeight, "F");
      }
      altRow = !altRow;

      doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
      doc.setLineWidth(0.15);
      doc.line(margin, y + rowHeight, margin + usableWidth, y + rowHeight);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(isA4 ? 8 : 7);
      doc.setTextColor(cTextDark[0], cTextDark[1], cTextDark[2]);

      doc.text(dateText, margin + 2, y + (isA4 ? 5.5 : 4.5));
      doc.text(catText, margin + colDateW + 2, y + (isA4 ? 5.5 : 4.5));
      
      // Amount text: bold and right aligned or colored if fuel
      if (exp.category === "Carburante") {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(cTextDark[0], cTextDark[1], cTextDark[2]);
      }
      doc.text(amountText, margin + colDateW + colCatW + colDescW + 2, y + (isA4 ? 5.5 : 4.5));
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(cTextDark[0], cTextDark[1], cTextDark[2]);

      let currentY = y + (isA4 ? 5.5 : 4.5);
      for (let i = 0; i < wrappedDesc.length; i++) {
        doc.text(wrappedDesc[i], margin + colDateW + colCatW + 2, currentY);
        currentY += isA4 ? 4.5 : 3.5;
      }

      y += rowHeight;
    }

    // Spend sum row
    checkPageBreak(isA4 ? 10 : 8);
    doc.setFillColor(cBackground[0], cBackground[1], cBackground[2]);
    doc.rect(margin, y, usableWidth, isA4 ? 8 : 7, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isA4 ? 9 : 7.5);
    doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
    doc.text("TOTALE SPESO:", margin + 2, y + (isA4 ? 5.5 : 4.5));
    
    doc.setTextColor(cAccent[0], cAccent[1], cAccent[2]);
    doc.text(`${totalSpent.toFixed(2)} ${currencySymbol}`, margin + colDateW + colCatW + colDescW + 2, y + (isA4 ? 5.5 : 4.5));
    
    y += (isA4 ? 8 : 7) + 8;
  }

  // --- FOTO & RICORDI SECTION ---
  if (options.includePhotos && trip.photos && trip.photos.length > 0) {
    checkPageBreak(isA4 ? 25 : 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(isA4 ? 12 : 10);
    doc.setTextColor(cPrimary[0], cPrimary[1], cPrimary[2]);
    doc.text("GALLERIA FOTOGRAFICA & RICORDI", margin, y);
    
    doc.setDrawColor(cAccent[0], cAccent[1], cAccent[2]);
    doc.setLineWidth(1);
    doc.line(margin, y + 2, margin + 25, y + 2);
    
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
      const x1 = margin;
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
        const x2 = margin + colWidth + gap;
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

/**
 * Utility to extract photo creation/capture date from EXIF metadata,
 * filename patterns, and file lastModified timestamps.
 * Enables automatic chronological ordering of travel diary photos.
 */

import { DiaryPhoto } from "../types";

export interface ExtractedPhotoDate {
  date: string; // ISO date format "YYYY-MM-DD"
  time?: string; // "HH:mm:ss" if available
  dateTime?: string; // "YYYY-MM-DDTHH:mm:ss"
  source: 'exif' | 'filename' | 'file-lastmodified' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Parses raw EXIF date string (e.g. "YYYY:MM:DD HH:MM:SS" or "YYYY-MM-DD HH:MM:SS")
 */
function parseExifDateString(str: string): { date: string; time?: string; dateTime?: string } | null {
  if (!str || typeof str !== "string") return null;
  const cleaned = str.trim();
  const match = cleaned.match(/^(\d{4})[:\-\/](\d{2})[:\-\/](\d{2})(?:[\sT](\d{2})[:\-\.](\d{2})(?:[:\-\.](\d{2}))?)?/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    if (y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const date = `${match[1]}-${match[2]}-${match[3]}`;
      const time = match[4] && match[5] ? `${match[4]}:${match[5]}:${match[6] || "00"}` : undefined;
      return {
        date,
        time,
        dateTime: time ? `${date}T${time}` : date,
      };
    }
  }
  return null;
}

/**
 * Extracts EXIF metadata directly from an image Blob/File without heavy dependencies.
 * Slices only the first 256KB where the APP1 Exif segment is guaranteed to live.
 */
async function extractExifDateFromBlob(blob: Blob): Promise<{ date: string; time?: string; dateTime?: string } | null> {
  try {
    // Slicing first 256KB is ultra-fast (<2ms) and preserves memory
    const slice = blob.slice(0, Math.min(blob.size, 262144));
    const arrayBuffer = await slice.arrayBuffer();
    const view = new DataView(arrayBuffer);

    if (view.byteLength < 16) return null;

    // Check for JPEG SOI marker (0xFFD8)
    if (view.getUint16(0, false) === 0xFFD8) {
      let offset = 2;
      while (offset < view.byteLength - 4) {
        if (view.getUint8(offset) !== 0xFF) break;
        const marker = view.getUint8(offset + 1);
        if (marker === 0xDA || marker === 0xD9) break; // Start of Scan or End of Image
        const len = view.getUint16(offset + 2, false);

        // Marker 0xE1 is APP1 (EXIF data)
        if (marker === 0xE1) {
          // Check 'Exif\0\0' (0x45786966 followed by 0x0000)
          if (
            view.byteLength >= offset + 10 &&
            view.getUint32(offset + 4, false) === 0x45786966 &&
            view.getUint16(offset + 8, false) === 0x0000
          ) {
            const tiffOffset = offset + 10;
            const maxOffset = offset + 2 + len;
            const parsed = parseTiffHeader(view, tiffOffset, maxOffset);
            if (parsed) return parsed;
          }
        }
        offset += 2 + len;
      }
    }

    // Check for PNG format (89 50 4E 47 0D 0A 1A 0A)
    if (
      view.getUint32(0, false) === 0x89504E47 &&
      view.getUint32(4, false) === 0x0D0A1A0A
    ) {
      let offset = 8;
      while (offset < view.byteLength - 8) {
        const chunkLen = view.getUint32(offset, false);
        const chunkType = String.fromCharCode(
          view.getUint8(offset + 4),
          view.getUint8(offset + 5),
          view.getUint8(offset + 6),
          view.getUint8(offset + 7)
        );

        if (chunkType === "eXIf") {
          // Raw TIFF header directly in PNG eXIf chunk
          const tiffOffset = offset + 8;
          const maxOffset = tiffOffset + chunkLen;
          const parsed = parseTiffHeader(view, tiffOffset, maxOffset);
          if (parsed) return parsed;
        }

        offset += 12 + chunkLen; // 4 len + 4 type + data + 4 crc
      }
    }
  } catch (err) {
    // Graceful fallback on unexpected or corrupt metadata
    console.debug("EXIF parsing skipped or not present:", err);
  }
  return null;
}

/**
 * Parses TIFF header and IFD structures for DateTimeOriginal (0x9003),
 * DateTimeDigitized (0x9004), or DateTime (0x0132).
 */
function parseTiffHeader(
  view: DataView,
  tiffOffset: number,
  maxOffset: number
): { date: string; time?: string; dateTime?: string } | null {
  if (tiffOffset + 8 > maxOffset || tiffOffset + 8 > view.byteLength) return null;

  // Endianness: 'II' = little-endian, 'MM' = big-endian
  const byteOrder = view.getUint16(tiffOffset, false);
  const isLittle = byteOrder === 0x4949;
  if (!isLittle && byteOrder !== 0x4D4D) return null;

  // 42 magic number
  if (view.getUint16(tiffOffset + 2, isLittle) !== 42) return null;

  const firstIfdOffset = view.getUint32(tiffOffset + 4, isLittle);
  let exifSubIfdOffset = 0;
  let fallbackDateStr: string | null = null;

  function scanIfd(ifdRelOffset: number): string | null {
    const ifdAbsOffset = tiffOffset + ifdRelOffset;
    if (ifdAbsOffset + 2 > maxOffset || ifdAbsOffset + 2 > view.byteLength) return null;

    const count = view.getUint16(ifdAbsOffset, isLittle);
    for (let i = 0; i < count; i++) {
      const entry = ifdAbsOffset + 2 + i * 12;
      if (entry + 12 > maxOffset || entry + 12 > view.byteLength) break;

      const tag = view.getUint16(entry, isLittle);
      const numValues = view.getUint32(entry + 4, isLittle);

      if (tag === 0x8769) {
        // Exif SubIFD Pointer
        exifSubIfdOffset = view.getUint32(entry + 8, isLittle);
      } else if (tag === 0x9003 || tag === 0x9004 || tag === 0x0132) {
        // 0x9003 = DateTimeOriginal, 0x9004 = DateTimeDigitized, 0x0132 = DateTime
        let valOffset = entry + 8;
        if (numValues > 4) {
          valOffset = tiffOffset + view.getUint32(entry + 8, isLittle);
        }
        if (valOffset + numValues <= maxOffset && valOffset + numValues <= view.byteLength) {
          let s = "";
          for (let j = 0; j < numValues; j++) {
            const charCode = view.getUint8(valOffset + j);
            if (charCode === 0) break;
            s += String.fromCharCode(charCode);
          }
          if (tag === 0x9003) return s; // Highest priority: DateTimeOriginal
          if (!fallbackDateStr) fallbackDateStr = s;
        }
      }
    }
    return null;
  }

  // Scan IFD0
  const directOriginal = scanIfd(firstIfdOffset);
  if (directOriginal) {
    const res = parseExifDateString(directOriginal);
    if (res) return res;
  }

  // Scan Exif SubIFD
  if (exifSubIfdOffset > 0) {
    const subOriginal = scanIfd(exifSubIfdOffset);
    if (subOriginal) {
      const res = parseExifDateString(subOriginal);
      if (res) return res;
    }
  }

  if (fallbackDateStr) {
    return parseExifDateString(fallbackDateStr);
  }

  return null;
}

/**
 * Extracts date and optional time from common camera and phone filenames:
 * - IMG_20240815_143022.jpg
 * - PXL_20240815_143022123.jpg
 * - 20240815_143022.jpg
 * - Screenshot_2024-08-15-14-30-22.png
 * - 2024-08-15 14.30.22.jpg
 * - IMG-20240815-WA0001.jpeg
 * - WP_20240815_001.jpg
 */
export function parseDateFromFilename(name: string): { date: string; time?: string; dateTime?: string } | null {
  if (!name || typeof name !== "string") return null;

  // Regex matches 4 digits year (2000-2099), 2 digits month, 2 digits day
  const pattern = /(?:^|[_\-\s])(20\d{2})[-_.]?(0[1-9]|1[0-2])[-_.]?(0[1-9]|[12]\d|3[01])(?:[_\-\sT]([01]\d|2[0-3])[-_.:]?([0-5]\d)(?:[-_.:]?([0-5]\d))?)?/i;
  const match = name.match(pattern);
  if (match) {
    const y = match[1];
    const m = match[2];
    const d = match[3];
    const date = `${y}-${m}-${d}`;
    const time = match[4] && match[5] ? `${match[4]}:${match[5]}:${match[6] || "00"}` : undefined;
    return {
      date,
      time,
      dateTime: time ? `${date}T${time}` : date,
    };
  }

  return null;
}

/**
 * Parses file.lastModified timestamp into ISO date and time
 */
export function parseDateFromLastModified(timestamp: number): { date: string; time?: string; dateTime?: string } | null {
  if (!timestamp || typeof timestamp !== "number" || isNaN(timestamp)) return null;

  // Accept valid dates from 2000 up to 1 day into the future
  const now = Date.now();
  const minTimestamp = 946684800000; // Jan 1, 2000
  const maxTimestamp = now + 86400000; // +1 day grace for timezones

  if (timestamp < minTimestamp || timestamp > maxTimestamp) return null;

  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");

  const date = `${year}-${month}-${day}`;
  const time = `${hours}:${minutes}:${seconds}`;

  return {
    date,
    time,
    dateTime: `${date}T${time}`,
  };
}

/**
 * Master date extraction function for uploaded photos:
 * 1. Reads embedded EXIF DateTimeOriginal / DateTime
 * 2. If not present, parses filename (e.g. IMG_20240815_143022)
 * 3. If not present, checks file.lastModified timestamp
 * 4. Fallback to trip start date or current date
 */
export async function extractPhotoDate(
  file: File,
  fallbackDate?: string
): Promise<ExtractedPhotoDate> {
  // 1. Try embedded EXIF data
  try {
    const exifDate = await extractExifDateFromBlob(file);
    if (exifDate && exifDate.date) {
      return {
        date: exifDate.date,
        time: exifDate.time,
        dateTime: exifDate.dateTime,
        source: 'exif',
        confidence: 'high',
      };
    }
  } catch (err) {
    console.debug("EXIF extraction error:", err);
  }

  // 2. Try parsing filename (very common on modern Android / iOS exports / WhatsApp)
  const filenameDate = parseDateFromFilename(file.name);
  if (filenameDate && filenameDate.date) {
    return {
      date: filenameDate.date,
      time: filenameDate.time,
      dateTime: filenameDate.dateTime,
      source: 'filename',
      confidence: 'medium',
    };
  }

  // 3. Try file.lastModified
  if (file.lastModified) {
    const lastModDate = parseDateFromLastModified(file.lastModified);
    if (lastModDate && lastModDate.date) {
      return {
        date: lastModDate.date,
        time: lastModDate.time,
        dateTime: lastModDate.dateTime,
        source: 'file-lastmodified',
        confidence: 'medium',
      };
    }
  }

  // 4. Fallback
  const defaultDate = fallbackDate || new Date().toISOString().split("T")[0];
  return {
    date: defaultDate,
    source: 'fallback',
    confidence: 'low',
  };
}

/**
 * Sorts an array of DiaryPhotos chronologically (by date and time).
 * @param photos List of photos
 * @param ascending true: oldest first (trip chronological start -> end), false: newest first
 */
export function sortPhotosChronologically(
  photos: DiaryPhoto[],
  ascending: boolean = true
): DiaryPhoto[] {
  return [...photos].sort((a, b) => {
    const dateA = (a.date || "") + (a.time ? `T${a.time}` : "");
    const dateB = (b.date || "") + (b.time ? `T${b.time}` : "");

    if (dateA !== dateB) {
      return ascending ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
    }
    // Fallback to id
    return ascending ? String(a.id).localeCompare(String(b.id)) : String(b.id).localeCompare(String(a.id));
  });
}

/**
 * Formats a photo date string (YYYY-MM-DD) into an Italian formatted label
 * e.g. "15 Ago 2024" or "15/08/2024 14:30"
 */
export function formatPhotoDateBadge(dateStr?: string, timeStr?: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    if (timeStr) {
      const timeParts = timeStr.split(":");
      return `${formattedDate} ${timeParts[0]}:${timeParts[1]}`;
    }
    return formattedDate;
  }
  return dateStr;
}

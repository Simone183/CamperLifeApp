/**
 * Utility to extract photo creation/capture date from EXIF metadata,
 * filename patterns, and file lastModified timestamps.
 * Enables automatic chronological ordering of travel diary photos.
 */

import exifr from "exifr";
import { DiaryPhoto } from "../types";

export interface ExtractedPhotoDate {
  date: string; // ISO date format "YYYY-MM-DD"
  time?: string; // "HH:mm:ss" if available
  dateTime?: string; // "YYYY-MM-DDTHH:mm:ss"
  source: 'exif' | 'filename' | 'file-lastmodified' | 'fallback' | 'manual';
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Extracts EXIF capture timestamp using the modern, high-compatibility `exifr` parser.
 * Works seamlessly across JPEG, HEIC, TIFF, PNG, and WebP images.
 */
export async function extractExifWithExifr(
  input: Blob | File | ArrayBuffer | Uint8Array | string
): Promise<{ date: string; time?: string; dateTime?: string } | null> {
  try {
    const data = await exifr.parse(input, [
      "DateTimeOriginal",
      "CreateDate",
      "ModifyDate",
      "DateCreated",
      "GPSDateStamp",
      "GPSTimeStamp",
    ]);

    if (!data) return null;

    const rawDate = data.DateTimeOriginal || data.CreateDate || data.DateCreated || data.ModifyDate;
    if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
      const year = rawDate.getFullYear();
      if (year >= 1990 && year <= 2100) {
        const month = String(rawDate.getMonth() + 1).padStart(2, "0");
        const day = String(rawDate.getDate()).padStart(2, "0");
        const hours = String(rawDate.getHours()).padStart(2, "0");
        const minutes = String(rawDate.getMinutes()).padStart(2, "0");
        const seconds = String(rawDate.getSeconds()).padStart(2, "0");
        const date = `${year}-${month}-${day}`;
        const time = `${hours}:${minutes}:${seconds}`;
        return {
          date,
          time,
          dateTime: `${date}T${time}`,
        };
      }
    } else if (typeof rawDate === "string") {
      const parsed = parseExifDateString(rawDate);
      if (parsed) return parsed;
    }

    if (data.GPSDateStamp) {
      const gpsDate = String(data.GPSDateStamp).replace(/:/g, "-");
      const timeStr = typeof data.GPSTimeStamp === "string" ? data.GPSTimeStamp : undefined;
      const parsed = parseExifDateString(gpsDate + (timeStr ? ` ${timeStr}` : ""));
      if (parsed) return parsed;
    }
  } catch (err) {
    // Silently fall back to lightweight binary slice parser
  }
  return null;
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
 * - IMG_20240815_143022.jpg / PXL_20240815_143022123.jpg
 * - 20240815_143022.jpg / 20240815143022.jpg (14 digits)
 * - Screenshot_2024-08-15-14-30-22.png / 2024-08-15 14.30.22.jpg
 * - IMG-20240815-WA0001.jpeg (WhatsApp)
 * - 15-08-2024_143022.jpg (European DD-MM-YYYY)
 */
export function parseDateFromFilename(name: string): { date: string; time?: string; dateTime?: string } | null {
  if (!name || typeof name !== "string") return null;

  // 1. Continuous 14 digits: YYYYMMDDHHmmss (e.g. 20260829152341.jpg)
  const match14 = name.match(/(?:^|[^\d])(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])([01]\d|2[0-3])([0-5]\d)([0-5]\d)(?:[^\d]|$)/);
  if (match14) {
    const date = `${match14[1]}-${match14[2]}-${match14[3]}`;
    const time = `${match14[4]}:${match14[5]}:${match14[6]}`;
    return { date, time, dateTime: `${date}T${time}` };
  }

  // 2. Standard ISO-like YYYYMMDD or YYYY-MM-DD (e.g. IMG_20260829_152341, PXL_20260829_152341123, 2026-08-29 14.30.00)
  const patternIso = /(?:^|[_\-\sA-Za-z])(20\d{2})[-_.]?(0[1-9]|1[0-2])[-_.]?(0[1-9]|[12]\d|3[01])(?:[_\-\sT]([01]\d|2[0-3])[-_.:]?([0-5]\d)(?:[-_.:]?([0-5]\d))?)?/i;
  const matchIso = name.match(patternIso);
  if (matchIso) {
    const y = matchIso[1];
    const m = matchIso[2];
    const d = matchIso[3];
    const date = `${y}-${m}-${d}`;
    const time = matchIso[4] && matchIso[5] ? `${matchIso[4]}:${matchIso[5]}:${matchIso[6] || "00"}` : undefined;
    return {
      date,
      time,
      dateTime: time ? `${date}T${time}` : date,
    };
  }

  // 3. European DD-MM-YYYY format (e.g. 29-08-2026_152341)
  const matchEur = name.match(/(?:^|[_\-\sA-Za-z])(0[1-9]|[12]\d|3[01])[-_.](0[1-9]|1[0-2])[-_.](20\d{2})(?:[_\-\sT]([01]\d|2[0-3])[-_.:]?([0-5]\d)(?:[-_.:]?([0-5]\d))?)?/i);
  if (matchEur) {
    const date = `${matchEur[3]}-${matchEur[2]}-${matchEur[1]}`;
    const time = matchEur[4] && matchEur[5] ? `${matchEur[4]}:${matchEur[5]}:${matchEur[6] || "00"}` : undefined;
    return { date, time, dateTime: time ? `${date}T${time}` : date };
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
 * 1. Reads embedded EXIF DateTimeOriginal / CreateDate via `exifr` (works with JPEG, HEIC, PNG, WebP)
 * 2. If not present or stripped, fallback to lightweight binary APP1 slice parser
 * 3. Parses camera & gallery filename patterns (e.g. IMG_20260829_143022)
 * 4. Checks file.lastModified ONLY if it is not the current upload/download session time
 * 5. Intelligent fallback to trip start date or current date
 */
export async function extractPhotoDate(
  file: File,
  tripStartDate?: string,
  tripEndDate?: string
): Promise<ExtractedPhotoDate> {
  // 1. High-precision EXIF metadata (captures the real shutter-click timestamp)
  try {
    const exifrDate = await extractExifWithExifr(file);
    if (exifrDate && exifrDate.date) {
      return {
        date: exifrDate.date,
        time: exifrDate.time,
        dateTime: exifrDate.dateTime,
        source: 'exif',
        confidence: 'high',
      };
    }
  } catch (err) {
    console.debug("exifr parse notice:", err);
  }

  // 1b. Fallback to lightweight binary EXIF slice parser
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
    console.debug("binary EXIF extraction error:", err);
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
  // CRITICAL: On mobile WebViews and Android photo picker, selecting a file creates
  // a temporary cache file with lastModified = NOW (the upload time).
  // We must NOT mistake the upload time for the photo capture date!
  if (file.lastModified) {
    const lastModDate = parseDateFromLastModified(file.lastModified);
    if (lastModDate && lastModDate.date) {
      const now = Date.now();
      const diffHours = Math.abs(now - file.lastModified) / (1000 * 60 * 60);
      const isRecentUpload = diffHours < 36; // Within last 36 hours is likely upload/picker time

      const isInTrip =
        Boolean(tripStartDate &&
        tripEndDate &&
        lastModDate.date >= tripStartDate &&
        lastModDate.date <= tripEndDate);

      // Only trust file.lastModified if it genuinely falls within the trip dates
      // or is an old file (not created during this upload session)
      if (isInTrip || !isRecentUpload) {
        return {
          date: lastModDate.date,
          time: lastModDate.time,
          dateTime: lastModDate.dateTime,
          source: 'file-lastmodified',
          confidence: isInTrip ? 'high' : 'medium',
        };
      }
    }
  }

  // 4. Fallback to trip start date (if known) or today's date
  const defaultDate = tripStartDate || new Date().toISOString().split("T")[0];
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

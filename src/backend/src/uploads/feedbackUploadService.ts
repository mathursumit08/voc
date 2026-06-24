import JSZip from "jszip";
import { pool } from "../db/pool.js";
import { maskPii } from "../privacy/piiMasker.js";

const sourceTypeByNormalizedValue = new Map(
  ["Survey", "JobCard", "WarrantyClaim", "GoogleReview", "SocialMedia", "CallCenter", "MobileApp", "ManualUpload"].map((sourceType) => [
    sourceType.toLowerCase(),
    sourceType
  ])
);

const requiredColumns = ["sourceType", "sourceReferenceId", "feedbackDate", "rawText"] as const;

interface ParsedUploadRow {
  rowNumber: number;
  sourceType: string;
  sourceReferenceId: string;
  feedbackDate: string;
  rawText: string;
  maskedText?: string;
  rating?: number;
  customerExternalId?: string;
  vinHash?: string;
  dealerCode?: string;
  jobCardExternalId?: string;
  warrantyClaimExternalId?: string;
}

interface RejectedUploadRow {
  rowNumber: number;
  sourceReferenceId?: string;
  reason: string;
}

interface FeedbackUploadResult {
  acceptedFormats: string[];
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  duplicateRows: number;
  insertedRows: number;
  rejected: RejectedUploadRow[];
}

function normalizeCell(value: unknown) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseRating(value: string) {
  if (!value) {
    return undefined;
  }

  const rating = Number(value);
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;
}

function normalizeSourceType(value: string) {
  return sourceTypeByNormalizedValue.get(value.replace(/[\s_-]/g, "").toLowerCase()) ?? null;
}

function decodeXmlText(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function getXmlAttribute(xml: string, attributeName: string) {
  const match = xml.match(new RegExp(`${attributeName}="([^"]*)"`));
  return match ? decodeXmlText(match[1]) : "";
}

function getColumnIndex(cellReference: string) {
  const letters = cellReference.replace(/[0-9]/g, "");
  return letters.split("").reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function excelSerialDateToIso(serialValue: string) {
  const serial = Number(serialValue);

  if (!Number.isFinite(serial)) {
    return serialValue;
  }

  const epoch = Date.UTC(1899, 11, 30);
  return new Date(epoch + serial * 86_400_000).toISOString().slice(0, 10);
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let currentValue = "";
  let isInsideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === "\"" && isInsideQuotes && nextCharacter === "\"") {
      currentValue += "\"";
      index += 1;
      continue;
    }

    if (character === "\"") {
      isInsideQuotes = !isInsideQuotes;
      continue;
    }

    if (character === "," && !isInsideQuotes) {
      values.push(currentValue);
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue);
  return values;
}

function parseCsvRows(file: Express.Multer.File) {
  const lines = file.buffer
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error("Uploaded CSV file is empty.");
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce<Record<string, unknown>>((row, header, index) => {
      row[header] = cells[index] ?? "";
      return row;
    }, {});
  });
}

async function readZipText(zip: JSZip, path: string) {
  const file = zip.file(path);
  return file ? file.async("text") : null;
}

function parseSharedStrings(xml: string | null) {
  if (!xml) {
    return [];
  }

  return [...xml.matchAll(/<si\b[\s\S]*?<\/si>/g)].map((match) => {
    const textNodes = [...match[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)];
    return textNodes.map((textNode) => decodeXmlText(textNode[1])).join("");
  });
}

function resolveFirstWorksheetPath(workbookXml: string, workbookRelsXml: string) {
  const firstSheet = workbookXml.match(/<sheet\b[^>]*>/);

  if (!firstSheet) {
    throw new Error("Uploaded XLSX file does not contain a worksheet.");
  }

  const relationshipId = getXmlAttribute(firstSheet[0], "r:id");
  const relationship = [...workbookRelsXml.matchAll(/<Relationship\b[^>]*\/>/g)]
    .map((match) => match[0])
    .find((entry) => getXmlAttribute(entry, "Id") === relationshipId);

  if (!relationship) {
    throw new Error("Uploaded XLSX file has an invalid workbook relationship.");
  }

  const target = getXmlAttribute(relationship, "Target").replace(/^\/+/, "");
  return target.startsWith("xl/") ? target : `xl/${target}`;
}

function parseWorksheetRows(worksheetXml: string, sharedStrings: string[]) {
  return [...worksheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((rowMatch) => {
    const rowValues: string[] = [];
    const cells = [...rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)];

    for (const cell of cells) {
      const attributes = cell[1];
      const body = cell[2];
      const cellReference = getXmlAttribute(attributes, "r");
      const cellType = getXmlAttribute(attributes, "t");
      const valueMatch = body.match(/<v>([\s\S]*?)<\/v>/);
      const inlineTextMatch = body.match(/<t[^>]*>([\s\S]*?)<\/t>/);
      const columnIndex = getColumnIndex(cellReference);
      let value = "";

      if (cellType === "s" && valueMatch) {
        value = sharedStrings[Number(valueMatch[1])] ?? "";
      } else if (cellType === "inlineStr" && inlineTextMatch) {
        value = decodeXmlText(inlineTextMatch[1]);
      } else if (valueMatch) {
        value = valueMatch[1];
      }

      rowValues[columnIndex] = value;
    }

    return rowValues;
  });
}

async function parseXlsxRows(file: Express.Multer.File) {
  const zip = await JSZip.loadAsync(file.buffer);
  const workbookXml = await readZipText(zip, "xl/workbook.xml");
  const workbookRelsXml = await readZipText(zip, "xl/_rels/workbook.xml.rels");

  if (!workbookXml || !workbookRelsXml) {
    throw new Error("Uploaded XLSX file is missing workbook metadata.");
  }

  const worksheetPath = resolveFirstWorksheetPath(workbookXml, workbookRelsXml);
  const worksheetXml = await readZipText(zip, worksheetPath);

  if (!worksheetXml) {
    throw new Error("Uploaded XLSX file does not contain a readable worksheet.");
  }

  const sharedStrings = parseSharedStrings(await readZipText(zip, "xl/sharedStrings.xml"));
  const parsedRows = parseWorksheetRows(worksheetXml, sharedStrings);
  const headers = (parsedRows[0] ?? []).map((header) => normalizeCell(header));

  return parsedRows.slice(1).map((row) => {
    return headers.reduce<Record<string, unknown>>((parsedRow, header, index) => {
      const value = row[index] ?? "";
      parsedRow[header] = header === "feedbackDate" ? excelSerialDateToIso(value) : value;
      return parsedRow;
    }, {});
  });
}

async function parseUploadRows(file: Express.Multer.File) {
  if (/\.csv$/i.test(file.originalname)) {
    return parseCsvRows(file);
  }

  if (/\.xlsx$/i.test(file.originalname)) {
    return parseXlsxRows(file);
  }

  throw new Error("Unsupported file type. Accepted formats: .csv, .xlsx.");
}

function validateRows(rows: Record<string, unknown>[]) {
  const accepted: ParsedUploadRow[] = [];
  const rejected: RejectedUploadRow[] = [];
  const seenSourceKeys = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const missingColumns = requiredColumns.filter((column) => !normalizeCell(row[column]));

    if (missingColumns.length > 0) {
      rejected.push({
        rowNumber,
        sourceReferenceId: normalizeCell(row.sourceReferenceId) || undefined,
        reason: `Missing required column value(s): ${missingColumns.join(", ")}`
      });
      return;
    }

    const sourceType = normalizeSourceType(normalizeCell(row.sourceType));
    const sourceReferenceId = normalizeCell(row.sourceReferenceId);
    const feedbackDate = parseDate(normalizeCell(row.feedbackDate));
    const rating = parseRating(normalizeCell(row.rating));
    const sourceKey = `${sourceType}:${sourceReferenceId}`;

    if (!sourceType) {
      rejected.push({ rowNumber, sourceReferenceId, reason: `Invalid sourceType: ${normalizeCell(row.sourceType)}` });
      return;
    }

    if (!feedbackDate) {
      rejected.push({ rowNumber, sourceReferenceId, reason: "Invalid feedbackDate. Use a valid date value." });
      return;
    }

    if (rating === null) {
      rejected.push({ rowNumber, sourceReferenceId, reason: "Invalid rating. Use an integer from 1 to 5." });
      return;
    }

    if (seenSourceKeys.has(sourceKey)) {
      rejected.push({ rowNumber, sourceReferenceId, reason: "Duplicate sourceType/sourceReferenceId within uploaded file." });
      return;
    }

    seenSourceKeys.add(sourceKey);
    accepted.push({
      rowNumber,
      sourceType,
      sourceReferenceId,
      feedbackDate,
      rawText: normalizeCell(row.rawText),
      // Downstream NLP stories should consume maskedText so analysis does not expose common PII patterns.
      maskedText: normalizeCell(row.maskedText) || maskPii(normalizeCell(row.rawText)),
      rating,
      customerExternalId: normalizeCell(row.customerExternalId) || undefined,
      vinHash: normalizeCell(row.vinHash) || undefined,
      dealerCode: normalizeCell(row.dealerCode) || undefined,
      jobCardExternalId: normalizeCell(row.jobCardExternalId) || undefined,
      warrantyClaimExternalId: normalizeCell(row.warrantyClaimExternalId) || undefined
    });
  });

  return { accepted, rejected };
}

async function findExistingSourceKeys(rows: ParsedUploadRow[]) {
  if (rows.length === 0) {
    return new Set<string>();
  }

  const sourceKeys = rows.map((row) => `${row.sourceType}:${row.sourceReferenceId}`);
  const result = await pool.query<{ source_key: string }>(
    `
      SELECT source_type::text || ':' || source_reference_id AS source_key
      FROM feedback_records
      WHERE source_type::text || ':' || source_reference_id = ANY($1)
    `,
    [sourceKeys]
  );

  return new Set(result.rows.map((row) => row.source_key));
}

async function insertFeedbackRows(rows: ParsedUploadRow[]) {
  if (rows.length === 0) {
    return 0;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const row of rows) {
      await client.query(
        `
          INSERT INTO feedback_records (
            source_type,
            source_reference_id,
            customer_id,
            vehicle_id,
            dealer_id,
            job_card_id,
            warranty_claim_id,
            feedback_date,
            raw_text,
            masked_text,
            rating,
            processing_status
          )
          SELECT
            $1::"FeedbackSourceType",
            $2,
            customer_match.id,
            vehicle_match.id,
            dealer_match.id,
            job_card_match.id,
            warranty_claim_match.id,
            $3::timestamptz,
            $4,
            $5,
            $6,
            'Pending'::"ProcessingStatus"
          FROM (SELECT 1) anchor
          LEFT JOIN customers customer_match ON customer_match.external_id = $7
          LEFT JOIN vehicles vehicle_match ON vehicle_match.vin_hash = $8
          LEFT JOIN dealers dealer_match ON dealer_match.code = $9
          LEFT JOIN job_cards job_card_match ON job_card_match.external_id = $10
          LEFT JOIN warranty_claims warranty_claim_match ON warranty_claim_match.external_id = $11
        `,
        [
          row.sourceType,
          row.sourceReferenceId,
          row.feedbackDate,
          row.rawText,
          row.maskedText ?? null,
          row.rating ?? null,
          row.customerExternalId ?? null,
          row.vinHash ?? null,
          row.dealerCode ?? null,
          row.jobCardExternalId ?? null,
          row.warrantyClaimExternalId ?? null
        ]
      );
    }

    await client.query("COMMIT");
    return rows.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function uploadFeedbackFile(file: Express.Multer.File): Promise<FeedbackUploadResult> {
  const rows = await parseUploadRows(file);
  const { accepted, rejected } = validateRows(rows);
  const existingSourceKeys = await findExistingSourceKeys(accepted);
  const nonDuplicateRows = accepted.filter((row) => !existingSourceKeys.has(`${row.sourceType}:${row.sourceReferenceId}`));
  const duplicateRows = accepted.length - nonDuplicateRows.length;
  const insertedRows = await insertFeedbackRows(nonDuplicateRows);

  return {
    acceptedFormats: [".csv", ".xlsx"],
    totalRows: rows.length,
    acceptedRows: nonDuplicateRows.length,
    rejectedRows: rejected.length,
    duplicateRows,
    insertedRows,
    rejected
  };
}

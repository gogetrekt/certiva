export interface ParsedCredentialRow {
  rowNumber: number;
  studentName: string;
  studentId: string;
  degree: string;
  documentHash?: string;
}

export interface CsvParseError {
  rowNumber: number;
  message: string;
}

export interface ParsedCsvResult {
  rows: ParsedCredentialRow[];
  errors: CsvParseError[];
  hasHeader: boolean;
}

export function parseCredentialCsv(csvText: string): ParsedCsvResult {
  const rows: ParsedCredentialRow[] = [];
  const errors: CsvParseError[] = [];
  const normalized = csvText.replace(/^\uFEFF/, "");
  const lines = normalized.split(/\r?\n/);

  let hasHeader = false;
  let firstDataLineSeen = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const rowNumber = index + 1;

    if (!line.trim()) {
      continue;
    }

    const parsed = parseCsvLine(line);
    if (!parsed.ok) {
      errors.push({
        rowNumber,
        message: parsed.error,
      });
      continue;
    }

    const fields = parsed.fields.map((field) => field.trim());

    if (!firstDataLineSeen) {
      firstDataLineSeen = true;
      if (isHeaderRow(fields)) {
        hasHeader = true;
        continue;
      }
    }

    if (fields.length < 3) {
      errors.push({
        rowNumber,
        message:
          "Expected at least 3 columns (studentName, studentId, degree).",
      });
      continue;
    }

    const [studentName, studentId, degree, documentHash, ...rest] = fields;
    const extras = rest.filter((value) => value.trim().length > 0);
    if (extras.length > 0) {
      errors.push({
        rowNumber,
        message:
          "Too many columns. Expected studentName, studentId, degree, and optional documentHash.",
      });
      continue;
    }

    const normalizedHash = documentHash?.trim().toLowerCase();
    if (normalizedHash && !/^[a-f0-9]{64}$/.test(normalizedHash)) {
      errors.push({
        rowNumber,
        message: "documentHash must be a 64-character SHA-256 hex value.",
      });
      continue;
    }

    rows.push({
      rowNumber,
      studentName,
      studentId,
      degree,
      documentHash: normalizedHash || undefined,
    });
  }

  return { rows, errors, hasHeader };
}

function parseCsvLine(line: string):
  | { ok: true; fields: string[] }
  | { ok: false; error: string } {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      fields.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  if (inQuotes) {
    return { ok: false, error: "Unclosed quote in CSV line." };
  }

  fields.push(current);
  return { ok: true, fields };
}

function isHeaderRow(fields: string[]) {
  if (fields.length < 3) {
    return false;
  }

  const normalized = fields.slice(0, 4).map((value) =>
    value.trim().toLowerCase().replace(/[\s_-]+/g, ""),
  );

  return (
    normalized[0] === "studentname" &&
    normalized[1] === "studentid" &&
    normalized[2] === "degree"
  );
}

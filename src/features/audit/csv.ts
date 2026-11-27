/** Minimal RFC 4180 reader/writer for the audit export (comma, double quote). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') cell += c;
      else if (text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = false;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw new Error("Unterminated quoted CSV field");
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const FORMULA_START = /^[=+\-@\t\r\n]/;

/** A leading apostrophe stops spreadsheets running the cell as a formula. */
export const neutralise = (cell: string) => (FORMULA_START.test(cell) ? `'${cell}` : cell);

/** Re-writes the CSV with formula cells neutralised and every cell quoted. */
export function safeCsv(text: string): string {
  return parseCsv(text)
    .map((row) => `${row.map((c) => `"${neutralise(c).replace(/"/g, '""')}"`).join(",")}\r\n`)
    .join("");
}

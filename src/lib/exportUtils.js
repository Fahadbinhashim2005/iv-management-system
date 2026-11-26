/**
 * Escapes a single CSV cell value, neutralizing spreadsheet formula prefixes
 * (=, +, -, @, tab, CR) before quoting.
 */
export function escapeCsvCell(value) {
  const raw = value === null || value === undefined ? "" : String(value);
  const formulaSafe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${formulaSafe.replaceAll('"', '""')}"`;
}

/**
 * Triggers a browser download for a text/CSV payload and cleans up the object URL.
 */
export function downloadTextFile(filename, content, mimeType = "text/plain;charset=utf-8;") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Serializes header + row arrays into a safe UTF-8 CSV download.
 */
export function downloadCsvFile(filename, headers, rows) {
  const headerLine = headers.map(escapeCsvCell).join(",");
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(","));
  downloadTextFile(filename, [headerLine, ...dataLines].join("\n"), "text/csv;charset=utf-8;");
}

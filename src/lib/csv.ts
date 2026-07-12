// Small client-side CSV export helper — no dependency needed for something
// this simple. Used by Customers/Inventory "Export CSV" buttons.

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface CsvColumn {
  key: string;
  label: string;
}

export function downloadCSV(filename: string, columns: CsvColumn[], rows: Record<string, unknown>[]) {
  const header = columns.map(c => csvEscape(c.label)).join(',');
  const lines = rows.map(row => columns.map(c => csvEscape(row[c.key])).join(','));
  // Leading BOM so Excel reliably detects UTF-8 instead of mangling accented characters.
  const csv = '﻿' + [header, ...lines].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

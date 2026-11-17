// Tiny dependency-free Excel (.xlsx) writer: several sheets, bold header row, numbers stay numbers, dates stay dates.
// An .xlsx file is a ZIP of XML files; we build it with "stored" (uncompressed) entries.

const enc = new TextEncoder();
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function zip(files) {   // files: [{ name, data: Uint8Array }]
  const parts = [], central = []; let offset = 0;
  const u16 = n => [n & 255, (n >> 8) & 255], u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  files.forEach(f => {
    const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
    const local = new Uint8Array([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0)]);
    parts.push(local, name, f.data);
    central.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), name);
    offset += local.length + name.length + size;
  });
  const cdSize = central.reduce((a, p) => a + p.length, 0);
  const end = new Uint8Array([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), ...u16(0)]);
  const all = [...parts, ...central, end], out = new Uint8Array(all.reduce((a, p) => a + p.length, 0)); let o = 0;
  all.forEach(p => { out.set(p, o); o += p.length; });
  return out;
}

const esc = s => String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const colName = i => { let s = ""; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
const serial = d => { const t = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); return Math.round(t / 864e5) + 25569; };   // local calendar day -> Excel date number

// styles: 0 normal, 1 bold header, 2 whole number #,##0, 3 date, 4 bold total (number)
const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd\\-mmm\\-yyyy"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE6E9F8"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="3" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

function sheetXml(rows, bold = 1) {   // first row is the header; a row whose first cell is {total:"..."} is bold
  const widths = []; 
  const body = rows.map((row, r) => `<row r="${r + 1}">` + row.map((v, c) => {
    const ref = colName(c) + (r + 1);
    let isTotal = false; if (v && typeof v === "object" && !(v instanceof Date)) { isTotal = true; v = v.v; }
    const text = v instanceof Date ? "" : String(v ?? "");
    widths[c] = Math.max(widths[c] || 8, Math.min(48, (v instanceof Date ? 12 : typeof v === "number" ? String(Math.round(v)).length + 3 : text.length) + 2));
    if (v === null || v === undefined || v === "") return r < bold ? `<c r="${ref}" s="1"/>` : "";
    if (v instanceof Date) return Number.isNaN(+v) ? "" : `<c r="${ref}" s="3"><v>${serial(v)}</v></c>`;
    if (typeof v === "number" && Number.isFinite(v)) return `<c r="${ref}" s="${isTotal ? 4 : 2}"><v>${v}</v></c>`;
    return `<c r="${ref}" t="inlineStr" s="${r < bold || isTotal ? 1 : 0}"><is><t xml:space="preserve">${esc(text)}</t></is></c>`;
  }).join("") + `</row>`).join("");
  const cols = widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="${bold}" topLeftCell="A${bold + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols}</cols><sheetData>${body}</sheetData></worksheet>`;
}

// sheets: [{ name: "Invoices", rows: [["Header", ...], [..values..]] }]. Values: string, number, Date or null.
export function buildXlsx(sheets) {
  const names = sheets.map((s, i) => (String(s.name || `Sheet${i + 1}`).replace(/[\\/?*[\]:]/g, " ").slice(0, 31).trim() || `Sheet${i + 1}`));
  const files = [
    { name: "[Content_Types].xml", x: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>` },
    { name: "_rels/.rels", x: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", x: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", x: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", x: STYLES },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, x: sheetXml(s.rows.length ? s.rows : [[""]]) }))
  ].map(f => ({ name: f.name, data: enc.encode(f.x) }));
  return zip(files);
}

export function downloadXlsx(filename, sheets) {
  const blob = new Blob([buildXlsx(sheets)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename.endsWith(".xlsx") ? filename : filename + ".xlsx";
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export const total = v => ({ v });   // mark a cell as bold (use for the "Total" row)

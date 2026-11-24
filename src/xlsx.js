// Small dependency-free .xlsx writer: styled cells, merged cells, column widths, autofilter, formulas and an embedded PNG logo.
// An .xlsx file is a zip of XML files; the zip is written "stored" (no compression), which every spreadsheet app accepts.

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
const enc = new TextEncoder();

// ---------- zip (store) ----------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function zip(files) {
  const parts = [], central = []; let offset = 0;
  const u16 = n => [n & 255, (n >> 8) & 255], u32 = n => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  const time = 0, date = ((2024 - 1980) << 9) | (1 << 5) | 1;
  for (const [name, data] of files) {
    const nameB = enc.encode(name), crc = crc32(data), size = data.length;
    const head = new Uint8Array([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0), ...u16(0), ...u16(time), ...u16(date), ...u32(crc), ...u32(size), ...u32(size), ...u16(nameB.length), ...u16(0)]);
    parts.push(head, nameB, data);
    central.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(time), ...u16(date), ...u32(crc), ...u32(size), ...u32(size), ...u16(nameB.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset)]), nameB);
    offset += head.length + nameB.length + size;
  }
  const cdSize = central.reduce((a, p) => a + p.length, 0);
  const end = new Uint8Array([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), ...u16(0)]);
  const all = [...parts, ...central, end], out = new Uint8Array(all.reduce((a, p) => a + p.length, 0));
  let o = 0; for (const p of all) { out.set(p, o); o += p.length; }
  return out;
}

// ---------- helpers ----------
const colName = i => { let s = ""; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
export const ref = (r, c) => colName(c) + (r + 1);
// Excel stores a date as the number of days since 1899-12-30. Dates here are local calendar days.
export const excelDate = d => d ? Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(1899, 11, 30)) / 864e5) : null;
const px = w => Math.round(w * 7 + 5);          // column width (characters) to pixels
const EMU = 9525;                                // pixels to EMU

const FMT = { int: "#,##0", money: "#,##0", date: "dd-mmm-yyyy", pct: '0.0"%"', num2: "#,##0.00" };

export class Workbook {
  constructor() { this.sheets = []; this.styles = new Map(); this.fonts = []; this.fills = []; this.borders = []; this.numFmts = []; this.xfs = []; this.logo = null; this.style({}); }
  // A style is a plain object: { b, i, sz, color, bg, h, v, wrap, border, bc, fmt, indent, shrink }
  style(s) {
    const key = JSON.stringify(s); if (this.styles.has(key)) return this.styles.get(key);
    const pick = (list, xml) => { let i = list.indexOf(xml); if (i < 0) { i = list.length; list.push(xml); } return i; };
    const font = pick(this.fonts, `<font>${s.b ? "<b/>" : ""}${s.i ? "<i/>" : ""}<sz val="${s.sz || 11}"/><color rgb="FF${s.color || "1F2937"}"/><name val="Calibri"/><family val="2"/></font>`);
    const fill = s.bg ? 2 + this._fill(s.bg) : 0;
    const bc = s.bc || "C9D6EA", edge = s.border ? `style="thin"><color rgb="FF${bc}"/>` : null;
    const border = s.border ? pick(this.borders, `<border>${["left", "right", "top", "bottom"].map(e => `<${e} ${edge}</${e}>`).join("")}<diagonal/></border>`) : 0;
    const fmtCode = FMT[s.fmt] || s.fmt;
    const numFmt = !fmtCode ? 0 : fmtCode === "#,##0" ? 3 : fmtCode === "#,##0.00" ? 4 : 164 + pick(this.numFmts, fmtCode);
    const align = `<alignment horizontal="${s.h || "general"}" vertical="${s.v || "center"}"${s.wrap ? ' wrapText="1"' : ""}${s.shrink ? ' shrinkToFit="1"' : ""}${s.indent ? ` indent="${s.indent}"` : ""}/>`;
    const xf = `<xf numFmtId="${numFmt}" fontId="${font}" fillId="${fill}" borderId="${s.border ? border + 1 : 0}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${align}</xf>`;
    const id = this.xfs.length; this.xfs.push(xf); this.styles.set(key, id); return id;
  }
  _fill(rgb) { const xml = `<fill><patternFill patternType="solid"><fgColor rgb="FF${rgb}"/><bgColor indexed="64"/></patternFill></fill>`; let i = this.fills.indexOf(xml); if (i < 0) { i = this.fills.length; this.fills.push(xml); } return i; }
  sheet(name, widths) { const s = new Sheet(this, name, widths); this.sheets.push(s); return s; }
  _stylesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
      (this.numFmts.length ? `<numFmts count="${this.numFmts.length}">${this.numFmts.map((f, i) => `<numFmt numFmtId="${164 + i}" formatCode="${esc(f)}"/>`).join("")}</numFmts>` : "") +
      `<fonts count="${this.fonts.length}">${this.fonts.join("")}</fonts>` +
      `<fills count="${this.fills.length + 2}"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${this.fills.join("")}</fills>` +
      `<borders count="${this.borders.length + 1}"><border><left/><right/><top/><bottom/><diagonal/></border>${this.borders.join("")}</borders>` +
      `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
      `<cellXfs count="${this.xfs.length}">${this.xfs.join("")}</cellXfs>` +
      `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  }
  // Returns the file as bytes. `logo` is an optional Uint8Array holding a PNG.
  build() {
    const files = [], logo = this.logo, hasLogo = !!logo;
    const sheetsWithLogo = this.sheets.filter(s => s.logoBox && hasLogo);
    files.push(["[Content_Types].xml", enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${this.sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}${sheetsWithLogo.map(s => `<Override PartName="/xl/drawings/drawing${this.sheets.indexOf(s) + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`).join("")}</Types>`)]);
    files.push(["_rels/.rels", enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`)]);
    files.push(["xl/workbook.xml", enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${this.sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>${this.sheets.some(s => s.filter) ? `<definedNames>${this.sheets.map((s, i) => s.filter ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${esc(s.name)}'!${s.filter.split(":").map(a => a.replace(/^([A-Z]+)(\d+)$/, "$$$1$$$2")).join(":")}</definedName>` : "").join("")}</definedNames>` : ""}</workbook>`)]);
    files.push(["xl/_rels/workbook.xml.rels", enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${this.sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${this.sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`)]);
    this.sheets.forEach((s, i) => {
      const withLogo = s.logoBox && hasLogo;
      files.push([`xl/worksheets/sheet${i + 1}.xml`, enc.encode(s._xml(withLogo))]);
      if (withLogo) {
        files.push([`xl/worksheets/_rels/sheet${i + 1}.xml.rels`, enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${i + 1}.xml"/></Relationships>`)]);
        const { col, row, w, h, dx, dy } = s.logoBox, cx = w * EMU, cy = h * EMU;
        files.push([`xl/drawings/drawing${i + 1}.xml`, enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>${dx * EMU}</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>${dy * EMU}</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logo"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`)]);
        files.push([`xl/drawings/_rels/drawing${i + 1}.xml.rels`, enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/logo.png"/></Relationships>`)]);
      }
    });
    files.push(["xl/styles.xml", enc.encode(this._stylesXml())]);
    if (sheetsWithLogo.length) files.push(["xl/media/logo.png", logo]);
    return zip(files);
  }
  blob() { return new Blob([this.build()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }); }
}

class Sheet {
  constructor(wb, name, widths) {
    this.wb = wb; this.name = String(name).replace(/[\[\]:*?/\\]/g, " ").slice(0, 31) || "Sheet";
    this.widths = widths; this.cells = new Map(); this.merges = []; this.heights = new Map(); this.filter = null; this.logoBox = null; this.landscape = true;
  }
  // value: string | number | null | { f: "formula", v: cachedValue }
  set(r, c, value, style = {}) { this.cells.set(r + "," + c, { r, c, value, s: this.wb.style(style) }); }
  fillRange(r1, c1, r2, c2, style) { for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (!this.cells.has(r + "," + c)) this.set(r, c, null, style); }
  merge(r1, c1, r2, c2) { if (r1 !== r2 || c1 !== c2) this.merges.push(`${ref(r1, c1)}:${ref(r2, c2)}`); }
  height(r, h) { this.heights.set(r, h); }
  _xml(withLogo) {
    const rows = new Map(); let maxR = 0, maxC = 0;
    for (const cell of this.cells.values()) { (rows.get(cell.r) || rows.set(cell.r, []).get(cell.r)).push(cell); maxR = Math.max(maxR, cell.r); maxC = Math.max(maxC, cell.c); }
    const cellXml = ({ r, c, value, s }) => {
      const a = `r="${ref(r, c)}" s="${s}"`;
      if (value === null || value === undefined || value === "") return `<c ${a}/>`;
      if (typeof value === "number") return Number.isFinite(value) ? `<c ${a}><v>${value}</v></c>` : `<c ${a}/>`;
      if (typeof value === "object" && value.f) return typeof value.v === "number" ? `<c ${a}><f>${esc(value.f)}</f><v>${value.v}</v></c>` : `<c ${a} t="str"><f>${esc(value.f)}</f><v>${esc(value.v)}</v></c>`;
      return `<c ${a} t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
    };
    const sheetData = [...rows.keys()].sort((a, b) => a - b).map(r => `<row r="${r + 1}"${this.heights.has(r) ? ` ht="${this.heights.get(r)}" customHeight="1"` : ""}>${rows.get(r).sort((a, b) => a.c - b.c).map(cellXml).join("")}</row>`).join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${ref(maxR, maxC)}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0"${this.wb.sheets[0] === this ? ' tabSelected="1"' : ""}/></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${this.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${sheetData}</sheetData>${this.filter ? `<autoFilter ref="${this.filter}"/>` : ""}${this.merges.length ? `<mergeCells count="${this.merges.length}">${this.merges.map(m => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : ""}<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="${this.landscape ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/>${withLogo ? '<drawing r:id="rId1"/>' : ""}</worksheet>`;
  }
}

// ---------- the report layout ----------
const C = { navy: "0B2A5B", blue: "1565C0", band: "EAF1FB", line: "C9D6EA", soft: "F4F8FD", ink: "1F2937", mute: "64748B", accent: "1E5BB8" };
const PILL = {   // status colours, like the Paid / Pending pills of the sample
  Paid: ["D5F2DC", "176B34"], Pending: ["FFE8CC", "9A5300"], Partial: ["DCE8FF", "1D4ED8"], Overdue: ["FDDADA", "9B1C1C"], Cancelled: ["E5E7EB", "4B5563"],
  Profit: ["D5F2DC", "176B34"], Loss: ["FDDADA", "9B1C1C"], Even: ["E5E7EB", "4B5563"]
};
// Splits `total` columns between cards in proportion to their weights (each card gets at least one column).
const spans = (weights, total) => { const sum = weights.reduce((a, b) => a + b, 0); let cum = 0, prev = 0; return weights.map((w, i) => { cum += w; const end = i === weights.length - 1 ? total : Math.max(prev + 1, Math.round(cum / sum * total)); const r = [prev, end - 1]; prev = end; return r; }); };

// Banner = logo, business name, report title pill, generated date. Returns the next free row.
function banner(sh, { business, title, subtitle, date }) {
  const n = sh.widths.length, W = sh.widths.map(px);
  let logoEnd = 0, acc = 0; while (logoEnd < n - 2 && acc < 130) acc += W[logoEnd++];
  let pillStart = n, acc2 = 0; while (pillStart > logoEnd + 1 && acc2 < 190) acc2 += W[--pillStart];
  const tStart = logoEnd, tEnd = pillStart - 1;
  const bg = { bg: C.band };
  sh.fillRange(0, 0, 2, n - 1, bg);
  [34, 24, 22].forEach((h, r) => sh.height(r, h));
  const width = W.slice(tStart, tEnd + 1).reduce((a, b) => a + b, 0);
  const sz = Math.max(11, Math.min(22, Math.floor(width / (0.74 * Math.max(8, business.length)))));
  sh.set(0, tStart, business, { b: true, sz, color: C.navy, bg: C.band, h: "center", v: "bottom", wrap: false }); sh.merge(0, tStart, 1, tEnd); sh.fillRange(0, tStart, 1, tEnd, bg);
  sh.set(2, tStart, subtitle, { i: true, sz: 11, color: C.accent, bg: C.band, h: "center", v: "center", shrink: true }); sh.merge(2, tStart, 2, tEnd);
  sh.set(0, pillStart, title, { b: true, sz: 16, color: "FFFFFF", bg: C.navy, h: "center", v: "center", shrink: true }); sh.merge(0, pillStart, 1, n - 1); sh.fillRange(0, pillStart, 1, n - 1, { bg: C.navy });
  sh.set(2, pillStart, `Report generated on:  ${date}`, { b: true, sz: 10, color: C.ink, bg: C.band, h: "center", shrink: true }); sh.merge(2, pillStart, 2, n - 1);
  sh.height(3, 6); sh.fillRange(3, 0, 3, n - 1, { bg: C.accent });
  sh.logoBox = { col: 0, row: 0, w: 66, h: 66, dx: 12, dy: 5 };
  sh.height(4, 10);
  return 5;
}

// Rows of small cards: grey label above, bold value below.
function cards(sh, row, items) {
  const n = sh.widths.length, sp = spans(items.map(i => i.weight || 1), n);
  items.forEach((it, i) => {
    const [a, b] = sp[i], tone = it.tone === "bad" ? "B42318" : it.tone === "good" ? "176B34" : C.navy;
    sh.set(row, a, String(it.label).toUpperCase(), { b: true, sz: 9, color: C.mute, bg: C.soft, border: true, bc: C.line, h: "center", shrink: true }); sh.merge(row, a, row, b); sh.fillRange(row, a, row, b, { bg: C.soft, border: true, bc: C.line });
    const fmt = it.fmt === "money" ? "money" : it.fmt === "int" ? "int" : undefined, v = it.value;
    sh.set(row + 1, a, v === "" || v == null ? "—" : v, { b: true, sz: 13, color: tone, border: true, bc: C.line, h: "center", wrap: true, fmt, v: "center" }); sh.merge(row + 1, a, row + 1, b); sh.fillRange(row + 1, a, row + 1, b, { border: true, bc: C.line });
  });
  sh.height(row, 18); sh.height(row + 1, it_height(items));
  return row + 2;
}
const it_height = items => items.some(i => typeof i.value === "string" && i.value.length > 22) ? 36 : 26;

// columns: { h: heading, w: width, type: text|center|int|money|date|status|pct|pl, get: row => value, total: "sum" }
export function addReport(wb, { name, business, title, subtitle, columns, rows, cardRows = [], date, totalLabel = "Grand Total:", totalWord = "Records", totalText }) {
  const sh = wb.sheet(name, columns.map(c => c.w)); const n = columns.length;
  let r = banner(sh, { business, title, subtitle, date });
  for (const items of cardRows) { r = cards(sh, r, items); r++; sh.height(r - 1, 8); }
  if (cardRows.length === 0) r = 5;
  const headRow = r;
  columns.forEach((c, i) => sh.set(headRow, i, c.h, { b: true, sz: 11, color: "FFFFFF", bg: C.navy, border: true, bc: C.navy, h: c.type === "text" ? "left" : "center", wrap: true, indent: c.type === "text" ? 1 : 0 }));
  sh.height(headRow, 30);
  const first = headRow + 1;
  rows.forEach((row, i) => {
    const bg = i % 2 ? C.band : "FFFFFF", rr = first + i; let tall = false;
    columns.forEach((c, j) => {
      let v = c.get(row, i), st = { sz: 11, color: C.ink, bg, border: true, bc: C.line };
      if (c.type === "text") st = { ...st, h: "left", indent: 1, wrap: !!c.wrap };
      else if (c.type === "center") st = { ...st, h: "center" };
      else if (c.type === "int") st = { ...st, h: "center", fmt: "int" };
      else if (c.type === "money") st = { ...st, h: "right", fmt: "money", indent: 1 };
      else if (c.type === "pct") st = { ...st, h: "right", fmt: "pct", indent: 1 };
      else if (c.type === "date") { st = { ...st, h: "center", fmt: "date" }; v = v instanceof Date ? excelDate(v) : v; }
      else if (c.type === "status" || c.type === "pl") { const [fill, ink] = PILL[v] || ["E5E7EB", "4B5563"]; st = { ...st, bg: fill, color: ink, b: true, h: "center" }; }
      if (c.tone) { const t = c.tone(row); if (t) st = { ...st, color: t === "bad" ? "B42318" : "176B34", b: true }; }
      if (c.type === "text" && c.w && String(v ?? "").length > c.w * 1.05) { tall = true; st = { ...st, wrap: true }; }
      sh.set(rr, j, v === "" ? null : v, st);
    });
    sh.height(rr, tall ? 38 : 22);
  });
  const last = first + rows.length - 1, tr = last + 1;
  if (rows.length) {
    sh.filter = `${ref(headRow, 0)}:${ref(last, n - 1)}`;
    const sums = columns.map((c, i) => c.total === "sum" ? i : -1).filter(i => i >= 0), firstSum = sums.length ? sums[0] : n;
    const tot = { b: true, sz: 11, color: "FFFFFF", bg: C.navy, border: true, bc: C.navy };
    sh.height(tr, 28);
    sh.fillRange(tr, 0, tr, n - 1, tot);
    const leftEnd = Math.max(0, firstSum - 2);
    sh.set(tr, 0, totalText || { f: `"Total ${totalWord}: "&SUBTOTAL(103,${ref(first, 1)}:${ref(last, 1)})`, v: `Total ${totalWord}: ${rows.length}` }, { ...tot, h: "left", indent: 1, sz: 12 }); sh.merge(tr, 0, tr, leftEnd);
    if (sums.length) {
      if (firstSum - 1 > leftEnd) sh.set(tr, firstSum - 1, totalLabel, { ...tot, h: "right", sz: 12, indent: 1 });
      sums.forEach(i => { const c = columns[i], col = ref(first, i) + ":" + ref(last, i); sh.set(tr, i, { f: `SUBTOTAL(109,${col})`, v: rows.reduce((a, row, k) => a + (Number(c.get(row, k)) || 0), 0) }, { ...tot, bg: C.blue, bc: C.blue, h: "right", fmt: "money", sz: 12, indent: 1 }); });
    }
  } else {
    sh.set(first, 0, "No records for this selection.", { i: true, color: C.mute, h: "left", indent: 1 }); sh.merge(first, 0, first, n - 1);
  }
  const noteRow = (rows.length ? tr : first) + 2;
  sh.set(noteRow, 0, `${business}  ·  generated from Finora on ${date}`, { sz: 9, color: C.mute, i: true, h: "left" }); sh.merge(noteRow, 0, noteRow, n - 1);
  return sh;
}

export const downloadBlob = (blob, name) => {
  const url = URL.createObjectURL(blob), a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
};

import type { HistoryCard } from "./store";
import type { ObservationResponse } from "../client/data-service";

export function historyPdfFilename(card: HistoryCard) {
  const name = `${card.location}-${card.selection.datasetId}-${card.selection.start}-${card.selection.end}`;
  return `TerraAI-${name.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 160)}.pdf`;
}

/** Draw text with browser fonts so Myanmar place names retain their correct shaping in PDFs. */
export async function createHistoryPdf(card: HistoryCard, result: ObservationResponse): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  await document.fonts.ready;
  await document.fonts.load('22px Padauk').catch(() => undefined);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const width = 1240, height = 1754, margin = 82, contentWidth = width - margin * 2;
  let canvas!: HTMLCanvasElement;
  let ctx!: CanvasRenderingContext2D;
  let y = 0, page = 0;
  const font = (size: number, bold = false) => { ctx.font = `${bold ? "600" : "400"} ${size}px Inter, Padauk, sans-serif`; };
  function beginPage() {
    canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("PDF downloads are unavailable in this browser.");
    ctx = context; ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#6542cc"; ctx.fillRect(0, 0, width, 12);
    font(20, true); ctx.fillStyle = "#6542cc"; ctx.fillText("TERRAAI / SAVED DISCOVERY", margin, 62);
    y = 110;
  }
  function finishPage() {
    font(17); ctx.fillStyle = "#5a677b";
    ctx.fillText(`Saved search snapshot  |  ${++page}`, margin, height - 45);
    if (page > 1) pdf.addPage();
    pdf.addImage(canvas.toDataURL("image/jpeg", .94), "JPEG", 0, 0, 210, 297);
  }
  function ensure(space: number) { if (y + space > height - 95) { finishPage(); beginPage(); } }
  function text(value: string, size = 22, bold = false, color = "#263249") {
    font(size, bold);
    const segments = new Intl.Segmenter(undefined, { granularity: "word" }).segment(value);
    let line = "";
    const flush = () => { ensure(size * 1.65); font(size, bold); ctx.fillStyle = color; ctx.fillText(line.trim(), margin, y, contentWidth); y += size * 1.55; line = ""; };
    for (const { segment } of segments) {
      if (segment === "\n") { flush(); continue; }
      if (ctx.measureText(line + segment).width > contentWidth && line) flush();
      line += segment;
    }
    if (line) flush();
    y += 8;
  }
  function heading(value: string) { ensure(90); y += 18; text(value, 24, true, "#6542cc"); }
  const number = (value: number | null) => value === null ? "No reading" : new Intl.NumberFormat("en", { maximumFractionDigits: 4 }).format(value);
  beginPage();
  text(card.location, 36, true);
  if (card.locationMy && card.locationMy !== card.location) text(card.locationMy, 24);
  text(card.locationType === "township" ? `Township in ${card.region}` : `State / region: ${card.region}`, 20);
  text(card.dataset, 27, true);
  text(`${card.selection.start} to ${card.selection.end} (UTC)`, 22);
  text(`Saved: ${new Date(card.savedAt).toLocaleString("en-GB", { timeZone: "Asia/Yangon" })} (Myanmar time)`, 18);
  text(`Data retrieved: ${new Date(result.observedAt).toLocaleString("en-GB", { timeZone: "Asia/Yangon" })}`, 18);
  heading("Observation summary");
  text(`Mean: ${number(result.summary.mean)} ${card.unit}    Minimum: ${number(result.summary.min)} ${card.unit}`, 21);
  text(`Maximum: ${number(result.summary.max)} ${card.unit}    Latest: ${number(result.summary.latest)} ${card.unit}`, 21);
  text(`${result.summary.count} valid observations; ${result.missingCount} missing readings. Missing readings are not zeros.`, 19);

  ensure(390);
  const plot = { x: margin + 95, y: y + 15, w: contentWidth - 120, h: 265 };
  const valid = result.observations.filter(p => p.value !== null && Number.isFinite(p.value));
  if (valid.length) {
    const lo = Math.min(...valid.map(p => p.value!)), hi = Math.max(...valid.map(p => p.value!));
    const pad = Math.max((hi - lo) * .12, .02);
    const first = Date.parse(result.observations[0].date), last = Date.parse(result.observations.at(-1)!.date);
    const xFor = (date: string) => plot.x + (last === first ? .5 : (Date.parse(date) - first) / (last - first)) * plot.w;
    const yFor = (value: number) => plot.y + (hi + pad - value) / (hi - lo + 2 * pad) * plot.h;
    font(17);
    for (let i = 0; i <= 4; i++) {
      const value = hi + pad - i / 4 * (hi - lo + 2 * pad);
      const py = plot.y + i / 4 * plot.h;
      ctx.strokeStyle = "#dce1eb"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(plot.x, py); ctx.lineTo(plot.x + plot.w, py); ctx.stroke();
      ctx.fillStyle = "#5a677b"; ctx.textAlign = "right"; ctx.fillText(number(value), plot.x - 12, py + 5); ctx.textAlign = "left";
    }
    ctx.strokeStyle = "#6542cc"; ctx.lineWidth = 3; ctx.beginPath(); let drawing = false;
    for (const point of result.observations) {
      if (point.value === null || !Number.isFinite(point.value)) { drawing = false; continue; }
      const x = xFor(point.date), py = yFor(point.value);
      if (drawing) ctx.lineTo(x, py); else ctx.moveTo(x, py);
      drawing = true;
    }
    ctx.stroke();
    if (valid.length === 1) { ctx.fillStyle = "#6542cc"; ctx.beginPath(); ctx.arc(xFor(valid[0].date), yFor(valid[0].value!), 5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = "#5a677b"; font(18);
    ctx.fillText(result.observations[0].date, plot.x, plot.y + plot.h + 32);
    ctx.textAlign = "right"; ctx.fillText(result.observations.at(-1)!.date, plot.x + plot.w, plot.y + plot.h + 32); ctx.textAlign = "left";
    y = plot.y + plot.h + 65;
    text(`Unit: ${card.unit} | ${result.dataset.temporalResolution ?? "Daily"}`, 19);
  }
  heading("Source and geographic coverage");
  text(result.source.name, 21, true);
  if (result.source.url) text(result.source.url, 18);
  if (result.spatialBasis) text(result.spatialBasis.label, 20);
  text(result.geographicCoverage, 19);
  heading("What this data means");
  text(result.dataset.description, 20);
  text(result.dataset.limitations, 19);
  if (result.qaPolicy) { heading("Quality filtering"); text(result.qaPolicy, 19); }
  if (result.dataWarning) { heading("Data warning"); text(result.dataWarning, 20, true, "#9c4d16"); }
  heading("About this saved report");
  text("This PDF preserves the observations retrieved for this search. It is not a new data request, a forecast, or an official warning. Nearby places may share the same source grid cell. Saved history is stored only in the browser on this device.", 19);
  finishPage();
  pdf.setProperties({ title: `${card.location} - ${card.dataset}`, subject: "Saved TerraAI observation report", creator: "TerraAI" });
  return pdf.output("blob");
}

export async function downloadHistoryPdf(card: HistoryCard, result: ObservationResponse) {
  const blob = await createHistoryPdf(card, result);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = historyPdfFilename(card);
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

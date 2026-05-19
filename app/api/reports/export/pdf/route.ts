import { requireOwner } from "@/lib/auth-session";
import {
  getOwnerReportSummary,
  getOwnerReportTransactions,
  reportDateStamp,
  rupiah,
} from "@/lib/reports";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function escapeText(value: string) {
  return value
    .replace(/[^\x20-\x7E]/g, " ")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

function color(hex: string) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;

  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

function text(
  value: string,
  x: number,
  y: number,
  size = 10,
  font = "F1",
  fill = "#0F172A",
) {
  return [
    "BT",
    `/${font} ${size} Tf`,
    `${color(fill)} rg`,
    `${x} ${PAGE_HEIGHT - y} Td`,
    `(${escapeText(value)}) Tj`,
    "ET",
  ].join("\n");
}

function rect(
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  stroke?: string,
) {
  const yy = PAGE_HEIGHT - y - height;

  if (!stroke) {
    return `${color(fill)} rg\n${x} ${yy} ${width} ${height} re f`;
  }

  return [
    `${color(fill)} rg`,
    `${color(stroke)} RG`,
    "0.8 w",
    `${x} ${yy} ${width} ${height} re B`,
  ].join("\n");
}

function line(x1: number, y1: number, x2: number, y2: number, stroke = "#E2E8F0") {
  return `${color(stroke)} RG\n0.8 w\n${x1} ${PAGE_HEIGHT - y1} m\n${x2} ${PAGE_HEIGHT - y2} l\nS`;
}

function metricCard(x: number, y: number, width: number, label: string, value: string) {
  return [
    rect(x, y, width, 58, "#F8FAFC", "#E2E8F0"),
    text(label.toUpperCase(), x + 10, y + 18, 7, "F2", "#64748B"),
    text(value, x + 10, y + 40, 12, "F2", "#0F172A"),
  ].join("\n");
}

function truncate(value: string, max = 22) {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function tableHeader(
  y: number,
  columns: { label: string; x: number; width: number }[],
) {
  return [
    rect(40, y, 515, 24, "#0F172A"),
    ...columns.map((column) =>
      text(column.label, column.x, y + 16, 8, "F2", "#FFFFFF"),
    ),
  ].join("\n");
}

function tableRow(
  y: number,
  columns: { value: string; x: number; max?: number; right?: boolean }[],
) {
  return [
    rect(40, y, 515, 24, "#FFFFFF", "#E2E8F0"),
    ...columns.map((column) => {
      const value = truncate(column.value, column.max ?? 18);
      const x = column.right ? column.x - value.length * 4 : column.x;

      return text(value, x, y + 16, 8, "F1", "#334155");
    }),
  ].join("\n");
}

function buildPdf(content: string) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}

export async function GET(req: Request) {
  const auth = requireOwner(req);

  if (!auth.ok) {
    return auth.response;
  }

  const [report, transactions] = await Promise.all([
    getOwnerReportSummary(),
    getOwnerReportTransactions(10),
  ]);
  const paymentRows = [
    ...report.today.paymentSummary.map((item) => ({
      period: "Hari Ini",
      method: item.paymentLabel,
      transactions: item.transactions,
      total: item.total,
    })),
    ...report.month.paymentSummary.map((item) => ({
      period: "Bulan Ini",
      method: item.paymentLabel,
      transactions: item.transactions,
      total: item.total,
    })),
  ];
  let y = 0;
  const chunks: string[] = [
    rect(0, 0, PAGE_WIDTH, 96, "#0F172A"),
    text(report.settings.storeName, 40, 38, 22, "F2", "#FFFFFF"),
    text("Laporan Owner", 40, 62, 12, "F1", "#CBD5E1"),
    text(`Tanggal cetak: ${formatDateTime(new Date())}`, 360, 38, 8, "F1", "#CBD5E1"),
    text("Periode: Hari ini dan bulan ini", 390, 56, 8, "F1", "#CBD5E1"),
    text("Ringkasan", 40, 124, 14, "F2", "#0F172A"),
    metricCard(40, 145, 160, "Omzet kotor hari ini", rupiah(report.today.grossOmzet)),
    metricCard(218, 145, 150, "Transaksi hari ini", String(report.today.transactions)),
    metricCard(386, 145, 169, "Omzet bersih hari ini", rupiah(report.today.netOmzet)),
    metricCard(40, 218, 160, "Omzet kotor bulan ini", rupiah(report.month.grossOmzet)),
    metricCard(218, 218, 150, "Transaksi bulan ini", String(report.month.transactions)),
    metricCard(386, 218, 169, "Omzet bersih bulan ini", rupiah(report.month.netOmzet)),
    text("Ringkasan Retur", 40, 306, 14, "F2", "#0F172A"),
    metricCard(40, 326, 160, "Jumlah retur bulan ini", String(report.month.returnCount)),
    metricCard(218, 326, 150, "Nilai retur bulan ini", rupiah(report.month.returnValue)),
    metricCard(
      386,
      326,
      169,
      "Alasan terbanyak",
      report.returns.topReason?.label ?? "-",
    ),
    text("Payment Summary", 40, 418, 14, "F2", "#0F172A"),
    tableHeader(438, [
      { label: "Periode", x: 52, width: 90 },
      { label: "Payment", x: 150, width: 120 },
      { label: "Transaksi", x: 300, width: 80 },
      { label: "Total Omzet", x: 420, width: 120 },
    ]),
  ];

  y = 462;
  if (paymentRows.length === 0) {
    chunks.push(tableRow(y, [{ value: "Belum ada transaksi", x: 52, max: 60 }]));
    y += 26;
  } else {
    for (const item of paymentRows.slice(0, 6)) {
      chunks.push(
        tableRow(y, [
          { value: item.period, x: 52, max: 14 },
          { value: item.method, x: 150, max: 18 },
          { value: String(item.transactions), x: 300, max: 8 },
          { value: rupiah(item.total), x: 535, max: 18, right: true },
        ]),
      );
      y += 26;
    }
  }

  y = Math.max(y + 28, 560);
  chunks.push(
    text("Transaksi Terakhir", 40, y, 14, "F2", "#0F172A"),
    tableHeader(y + 20, [
      { label: "Invoice", x: 52, width: 88 },
      { label: "Tanggal", x: 142, width: 92 },
      { label: "Customer", x: 238, width: 84 },
      { label: "Kasir", x: 325, width: 72 },
      { label: "Payment", x: 400, width: 58 },
      { label: "Total", x: 463, width: 78 },
    ]),
  );
  y += 44;

  if (transactions.length === 0) {
    chunks.push(tableRow(y, [{ value: "Belum ada transaksi bulan ini", x: 52, max: 60 }]));
  } else {
    for (const sale of transactions.slice(0, 10)) {
      if (y > 710) {
        break;
      }

      chunks.push(
        tableRow(y, [
          { value: sale.invoiceNumber, x: 52, max: 14 },
          { value: formatDateTime(sale.createdAt), x: 142, max: 18 },
          { value: sale.customer?.name ?? "Walk-in", x: 238, max: 14 },
          { value: sale.cashier.name, x: 325, max: 12 },
          { value: sale.paymentLabel, x: 400, max: 10 },
          { value: rupiah(sale.subtotal), x: 540, max: 16, right: true },
        ]),
      );
      y += 26;
    }
  }

  chunks.push(
    line(40, 748, 555, 748),
    text("Powered by Meijrverse", 40, 766, 8, "F1", "#64748B"),
    text("Developer: Akbar Fahreza a.k.a Alexander Van Meijr", 320, 766, 8, "F1", "#64748B"),
  );

  const filename = `owner-report-${reportDateStamp()}.pdf`;

  return new NextResponse(new Uint8Array(buildPdf(chunks.join("\n"))), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

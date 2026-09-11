import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getEstadoCuentaContrato } from "@/lib/estado-cuenta-contrato";
import { formatDate } from "@/lib/utils/format";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await getEstadoCuentaContrato(id);

  if (!data) {
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
  }

  const { contrato, cliente, nombreCliente, propiedades, resumen } = data;
  const detalle = [...resumen.detalle].sort((a, b) => a.numero_cuota - b.numero_cuota);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Urbanizadora LYF Olmos";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Estado de cuenta");
  sheet.columns = [
    { width: 12 },
    { width: 30 },
    { width: 16 },
    { width: 16 },
    { width: 14 },
    { width: 16 },
    { width: 16 },
    { width: 14 },
    { width: 14 },
  ];

  sheet.mergeCells("A1:H1");
  sheet.getCell("A1").value = `Estado de cuenta - Contrato N.º ${contrato.numero}`;
  sheet.getCell("A1").font = { bold: true, size: 14 };

  sheet.mergeCells("A2:H2");
  sheet.getCell("A2").value = `Generado el ${formatDate(new Date().toISOString().slice(0, 10))}`;
  sheet.getCell("A2").font = { italic: true, size: 9, color: { argb: "FF64748B" } };

  const infoLabelStyle = { font: { bold: true } };

  sheet.getCell("A4").value = "Cliente:";
  sheet.getCell("A4").font = infoLabelStyle.font;
  sheet.getCell("B4").value = nombreCliente;

  sheet.getCell("A5").value = cliente?.tipo_persona === "juridica" ? "NIT:" : "Documento:";
  sheet.getCell("A5").font = infoLabelStyle.font;
  sheet.getCell("B5").value =
    cliente?.tipo_persona === "juridica" ? cliente?.nit ?? "-" : cliente?.documento ?? "-";

  sheet.getCell("A6").value = "Propiedad(es):";
  sheet.getCell("A6").font = infoLabelStyle.font;
  sheet.getCell("B6").value =
    propiedades.length > 0
      ? propiedades
          .map(
            (p) =>
              `${p.proyecto ? `${p.proyecto} · ` : ""}${p.direccion}${
                p.manzana ? ` Mz.${p.manzana}` : ""
              }${p.numero_lote ? ` Lote ${p.numero_lote}` : ""}`
          )
          .join(" | ")
      : "-";

  sheet.getCell("A7").value = "Estado del contrato:";
  sheet.getCell("A7").font = infoLabelStyle.font;
  sheet.getCell("B7").value = contrato.estado;

  sheet.getCell("A8").value = "Fecha de inicio:";
  sheet.getCell("A8").font = infoLabelStyle.font;
  sheet.getCell("B8").value = formatDate(contrato.fecha_inicio);

  sheet.getCell("D4").value = "Total contratado:";
  sheet.getCell("D4").font = infoLabelStyle.font;
  sheet.getCell("E4").value = resumen.totalMonto;
  sheet.getCell("E4").numFmt = "#,##0";

  sheet.getCell("D5").value = "Total pagado:";
  sheet.getCell("D5").font = infoLabelStyle.font;
  sheet.getCell("E5").value = resumen.totalPagado;
  sheet.getCell("E5").numFmt = "#,##0";

  sheet.getCell("D6").value = "Saldo pendiente:";
  sheet.getCell("D6").font = infoLabelStyle.font;
  sheet.getCell("E6").value = resumen.totalPendiente;
  sheet.getCell("E6").numFmt = "#,##0";

  sheet.getCell("D7").value = "Mora acumulada:";
  sheet.getCell("D7").font = infoLabelStyle.font;
  sheet.getCell("E7").value = resumen.totalMora;
  sheet.getCell("E7").numFmt = "#,##0";

  const headerRowIndex = 10;
  const headers = [
    "Cuota",
    "Vencimiento",
    "Monto",
    "Pagado",
    "Mora",
    "Fecha de pago",
    "Referencia",
    "N.º Recibo",
    "Estado",
  ];
  const headerRow = sheet.getRow(headerRowIndex);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E9BD7" } };
    cell.alignment = { vertical: "middle" };
  });

  detalle.forEach((c, idx) => {
    const row = sheet.getRow(headerRowIndex + 1 + idx);
    row.getCell(1).value = c.numero_cuota === 0 ? "Inicial" : `#${c.numero_cuota}`;
    row.getCell(2).value = formatDate(c.fecha_vencimiento);
    row.getCell(3).value = c.monto;
    row.getCell(3).numFmt = "#,##0";
    row.getCell(4).value = c.monto_pagado;
    row.getCell(4).numFmt = "#,##0";
    row.getCell(5).value = c.recargo;
    row.getCell(5).numFmt = "#,##0";
    row.getCell(6).value = formatDate(c.fecha_pago);
    row.getCell(7).value = c.referencia ?? "-";
    row.getCell(8).value = c.numero_recibo ?? "-";
    row.getCell(9).value = c.estado;
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="estado-cuenta-contrato-${contrato.numero}.xlsx"`,
    },
  });
}

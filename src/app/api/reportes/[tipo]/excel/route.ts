import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getReportes, REPORTE_TIPOS, type ReporteTipo, type ReporteMesFila } from "@/lib/reportes";
import { formatDate } from "@/lib/utils/format";

export const runtime = "nodejs";

function headerCell(cell: ExcelJS.Cell, valor: string) {
  cell.value = valor;
  cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E9BD7" } };
}

function agregarHojaRecaudo(
  workbook: ExcelJS.Workbook,
  nombreHoja: string,
  proyectos: string[],
  filasPorMes: ReporteMesFila[],
  totalesPorProyecto: Record<string, number>,
  totalGeneralAnio: number,
  anio: number
) {
  const sheet = workbook.addWorksheet(nombreHoja);
  const header = ["Mes", ...proyectos, "Total"];
  sheet.columns = header.map((_, i) => ({ width: i === 0 ? 14 : 16 }));

  const headerRow = sheet.getRow(1);
  header.forEach((h, i) => headerCell(headerRow.getCell(i + 1), h));

  filasPorMes.forEach((fila, idx) => {
    const row = sheet.getRow(idx + 2);
    row.getCell(1).value = fila.nombreMes;
    proyectos.forEach((p, i) => {
      const cell = row.getCell(i + 2);
      cell.value = fila.porProyecto[p] ?? 0;
      cell.numFmt = "#,##0";
    });
    const totalCell = row.getCell(proyectos.length + 2);
    totalCell.value = fila.total;
    totalCell.numFmt = "#,##0";
    totalCell.font = { bold: true };
  });

  const totalRow = sheet.getRow(filasPorMes.length + 2);
  totalRow.getCell(1).value = `Total ${anio}`;
  totalRow.getCell(1).font = { bold: true };
  proyectos.forEach((p, i) => {
    const cell = totalRow.getCell(i + 2);
    cell.value = totalesPorProyecto[p] ?? 0;
    cell.numFmt = "#,##0";
    cell.font = { bold: true };
  });
  const totalGeneralCell = totalRow.getCell(proyectos.length + 2);
  totalGeneralCell.value = totalGeneralAnio;
  totalGeneralCell.numFmt = "#,##0";
  totalGeneralCell.font = { bold: true };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tipo: string }> }
) {
  const { tipo } = await params;
  const tipos = REPORTE_TIPOS.map((t) => t.tipo) as string[];
  if (!tipos.includes(tipo)) {
    return NextResponse.json({ error: "Tipo de reporte no válido." }, { status: 404 });
  }
  const reporteTipo = tipo as ReporteTipo;

  const anioParam = req.nextUrl.searchParams.get("anio");
  const anioActual = new Date().getFullYear();
  const anioParseado = anioParam ? Number(anioParam) : anioActual;
  const anio = Number.isFinite(anioParseado) && anioParseado > 2000 ? anioParseado : anioActual;

  const data = await getReportes(anio);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Urbanizadora LYF Olmos";
  workbook.created = new Date();

  if (reporteTipo === "recaudo") {
    agregarHojaRecaudo(
      workbook,
      `Recaudo ${anio}`,
      data.proyectos,
      data.filasPorMes,
      data.totalesPorProyecto,
      data.totalGeneralAnio,
      anio
    );
  } else if (reporteTipo === "recaudo-esperado") {
    agregarHojaRecaudo(
      workbook,
      `Recaudo esperado ${anio}`,
      data.proyectosEsperado,
      data.filasPorMesEsperado,
      data.totalesPorProyectoEsperado,
      data.totalGeneralAnioEsperado,
      anio
    );
  } else if (reporteTipo === "vencen-este-mes") {
    const sheet = workbook.addWorksheet("Vencen este mes");
    sheet.columns = [
      { width: 28 },
      { width: 30 },
      { width: 22 },
      { width: 12 },
      { width: 10 },
      { width: 14 },
      { width: 16 },
    ];
    const headers = ["Cliente", "Propiedad", "Proyecto", "Contrato", "Cuota", "Vencimiento", "Saldo"];
    const headerRow = sheet.getRow(1);
    headers.forEach((h, i) => headerCell(headerRow.getCell(i + 1), h));
    data.cuotasVencenEsteMes.forEach((c, idx) => {
      const row = sheet.getRow(idx + 2);
      row.getCell(1).value = c.nombreCliente;
      row.getCell(2).value = c.propiedadesTexto || "-";
      row.getCell(3).value = c.proyectoTexto;
      row.getCell(4).value = c.numeroContrato ? `N.º ${c.numeroContrato}` : "-";
      row.getCell(5).value = c.numero_cuota === 0 ? "Inicial" : `#${c.numero_cuota}`;
      row.getCell(6).value = formatDate(c.fecha_vencimiento);
      row.getCell(7).value = c.saldo;
      row.getCell(7).numFmt = "#,##0";
    });
    if (data.cuotasVencenEsteMes.length > 0) {
      const totalRow = sheet.getRow(data.cuotasVencenEsteMes.length + 2);
      totalRow.getCell(6).value = "Total";
      totalRow.getCell(6).font = { bold: true };
      totalRow.getCell(7).value = data.totalVencenEsteMes;
      totalRow.getCell(7).numFmt = "#,##0";
      totalRow.getCell(7).font = { bold: true };
    }
  } else if (reporteTipo === "vencidas") {
    const sheet = workbook.addWorksheet("Vencidas");
    sheet.columns = [
      { width: 28 },
      { width: 30 },
      { width: 22 },
      { width: 12 },
      { width: 10 },
      { width: 14 },
      { width: 12 },
      { width: 16 },
    ];
    const headers = [
      "Cliente",
      "Propiedad",
      "Proyecto",
      "Contrato",
      "Cuota",
      "Vencimiento",
      "Días vencida",
      "Saldo",
    ];
    const headerRow = sheet.getRow(1);
    headers.forEach((h, i) => headerCell(headerRow.getCell(i + 1), h));
    data.cuotasVencidas.forEach((c, idx) => {
      const row = sheet.getRow(idx + 2);
      row.getCell(1).value = c.nombreCliente;
      row.getCell(2).value = c.propiedadesTexto || "-";
      row.getCell(3).value = c.proyectoTexto;
      row.getCell(4).value = c.numeroContrato ? `N.º ${c.numeroContrato}` : "-";
      row.getCell(5).value = c.numero_cuota === 0 ? "Inicial" : `#${c.numero_cuota}`;
      row.getCell(6).value = formatDate(c.fecha_vencimiento);
      row.getCell(7).value = c.diasMora ?? 0;
      row.getCell(8).value = c.saldo;
      row.getCell(8).numFmt = "#,##0";
    });
    if (data.cuotasVencidas.length > 0) {
      const totalRow = sheet.getRow(data.cuotasVencidas.length + 2);
      totalRow.getCell(7).value = "Total";
      totalRow.getCell(7).font = { bold: true };
      totalRow.getCell(8).value = data.totalVencidas;
      totalRow.getCell(8).numFmt = "#,##0";
      totalRow.getCell(8).font = { bold: true };
    }
  } else if (reporteTipo === "escrituradas") {
    const sheet = workbook.addWorksheet("Escriturados");
    sheet.columns = [
      { width: 16 },
      { width: 30 },
      { width: 12 },
      { width: 12 },
      { width: 16 },
      { width: 16 },
    ];
    const headers = [
      "Proyecto",
      "Dirección",
      "Manzana",
      "Lote",
      "N.º Escritura",
      "Fecha escritura",
    ];
    const headerRow = sheet.getRow(1);
    headers.forEach((h, i) => headerCell(headerRow.getCell(i + 1), h));
    let rowIdx = 2;
    for (const grupo of data.escrituradasPorProyecto) {
      for (const lote of grupo.lotes) {
        const row = sheet.getRow(rowIdx);
        row.getCell(1).value = grupo.proyecto;
        row.getCell(2).value = lote.direccion;
        row.getCell(3).value = lote.manzana ?? "-";
        row.getCell(4).value = lote.numero_lote ?? "-";
        row.getCell(5).value = lote.numero_escritura ?? "-";
        row.getCell(6).value = formatDate(lote.fecha_escritura);
        rowIdx++;
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-${reporteTipo}-${anio}.xlsx"`,
    },
  });
}

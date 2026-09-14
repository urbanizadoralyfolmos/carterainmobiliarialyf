import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getReportes } from "@/lib/reportes";
import { formatDate } from "@/lib/utils/format";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const anioParam = req.nextUrl.searchParams.get("anio");
  const anioActual = new Date().getFullYear();
  const anioParseado = anioParam ? Number(anioParam) : anioActual;
  const anio = Number.isFinite(anioParseado) && anioParseado > 2000 ? anioParseado : anioActual;

  const data = await getReportes(anio);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Urbanizadora LYF Olmos";
  workbook.created = new Date();

  // Hoja 1: Recaudo por mes y proyecto
  const sheetRecaudo = workbook.addWorksheet(`Recaudo ${anio}`);
  const headerRecaudo = ["Mes", ...data.proyectos, "Total"];
  sheetRecaudo.columns = headerRecaudo.map((_, i) => ({ width: i === 0 ? 14 : 16 }));

  const headerRowRecaudo = sheetRecaudo.getRow(1);
  headerRecaudo.forEach((h, i) => {
    const cell = headerRowRecaudo.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E9BD7" } };
  });

  data.filasPorMes.forEach((fila, idx) => {
    const row = sheetRecaudo.getRow(idx + 2);
    row.getCell(1).value = fila.nombreMes;
    data.proyectos.forEach((p, i) => {
      const cell = row.getCell(i + 2);
      cell.value = fila.porProyecto[p] ?? 0;
      cell.numFmt = "#,##0";
    });
    const totalCell = row.getCell(data.proyectos.length + 2);
    totalCell.value = fila.total;
    totalCell.numFmt = "#,##0";
    totalCell.font = { bold: true };
  });

  const totalRow = sheetRecaudo.getRow(data.filasPorMes.length + 2);
  totalRow.getCell(1).value = `Total ${anio}`;
  totalRow.getCell(1).font = { bold: true };
  data.proyectos.forEach((p, i) => {
    const cell = totalRow.getCell(i + 2);
    cell.value = data.totalesPorProyecto[p] ?? 0;
    cell.numFmt = "#,##0";
    cell.font = { bold: true };
  });
  const totalGeneralCell = totalRow.getCell(data.proyectos.length + 2);
  totalGeneralCell.value = data.totalGeneralAnio;
  totalGeneralCell.numFmt = "#,##0";
  totalGeneralCell.font = { bold: true };

  // Hoja 2: Cuotas que vencen este mes
  const sheetVencen = workbook.addWorksheet("Vencen este mes");
  sheetVencen.columns = [
    { width: 28 },
    { width: 30 },
    { width: 12 },
    { width: 10 },
    { width: 14 },
    { width: 16 },
  ];
  const headersVencen = ["Cliente", "Propiedad", "Contrato", "Cuota", "Vencimiento", "Saldo"];
  const headerRowVencen = sheetVencen.getRow(1);
  headersVencen.forEach((h, i) => {
    const cell = headerRowVencen.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E9BD7" } };
  });
  data.cuotasVencenEsteMes.forEach((c, idx) => {
    const row = sheetVencen.getRow(idx + 2);
    row.getCell(1).value = c.nombreCliente;
    row.getCell(2).value = c.propiedadesTexto || "-";
    row.getCell(3).value = c.numeroContrato ? `N.º ${c.numeroContrato}` : "-";
    row.getCell(4).value = c.numero_cuota === 0 ? "Inicial" : `#${c.numero_cuota}`;
    row.getCell(5).value = formatDate(c.fecha_vencimiento);
    row.getCell(6).value = c.saldo;
    row.getCell(6).numFmt = "#,##0";
  });
  if (data.cuotasVencenEsteMes.length > 0) {
    const totalRowVencen = sheetVencen.getRow(data.cuotasVencenEsteMes.length + 2);
    totalRowVencen.getCell(5).value = "Total";
    totalRowVencen.getCell(5).font = { bold: true };
    totalRowVencen.getCell(6).value = data.totalVencenEsteMes;
    totalRowVencen.getCell(6).numFmt = "#,##0";
    totalRowVencen.getCell(6).font = { bold: true };
  }

  // Hoja 3: Cuotas vencidas
  const sheetVencidas = workbook.addWorksheet("Vencidas");
  sheetVencidas.columns = [
    { width: 28 },
    { width: 30 },
    { width: 12 },
    { width: 10 },
    { width: 14 },
    { width: 12 },
    { width: 16 },
  ];
  const headersVencidas = [
    "Cliente",
    "Propiedad",
    "Contrato",
    "Cuota",
    "Vencimiento",
    "Días vencida",
    "Saldo",
  ];
  const headerRowVencidas = sheetVencidas.getRow(1);
  headersVencidas.forEach((h, i) => {
    const cell = headerRowVencidas.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E9BD7" } };
  });
  data.cuotasVencidas.forEach((c, idx) => {
    const row = sheetVencidas.getRow(idx + 2);
    row.getCell(1).value = c.nombreCliente;
    row.getCell(2).value = c.propiedadesTexto || "-";
    row.getCell(3).value = c.numeroContrato ? `N.º ${c.numeroContrato}` : "-";
    row.getCell(4).value = c.numero_cuota === 0 ? "Inicial" : `#${c.numero_cuota}`;
    row.getCell(5).value = formatDate(c.fecha_vencimiento);
    row.getCell(6).value = c.diasMora ?? 0;
    row.getCell(7).value = c.saldo;
    row.getCell(7).numFmt = "#,##0";
  });
  if (data.cuotasVencidas.length > 0) {
    const totalRowVencidas = sheetVencidas.getRow(data.cuotasVencidas.length + 2);
    totalRowVencidas.getCell(6).value = "Total";
    totalRowVencidas.getCell(6).font = { bold: true };
    totalRowVencidas.getCell(7).value = data.totalVencidas;
    totalRowVencidas.getCell(7).numFmt = "#,##0";
    totalRowVencidas.getCell(7).font = { bold: true };
  }

  // Hoja 4: Lotes escriturados por proyecto
  const sheetEscrituradas = workbook.addWorksheet("Escriturados");
  sheetEscrituradas.columns = [
    { width: 16 },
    { width: 30 },
    { width: 12 },
    { width: 12 },
    { width: 16 },
    { width: 16 },
  ];
  const headersEscrituradas = [
    "Proyecto",
    "Dirección",
    "Manzana",
    "Lote",
    "N.º Escritura",
    "Fecha escritura",
  ];
  const headerRowEscrituradas = sheetEscrituradas.getRow(1);
  headersEscrituradas.forEach((h, i) => {
    const cell = headerRowEscrituradas.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E9BD7" } };
  });
  let rowIdx = 2;
  for (const grupo of data.escrituradasPorProyecto) {
    for (const lote of grupo.lotes) {
      const row = sheetEscrituradas.getRow(rowIdx);
      row.getCell(1).value = grupo.proyecto;
      row.getCell(2).value = lote.direccion;
      row.getCell(3).value = lote.manzana ?? "-";
      row.getCell(4).value = lote.numero_lote ?? "-";
      row.getCell(5).value = lote.numero_escritura ?? "-";
      row.getCell(6).value = formatDate(lote.fecha_escritura);
      rowIdx++;
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reportes-${anio}.xlsx"`,
    },
  });
}

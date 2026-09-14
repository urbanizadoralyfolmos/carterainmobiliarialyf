import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getClientesPorProyecto } from "@/lib/clientes-por-proyecto";

export const runtime = "nodejs";

const CARACTERES_INVALIDOS = /[\\/?*[\]:]/g;

/**
 * Los nombres de hoja de Excel no pueden tener más de 31 caracteres ni los
 * símbolos \ / ? * [ ] : , y deben ser únicos dentro del libro. Esta función
 * arma un nombre válido y evita choques cuando dos proyectos truncados
 * quedarían iguales.
 */
function nombreHojaValido(nombre: string, usados: Set<string>) {
  const base = (nombre.replace(CARACTERES_INVALIDOS, "-").trim() || "Proyecto").slice(0, 31);
  let candidato = base;
  let i = 2;
  while (usados.has(candidato.toLowerCase())) {
    const sufijo = ` (${i})`;
    candidato = base.slice(0, 31 - sufijo.length) + sufijo;
    i++;
  }
  usados.add(candidato.toLowerCase());
  return candidato;
}

function headerCell(cell: ExcelJS.Cell, valor: string) {
  cell.value = valor;
  cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E9BD7" } };
}

export async function GET() {
  const grupos = await getClientesPorProyecto();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Urbanizadora LYF Olmos";
  workbook.created = new Date();

  const nombresUsados = new Set<string>();
  const headers = [
    "Cliente",
    "Tipo",
    "Documento/NIT",
    "Email",
    "Teléfono",
    "Dirección",
    "Contrato(s)",
    "Propiedad(es)",
  ];

  for (const grupo of grupos) {
    const sheet = workbook.addWorksheet(nombreHojaValido(grupo.proyecto, nombresUsados));
    sheet.columns = [
      { width: 30 },
      { width: 12 },
      { width: 16 },
      { width: 28 },
      { width: 16 },
      { width: 30 },
      { width: 16 },
      { width: 34 },
    ];

    const headerRow = sheet.getRow(1);
    headers.forEach((h, i) => headerCell(headerRow.getCell(i + 1), h));

    grupo.clientes.forEach((c, idx) => {
      const row = sheet.getRow(idx + 2);
      row.getCell(1).value = c.nombreCliente;
      row.getCell(2).value = c.tipoPersona === "juridica" ? "Jurídica" : "Natural";
      row.getCell(3).value = c.documento;
      row.getCell(4).value = c.email;
      row.getCell(5).value = c.telefono;
      row.getCell(6).value = c.direccion;
      row.getCell(7).value = c.contratos;
      row.getCell(8).value = c.propiedadesTexto;
    });
  }

  if (grupos.length === 0) {
    const sheet = workbook.addWorksheet("Clientes por proyecto");
    const headerRow = sheet.getRow(1);
    headers.forEach((h, i) => headerCell(headerRow.getCell(i + 1), h));
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="clientes-por-proyecto.xlsx"`,
    },
  });
}

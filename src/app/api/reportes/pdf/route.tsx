import { NextRequest, NextResponse } from "next/server";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { getReportes } from "@/lib/reportes";
import { formatMoney, formatDate } from "@/lib/utils/format";

export const runtime = "nodejs";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 16, fontWeight: "bold", color: "#0f172a" },
  subtitle: { fontSize: 9, color: "#64748b", marginTop: 2, marginBottom: 14 },
  table: { marginTop: 4 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#1e9bd7", paddingVertical: 5 },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 4,
  },
  th: { color: "#ffffff", fontSize: 7, fontWeight: "bold", paddingHorizontal: 3 },
  td: { fontSize: 7, color: "#334155", paddingHorizontal: 3 },
  totalRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#0f172a",
    paddingVertical: 5,
  },
  totalLabel: { fontSize: 8, fontWeight: "bold", color: "#0f172a", paddingHorizontal: 3 },
  totalValue: { fontSize: 8, fontWeight: "bold", color: "#92400e", paddingHorizontal: 3 },
  colMes: { width: "16%" },
  colProyecto: { flex: 1 },
  colTotal: { width: "16%" },
  colCliente: { width: "24%" },
  colPropiedad: { width: "26%" },
  colContrato: { width: "12%" },
  colCuota: { width: "10%" },
  colFecha: { width: "13%" },
  colDias: { width: "10%" },
  colSaldo: { width: "15%" },
  sectionSubtitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 10,
    marginBottom: 3,
  },
});

export async function GET(req: NextRequest) {
  const anioParam = req.nextUrl.searchParams.get("anio");
  const anioActual = new Date().getFullYear();
  const anioParseado = anioParam ? Number(anioParam) : anioActual;
  const anio = Number.isFinite(anioParseado) && anioParseado > 2000 ? anioParseado : anioActual;

  const data = await getReportes(anio);
  const generado = formatDate(new Date().toISOString().slice(0, 10));

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Recaudo por mes y proyecto - {anio}</Text>
        <Text style={styles.subtitle}>Generado el {generado}</Text>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colMes]}>Mes</Text>
            {data.proyectos.map((p) => (
              <Text key={p} style={[styles.th, styles.colProyecto]}>
                {p}
              </Text>
            ))}
            <Text style={[styles.th, styles.colTotal]}>Total</Text>
          </View>
          {data.filasPorMes.map((fila) => (
            <View style={styles.tableRow} key={fila.mes}>
              <Text style={[styles.td, styles.colMes]}>{fila.nombreMes}</Text>
              {data.proyectos.map((p) => (
                <Text key={p} style={[styles.td, styles.colProyecto]}>
                  {formatMoney(fila.porProyecto[p] ?? 0)}
                </Text>
              ))}
              <Text style={[styles.td, styles.colTotal]}>{formatMoney(fila.total)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, styles.colMes]}>Total {anio}</Text>
            {data.proyectos.map((p) => (
              <Text key={p} style={[styles.totalValue, styles.colProyecto]}>
                {formatMoney(data.totalesPorProyecto[p] ?? 0)}
              </Text>
            ))}
            <Text style={[styles.totalValue, styles.colTotal]}>
              {formatMoney(data.totalGeneralAnio)}
            </Text>
          </View>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Cuotas que vencen este mes</Text>
        <Text style={styles.subtitle}>Generado el {generado}</Text>

        {data.cuotasVencenEsteMes.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, styles.colCliente]}>Cliente</Text>
              <Text style={[styles.th, styles.colPropiedad]}>Propiedad</Text>
              <Text style={[styles.th, styles.colContrato]}>Contrato</Text>
              <Text style={[styles.th, styles.colCuota]}>Cuota</Text>
              <Text style={[styles.th, styles.colFecha]}>Vencimiento</Text>
              <Text style={[styles.th, styles.colSaldo]}>Saldo</Text>
            </View>
            {data.cuotasVencenEsteMes.map((c) => (
              <View style={styles.tableRow} key={c.id}>
                <Text style={[styles.td, styles.colCliente]}>{c.nombreCliente}</Text>
                <Text style={[styles.td, styles.colPropiedad]}>{c.propiedadesTexto || "-"}</Text>
                <Text style={[styles.td, styles.colContrato]}>
                  {c.numeroContrato ? `N.º ${c.numeroContrato}` : "-"}
                </Text>
                <Text style={[styles.td, styles.colCuota]}>
                  {c.numero_cuota === 0 ? "Inicial" : `#${c.numero_cuota}`}
                </Text>
                <Text style={[styles.td, styles.colFecha]}>{formatDate(c.fecha_vencimiento)}</Text>
                <Text style={[styles.td, styles.colSaldo]}>{formatMoney(c.saldo)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { width: "85%" }]}>Total</Text>
              <Text style={[styles.totalValue, styles.colSaldo]}>
                {formatMoney(data.totalVencenEsteMes)}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.td}>No hay cuotas por vencer en lo que queda del mes.</Text>
        )}
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Cuotas vencidas</Text>
        <Text style={styles.subtitle}>Generado el {generado}</Text>

        {data.cuotasVencidas.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, styles.colCliente]}>Cliente</Text>
              <Text style={[styles.th, styles.colPropiedad]}>Propiedad</Text>
              <Text style={[styles.th, styles.colContrato]}>Contrato</Text>
              <Text style={[styles.th, styles.colCuota]}>Cuota</Text>
              <Text style={[styles.th, styles.colFecha]}>Vencimiento</Text>
              <Text style={[styles.th, styles.colDias]}>Días</Text>
              <Text style={[styles.th, styles.colSaldo]}>Saldo</Text>
            </View>
            {data.cuotasVencidas.map((c) => (
              <View style={styles.tableRow} key={c.id}>
                <Text style={[styles.td, styles.colCliente]}>{c.nombreCliente}</Text>
                <Text style={[styles.td, styles.colPropiedad]}>{c.propiedadesTexto || "-"}</Text>
                <Text style={[styles.td, styles.colContrato]}>
                  {c.numeroContrato ? `N.º ${c.numeroContrato}` : "-"}
                </Text>
                <Text style={[styles.td, styles.colCuota]}>
                  {c.numero_cuota === 0 ? "Inicial" : `#${c.numero_cuota}`}
                </Text>
                <Text style={[styles.td, styles.colFecha]}>{formatDate(c.fecha_vencimiento)}</Text>
                <Text style={[styles.td, styles.colDias]}>{c.diasMora ?? 0}</Text>
                <Text style={[styles.td, styles.colSaldo]}>{formatMoney(c.saldo)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { width: "75%" }]}>Total</Text>
              <Text style={[styles.totalValue, styles.colSaldo]}>
                {formatMoney(data.totalVencidas)}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.td}>No hay cuotas vencidas.</Text>
        )}
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Lotes escriturados por proyecto</Text>
        <Text style={styles.subtitle}>Generado el {generado}</Text>

        {data.escrituradasPorProyecto.length > 0 ? (
          data.escrituradasPorProyecto.map((grupo) => (
            <View key={grupo.proyecto}>
              <Text style={styles.sectionSubtitle}>
                {grupo.proyecto} ({grupo.lotes.length})
              </Text>
              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.th, { width: "34%" }]}>Dirección</Text>
                  <Text style={[styles.th, { width: "14%" }]}>Manzana</Text>
                  <Text style={[styles.th, { width: "14%" }]}>Lote</Text>
                  <Text style={[styles.th, { width: "20%" }]}>N.º Escritura</Text>
                  <Text style={[styles.th, { width: "18%" }]}>Fecha escritura</Text>
                </View>
                {grupo.lotes.map((p) => (
                  <View style={styles.tableRow} key={p.id}>
                    <Text style={[styles.td, { width: "34%" }]}>{p.direccion}</Text>
                    <Text style={[styles.td, { width: "14%" }]}>{p.manzana ?? "-"}</Text>
                    <Text style={[styles.td, { width: "14%" }]}>{p.numero_lote ?? "-"}</Text>
                    <Text style={[styles.td, { width: "20%" }]}>{p.numero_escritura ?? "-"}</Text>
                    <Text style={[styles.td, { width: "18%" }]}>
                      {formatDate(p.fecha_escritura)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.td}>Todavía no hay lotes escriturados.</Text>
        )}
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  const body = new Uint8Array(buffer);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reportes-${anio}.pdf"`,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { getEstadoCuentaContrato } from "@/lib/estado-cuenta-contrato";
import { formatMoney, formatDate } from "@/lib/utils/format";

export const runtime = "nodejs";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, fontWeight: "bold" },
  subtitle: { fontSize: 9, color: "#64748b", marginTop: 2, marginBottom: 16 },
  sectionRow: { flexDirection: "row", gap: 12, marginBottom: 10 },
  card: { flex: 1, backgroundColor: "#f8fafc", borderRadius: 4, padding: 8 },
  cardLabel: { fontSize: 8, color: "#64748b", marginBottom: 3 },
  cardValue: { fontSize: 10, fontWeight: "bold", color: "#0f172a" },
  cardText: { fontSize: 9, color: "#334155", marginTop: 1 },
  table: { marginTop: 10 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#1e9bd7", paddingVertical: 5 },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 4,
  },
  th: { color: "#ffffff", fontSize: 8, fontWeight: "bold", paddingHorizontal: 3 },
  td: { fontSize: 8, color: "#334155", paddingHorizontal: 3 },
  colCuota: { width: "6%" },
  colFecha: { width: "12%" },
  colMonto: { width: "13%" },
  colPagado: { width: "13%" },
  colMora: { width: "10%" },
  colFechaPago: { width: "12%" },
  colRef: { width: "13%" },
  colRecibo: { width: "10%" },
  colEstado: { width: "11%" },
});

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

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Estado de cuenta - Contrato N.º {contrato.numero}</Text>
        <Text style={styles.subtitle}>
          Generado el {formatDate(new Date().toISOString().slice(0, 10))}
        </Text>

        <View style={styles.sectionRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>CLIENTE</Text>
            <Text style={styles.cardValue}>{nombreCliente}</Text>
            <Text style={styles.cardText}>
              {cliente?.tipo_persona === "juridica"
                ? `NIT ${cliente?.nit ?? "-"}`
                : `Doc. ${cliente?.documento ?? "-"}`}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>
              {propiedades.length > 1 ? "PROPIEDADES" : "PROPIEDAD"}
            </Text>
            {propiedades.length > 0 ? (
              propiedades.map((p, i) => (
                <Text key={i} style={styles.cardText}>
                  {p.proyecto ? `${p.proyecto} · ` : ""}
                  {p.direccion}
                  {p.manzana ? ` · Mz. ${p.manzana}` : ""}
                  {p.numero_lote ? ` · Lote ${p.numero_lote}` : ""}
                </Text>
              ))
            ) : (
              <Text style={styles.cardText}>Sin propiedad asociada</Text>
            )}
          </View>
        </View>

        <View style={styles.sectionRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>TOTAL CONTRATADO</Text>
            <Text style={styles.cardValue}>{formatMoney(resumen.totalMonto, contrato.moneda)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>TOTAL PAGADO</Text>
            <Text style={styles.cardValue}>{formatMoney(resumen.totalPagado, contrato.moneda)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>SALDO PENDIENTE</Text>
            <Text style={styles.cardValue}>
              {formatMoney(resumen.totalPendiente, contrato.moneda)}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>MORA ACUMULADA</Text>
            <Text style={styles.cardValue}>{formatMoney(resumen.totalMora, contrato.moneda)}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colCuota]}>Cuota</Text>
            <Text style={[styles.th, styles.colFecha]}>Vencimiento</Text>
            <Text style={[styles.th, styles.colMonto]}>Monto</Text>
            <Text style={[styles.th, styles.colPagado]}>Pagado</Text>
            <Text style={[styles.th, styles.colMora]}>Mora</Text>
            <Text style={[styles.th, styles.colFechaPago]}>Fecha pago</Text>
            <Text style={[styles.th, styles.colRef]}>Referencia</Text>
            <Text style={[styles.th, styles.colRecibo]}>N.º Recibo</Text>
            <Text style={[styles.th, styles.colEstado]}>Estado</Text>
          </View>
          {detalle.map((c) => (
            <View style={styles.tableRow} key={c.id}>
              <Text style={[styles.td, styles.colCuota]}>
                {c.numero_cuota === 0 ? "Inicial" : `#${c.numero_cuota}`}
              </Text>
              <Text style={[styles.td, styles.colFecha]}>{formatDate(c.fecha_vencimiento)}</Text>
              <Text style={[styles.td, styles.colMonto]}>
                {formatMoney(c.monto, contrato.moneda)}
              </Text>
              <Text style={[styles.td, styles.colPagado]}>
                {formatMoney(c.monto_pagado, contrato.moneda)}
              </Text>
              <Text style={[styles.td, styles.colMora]}>
                {c.recargo > 0 ? formatMoney(c.recargo, contrato.moneda) : "-"}
              </Text>
              <Text style={[styles.td, styles.colFechaPago]}>{formatDate(c.fecha_pago)}</Text>
              <Text style={[styles.td, styles.colRef]}>{c.referencia ?? "-"}</Text>
              <Text style={[styles.td, styles.colRecibo]}>{c.numero_recibo ?? "-"}</Text>
              <Text style={[styles.td, styles.colEstado]}>{c.estado}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  const body = new Uint8Array(buffer);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="estado-cuenta-contrato-${contrato.numero}.pdf"`,
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatDate } from "@/lib/utils/format";

export const runtime = "nodejs";

type ProyectoRel = { nombre: string } | { nombre: string }[] | null | undefined;

function nombreProyecto(rel: ProyectoRel) {
  if (Array.isArray(rel)) return rel[0]?.nombre ?? "";
  return rel?.nombre ?? "";
}

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: "Helvetica" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 14,
    marginBottom: 20,
  },
  title: { fontSize: 16, fontWeight: "bold", color: "#0f172a" },
  numero: { fontSize: 9, color: "#64748b", marginTop: 2 },
  fechaLabel: { fontSize: 9, color: "#64748b", textAlign: "right" },
  fechaValor: { fontSize: 11, fontWeight: "bold", color: "#0f172a", textAlign: "right" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  campo: { width: "50%", marginBottom: 14 },
  campoAncho: { width: "100%", marginBottom: 14 },
  label: { fontSize: 9, color: "#64748b" },
  valor: { fontSize: 11, fontWeight: "bold", color: "#0f172a", marginTop: 2 },
  valorChico: { fontSize: 8, color: "#94a3b8", marginTop: 2 },
  totalBox: {
    marginTop: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: { fontSize: 10, color: "#64748b" },
  totalValor: { fontSize: 18, fontWeight: "bold", color: "#0f172a" },
  footer: { marginTop: 36, fontSize: 8, color: "#94a3b8", textAlign: "center" },
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: recibo } = await supabase
    .from("recibos")
    .select(
      "*, cuotas(numero_cuota, referencia, contratos(numero, moneda, clientes(nombre, apellido, documento), contrato_propiedades(propiedades(direccion, proyectos(nombre)))))"
    )
    .eq("id", id)
    .single();

  if (!recibo) {
    return NextResponse.json({ error: "Recibo no encontrado" }, { status: 404 });
  }

  const cuota = recibo.cuotas;
  const contrato = cuota?.contratos;
  const cliente = contrato?.clientes;
  const propiedades = (contrato?.contrato_propiedades ?? [])
    .map(
      (cp: { propiedades: { direccion: string; proyectos?: ProyectoRel } | null }) =>
        cp.propiedades
    )
    .filter(Boolean) as { direccion: string; proyectos?: ProyectoRel }[];
  const moneda = contrato?.moneda ?? "COP";
  const nombreCliente = cliente ? `${cliente.nombre} ${cliente.apellido}` : "-";

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Recibo de pago</Text>
            <Text style={styles.numero}>N.º {recibo.numero}</Text>
          </View>
          <View>
            <Text style={styles.fechaLabel}>Fecha de pago</Text>
            <Text style={styles.fechaValor}>{formatDate(recibo.fecha_pago)}</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.campo}>
            <Text style={styles.label}>Cliente</Text>
            <Text style={styles.valor}>{nombreCliente}</Text>
            {cliente?.documento && (
              <Text style={styles.valorChico}>Doc. {cliente.documento}</Text>
            )}
          </View>
          <View style={styles.campo}>
            <Text style={styles.label}>Contrato</Text>
            <Text style={styles.valor}>
              {contrato?.numero ? `N.º ${contrato.numero}` : "-"}
            </Text>
          </View>
          <View style={styles.campoAncho}>
            <Text style={styles.label}>
              Propiedad{propiedades.length > 1 ? "es" : ""}
            </Text>
            {propiedades.length > 0 ? (
              propiedades.map((p, i) => {
                const proyecto = nombreProyecto(p.proyectos);
                return (
                  <Text key={i} style={styles.valor}>
                    {proyecto ? `${proyecto} - ` : ""}
                    {p.direccion}
                  </Text>
                );
              })
            ) : (
              <Text style={styles.valor}>-</Text>
            )}
          </View>
          <View style={styles.campo}>
            <Text style={styles.label}>Cuota</Text>
            <Text style={styles.valor}>
              {cuota?.numero_cuota === 0 ? "Cuota inicial" : `Cuota #${cuota?.numero_cuota}`}
            </Text>
          </View>
          {cuota?.referencia && (
            <View style={styles.campo}>
              <Text style={styles.label}>Referencia de pago</Text>
              <Text style={styles.valor}>{cuota.referencia}</Text>
            </View>
          )}
        </View>

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Valor pagado</Text>
          <Text style={styles.totalValor}>{formatMoney(recibo.monto, moneda)}</Text>
        </View>

        <Text style={styles.footer}>
          Recibo generado automáticamente por el sistema de cartera inmobiliaria.
        </Text>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);
  const body = new Uint8Array(buffer);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recibo-${recibo.numero}.pdf"`,
    },
  });
}

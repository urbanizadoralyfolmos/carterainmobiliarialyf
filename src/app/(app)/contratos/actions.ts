"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generarFechasCuotas } from "@/lib/utils/mora";
import { normalizarTelefonoCO } from "@/lib/utils/telefono";
import { requireAdmin } from "@/lib/auth/rol";

function readContratoForm(formData: FormData) {
  return {
    cliente_id: String(formData.get("cliente_id") ?? ""),
    tipo: String(formData.get("tipo") ?? "alquiler"),
    fecha_inicio: String(formData.get("fecha_inicio") ?? ""),
    fecha_fin: String(formData.get("fecha_fin") ?? "") || null,
    moneda: String(formData.get("moneda") ?? "COP"),
    monto_total: formData.get("monto_total") ? Number(formData.get("monto_total")) : null,
    cuota_inicial: Number(formData.get("cuota_inicial") ?? 0),
    cantidad_cuotas: Number(formData.get("cantidad_cuotas") ?? 12),
    dia_vencimiento: Number(formData.get("dia_vencimiento") ?? 10),
    tasa_mora_mensual: Number(formData.get("tasa_mora_mensual") ?? 5),
    estado: String(formData.get("estado") ?? "activo"),
    notas: String(formData.get("notas") ?? "").trim() || null,
  };
}

/** Un contrato puede incluir uno o varios lotes/propiedades (checkboxes en el formulario). */
function readPropiedadIds(formData: FormData) {
  return formData.getAll("propiedad_ids").map(String).filter(Boolean);
}

export async function crearContrato(formData: FormData) {
  const supabase = await createClient();
  const data = readContratoForm(formData);
  const propiedadIds = readPropiedadIds(formData);

  if (propiedadIds.length === 0) {
    redirect(
      `/contratos/nuevo?error=${encodeURIComponent("Selecciona al menos una propiedad/lote.")}`
    );
  }

  const { data: contrato, error } = await supabase
    .from("contratos")
    .insert(data)
    .select()
    .single();

  if (error || !contrato) {
    redirect(`/contratos/nuevo?error=${encodeURIComponent(error?.message ?? "Error")}`);
  }

  const { error: errorVinculos } = await supabase.from("contrato_propiedades").insert(
    propiedadIds.map((propiedad_id) => ({ contrato_id: contrato.id, propiedad_id }))
  );
  if (errorVinculos) {
    redirect(`/contratos/nuevo?error=${encodeURIComponent(errorVinculos.message)}`);
  }

  const cuotas: {
    contrato_id: string;
    numero_cuota: number;
    fecha_vencimiento: string;
    monto: number;
    monto_pagado: number;
    estado: string;
  }[] = [];

  // Cuota inicial (número 0), vence en la fecha de inicio del contrato.
  if (data.cuota_inicial > 0) {
    cuotas.push({
      contrato_id: contrato.id,
      numero_cuota: 0,
      fecha_vencimiento: data.fecha_inicio,
      monto: data.cuota_inicial,
      monto_pagado: 0,
      estado: "pendiente",
    });
  }

  // Cuotas diferidas: cada una con el monto que se cargó en el formulario.
  const offsetMeses = data.cuota_inicial > 0 ? 1 : 0;
  const fechas = generarFechasCuotas(
    data.fecha_inicio,
    data.cantidad_cuotas,
    data.dia_vencimiento,
    offsetMeses
  );

  fechas.forEach((fecha, i) => {
    const monto = Number(formData.get(`monto_cuota_${i + 1}`) ?? 0);
    cuotas.push({
      contrato_id: contrato.id,
      numero_cuota: i + 1,
      fecha_vencimiento: fecha,
      monto,
      monto_pagado: 0,
      estado: "pendiente",
    });
  });

  const { error: errorCuotas } = await supabase.from("cuotas").insert(cuotas);
  if (errorCuotas) {
    redirect(`/contratos/nuevo?error=${encodeURIComponent(errorCuotas.message)}`);
  }

  // Las propiedades pasan a "prometido en venta" al quedar ligadas a un
  // contrato (solo si todavía estaban disponibles; no se pisa un estado
  // más avanzado como escriturado/facturado). Se usa una función RPC en vez
  // de un update directo porque "propiedades" solo admite UPDATE directo
  // desde admin; esta función puntual sí puede llamarla cualquier usuario
  // autenticado, ya que es un efecto colateral de crear el contrato (una
  // acción de alta, no una edición manual).
  await supabase.rpc("marcar_propiedades_prometidas", { ids: propiedadIds });

  revalidatePath("/contratos");
  revalidatePath("/cuotas");
  revalidatePath("/propiedades");
  redirect("/contratos");
}

export async function actualizarContrato(id: string, formData: FormData) {
  await requireAdmin(`/contratos/${id}`);
  const supabase = await createClient();
  const { cliente_id: _clienteIdIgnorado, ...data } = readContratoForm(formData);
  const propiedadIds = readPropiedadIds(formData);
  void _clienteIdIgnorado;

  if (propiedadIds.length === 0) {
    redirect(
      `/contratos/${id}?error=${encodeURIComponent("Selecciona al menos una propiedad/lote.")}`
    );
  }

  // El titular (cliente) de un contrato ya no se cambia desde este
  // formulario: cualquier cambio de comprador se hace con "Ceder contrato"
  // (ver cederContrato más abajo), para que siempre quede un registro de la
  // cesión. Por eso "cliente_id" se descarta aunque venga en el formulario.
  const { data: contratoAnterior } = await supabase
    .from("contratos")
    .select("estado")
    .eq("id", id)
    .single();

  // No se regenera el plan de cuotas al editar: solo se actualizan los
  // datos del contrato. El plan de cuotas se gestiona desde /cuotas o con
  // un otrosí (ver reestructurarPlanPago).
  const { error } = await supabase.from("contratos").update(data).eq("id", id);
  if (error) {
    redirect(`/contratos/${id}?error=${encodeURIComponent(error.message)}`);
  }

  // Reemplaza el conjunto de propiedades vinculadas por el nuevo seleccionado.
  const { data: vinculosActuales } = await supabase
    .from("contrato_propiedades")
    .select("propiedad_id")
    .eq("contrato_id", id);

  const idsActuales = new Set((vinculosActuales ?? []).map((v) => v.propiedad_id));
  const idsNuevos = new Set(propiedadIds);

  const aQuitar = [...idsActuales].filter((pid) => !idsNuevos.has(pid));
  const aAgregar = [...idsNuevos].filter((pid) => !idsActuales.has(pid));

  if (aQuitar.length > 0) {
    await supabase
      .from("contrato_propiedades")
      .delete()
      .eq("contrato_id", id)
      .in("propiedad_id", aQuitar);
  }
  if (aAgregar.length > 0) {
    await supabase
      .from("contrato_propiedades")
      .insert(aAgregar.map((propiedad_id) => ({ contrato_id: id, propiedad_id })));
  }
  if (aAgregar.length > 0) {
    await supabase
      .from("propiedades")
      .update({ estado: "prometido_en_venta" })
      .in("id", aAgregar)
      .eq("estado", "disponible");
  }

  // Si el contrato pasó a "anulado" recién ahora, se liberan sus
  // propiedades/lotes (las que seguían en "prometido en venta") para que
  // vuelvan a quedar disponibles para la venta.
  if (data.estado === "anulado" && contratoAnterior?.estado !== "anulado") {
    const idsVinculadas = [...idsNuevos];
    if (idsVinculadas.length > 0) {
      await supabase
        .from("propiedades")
        .update({ estado: "disponible" })
        .in("id", idsVinculadas)
        .eq("estado", "prometido_en_venta");
    }
  }

  revalidatePath("/contratos");
  revalidatePath("/propiedades");
  redirect("/contratos");
}

const ESTADOS_CONTRATO_VALIDOS = [
  "activo",
  "paz_y_salvo_sin_escritura",
  "escriturado",
  "anulado",
];

/**
 * Cambia el estado de varios contratos marcados con checkbox de una sola
 * vez, desde el listado de Contratos ("Editar estado en bloque"). Si alguno
 * de los contratos que se están actualizando queda "anulado" y antes no lo
 * estaba, se liberan sus propiedades/lotes vinculados (misma lógica que al
 * editar un contrato individualmente).
 */
export async function actualizarEstadoEnBloque(formData: FormData) {
  const redirectTo = String(formData.get("redirect_to") ?? "").trim() || "/contratos";
  await requireAdmin(redirectTo);
  const supabase = await createClient();

  const ids = formData.getAll("contrato_ids").map(String).filter(Boolean);
  const nuevoEstado = String(formData.get("nuevo_estado") ?? "").trim();

  if (ids.length === 0) {
    redirect(`${redirectTo}?error=${encodeURIComponent("No seleccionaste ningún contrato.")}`);
  }
  if (!ESTADOS_CONTRATO_VALIDOS.includes(nuevoEstado)) {
    redirect(`${redirectTo}?error=${encodeURIComponent("Selecciona un estado válido.")}`);
  }

  const { data: contratosAnteriores } = await supabase
    .from("contratos")
    .select("id, estado")
    .in("id", ids);

  const { error } = await supabase
    .from("contratos")
    .update({ estado: nuevoEstado })
    .in("id", ids);

  if (error) {
    redirect(`${redirectTo}?error=${encodeURIComponent(error.message)}`);
  }

  if (nuevoEstado === "anulado") {
    const idsQuePasanAAnulado = (contratosAnteriores ?? [])
      .filter((c) => c.estado !== "anulado")
      .map((c) => c.id);

    if (idsQuePasanAAnulado.length > 0) {
      const { data: vinculos } = await supabase
        .from("contrato_propiedades")
        .select("propiedad_id")
        .in("contrato_id", idsQuePasanAAnulado);
      const propiedadIds = (vinculos ?? []).map((v) => v.propiedad_id);

      if (propiedadIds.length > 0) {
        await supabase
          .from("propiedades")
          .update({ estado: "disponible" })
          .in("id", propiedadIds)
          .eq("estado", "prometido_en_venta");
      }
    }
  }

  revalidatePath("/contratos");
  revalidatePath("/propiedades");
  redirect(redirectTo);
}

export async function eliminarContrato(id: string) {
  await requireAdmin("/contratos");
  const supabase = await createClient();

  // Se capturan las propiedades vinculadas ANTES de borrar el contrato
  // (el borrado elimina en cascada esos vínculos), para poder liberarlas
  // después y que no queden marcadas "prometido en venta" para siempre.
  const { data: vinculos } = await supabase
    .from("contrato_propiedades")
    .select("propiedad_id")
    .eq("contrato_id", id);
  const propiedadIds = (vinculos ?? []).map((v) => v.propiedad_id);

  await supabase.from("contratos").delete().eq("id", id);

  if (propiedadIds.length > 0) {
    await supabase
      .from("propiedades")
      .update({ estado: "disponible" })
      .in("id", propiedadIds)
      .eq("estado", "prometido_en_venta");
  }

  revalidatePath("/contratos");
  revalidatePath("/cuotas");
  revalidatePath("/propiedades");
  redirect("/contratos");
}

/**
 * Registra la cesión de un contrato a otro cliente (el comprador original
 * transfiere sus derechos a un tercero). El contrato mantiene su estado
 * normal — no existe un estado "cedido" separado — y queda un registro en
 * `cesiones_contrato` con quién era el titular anterior, quién es el nuevo,
 * la fecha y una nota. El historial se guarda ANTES de cambiar el cliente
 * del contrato: así, si algo falla al actualizar el contrato, al menos
 * queda constancia de que la cesión se intentó, en vez de perder el rastro.
 */
export async function cederContrato(contratoId: string, formData: FormData) {
  await requireAdmin(`/contratos/${contratoId}/estado-cuenta`);
  const supabase = await createClient();

  const clienteNuevoId = String(formData.get("cliente_nuevo_id") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "").trim() || undefined;
  const nota = String(formData.get("nota") ?? "").trim() || null;

  if (!clienteNuevoId) {
    redirect(
      `/contratos/${contratoId}/estado-cuenta?error=${encodeURIComponent(
        "Selecciona el cliente al que se cede el contrato."
      )}`
    );
  }

  const { data: contratoActual } = await supabase
    .from("contratos")
    .select("cliente_id")
    .eq("id", contratoId)
    .single();

  if (!contratoActual) {
    redirect(
      `/contratos/${contratoId}/estado-cuenta?error=${encodeURIComponent(
        "No se encontró el contrato."
      )}`
    );
  }

  if (contratoActual!.cliente_id === clienteNuevoId) {
    redirect(
      `/contratos/${contratoId}/estado-cuenta?error=${encodeURIComponent(
        "Ese cliente ya es el titular actual del contrato."
      )}`
    );
  }

  const { error: errorHistorial } = await supabase.from("cesiones_contrato").insert({
    contrato_id: contratoId,
    cliente_anterior_id: contratoActual!.cliente_id,
    cliente_nuevo_id: clienteNuevoId,
    ...(fecha ? { fecha } : {}),
    nota,
  });

  if (errorHistorial) {
    redirect(`/contratos/${contratoId}/estado-cuenta?error=${encodeURIComponent(errorHistorial.message)}`);
  }

  const { error: errorCliente } = await supabase
    .from("contratos")
    .update({ cliente_id: clienteNuevoId })
    .eq("id", contratoId);

  if (errorCliente) {
    redirect(`/contratos/${contratoId}/estado-cuenta?error=${encodeURIComponent(errorCliente.message)}`);
  }

  revalidatePath(`/contratos/${contratoId}/estado-cuenta`);
  revalidatePath("/contratos");
  revalidatePath("/clientes");
  redirect(`/contratos/${contratoId}/estado-cuenta?cedido=1`);
}

/**
 * Otrosí: reestructura el saldo pendiente de un contrato en un nuevo plan
 * de cuotas (nueva cantidad, nuevas fechas y montos). Solo toca las cuotas
 * "pendiente" (las que todavía no tienen ningún abono) — las pagadas o con
 * abono parcial no se tocan. Queda un registro en `otrosies_contrato` con
 * el motivo y una copia de las cuotas antes/después.
 */
export async function reestructurarPlanPago(contratoId: string, formData: FormData) {
  await requireAdmin(`/contratos/${contratoId}/estado-cuenta`);
  const supabase = await createClient();

  const motivo = String(formData.get("motivo") ?? "").trim();
  const fechaPrimeraCuota = String(formData.get("fecha_primera_cuota") ?? "").trim();
  const cantidad = Math.max(1, Math.min(120, Number(formData.get("cantidad_cuotas") ?? 0)));

  if (!motivo) {
    redirect(
      `/contratos/${contratoId}/estado-cuenta?error=${encodeURIComponent(
        "Indica el motivo del otrosí."
      )}`
    );
  }
  if (!fechaPrimeraCuota || !cantidad) {
    redirect(
      `/contratos/${contratoId}/estado-cuenta?error=${encodeURIComponent(
        "Indica la fecha de la primera cuota nueva y la cantidad de cuotas."
      )}`
    );
  }

  const { data: contrato } = await supabase
    .from("contratos")
    .select("dia_vencimiento")
    .eq("id", contratoId)
    .single();

  if (!contrato) {
    redirect(
      `/contratos/${contratoId}/estado-cuenta?error=${encodeURIComponent(
        "No se encontró el contrato."
      )}`
    );
  }

  const { data: cuotasPendientes } = await supabase
    .from("cuotas")
    .select("id, numero_cuota, fecha_vencimiento, monto")
    .eq("contrato_id", contratoId)
    .eq("estado", "pendiente")
    .order("numero_cuota");

  if (!cuotasPendientes || cuotasPendientes.length === 0) {
    redirect(
      `/contratos/${contratoId}/estado-cuenta?error=${encodeURIComponent(
        "Este contrato no tiene cuotas pendientes (sin abonos) para reestructurar."
      )}`
    );
  }

  const { data: cuotaRestanteMasAlta } = await supabase
    .from("cuotas")
    .select("numero_cuota")
    .eq("contrato_id", contratoId)
    .neq("estado", "pendiente")
    .order("numero_cuota", { ascending: false })
    .limit(1)
    .maybeSingle();

  const numeroInicio = (cuotaRestanteMasAlta?.numero_cuota ?? 0) + 1;

  const montos = formData
    .getAll("monto_nueva_cuota")
    .slice(0, cantidad)
    .map((m) => Number(m) || 0);

  const fechas = generarFechasCuotas(fechaPrimeraCuota, cantidad, contrato!.dia_vencimiento, 0);

  const cuotasAnterioresSnapshot = cuotasPendientes.map((c) => ({
    numero_cuota: c.numero_cuota,
    fecha_vencimiento: c.fecha_vencimiento,
    monto: c.monto,
  }));

  const idsABorrar = cuotasPendientes.map((c) => c.id);
  const { error: errorBorrar } = await supabase.from("cuotas").delete().in("id", idsABorrar);
  if (errorBorrar) {
    redirect(`/contratos/${contratoId}/estado-cuenta?error=${encodeURIComponent(errorBorrar.message)}`);
  }

  const nuevasCuotas = fechas.map((fecha, i) => ({
    contrato_id: contratoId,
    numero_cuota: numeroInicio + i,
    fecha_vencimiento: fecha,
    monto: montos[i] ?? 0,
    monto_pagado: 0,
    estado: "pendiente",
  }));

  const { error: errorInsertar } = await supabase.from("cuotas").insert(nuevasCuotas);
  if (errorInsertar) {
    redirect(`/contratos/${contratoId}/estado-cuenta?error=${encodeURIComponent(errorInsertar.message)}`);
  }

  await supabase.from("otrosies_contrato").insert({
    contrato_id: contratoId,
    motivo,
    saldo_reestructurado: cuotasAnterioresSnapshot.reduce((acc, c) => acc + c.monto, 0),
    cuotas_anteriores: cuotasAnterioresSnapshot,
    cuotas_nuevas: nuevasCuotas.map(({ numero_cuota, fecha_vencimiento, monto }) => ({
      numero_cuota,
      fecha_vencimiento,
      monto,
    })),
  });

  // El plan de cuotas cambió por completo: se sincroniza el estado del
  // contrato por si esto lo saca de "paz y salvo sin escritura" (ahora
  // tiene cuotas pendientes de nuevo).
  await supabase.rpc("sincronizar_estado_contrato_por_pagos", { p_contrato_id: contratoId });

  revalidatePath(`/contratos/${contratoId}/estado-cuenta`);
  revalidatePath("/cuotas");
  revalidatePath("/dashboard");
  redirect(`/contratos/${contratoId}/estado-cuenta?otrosi=1`);
}

/**
 * Lee los datos de un cliente nuevo desde el formulario de revisión de la
 * promesa de compraventa (campos prefijados con "nuevo_cliente_" para no
 * chocar con los campos del propio contrato, p. ej. "notas").
 */
function readClienteDesdePromesa(formData: FormData) {
  const tipoPersona =
    String(formData.get("nuevo_cliente_tipo_persona") ?? "natural") === "juridica"
      ? "juridica"
      : "natural";

  return {
    nombre: String(formData.get("nuevo_cliente_nombre") ?? "").trim(),
    apellido: String(formData.get("nuevo_cliente_apellido") ?? "").trim(),
    documento: String(formData.get("nuevo_cliente_documento") ?? "").trim() || null,
    email: String(formData.get("nuevo_cliente_email") ?? "").trim() || null,
    telefono: normalizarTelefonoCO(String(formData.get("nuevo_cliente_telefono") ?? "")),
    direccion: String(formData.get("nuevo_cliente_direccion") ?? "").trim() || null,
    notas: null as string | null,
    tipo_persona: tipoPersona,
    razon_social:
      tipoPersona === "juridica"
        ? String(formData.get("nuevo_cliente_razon_social") ?? "").trim() || null
        : null,
    nit:
      tipoPersona === "juridica"
        ? String(formData.get("nuevo_cliente_nit") ?? "").trim() || null
        : null,
    representante_nombre:
      tipoPersona === "juridica"
        ? String(formData.get("nuevo_cliente_nombre") ?? "").trim() || null
        : null,
    representante_documento:
      tipoPersona === "juridica"
        ? String(formData.get("nuevo_cliente_representante_documento") ?? "").trim() || null
        : null,
  };
}

/**
 * Crea un contrato a partir de los datos revisados/confirmados que salieron
 * de leer una promesa de compraventa en PDF (ver /contratos/nueva-promesa).
 * Si el cliente no existía, lo crea primero; luego reutiliza la misma
 * mecánica de creación de contrato + vínculo de propiedades + generación de
 * cuotas que usa "Nuevo contrato" manual.
 */
export async function crearContratoDesdePromesa(formData: FormData) {
  const supabase = await createClient();
  const modo = String(formData.get("cliente_modo") ?? "existente");

  let clienteId = String(formData.get("cliente_id") ?? "");

  if (modo === "nuevo") {
    const clienteData = readClienteDesdePromesa(formData);

    if (!clienteData.nombre || !clienteData.apellido) {
      redirect(
        `/contratos/nueva-promesa?error=${encodeURIComponent(
          "Completa al menos el nombre y apellido del nuevo cliente."
        )}`
      );
    }

    const { data: clienteCreado, error: errorCliente } = await supabase
      .from("clientes")
      .insert(clienteData)
      .select()
      .single();

    if (errorCliente || !clienteCreado) {
      redirect(
        `/contratos/nueva-promesa?error=${encodeURIComponent(
          errorCliente?.message ?? "No se pudo crear el cliente."
        )}`
      );
    }

    clienteId = clienteCreado!.id;
  }

  if (!clienteId) {
    redirect(
      `/contratos/nueva-promesa?error=${encodeURIComponent(
        "Selecciona un cliente existente o completa los datos del nuevo cliente."
      )}`
    );
  }

  const data = readContratoForm(formData);
  data.cliente_id = clienteId;
  const propiedadIds = readPropiedadIds(formData);

  if (propiedadIds.length === 0) {
    redirect(
      `/contratos/nueva-promesa?error=${encodeURIComponent(
        "Selecciona al menos una propiedad/lote."
      )}`
    );
  }

  const { data: contrato, error } = await supabase
    .from("contratos")
    .insert(data)
    .select()
    .single();

  if (error || !contrato) {
    redirect(`/contratos/nueva-promesa?error=${encodeURIComponent(error?.message ?? "Error")}`);
  }

  const { error: errorVinculos } = await supabase.from("contrato_propiedades").insert(
    propiedadIds.map((propiedad_id) => ({ contrato_id: contrato!.id, propiedad_id }))
  );
  if (errorVinculos) {
    redirect(`/contratos/nueva-promesa?error=${encodeURIComponent(errorVinculos.message)}`);
  }

  const cuotas: {
    contrato_id: string;
    numero_cuota: number;
    fecha_vencimiento: string;
    monto: number;
    monto_pagado: number;
    estado: string;
  }[] = [];

  if (data.cuota_inicial > 0) {
    cuotas.push({
      contrato_id: contrato!.id,
      numero_cuota: 0,
      fecha_vencimiento: data.fecha_inicio,
      monto: data.cuota_inicial,
      monto_pagado: 0,
      estado: "pendiente",
    });
  }

  const offsetMeses = data.cuota_inicial > 0 ? 1 : 0;
  const fechas = generarFechasCuotas(
    data.fecha_inicio,
    data.cantidad_cuotas,
    data.dia_vencimiento,
    offsetMeses
  );

  fechas.forEach((fecha, i) => {
    const monto = Number(formData.get(`monto_cuota_${i + 1}`) ?? 0);
    cuotas.push({
      contrato_id: contrato!.id,
      numero_cuota: i + 1,
      fecha_vencimiento: fecha,
      monto,
      monto_pagado: 0,
      estado: "pendiente",
    });
  });

  const { error: errorCuotas } = await supabase.from("cuotas").insert(cuotas);
  if (errorCuotas) {
    redirect(`/contratos/nueva-promesa?error=${encodeURIComponent(errorCuotas.message)}`);
  }

  await supabase.rpc("marcar_propiedades_prometidas", { ids: propiedadIds });

  revalidatePath("/contratos");
  revalidatePath("/cuotas");
  revalidatePath("/propiedades");
  revalidatePath("/clientes");
  redirect("/contratos");
}

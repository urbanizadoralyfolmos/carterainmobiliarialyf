export type Cliente = {
  id: string;
  tipo_persona: "natural" | "juridica";
  // Persona natural
  nombre: string | null;
  apellido: string | null;
  documento: string | null;
  // Persona jurídica (sociedad)
  razon_social: string | null;
  nit: string | null;
  representante_nombre: string | null;
  representante_documento: string | null;
  // Comunes (para persona jurídica son los datos de la sociedad)
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  notas: string | null;
  created_at: string;
};

export type Proyecto = {
  id: string;
  nombre: string;
  ciudad: string | null;
  descripcion: string | null;
  valor_m2: number | null;
  created_at: string;
};

export type Propiedad = {
  id: string;
  direccion: string;
  ciudad: string | null;
  tipo: string;
  superficie_m2: number | null;
  valor_referencia: number | null;
  estado: string;
  numero_escritura: string | null;
  fecha_escritura: string | null;
  numero_factura: string | null;
  descripcion: string | null;
  proyecto_id: string | null;
  numero_lote: string | null;
  manzana: string | null;
  created_at: string;
  proyectos?: Proyecto;
};

export type Contrato = {
  id: string;
  numero: number;
  cliente_id: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  cuota_inicial: number;
  monto_total: number | null;
  moneda: string;
  cantidad_cuotas: number;
  dia_vencimiento: number;
  tasa_mora_mensual: number;
  estado: string;
  notas: string | null;
  created_at: string;
  clientes?: Cliente;
  // Un contrato puede tener una o más propiedades (tabla puente
  // contrato_propiedades). Se completa solo cuando la consulta lo pide.
  propiedades?: Propiedad[];
};

export type Cuota = {
  id: string;
  contrato_id: string;
  numero_cuota: number;
  fecha_vencimiento: string;
  monto: number;
  monto_pagado: number;
  fecha_pago: string | null;
  estado: string;
  created_at: string;
  contratos?: Contrato;
};

export type Recibo = {
  id: string;
  numero: number;
  cuota_id: string;
  monto: number;
  fecha_pago: string;
  created_at: string;
  cuotas?: Cuota;
};

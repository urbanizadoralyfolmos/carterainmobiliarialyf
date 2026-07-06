export type Cliente = {
  id: string;
  nombre: string;
  apellido: string;
  documento: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  notas: string | null;
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
  descripcion: string | null;
  created_at: string;
};

export type Contrato = {
  id: string;
  cliente_id: string;
  propiedad_id: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  monto_cuota: number;
  moneda: string;
  cantidad_cuotas: number;
  dia_vencimiento: number;
  tasa_mora_mensual: number;
  estado: string;
  notas: string | null;
  created_at: string;
  clientes?: Cliente;
  propiedades?: Propiedad;
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

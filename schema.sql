-- ============================================================
-- Cartera Inmobiliaria — esquema de base de datos (Supabase/Postgres)
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tabla: perfiles (uno por usuario autenticado)
-- ------------------------------------------------------------
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre_completo text,
  rol text not null default 'admin' check (rol in ('admin', 'gestor', 'lectura')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre_completo)
  values (new.id, new.raw_user_meta_data ->> 'nombre_completo');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- Tabla: clientes
-- ------------------------------------------------------------
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  apellido text not null,
  documento text,
  email text,
  telefono text,
  direccion text,
  notas text,
  tipo_persona text not null default 'natural' check (tipo_persona in ('natural', 'juridica')),
  razon_social text,
  nit text,
  representante_nombre text,
  representante_documento text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Tabla: proyectos (urbanizaciones)
-- ------------------------------------------------------------
create table if not exists public.proyectos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  ciudad text,
  descripcion text,
  valor_m2 numeric,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.proyectos enable row level security;

drop policy if exists "proyectos_all_authenticated" on public.proyectos;
create policy "proyectos_all_authenticated" on public.proyectos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- Tabla: propiedades (incluye lotes de proyectos/urbanizaciones)
-- ------------------------------------------------------------
create table if not exists public.propiedades (
  id uuid primary key default gen_random_uuid(),
  direccion text not null,
  ciudad text,
  tipo text not null default 'departamento'
    check (tipo in ('lote', 'departamento', 'casa', 'local', 'terreno', 'oficina', 'otro')),
  superficie_m2 numeric,
  valor_referencia numeric,
  estado text not null default 'disponible'
    check (estado in ('disponible', 'prometido_en_venta', 'escriturado', 'facturado')),
  numero_escritura text,
  fecha_escritura date,
  numero_factura text,
  proyecto_id uuid references public.proyectos(id) on delete set null,
  numero_lote text,
  manzana text,
  descripcion text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_propiedades_proyecto on public.propiedades(proyecto_id);
create index if not exists idx_propiedades_manzana on public.propiedades(proyecto_id, manzana);

-- ------------------------------------------------------------
-- Tabla: contratos
-- ------------------------------------------------------------
create table if not exists public.contratos (
  id uuid primary key default gen_random_uuid(),
  numero integer generated always as identity,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  tipo text not null default 'alquiler' check (tipo in ('alquiler', 'venta')),
  fecha_inicio date not null,
  fecha_fin date,
  monto_total numeric,
  cuota_inicial numeric not null default 0,
  moneda text not null default 'COP',
  cantidad_cuotas integer not null default 12,
  dia_vencimiento integer not null default 10 check (dia_vencimiento between 1 and 28),
  tasa_mora_mensual numeric not null default 5,
  estado text not null default 'activo' check (estado in ('activo', 'cancelado', 'cedido', 'escriturado')),
  notas text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_contratos_cliente on public.contratos(cliente_id);

-- ------------------------------------------------------------
-- Tabla puente: contrato_propiedades (un contrato puede incluir
-- varios lotes/propiedades, y en teoría una propiedad podría
-- quedar ligada a más de un contrato a lo largo del tiempo).
-- ------------------------------------------------------------
create table if not exists public.contrato_propiedades (
  contrato_id uuid not null references public.contratos(id) on delete cascade,
  propiedad_id uuid not null references public.propiedades(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (contrato_id, propiedad_id)
);

create index if not exists idx_contrato_propiedades_contrato on public.contrato_propiedades(contrato_id);
create index if not exists idx_contrato_propiedades_propiedad on public.contrato_propiedades(propiedad_id);

alter table public.contrato_propiedades enable row level security;

drop policy if exists "contrato_propiedades_all_authenticated" on public.contrato_propiedades;
create policy "contrato_propiedades_all_authenticated" on public.contrato_propiedades
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- Tabla: cuotas
-- ------------------------------------------------------------
create table if not exists public.cuotas (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contratos(id) on delete cascade,
  numero_cuota integer not null,
  fecha_vencimiento date not null,
  monto numeric not null,
  monto_pagado numeric not null default 0,
  fecha_pago date,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'pagada', 'parcial', 'vencida')),
  referencia text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contrato_id, numero_cuota)
);

create index if not exists idx_cuotas_contrato on public.cuotas(contrato_id);
create index if not exists idx_cuotas_vencimiento on public.cuotas(fecha_vencimiento);

-- ------------------------------------------------------------
-- Tabla: recibos (comprobante de cada pago registrado)
-- ------------------------------------------------------------
create table if not exists public.recibos (
  id uuid primary key default gen_random_uuid(),
  numero integer generated always as identity,
  cuota_id uuid not null references public.cuotas(id) on delete cascade,
  monto numeric not null,
  fecha_pago date not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_recibos_cuota on public.recibos(cuota_id);

alter table public.recibos enable row level security;

drop policy if exists "recibos_all_authenticated" on public.recibos;
create policy "recibos_all_authenticated" on public.recibos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- Vista: cuotas con mora calculada al día de hoy
-- ------------------------------------------------------------
create or replace view public.cuotas_con_mora as
select
  cu.*,
  co.tasa_mora_mensual,
  co.moneda,
  case
    when cu.estado <> 'pagada' and cu.fecha_vencimiento < current_date
      then (current_date - cu.fecha_vencimiento)
    else 0
  end as dias_mora,
  case
    when cu.estado <> 'pagada' and cu.fecha_vencimiento < current_date
      then round(
        (cu.monto - cu.monto_pagado)
        * (co.tasa_mora_mensual / 100.0 / 30.0)
        * (current_date - cu.fecha_vencimiento),
        2
      )
    else 0
  end as recargo_mora
from public.cuotas cu
join public.contratos co on co.id = cu.contrato_id;

-- ------------------------------------------------------------
-- Trigger: mantiene updated_at
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_proyectos_updated on public.proyectos;
create trigger trg_proyectos_updated before update on public.proyectos
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_clientes_updated on public.clientes;
create trigger trg_clientes_updated before update on public.clientes
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_propiedades_updated on public.propiedades;
create trigger trg_propiedades_updated before update on public.propiedades
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_contratos_updated on public.contratos;
create trigger trg_contratos_updated before update on public.contratos
  for each row execute procedure public.set_updated_at();

drop trigger if exists trg_cuotas_updated on public.cuotas;
create trigger trg_cuotas_updated before update on public.cuotas
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- Row Level Security: cualquier usuario autenticado puede
-- leer/escribir (app de uso interno de un solo equipo).
-- ------------------------------------------------------------
alter table public.perfiles enable row level security;
alter table public.clientes enable row level security;
alter table public.propiedades enable row level security;
alter table public.contratos enable row level security;
alter table public.cuotas enable row level security;

drop policy if exists "perfiles_select_own" on public.perfiles;
create policy "perfiles_select_own" on public.perfiles
  for select using (auth.uid() = id);

drop policy if exists "perfiles_update_own" on public.perfiles;
create policy "perfiles_update_own" on public.perfiles
  for update using (auth.uid() = id);

drop policy if exists "clientes_all_authenticated" on public.clientes;
create policy "clientes_all_authenticated" on public.clientes
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "propiedades_all_authenticated" on public.propiedades;
create policy "propiedades_all_authenticated" on public.propiedades
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "contratos_all_authenticated" on public.contratos;
create policy "contratos_all_authenticated" on public.contratos
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "cuotas_all_authenticated" on public.cuotas;
create policy "cuotas_all_authenticated" on public.cuotas
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

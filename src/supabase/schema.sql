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
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Tabla: propiedades
-- ------------------------------------------------------------
create table if not exists public.propiedades (
  id uuid primary key default gen_random_uuid(),
  direccion text not null,
  ciudad text,
  tipo text not null default 'departamento'
    check (tipo in ('departamento', 'casa', 'local', 'terreno', 'oficina', 'otro')),
  superficie_m2 numeric,
  valor_referencia numeric,
  estado text not null default 'disponible'
    check (estado in ('disponible', 'prometido_en_venta', 'escriturado', 'facturado')),
  numero_escritura text,
  fecha_escritura date,
  numero_factura text,
  descripcion text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Tabla: contratos
-- ------------------------------------------------------------
create table if not exists public.contratos (
  id uuid primary key default gen_random_uuid(),
  numero integer generated always as identity,
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  propiedad_id uuid not null references public.propiedades(id) on delete restrict,
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
create index if not exists idx_contratos_propiedad on public.contratos(propiedad_id);

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contrato_id, numero_cuota)
);

create index if not exists idx_cuotas_contrato on public.cuotas(contrato_id);
create index if not exists idx_cuotas_vencimiento on public.cuotas(fecha_vencimiento);

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

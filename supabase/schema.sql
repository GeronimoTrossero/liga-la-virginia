-- Liga La Virginia — schema idempotente. El cálculo vive en lib/scoring.ts (no en SQL).

drop table if exists automation_log cascade;
drop table if exists ajuste_kpi cascade;
drop table if exists mision_progreso cascade;
drop table if exists mision cascade;
drop table if exists figurita cascade;
drop table if exists venta_familia_demo cascade;
drop table if exists cliente_demo cascade;
drop table if exists lanzamiento cascade;
drop table if exists score_anual cascade;
drop table if exists score_mes cascade;
drop table if exists kpi_mes cascade;
drop table if exists vendedor cascade;

create table if not exists vendedor (
  id text primary key,
  nombre text not null,
  sucursal text not null,
  regional text not null,
  supervisor text not null,
  tipo text not null,
  zona text not null check (zona in ('GBA','INTERIOR'))
);

create table if not exists kpi_mes (
  vendedor_id text not null references vendedor(id),
  mes text not null,
  clientes_cartera int not null,
  clientes_compradores int not null,
  clientes_con_lanzamiento int not null,
  kilos_objetivo numeric not null,
  kilos_vendidos numeric not null,
  visitas_realizadas int not null,
  pedidos_levantados int not null,
  pedidos_no_entregados int not null,
  cobros_mes int not null,
  cobros_en_plazo int not null,
  encuestas_asignadas int not null,
  encuestas_realizadas int not null,
  primary key (vendedor_id, mes)
);

create table if not exists score_mes (
  vendedor_id text not null references vendedor(id),
  mes text not null,
  cumpl_vta numeric, cumpl_prd numeric, cumpl_act numeric, cumpl_lan numeric,
  cumpl_ent numeric, cumpl_cob numeric, cumpl_rel numeric,
  puntaje numeric not null,
  nivel text not null,
  bloqueado boolean not null default false,
  motivo_bloqueo text,
  rank_general int, rank_sucursal int, rank_tipo int,
  rank_vta int, rank_prd int, rank_act int, rank_lan int, rank_ent int, rank_cob int, rank_rel int,
  delta_rank int,
  primary key (vendedor_id, mes)
);

create table if not exists score_anual (
  vendedor_id text not null references vendedor(id),
  anio text not null,
  puntaje_prom numeric not null,
  rank_general int,
  rank_sucursal int,
  meses_podio int,
  mejor_mes text,
  primary key (vendedor_id, anio)
);

create table if not exists figurita (
  id text primary key,
  vendedor_id text not null references vendedor(id),
  mes text not null,
  kpi text not null,
  puesto int not null check (puesto in (1,2,3)),
  rareza text not null check (rareza in ('oro','plata','bronce','holo'))
);

create table if not exists mision (
  id text primary key,
  mes text not null,
  titulo text not null,
  descripcion text not null,
  kpi text not null,
  meta numeric not null,
  alcance text not null check (alcance in ('INDIVIDUAL','SUCURSAL')),
  premio text not null,
  icono text not null
);

create table if not exists mision_progreso (
  mision_id text not null references mision(id),
  vendedor_id text references vendedor(id),
  sucursal text,
  progreso numeric not null,
  cumplida boolean not null default false
);

create table if not exists lanzamiento (
  id text primary key,
  producto text not null,
  desde date not null
);

create table if not exists cliente_demo (
  id text primary key,
  vendedor_id text not null references vendedor(id),
  nombre_comercio text not null,
  rubro text not null,
  compro_mes boolean not null default true,
  compro_lanzamiento boolean not null default true,
  lanzamiento_id text references lanzamiento(id),
  relevado boolean not null default true,
  estacional boolean not null default false,
  saldo_cc numeric not null default 0,
  facturas int not null default 0,
  vence_el date,
  pagado boolean not null default true,
  pedido_no_entregado boolean not null default false,
  motivo_no_entrega text,
  telefono_demo text
);
create index if not exists cliente_demo_vendedor on cliente_demo(vendedor_id);

create table if not exists venta_familia_demo (
  vendedor_id text not null references vendedor(id),
  familia text not null,
  objetivo_kg numeric not null,
  vendido_kg numeric not null,
  primary key (vendedor_id, familia)
);

create table if not exists ajuste_kpi (
  id bigint generated always as identity primary key,
  vendedor_id text not null references vendedor(id),
  mes text not null,
  campo text not null,
  delta numeric not null,
  origen text not null,
  created_at timestamptz not null default now()
);

create table if not exists automation_log (
  id bigint generated always as identity primary key,
  tipo text not null,
  vendedor_id text references vendedor(id),
  cliente_id text,
  canal text not null default 'whatsapp',
  mensaje text not null,
  estado text not null check (estado in ('enviado','respondido','pagado','simulado')),
  created_at timestamptz not null default now()
);

-- RLS activado sin políticas: anon no lee nada. Lecturas y escrituras van por el servidor (service role) filtrando por sesión.
-- Ver schema-v2.sql (usuarios, misión de equipo, reconocimientos).
do $$
declare t text;
begin
  foreach t in array array['vendedor','kpi_mes','score_mes','score_anual','figurita','mision','mision_progreso','lanzamiento','cliente_demo','venta_familia_demo','ajuste_kpi','automation_log'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

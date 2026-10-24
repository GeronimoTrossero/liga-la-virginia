-- V2: login propio + sin lecturas anon. Idempotente; correr después de schema.sql.

create table if not exists usuario (
  id text primary key,
  rol text not null check (rol in ('VENDEDOR','SUPERVISOR','GERENCIA')),
  ref text not null,
  nombre text not null,
  pin_hash text not null
);

create table if not exists mision_equipo (
  supervisor text not null,
  mes text not null,
  mision_key text not null,
  updated_at timestamptz not null default now(),
  primary key (supervisor, mes)
);

create table if not exists reconocimiento (
  id bigint generated always as identity primary key,
  de text not null,
  para text not null references vendedor(id),
  mensaje text not null,
  created_at timestamptz not null default now()
);

-- Sin políticas SELECT para anon: todas las lecturas van por el servidor con service role filtrando por sesión.
do $$
declare t text;
begin
  foreach t in array array['vendedor','kpi_mes','score_mes','score_anual','figurita','mision','mision_progreso','lanzamiento','cliente_demo','venta_familia_demo','ajuste_kpi','automation_log','usuario','mision_equipo','reconocimiento'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "lectura publica" on %I', t);
  end loop;
end $$;

-- Chau Realtime (reemplazado por polling SWR a una API filtrada por sesión)
do $$
declare t text;
begin
  foreach t in array array['cliente_demo','ajuste_kpi','automation_log'] loop
    if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = t) then
      execute format('alter publication supabase_realtime drop table %I', t);
    end if;
  end loop;
end $$;

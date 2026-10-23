-- =====================================================================================
-- Cota · esquema inicial (Supabase / PostgreSQL)
-- Una tabla por clave de TableMap (src/domain/types.ts). Pégalo entero en el SQL Editor.
-- Es re-ejecutable: usa "if not exists" y recrea políticas y triggers.
-- =====================================================================================
--
-- Convenciones de sincronización (las usa src/db/sync.ts):
--   · id          uuid generado en el cliente (clave primaria).
--   · user_id     propietario; por defecto el usuario autenticado. Con RLS solo se ve lo propio.
--   · updated_at  marca de tiempo puesta por el cliente; "el último cambio gana".
--   · deleted     borrado lógico (tombstone) para que los borrados lleguen a otros dispositivos.
--   · synced_at   marca de tiempo puesta por el SERVIDOR en cada escritura; el cliente la usa
--                 como cursor de descarga (así no se pierden cambios hechos sin conexión con
--                 un reloj atrasado). No forma parte del contrato de tipos del cliente.

-- ───────────────────────────── settings ─────────────────────────────
create table if not exists public.settings (
  id                      uuid primary key,
  user_id                 uuid not null default auth.uid() references auth.users (id) on delete cascade,
  start_date              date    not null,
  goal_date               date    not null,
  goal_weight             numeric not null,
  height_cm               numeric not null,
  protein_min             numeric not null,
  protein_max             numeric not null,
  -- Mantenimiento fijado a mano (kcal/día); null = usar el estimado adaptativo.
  kcal_maintenance_manual numeric,
  deficit_kcal            numeric not null,
  updated_at              timestamptz not null,
  deleted                 boolean not null default false,
  synced_at               timestamptz not null default clock_timestamp()
);

-- ───────────────────────────── body_logs ─────────────────────────────
create table if not exists public.body_logs (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date        date not null,
  weight      numeric,
  waist       numeric,
  knee_pain   integer,
  note        text,
  source      text not null default 'app',
  updated_at  timestamptz not null,
  deleted     boolean not null default false,
  synced_at   timestamptz not null default clock_timestamp(),
  constraint body_logs_knee_pain_chk check (knee_pain is null or knee_pain between 0 and 10),
  constraint body_logs_weight_chk    check (weight    is null or weight    between 30 and 250),
  constraint body_logs_waist_chk     check (waist     is null or waist     between 40 and 200),
  constraint body_logs_source_chk    check (source in ('app', 'opengym'))
);

-- ───────────────────────────── sessions ─────────────────────────────
create table if not exists public.sessions (
  id            uuid primary key,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date          date not null,
  routine_code  text,
  source        text not null default 'app',
  -- Identificador estable del workout en OpenGym: evita duplicar al reimportar.
  source_ref    text,
  duration_min  numeric,
  -- Sesión de deload o excluida de la progresión.
  excluded      boolean not null default false,
  updated_at    timestamptz not null,
  deleted       boolean not null default false,
  synced_at     timestamptz not null default clock_timestamp(),
  constraint sessions_routine_code_chk check (routine_code is null or routine_code in ('A','B','C','H1','H2','Z2','DL')),
  constraint sessions_source_chk       check (source in ('app', 'opengym'))
);

-- ───────────────────────────── session_sets ─────────────────────────────
create table if not exists public.session_sets (
  id           uuid primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id   uuid not null references public.sessions (id) on delete cascade,
  exercise_id  text not null,
  set_index    integer not null,
  weight       numeric,
  reps         numeric,
  sec          numeric,
  rir          numeric,
  is_warmup    boolean not null default false,
  updated_at   timestamptz not null,
  deleted      boolean not null default false,
  synced_at    timestamptz not null default clock_timestamp()
);

-- ───────────────────────────── activities ─────────────────────────────
create table if not exists public.activities (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date        date not null,
  kind        text not null,
  minutes     numeric not null,
  note        text,
  updated_at  timestamptz not null,
  deleted     boolean not null default false,
  synced_at   timestamptz not null default clock_timestamp(),
  constraint activities_kind_chk check (kind in ('walk', 'run', 'bike', 'elliptical', 'other'))
);

-- ───────────────────────────── shifts (guardias de 24 h) ─────────────────────────────
create table if not exists public.shifts (
  id          uuid primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date        date not null,
  updated_at  timestamptz not null,
  deleted     boolean not null default false,
  synced_at   timestamptz not null default clock_timestamp()
);

-- ───────────────────────────── food_logs ─────────────────────────────
create table if not exists public.food_logs (
  id           uuid primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date         date not null,
  meal         text not null,
  label        text not null,
  kcal         numeric not null,
  protein_g    numeric not null,
  -- Sin clave foránea a propósito: el favorito puede borrarse sin afectar a los registros.
  favorite_id  uuid,
  updated_at   timestamptz not null,
  deleted      boolean not null default false,
  synced_at    timestamptz not null default clock_timestamp(),
  constraint food_logs_meal_chk check (meal in ('desayuno', 'comida', 'merienda', 'cena', 'snack'))
);

-- ───────────────────────────── food_favorites ─────────────────────────────
create table if not exists public.food_favorites (
  id            uuid primary key,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label         text not null,
  kcal          numeric not null,
  protein_g     numeric not null,
  default_meal  text not null,
  updated_at    timestamptz not null,
  deleted       boolean not null default false,
  synced_at     timestamptz not null default clock_timestamp(),
  constraint food_favorites_meal_chk check (default_meal in ('desayuno', 'comida', 'merienda', 'cena', 'snack'))
);

-- ───────────────────────────── imports (copias de OpenGym ya importadas) ─────────────────────────────
create table if not exists public.imports (
  id           uuid primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source       text not null default 'opengym',
  filename     text not null,
  file_hash    text not null,
  imported_at  timestamptz not null,
  counts       jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null,
  deleted      boolean not null default false,
  synced_at    timestamptz not null default clock_timestamp(),
  constraint imports_source_chk check (source in ('opengym'))
);

-- =====================================================================================
-- Índices
-- =====================================================================================

-- Rutas habituales de consulta: (user_id, updated_at) en todas las tablas y
-- (user_id, synced_at) para el cursor de descarga incremental.
create index if not exists settings_user_updated_idx       on public.settings       (user_id, updated_at);
create index if not exists body_logs_user_updated_idx      on public.body_logs      (user_id, updated_at);
create index if not exists sessions_user_updated_idx       on public.sessions       (user_id, updated_at);
create index if not exists session_sets_user_updated_idx   on public.session_sets   (user_id, updated_at);
create index if not exists activities_user_updated_idx     on public.activities     (user_id, updated_at);
create index if not exists shifts_user_updated_idx         on public.shifts         (user_id, updated_at);
create index if not exists food_logs_user_updated_idx      on public.food_logs      (user_id, updated_at);
create index if not exists food_favorites_user_updated_idx on public.food_favorites (user_id, updated_at);
create index if not exists imports_user_updated_idx        on public.imports        (user_id, updated_at);

create index if not exists settings_user_synced_idx       on public.settings       (user_id, synced_at);
create index if not exists body_logs_user_synced_idx      on public.body_logs      (user_id, synced_at);
create index if not exists sessions_user_synced_idx       on public.sessions       (user_id, synced_at);
create index if not exists session_sets_user_synced_idx   on public.session_sets   (user_id, synced_at);
create index if not exists activities_user_synced_idx     on public.activities     (user_id, synced_at);
create index if not exists shifts_user_synced_idx         on public.shifts         (user_id, synced_at);
create index if not exists food_logs_user_synced_idx      on public.food_logs      (user_id, synced_at);
create index if not exists food_favorites_user_synced_idx on public.food_favorites (user_id, synced_at);
create index if not exists imports_user_synced_idx        on public.imports        (user_id, synced_at);

-- Apoyo a las pantallas (consultas por fecha / por sesión).
create index if not exists activities_user_date_idx   on public.activities   (user_id, date);
create index if not exists food_logs_user_date_idx    on public.food_logs    (user_id, date);
create index if not exists session_sets_session_idx   on public.session_sets (session_id);
create index if not exists sessions_user_date_idx     on public.sessions     (user_id, date);

-- Unicidad "natural" (claves de negocio). Los parciales ignoran los borrados lógicos.
create unique index if not exists body_logs_user_date_uq on public.body_logs (user_id, date)
  where not deleted;                                       -- una pesada por día
create unique index if not exists settings_user_uq       on public.settings  (user_id);   -- una sola fila de ajustes
create unique index if not exists sessions_user_source_ref_uq on public.sessions (user_id, source_ref)
  where source_ref is not null and not deleted;            -- no duplicar workouts de OpenGym
create unique index if not exists imports_user_file_hash_uq on public.imports (user_id, file_hash);  -- no reimportar el mismo archivo
create unique index if not exists shifts_user_date_uq    on public.shifts    (user_id, date)
  where not deleted;                                       -- una guardia por día

-- =====================================================================================
-- Trigger: "el último cambio gana" también en el servidor + synced_at
-- =====================================================================================
-- · En UPDATE ignora (silenciosamente) las escrituras cuyo updated_at es más antiguo que el de
--   la fila guardada: un dispositivo con datos viejos no puede pisar cambios más recientes.
-- · Pone synced_at con la hora del servidor (cursor de descarga fiable).
create or replace function public.ruta85_lww()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null;  -- descartar: la fila almacenada es más reciente
  end if;
  new.synced_at := clock_timestamp();
  return new;
end;
$$;

-- =====================================================================================
-- RLS: cada usuario solo ve y modifica sus propias filas; anon no tiene acceso a nada.
-- =====================================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'settings', 'body_logs', 'sessions', 'session_sets',
    'activities', 'shifts', 'food_logs', 'food_favorites', 'imports'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    -- Privilegios de tabla: nada para anon; CRUD para authenticated (filtrado por RLS).
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);

    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
      t || '_select', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))',
      t || '_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || '_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))',
      t || '_delete', t);

    -- Trigger de último-cambio-gana + synced_at.
    execute format('drop trigger if exists %I on public.%I', t || '_lww', t);
    execute format(
      'create trigger %I before insert or update on public.%I for each row execute function public.ruta85_lww()',
      t || '_lww', t);
  end loop;
end;
$$;

-- La función solo la usan los triggers; nadie necesita llamarla directamente.
revoke execute on function public.ruta85_lww() from public, anon, authenticated;

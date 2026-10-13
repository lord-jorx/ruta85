-- Ruta 85 · 002: quitar privilegios de tabla que no usa la app.
-- Supabase concede por defecto a "authenticated" más privilegios de los que da 001_init.sql.
-- La app solo necesita select/insert/update/delete (filtrados por RLS). TRUNCATE se salta RLS;
-- no es alcanzable por la API REST, pero se retira por defensa en profundidad. Re-ejecutable.
do $$
declare
  t text;
begin
  foreach t in array array[
    'settings', 'body_logs', 'sessions', 'session_sets',
    'activities', 'shifts', 'food_logs', 'food_favorites', 'imports'
  ]
  loop
    execute format('revoke truncate, references, trigger on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

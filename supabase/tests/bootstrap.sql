-- Only for a disposable vanilla PostgreSQL test container (not hosted Supabase).
do $$begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin;end if;end$$;
do $$begin if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin;end if;end$$;
create schema auth;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth, public to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
alter default privileges in schema public grant select,insert,update,delete on tables to authenticated;

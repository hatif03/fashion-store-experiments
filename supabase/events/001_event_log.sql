-- STILLFORM event log: the anonymous visit events behind the /live page.
-- A separate Supabase project from the store's optional backend.
-- Nothing reads or writes the table directly (RLS on, no policies). The
-- server function in api/track.ts calls record_event; api/stats.ts calls
-- analytics_summary, which returns aggregates only, never a visitor id.

create table if not exists public.events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  environment text not null default 'production' check (environment in ('production', 'preview', 'development')),
  event text not null check (event ~ '^[a-z_]{2,40}$'),
  visitor_id text not null check (char_length(visitor_id) between 8 and 64),
  session_id text check (char_length(session_id) <= 64),
  path text check (char_length(path) <= 200),
  product_id text check (char_length(product_id) <= 60),
  value numeric(10, 2) check (value between 0 and 100000),
  variant text check (char_length(variant) <= 40),
  utm_source text check (char_length(utm_source) <= 60),
  utm_medium text check (char_length(utm_medium) <= 60),
  utm_campaign text check (char_length(utm_campaign) <= 60),
  referrer_host text check (char_length(referrer_host) <= 120),
  device text check (device in ('mobile', 'tablet', 'desktop')),
  country text check (country ~ '^[A-Z]{2}$'),
  region text check (char_length(region) <= 80),
  city text check (char_length(city) <= 80),
  -- Rounded to one decimal (about 11 km): a city, never an address.
  lat numeric(4, 1) check (lat between -90 and 90),
  lon numeric(4, 1) check (lon between -180 and 180),
  metadata jsonb not null default '{}'::jsonb check (pg_column_size(metadata) < 2048)
);

create index if not exists events_created_at on public.events (created_at desc);
create index if not exists events_visitor_recent on public.events (visitor_id, created_at desc);
create index if not exists events_event on public.events (environment, event, created_at desc);

alter table public.events enable row level security;
revoke all on public.events from anon, authenticated;

create or replace function public.record_event(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_visitor text := left(p ->> 'visitor_id', 64);
begin
  if v_visitor is null or char_length(v_visitor) < 8 then
    return;
  end if;
  -- A browser that sends more than 300 events in ten minutes is not a shopper.
  if (select count(*) from public.events e where e.visitor_id = v_visitor and e.created_at > now() - interval '10 minutes') >= 300 then
    return;
  end if;
  insert into public.events (
    environment, event, visitor_id, session_id, path, product_id, value, variant,
    utm_source, utm_medium, utm_campaign, referrer_host, device,
    country, region, city, lat, lon, metadata
  ) values (
    coalesce(nullif(p ->> 'environment', ''), 'production'),
    p ->> 'event',
    v_visitor,
    left(p ->> 'session_id', 64),
    left(p ->> 'path', 200),
    left(nullif(p ->> 'product_id', ''), 60),
    nullif(p ->> 'value', '')::numeric,
    left(nullif(p ->> 'variant', ''), 40),
    left(nullif(p ->> 'utm_source', ''), 60),
    left(nullif(p ->> 'utm_medium', ''), 60),
    left(nullif(p ->> 'utm_campaign', ''), 60),
    left(nullif(p ->> 'referrer_host', ''), 120),
    nullif(p ->> 'device', ''),
    nullif(upper(p ->> 'country'), ''),
    left(nullif(p ->> 'region', ''), 80),
    left(nullif(p ->> 'city', ''), 80),
    round((nullif(p ->> 'lat', ''))::numeric, 1),
    round((nullif(p ->> 'lon', ''))::numeric, 1),
    coalesce(p -> 'metadata', '{}'::jsonb)
  );
end;
$$;

drop function if exists public.analytics_summary(integer);

create or replace function public.analytics_summary(p_hours integer default null, p_environment text default 'production')
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with e as (
    select * from public.events
    where environment = p_environment
      and (p_hours is null or created_at > now() - make_interval(hours => p_hours))
  )
  select jsonb_build_object(
    'generated_at', now(),
    'first_event_at', (select min(created_at) from e),
    'totals', (
      select jsonb_build_object(
        'visitors', count(distinct visitor_id),
        'sessions', count(distinct session_id),
        'page_views', count(*) filter (where event = 'page_viewed'),
        'product_views', count(*) filter (where event = 'product_viewed'),
        'adds', count(*) filter (where event = 'piece_added'),
        'orders', count(*) filter (where event = 'order_placed'),
        'demo_revenue', coalesce(sum(value) filter (where event = 'order_placed'), 0),
        'associate_messages', count(*) filter (where event = 'associate_message_sent'),
        'countries', count(distinct country),
        'cities', count(distinct country || '/' || city)
      )
      from e
    ),
    'funnel', (
      select jsonb_agg(jsonb_build_object('step', s.step, 'event', s.event, 'visitors', (select count(distinct visitor_id) from e where s.event = 'any' or e.event = s.event)) order by s.ord)
      from (values
        (1, 'Visited', 'any'),
        (2, 'Opened a product', 'product_viewed'),
        (3, 'Added to bag', 'piece_added'),
        (4, 'Started checkout', 'checkout_started'),
        (5, 'Placed a demo order', 'order_placed')
      ) as s(ord, step, event)
    ),
    'countries', (
      select coalesce(jsonb_agg(c), '[]'::jsonb)
      from (
        select country as code, count(distinct visitor_id) as visitors
        from e where country is not null
        group by country order by visitors desc limit 80
      ) c
    ),
    'places', (
      select coalesce(jsonb_agg(p), '[]'::jsonb)
      from (
        select city, country, round(avg(lat), 1) as lat, round(avg(lon), 1) as lon,
               count(distinct visitor_id) as visitors, max(created_at) as last_seen
        from e where lat is not null and lon is not null
        group by city, country order by visitors desc limit 300
      ) p
    ),
    'recent', (
      select coalesce(jsonb_agg(r), '[]'::jsonb)
      from (
        select event, city, country, lat, lon, product_id, created_at
        from e
        where event in ('page_viewed', 'product_viewed', 'piece_added', 'order_placed', 'associate_message_sent')
        order by created_at desc limit 40
      ) r
    ),
    'sources', (
      select coalesce(jsonb_agg(s), '[]'::jsonb)
      from (
        select coalesce(utm_source, referrer_host, 'direct') as source, count(distinct visitor_id) as visitors
        from e group by 1 order by visitors desc limit 12
      ) s
    ),
    'devices', (
      select coalesce(jsonb_agg(d), '[]'::jsonb)
      from (select device, count(distinct visitor_id) as visitors from e where device is not null group by device order by visitors desc) d
    ),
    'variants', (
      select coalesce(jsonb_agg(v), '[]'::jsonb)
      from (
        select variant,
               count(distinct visitor_id) as visitors,
               count(distinct visitor_id) filter (where event = 'product_viewed') as viewers,
               count(distinct visitor_id) filter (where event = 'piece_added') as adders
        from e where variant is not null
        group by variant order by variant
      ) v
    ),
    'products', (
      select coalesce(jsonb_agg(x), '[]'::jsonb)
      from (
        select product_id,
               count(distinct visitor_id) filter (where event = 'product_viewed') as viewers,
               count(distinct visitor_id) filter (where event = 'piece_added') as adders
        from e where product_id is not null
        group by product_id order by viewers desc limit 10
      ) x
    ),
    'hourly', (
      select coalesce(jsonb_agg(h order by h.hour), '[]'::jsonb)
      from (
        select date_trunc('hour', created_at) as hour, count(distinct visitor_id) as visitors
        from e where created_at > now() - interval '72 hours'
        group by 1
      ) h
    )
  );
$$;

-- Called with the project's publishable key, which only the server holds.
revoke all on function public.record_event(jsonb) from public, authenticated;
revoke all on function public.analytics_summary(integer, text) from public, authenticated;
grant execute on function public.record_event(jsonb) to anon;
grant execute on function public.analytics_summary(integer, text) to anon;

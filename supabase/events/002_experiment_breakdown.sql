-- Adds the five-experiment breakdown to the live summary.
-- The homepage split stays on the variant column, which has been filled since EXP-001 started.
-- The other four are read from metadata keys written after a visitor is exposed.

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
    'experiments', (
      select coalesce(jsonb_agg(x order by x.flag, x.variant), '[]'::jsonb)
      from (
        select substring(kv.key from 6) as flag,
               kv.value as variant,
               count(distinct e.visitor_id) as visitors,
               count(distinct e.visitor_id) filter (where e.event = 'product_viewed') as viewers,
               count(*) filter (where e.event = 'product_viewed') as views,
               count(distinct e.visitor_id) filter (where e.event = 'piece_added') as adders,
               count(distinct e.visitor_id) filter (where e.event = 'associate_message_sent') as repliers
        from e
        cross join lateral jsonb_each_text(coalesce(e.metadata, '{}'::jsonb)) as kv(key, value)
        where kv.key like 'flag\_%' escape '\'
        group by 1, 2
      ) x
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

revoke all on function public.analytics_summary(integer, text) from public, authenticated;
grant execute on function public.analytics_summary(integer, text) to anon;

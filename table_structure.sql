create view public.active_routes_view as
select
  id,
  name,
  from_island_id,
  to_island_id,
  base_fare,
  status,
  is_active,
  from_island_name,
  to_island_name,
  route_display_name
from
  routes_simple_view
where
  is_active = true
  and status::text = 'active'::text;

create view public.active_seat_reservations as
select
  id,
  trip_id,
  seat_id,
  booking_id,
  is_available,
  is_reserved,
  reservation_expiry,
  created_at,
  user_id,
  session_id,
  temp_reserved_at,
  temp_reservation_expiry,
  last_activity,
  case
    when temp_reservation_expiry is not null
    and temp_reservation_expiry < CURRENT_TIMESTAMP then true
    else false
  end as is_expired
from
  seat_reservations sr
where
  booking_id is not null
  or temp_reservation_expiry is not null
  and temp_reservation_expiry > CURRENT_TIMESTAMP;

create table public.activity_logs (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  action character varying(100) not null,
  details text null,
  ip_address character varying(45) null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  entity_type character varying(50) null,
  entity_id uuid null,
  old_values jsonb null,
  new_values jsonb null,
  session_id character varying(100) null,
  user_agent text null,
  constraint activity_logs_pkey primary key (id),
  constraint activity_logs_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

create index IF not exists idx_activity_logs_action_date on public.activity_logs using btree (action, created_at) TABLESPACE pg_default;

create index IF not exists idx_activity_logs_created_at on public.activity_logs using btree (created_at) TABLESPACE pg_default;

create index IF not exists idx_activity_logs_created_at_desc on public.activity_logs using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_activity_logs_entity on public.activity_logs using btree (entity_type, entity_id) TABLESPACE pg_default
where
  (entity_type is not null);

create index IF not exists idx_activity_logs_session on public.activity_logs using btree (session_id) TABLESPACE pg_default
where
  (session_id is not null);

create index IF not exists idx_activity_logs_user_action_date on public.activity_logs using btree (user_id, action, created_at) TABLESPACE pg_default;

create index IF not exists idx_activity_logs_user_id on public.activity_logs using btree (user_id) TABLESPACE pg_default;

create view public.activity_logs_with_users as
select
  al.id,
  al.user_id,
  al.action,
  al.details,
  al.ip_address,
  al.created_at,
  al.entity_type,
  al.entity_id,
  al.old_values,
  al.new_values,
  al.session_id,
  al.user_agent,
  COALESCE(up.full_name, 'Unknown User'::character varying) as user_name,
  up.email as user_email,
  up.role as user_role
from
  activity_logs al
  left join user_profiles up on al.user_id = up.id;

create view public.admin_bookings_view as
select
  b.id,
  b.booking_number,
  b.user_id,
  b.trip_id,
  b.is_round_trip,
  b.return_booking_id,
  b.status,
  b.total_fare,
  b.qr_code_url,
  b.check_in_status,
  b.agent_id,
  b.agent_client_id,
  b.payment_method_type,
  b.round_trip_group_id,
  b.created_at,
  up.full_name as user_name,
  up.email as user_email,
  up.mobile_number as user_mobile,
  t.travel_date as trip_travel_date,
  t.departure_time as trip_departure_time,
  r.base_fare as trip_base_fare,
  v.name as vessel_name,
  v.seating_capacity as vessel_capacity,
  concat(i1.name, ' to ', i2.name) as route_name,
  i1.name as from_island_name,
  i2.name as to_island_name,
  agent.full_name as agent_name,
  agent.email as agent_email,
  (
    select
      count(*) as count
    from
      passengers
    where
      passengers.booking_id = b.id
  ) as passenger_count,
  COALESCE(
    (
      select
        p.status::text as status
      from
        payments p
      where
        p.booking_id = b.id
      order by
        p.created_at desc
      limit
        1
    ),
    case
      when b.status = any (
        array[
          'confirmed'::booking_status,
          'checked_in'::booking_status,
          'completed'::booking_status
        ]
      ) then 'completed'::text
      when b.status = 'pending_payment'::booking_status then 'pending'::text
      when b.status = 'cancelled'::booking_status then 'refunded'::text
      else 'pending'::text
    end
  ) as payment_status,
  COALESCE(
    (
      select
        sum(p.amount) as sum
      from
        payments p
      where
        p.booking_id = b.id
        and p.status = 'completed'::payment_status
    ),
    case
      when b.status = any (
        array[
          'confirmed'::booking_status,
          'checked_in'::booking_status,
          'completed'::booking_status
        ]
      ) then b.total_fare
      else 0::numeric
    end
  ) as payment_amount,
  COALESCE(
    (
      select
        p.payment_method::text as payment_method
      from
        payments p
      where
        p.booking_id = b.id
      order by
        p.created_at desc
      limit
        1
    ),
    b.payment_method_type::text
  ) as payment_method
from
  bookings b
  left join user_profiles up on b.user_id = up.id
  left join trips t on b.trip_id = t.id
  left join vessels v on t.vessel_id = v.id
  left join routes r on t.route_id = r.id
  left join islands i1 on r.from_island_id = i1.id
  left join islands i2 on r.to_island_id = i2.id
  left join user_profiles agent on b.agent_id = agent.id;

create table public.admin_cache_stats (
  cache_key character varying(100) not null,
  cache_value jsonb not null,
  cache_type character varying(50) null default 'general'::character varying,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint admin_cache_stats_pkey primary key (cache_key)
) TABLESPACE pg_default;

create index IF not exists idx_admin_cache_expires on public.admin_cache_stats using btree (expires_at) TABLESPACE pg_default;

create index IF not exists idx_admin_cache_type on public.admin_cache_stats using btree (cache_type) TABLESPACE pg_default;

create materialized view public.admin_dashboard_stats as
select
  count(*) filter (
    where
      date (created_at) = CURRENT_DATE
  ) as today_bookings,
  count(*) filter (
    where
      status = 'confirmed'::booking_status
      and date (created_at) = CURRENT_DATE
  ) as today_confirmed,
  COALESCE(
    sum(total_fare) filter (
      where
        status = 'confirmed'::booking_status
        and date (created_at) = CURRENT_DATE
    ),
    0::numeric
  ) as today_revenue,
  count(*) filter (
    where
      date (created_at) >= (CURRENT_DATE - '30 days'::interval)
  ) as bookings_30d,
  count(distinct user_id) filter (
    where
      date (created_at) >= (CURRENT_DATE - '30 days'::interval)
  ) as active_users_30d,
  COALESCE(
    sum(total_fare) filter (
      where
        status = 'confirmed'::booking_status
        and date (created_at) >= (CURRENT_DATE - '30 days'::interval)
    ),
    0::numeric
  ) as revenue_30d,
  count(*) as total_bookings,
  count(distinct user_id) as total_users,
  COALESCE(
    sum(total_fare) filter (
      where
        status = 'confirmed'::booking_status
    ),
    0::numeric
  ) as total_revenue,
  count(*) filter (
    where
      status = 'pending_payment'::booking_status
  ) as pending_payment_count,
  count(*) filter (
    where
      status = 'confirmed'::booking_status
  ) as confirmed_count,
  count(*) filter (
    where
      status = 'cancelled'::booking_status
  ) as cancelled_count,
  count(*) filter (
    where
      status = 'reserved'::booking_status
  ) as reserved_count,
  count(*) filter (
    where
      status = 'checked_in'::booking_status
  ) as checked_in_count,
  count(*) filter (
    where
      status = 'completed'::booking_status
  ) as completed_count,
  CURRENT_TIMESTAMP as calculated_at
from
  bookings b;

create table public.admin_notifications (
  id uuid not null default gen_random_uuid (),
  recipient_id uuid null,
  recipient_role public.user_role null,
  title character varying(200) not null,
  message text not null,
  notification_type character varying(50) not null default 'info'::character varying,
  priority integer null default 0,
  is_read boolean null default false,
  is_system boolean null default false,
  action_url text null,
  action_label character varying(100) null,
  metadata jsonb null,
  expires_at timestamp with time zone null,
  read_at timestamp with time zone null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint admin_notifications_pkey primary key (id),
  constraint admin_notifications_recipient_id_fkey foreign KEY (recipient_id) references user_profiles (id)
) TABLESPACE pg_default;

create index IF not exists idx_admin_notifications_priority on public.admin_notifications using btree (priority, created_at) TABLESPACE pg_default
where
  (is_read = false);

create index IF not exists idx_admin_notifications_recipient_unread on public.admin_notifications using btree (recipient_id, is_read, created_at) TABLESPACE pg_default;

create index IF not exists idx_admin_notifications_role_unread on public.admin_notifications using btree (recipient_role, is_read, created_at) TABLESPACE pg_default
where
  (recipient_role is not null);

create view public.admin_operations_overview as
select
  (
    select
      count(*) as count
    from
      routes
    where
      routes.is_active = true
  ) as active_routes,
  (
    select
      count(*) as count
    from
      routes
  ) as total_routes,
  (
    select
      count(*) as count
    from
      vessels
    where
      vessels.is_active = true
  ) as active_vessels,
  (
    select
      count(*) as count
    from
      vessels
  ) as total_vessels,
  (
    select
      count(*) as count
    from
      trips
    where
      trips.travel_date = CURRENT_DATE
      and trips.is_active = true
  ) as today_trips,
  (
    select
      count(*) as count
    from
      trips
    where
      trips.travel_date = CURRENT_DATE
      and trips.departure_time::time with time zone < CURRENT_TIME
  ) as departed_trips_today,
  (
    select
      COALESCE(sum(v.seating_capacity), 0::bigint) as "coalesce"
    from
      trips t
      join vessels v on t.vessel_id = v.id
    where
      t.travel_date = CURRENT_DATE
      and t.is_active = true
  ) as today_total_capacity,
  (
    select
      count(*) as count
    from
      bookings b
      join trips t on b.trip_id = t.id
    where
      t.travel_date = CURRENT_DATE
      and (
        b.status = any (
          array[
            'confirmed'::booking_status,
            'checked_in'::booking_status
          ]
        )
      )
  ) as today_passengers,
  (
    select
      round(
        avg(
          case
            when v.seating_capacity > 0 then trip_stats.confirmed_bookings::numeric / v.seating_capacity::numeric * 100::numeric
            else 0::numeric
          end
        ),
        2
      ) as round
    from
      (
        select
          t.vessel_id,
          count(b.id) filter (
            where
              b.status = any (
                array[
                  'confirmed'::booking_status,
                  'checked_in'::booking_status
                ]
              )
          ) as confirmed_bookings
        from
          trips t
          left join bookings b on t.id = b.trip_id
        where
          t.travel_date >= (CURRENT_DATE - '7 days'::interval)
        group by
          t.vessel_id
      ) trip_stats
      join vessels v on trip_stats.vessel_id = v.id
  ) as avg_occupancy_7d;

create table public.admin_report_queue (
  id uuid not null default gen_random_uuid (),
  report_type character varying(100) not null,
  parameters jsonb not null,
  status character varying(50) null default 'pending'::character varying,
  priority integer null default 0,
  requested_by uuid null,
  file_path text null,
  error_message text null,
  progress_percentage integer null default 0,
  estimated_completion timestamp with time zone null,
  started_at timestamp with time zone null,
  completed_at timestamp with time zone null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint admin_report_queue_pkey primary key (id),
  constraint admin_report_queue_requested_by_fkey foreign KEY (requested_by) references user_profiles (id)
) TABLESPACE pg_default;

create index IF not exists idx_admin_report_queue_status on public.admin_report_queue using btree (status, priority, created_at) TABLESPACE pg_default;

create index IF not exists idx_admin_report_queue_user on public.admin_report_queue using btree (requested_by, created_at) TABLESPACE pg_default;

create table public.admin_settings (
  id uuid not null default gen_random_uuid (),
  setting_key character varying(100) not null,
  setting_value jsonb not null,
  setting_type character varying(50) not null default 'string'::character varying,
  category character varying(50) null default 'general'::character varying,
  description text null,
  is_sensitive boolean null default false,
  is_system boolean null default false,
  validation_rules jsonb null,
  updated_by uuid null,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint admin_settings_pkey primary key (id),
  constraint admin_settings_setting_key_key unique (setting_key),
  constraint admin_settings_updated_by_fkey foreign KEY (updated_by) references user_profiles (id)
) TABLESPACE pg_default;

create index IF not exists idx_admin_settings_category on public.admin_settings using btree (category) TABLESPACE pg_default;

create index IF not exists idx_admin_settings_key on public.admin_settings using btree (setting_key) TABLESPACE pg_default;

create view public.admin_user_analytics as
select
  up.role,
  count(*) as total_count,
  count(*) filter (
    where
      up.is_active = true
  ) as active_count,
  count(*) filter (
    where
      up.created_at >= (CURRENT_DATE - '30 days'::interval)
  ) as new_users_30d,
  count(*) filter (
    where
      up.created_at >= (CURRENT_DATE - '7 days'::interval)
  ) as new_users_7d,
  COALESCE(avg(user_stats.total_bookings), 0::numeric) as avg_bookings_per_user,
  COALESCE(avg(user_stats.total_spent), 0::numeric) as avg_spent_per_user,
  count(*) filter (
    where
      user_stats.last_booking_date >= (CURRENT_DATE - '30 days'::interval)
  ) as recently_active,
  case
    when up.role = 'agent'::user_role then COALESCE(avg(up.credit_balance), 0::numeric)
    else null::numeric
  end as avg_agent_credit_balance,
  case
    when up.role = 'agent'::user_role then COALESCE(avg(agent_stats.agent_revenue), 0::numeric)
    else null::numeric
  end as avg_agent_revenue
from
  user_profiles up
  left join (
    select
      bookings.user_id,
      count(*) as total_bookings,
      sum(bookings.total_fare) filter (
        where
          bookings.status = 'confirmed'::booking_status
      ) as total_spent,
      max(bookings.created_at) as last_booking_date
    from
      bookings
    group by
      bookings.user_id
  ) user_stats on up.id = user_stats.user_id
  left join (
    select
      bookings.agent_id,
      count(*) as agent_bookings,
      sum(bookings.total_fare) filter (
        where
          bookings.status = 'confirmed'::booking_status
      ) as agent_revenue
    from
      bookings
    where
      bookings.agent_id is not null
    group by
      bookings.agent_id
  ) agent_stats on up.id = agent_stats.agent_id
group by
  up.role;

create view public.admin_users_only as
select
  up.id,
  up.full_name,
  up.email,
  up.role,
  up.is_super_admin,
  up.is_active,
  up.created_at,
  COALESCE(
    array_agg(distinct uper.permission_id) filter (
      where
        uper.permission_id is not null
        and uper.is_active = true
        and (
          uper.expires_at is null
          or uper.expires_at > CURRENT_TIMESTAMP
        )
    ),
    array[]::uuid[]
  ) as direct_permissions,
  count(distinct p.id) filter (
    where
      uper.is_active = true
      and (
        uper.expires_at is null
        or uper.expires_at > CURRENT_TIMESTAMP
      )
  ) as active_permission_count
from
  user_profiles up
  left join user_permissions uper on up.id = uper.user_id
  left join permissions p on uper.permission_id = p.id
where
  up.is_super_admin = true
  or up.role = 'admin'::user_role
group by
  up.id,
  up.full_name,
  up.email,
  up.role,
  up.is_super_admin,
  up.is_active,
  up.created_at
order by
  up.full_name;

create view public.admin_users_view as
select
  up.id,
  up.full_name,
  up.email,
  up.mobile_number,
  up.role,
  up.status,
  up.status_reason,
  up.status_updated_at,
  up.status_updated_by,
  up.date_of_birth,
  up.created_at,
  up.last_login,
  COALESCE(user_stats.total_bookings, 0::bigint) as total_bookings,
  COALESCE(user_stats.total_spent, 0::numeric) as total_spent,
  COALESCE(user_stats.total_trips, 0::bigint) as total_trips,
  COALESCE(user_stats.average_rating, 0::numeric) as average_rating,
  COALESCE(up.credit_balance, 0::numeric) as wallet_balance,
  COALESCE(user_stats.credit_score, 0) as credit_score,
  COALESCE(user_stats.loyalty_points, 0) as loyalty_points
from
  user_profiles up
  left join (
    select
      b.user_id,
      count(*) as total_bookings,
      sum(
        case
          when b.status = 'confirmed'::booking_status then b.total_fare
          else 0::numeric
        end
      ) as total_spent,
      count(distinct t.id) as total_trips,
      4.5 as average_rating,
      750 as credit_score,
      100 as loyalty_points
    from
      bookings b
      left join trips t on b.trip_id = t.id
    group by
      b.user_id
  ) user_stats on up.id = user_stats.user_id
where
  up.role = any (
    array[
      'admin'::user_role,
      'agent'::user_role,
      'customer'::user_role,
      'captain'::user_role
    ]
  );

create table public.agent_clients (
  id uuid not null default gen_random_uuid (),
  agent_id uuid not null,
  client_id uuid null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  email character varying(255) null,
  mobile_number character varying(20) null,
  id_number character varying(50) null,
  full_name character varying(100) null,
  updated_at timestamp with time zone null default now(),
  constraint agent_clients_pkey primary key (id),
  constraint unique_agent_client_email unique (agent_id, email),
  constraint agent_clients_agent_id_fkey foreign KEY (agent_id) references user_profiles (id),
  constraint agent_clients_client_id_fkey foreign KEY (client_id) references user_profiles (id),
  constraint agent_client_identity_check check (
    (
      (client_id is not null)
      or (
        (client_id is null)
        and (full_name is not null)
        and (email is not null)
      )
    )
  ),
  constraint different_agent_client check ((agent_id <> client_id))
) TABLESPACE pg_default;

create unique INDEX IF not exists idx_agent_client_with_account on public.agent_clients using btree (agent_id, client_id) TABLESPACE pg_default
where
  (client_id is not null);

create unique INDEX IF not exists idx_agent_client_without_account on public.agent_clients using btree (agent_id, email) TABLESPACE pg_default
where
  (client_id is null);

create index IF not exists idx_agent_clients_agent_email on public.agent_clients using btree (agent_id, email) TABLESPACE pg_default;

create index IF not exists idx_agent_clients_agent_id on public.agent_clients using btree (agent_id) TABLESPACE pg_default;

create view public.agent_clients_with_details as
select
  ac.id,
  ac.agent_id,
  ac.client_id,
  COALESCE(up.full_name, ac.full_name) as full_name,
  COALESCE(up.email, ac.email) as email,
  COALESCE(up.mobile_number, ac.mobile_number) as mobile_number,
  ac.id_number,
  ac.created_at,
  ac.updated_at,
  case
    when ac.client_id is not null then true
    else false
  end as has_account,
  up.preferred_language,
  up.text_direction
from
  agent_clients ac
  left join user_profiles up on ac.client_id = up.id;

create table public.agent_credit_transactions (
  id uuid not null default gen_random_uuid (),
  agent_id uuid not null,
  amount numeric(10, 2) not null,
  transaction_type public.credit_transaction_type not null,
  booking_id uuid null,
  description text not null,
  balance_after numeric(10, 2) not null,
  transaction_date timestamp with time zone not null default CURRENT_TIMESTAMP,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint agent_credit_transactions_pkey primary key (id),
  constraint agent_credit_transactions_agent_id_fkey foreign KEY (agent_id) references user_profiles (id),
  constraint agent_credit_transactions_booking_id_fkey foreign KEY (booking_id) references bookings (id)
) TABLESPACE pg_default;

create index IF not exists idx_agent_credit_transactions_agent_id on public.agent_credit_transactions using btree (agent_id) TABLESPACE pg_default;

create index IF not exists idx_agent_credit_transactions_booking_id on public.agent_credit_transactions using btree (booking_id) TABLESPACE pg_default
where
  (booking_id is not null);

create table public.agent_rates (
  id uuid not null default gen_random_uuid (),
  route_id uuid not null,
  agent_discount numeric(5, 2) not null,
  effective_from timestamp with time zone not null,
  effective_to timestamp with time zone null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint agent_rates_pkey primary key (id),
  constraint agent_rates_route_id_fkey foreign KEY (route_id) references routes (id)
) TABLESPACE pg_default;

create view public.agent_statistics as
with
  booking_stats as (
    select
      b.agent_id,
      count(*) as total_bookings,
      count(*) filter (
        where
          b.status = any (
            array[
              'reserved'::booking_status,
              'pending_payment'::booking_status,
              'confirmed'::booking_status,
              'checked_in'::booking_status
            ]
          )
      ) as active_bookings,
      count(*) filter (
        where
          b.status = 'completed'::booking_status
      ) as completed_bookings,
      count(*) filter (
        where
          b.status = 'cancelled'::booking_status
      ) as cancelled_bookings,
      COALESCE(sum(b.total_fare), 0::numeric)::numeric(10, 2) as total_revenue,
      count(distinct b.user_id) as unique_clients
    from
      bookings b
    where
      b.agent_id is not null
    group by
      b.agent_id
  )
select
  up.id as agent_id,
  up.full_name as agent_name,
  'TRA-'::text || "right" (up.id::text, 4) as agent_code,
  COALESCE(bs.total_bookings, 0::bigint) as total_bookings,
  COALESCE(bs.active_bookings, 0::bigint) as active_bookings,
  COALESCE(bs.completed_bookings, 0::bigint) as completed_bookings,
  COALESCE(bs.cancelled_bookings, 0::bigint) as cancelled_bookings,
  COALESCE(bs.total_revenue, 0.00)::numeric(10, 2) as total_revenue,
  0.00::numeric(10, 2) as total_commission,
  COALESCE(bs.unique_clients, 0::bigint) as unique_clients,
  COALESCE(up.credit_ceiling, 0.00)::numeric(10, 2) as credit_ceiling,
  COALESCE(up.credit_balance, 0.00)::numeric(10, 2) as credit_balance,
  COALESCE(up.agent_discount, 0.00)::numeric(5, 2) as discount_rate,
  COALESCE(up.free_tickets_allocation, 0) as free_tickets_allocation,
  COALESCE(up.free_tickets_remaining, 0) as free_tickets_remaining
from
  user_profiles up
  left join booking_stats bs on up.id = bs.agent_id
where
  up.role = 'agent'::user_role;

create view public.all_users_view as
select
  up.id,
  up.full_name,
  up.email,
  up.mobile_number,
  up.role::text as role,
  up.status,
  up.status_reason,
  up.status_updated_at,
  up.status_updated_by,
  up.date_of_birth,
  up.created_at,
  up.last_login,
  COALESCE(user_stats.total_bookings, 0::bigint) as total_bookings,
  COALESCE(user_stats.total_spent, 0::numeric) as total_spent,
  COALESCE(user_stats.total_trips, 0::bigint) as total_trips,
  COALESCE(user_stats.average_rating, 0::numeric) as average_rating,
  COALESCE(up.credit_balance, 0::numeric) as wallet_balance,
  COALESCE(user_stats.credit_score, 0) as credit_score,
  COALESCE(user_stats.loyalty_points, 0) as loyalty_points
from
  user_profiles up
  left join (
    select
      b.user_id,
      count(*) as total_bookings,
      sum(
        case
          when b.status = 'confirmed'::booking_status then b.total_fare
          else 0::numeric
        end
      ) as total_spent,
      count(distinct t.id) as total_trips,
      4.5 as average_rating,
      750 as credit_score,
      100 as loyalty_points
    from
      bookings b
      left join trips t on b.trip_id = t.id
    group by
      b.user_id
  ) user_stats on up.id = user_stats.user_id
where
  up.role = any (
    array[
      'admin'::user_role,
      'agent'::user_role,
      'customer'::user_role,
      'captain'::user_role
    ]
  )
union all
select
  p.id,
  p.passenger_name as full_name,
  null::character varying as email,
  p.passenger_contact_number as mobile_number,
  'passenger'::text as role,
  p.status,
  p.status_reason,
  p.status_updated_at,
  p.status_updated_by,
  null::date as date_of_birth,
  p.created_at,
  null::timestamp with time zone as last_login,
  COALESCE(passenger_stats.total_bookings, 1::bigint) as total_bookings,
  COALESCE(passenger_stats.total_spent, 0::numeric) as total_spent,
  COALESCE(passenger_stats.total_trips, 1::bigint) as total_trips,
  0 as average_rating,
  0 as wallet_balance,
  0 as credit_score,
  0 as loyalty_points
from
  passengers p
  left join (
    select
      p2.id as passenger_id,
      count(b.id) as total_bookings,
      sum(
        case
          when b.status = 'confirmed'::booking_status then b.total_fare
          else 0::numeric
        end
      ) as total_spent,
      count(distinct t.id) as total_trips
    from
      passengers p2
      left join bookings b on p2.booking_id = b.id
      left join trips t on b.trip_id = t.id
    group by
      p2.id
  ) passenger_stats on p.id = passenger_stats.passenger_id;

create table public.booking_segments (
  id uuid not null default gen_random_uuid (),
  booking_id uuid not null,
  boarding_stop_id uuid not null,
  destination_stop_id uuid not null,
  boarding_stop_sequence integer not null,
  destination_stop_sequence integer not null,
  fare_amount numeric(10, 2) not null,
  created_at timestamp with time zone null default now(),
  constraint booking_segments_pkey primary key (id),
  constraint unique_booking_segment unique (booking_id),
  constraint booking_segments_destination_stop_id_fkey foreign KEY (destination_stop_id) references route_stops (id),
  constraint booking_segments_booking_id_fkey foreign KEY (booking_id) references bookings (id) on delete CASCADE,
  constraint booking_segments_boarding_stop_id_fkey foreign KEY (boarding_stop_id) references route_stops (id),
  constraint booking_segments_fare_amount_check check ((fare_amount >= (0)::numeric)),
  constraint check_different_segment_stops check ((boarding_stop_id <> destination_stop_id)),
  constraint check_valid_segment_sequence check (
    (
      destination_stop_sequence > boarding_stop_sequence
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_booking_segments_boarding on public.booking_segments using btree (boarding_stop_id) TABLESPACE pg_default;

create index IF not exists idx_booking_segments_booking on public.booking_segments using btree (booking_id) TABLESPACE pg_default;

create index IF not exists idx_booking_segments_destination on public.booking_segments using btree (destination_stop_id) TABLESPACE pg_default;

create index IF not exists idx_booking_segments_sequences on public.booking_segments using btree (boarding_stop_sequence, destination_stop_sequence) TABLESPACE pg_default;

create table public.bookings (
  id uuid not null default gen_random_uuid (),
  booking_number character varying(7) not null,
  user_id uuid not null,
  trip_id uuid not null,
  is_round_trip boolean not null default false,
  return_booking_id uuid null,
  status public.booking_status not null default 'reserved'::booking_status,
  total_fare numeric(10, 2) not null,
  qr_code_url text null,
  check_in_status boolean not null default false,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  agent_id uuid null,
  payment_method_type character varying(20) null default 'gateway'::character varying,
  agent_client_id uuid null,
  round_trip_group_id uuid null,
  checked_in_at timestamp with time zone null,
  checked_in_by uuid null,
  constraint bookings_pkey primary key (id),
  constraint bookings_booking_number_key unique (booking_number),
  constraint bookings_checked_in_by_fkey foreign KEY (checked_in_by) references user_profiles (id),
  constraint bookings_return_booking_id_fkey foreign KEY (return_booking_id) references bookings (id),
  constraint bookings_trip_id_fkey foreign KEY (trip_id) references trips (id),
  constraint bookings_user_id_fkey foreign KEY (user_id) references auth.users (id),
  constraint bookings_agent_client_id_fkey foreign KEY (agent_client_id) references agent_clients (id),
  constraint bookings_agent_id_fkey foreign KEY (agent_id) references user_profiles (id),
  constraint chk_booking_fare_positive check ((total_fare >= (0)::numeric)),
  constraint chk_round_trip_consistency check (
    (
      (
        (is_round_trip = false)
        and (return_booking_id is null)
      )
      or (is_round_trip = true)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_bookings_agent_client_id on public.bookings using btree (agent_client_id) TABLESPACE pg_default
where
  (agent_client_id is not null);

create index IF not exists idx_bookings_agent_created_at on public.bookings using btree (agent_id, created_at) TABLESPACE pg_default
where
  (agent_id is not null);

create index IF not exists idx_bookings_agent_id on public.bookings using btree (agent_id) TABLESPACE pg_default
where
  (agent_id is not null);

create index IF not exists idx_bookings_agent_user on public.bookings using btree (agent_id, user_id) TABLESPACE pg_default;

create index IF not exists idx_bookings_check_in_status on public.bookings using btree (check_in_status, checked_in_at) TABLESPACE pg_default;

create index IF not exists idx_bookings_checked_in_by on public.bookings using btree (checked_in_by) TABLESPACE pg_default
where
  (checked_in_by is not null);

create index IF not exists idx_bookings_created_at on public.bookings using btree (created_at) TABLESPACE pg_default
where
  (created_at is not null);

create index IF not exists idx_bookings_created_at_status on public.bookings using btree (created_at, status) TABLESPACE pg_default;

create index IF not exists idx_bookings_return_booking_id on public.bookings using btree (return_booking_id) TABLESPACE pg_default
where
  (return_booking_id is not null);

create index IF not exists idx_bookings_round_trip_group on public.bookings using btree (round_trip_group_id) TABLESPACE pg_default
where
  (round_trip_group_id is not null);

create index IF not exists idx_bookings_status on public.bookings using btree (status) TABLESPACE pg_default;

create index IF not exists idx_bookings_status_fare on public.bookings using btree (status, total_fare) TABLESPACE pg_default
where
  (
    status = any (
      array[
        'confirmed'::booking_status,
        'checked_in'::booking_status
      ]
    )
  );

create index IF not exists idx_bookings_status_trip on public.bookings using btree (status, trip_id) TABLESPACE pg_default;

create index IF not exists idx_bookings_status_trip_travel on public.bookings using btree (status, trip_id) TABLESPACE pg_default;

create index IF not exists idx_bookings_trip_date_status on public.bookings using btree (trip_id, created_at, status) TABLESPACE pg_default;

create index IF not exists idx_bookings_trip_id_status on public.bookings using btree (trip_id, status) TABLESPACE pg_default
where
  (
    status = any (
      array[
        'confirmed'::booking_status,
        'checked_in'::booking_status,
        'completed'::booking_status
      ]
    )
  );

create index IF not exists idx_bookings_trip_status on public.bookings using btree (trip_id, status) TABLESPACE pg_default;

create index IF not exists idx_bookings_user_id on public.bookings using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_bookings_user_status_date on public.bookings using btree (user_id, status, created_at) TABLESPACE pg_default;

create trigger audit_bookings_trigger
after INSERT
or DELETE
or
update on bookings for EACH row
execute FUNCTION enhanced_audit_trigger ();

create trigger check_trip_before_booking BEFORE INSERT on bookings for EACH row
execute FUNCTION validate_trip_before_booking ();

create trigger trg_prevent_checkin_after_closure BEFORE
update on bookings for EACH row
execute FUNCTION prevent_checkin_after_closure ();

create trigger trg_set_booking_number BEFORE INSERT on bookings for EACH row
execute FUNCTION set_booking_number ();

create trigger trg_split_round_trip_fare
after
update OF return_booking_id on bookings for EACH row
execute FUNCTION split_round_trip_fare ();

create trigger trg_update_available_seats
after
update OF status on bookings for EACH row
execute FUNCTION update_available_seats ();

create view public.bookings_with_segments_view as
select
  b.id,
  b.booking_number,
  b.user_id,
  b.trip_id,
  b.is_round_trip,
  b.return_booking_id,
  b.status,
  b.total_fare,
  b.qr_code_url,
  b.check_in_status,
  b.created_at,
  b.updated_at,
  b.agent_id,
  b.payment_method_type,
  b.agent_client_id,
  b.round_trip_group_id,
  b.checked_in_at,
  b.checked_in_by,
  bs.boarding_stop_id,
  bs.destination_stop_id,
  bs.boarding_stop_sequence,
  bs.destination_stop_sequence,
  bs.fare_amount as segment_fare,
  i_boarding.name as boarding_island_name,
  i_boarding.zone as boarding_zone,
  i_dest.name as destination_island_name,
  i_dest.zone as destination_zone,
  bs.destination_stop_sequence - bs.boarding_stop_sequence as segments_traveled,
  t.travel_date,
  t.departure_time,
  r.name as route_name
from
  bookings b
  left join booking_segments bs on b.id = bs.booking_id
  left join route_stops rs_boarding on bs.boarding_stop_id = rs_boarding.id
  left join route_stops rs_dest on bs.destination_stop_id = rs_dest.id
  left join islands i_boarding on rs_boarding.island_id = i_boarding.id
  left join islands i_dest on rs_dest.island_id = i_dest.id
  left join trips t on b.trip_id = t.id
  left join routes r on t.route_id = r.id;

create table public.cancellations (
  id uuid not null default gen_random_uuid (),
  booking_id uuid not null,
  cancellation_number character varying(10) not null,
  cancellation_reason text not null,
  cancellation_fee numeric(10, 2) not null,
  refund_amount numeric(10, 2) not null,
  refund_bank_account_number character varying(50) null,
  refund_bank_account_name character varying(100) null,
  refund_bank_name character varying(100) null,
  refund_processing_date timestamp with time zone null,
  status public.cancellation_status not null default 'pending'::cancellation_status,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint cancellations_pkey primary key (id),
  constraint cancellations_booking_id_key unique (booking_id),
  constraint cancellations_cancellation_number_key unique (cancellation_number),
  constraint cancellations_booking_id_fkey foreign KEY (booking_id) references bookings (id)
) TABLESPACE pg_default;

create view public.captain_passengers_view as
select
  p.id,
  p.booking_id,
  p.passenger_name,
  p.passenger_contact_number,
  p.special_assistance_request,
  p.status as passenger_status,
  p.created_at,
  b.booking_number,
  b.trip_id,
  b.status as booking_status,
  b.check_in_status,
  b.checked_in_at,
  b.user_id,
  b.agent_id,
  b.agent_client_id,
  COALESCE(s.seat_number, 'Not assigned'::character varying) as seat_number,
  s.id as seat_id,
  s.is_window,
  s.is_aisle,
  s.seat_type,
  COALESCE(
    up.full_name,
    ac.full_name,
    'Unknown'::character varying
  ) as client_name,
  COALESCE(up.email, ac.email, ''::character varying) as client_email,
  COALESCE(
    up.mobile_number,
    ac.mobile_number,
    ''::character varying
  ) as client_phone,
  t.travel_date as trip_date,
  t.departure_time,
  t.status as trip_status,
  t.is_checkin_closed
from
  passengers p
  join bookings b on p.booking_id = b.id
  join trips t on b.trip_id = t.id
  left join seats s on p.seat_id = s.id
  left join user_profiles up on b.user_id = up.id
  left join agent_clients ac on b.agent_client_id = ac.id
where
  t.is_active = true
  and (
    b.status = any (
      array[
        'confirmed'::booking_status,
        'checked_in'::booking_status,
        'completed'::booking_status
      ]
    )
  )
order by
  t.travel_date,
  t.departure_time,
  s.seat_number;

create view public.captain_profile_view as
select
  id,
  full_name,
  email,
  mobile_number as phone,
  mobile_number,
  role,
  status,
  is_active,
  created_at,
  updated_at,
  last_login,
  0 as total_trips,
  0 as completed_trips,
  0 as total_passengers,
  0 as total_revenue,
  0 as avg_occupancy_rate
from
  user_profiles up
where
  role = 'captain'::user_role
  and is_active = true;

create view public.captain_trip_progress_view as
select
  t.id as trip_id,
  t.travel_date,
  t.departure_time,
  t.status as trip_status,
  t.trip_progress_status,
  t.current_stop_sequence,
  t.current_stop_id,
  r.name as route_name,
  v.name as vessel_name,
  v.seating_capacity,
  (
    select
      count(*) as count
    from
      route_stops
    where
      route_stops.route_id = t.route_id
  ) as total_stops,
  csp.status as current_stop_status,
  csp.stop_type as current_stop_type,
  ci.name as current_stop_name,
  ci.zone as current_stop_zone
from
  trips t
  join routes r on t.route_id = r.id
  join vessels v on t.vessel_id = v.id
  left join trip_stop_progress csp on t.id = csp.trip_id
  and t.current_stop_id = csp.stop_id
  left join route_stops rs on t.current_stop_id = rs.id
  left join islands ci on rs.island_id = ci.id
where
  t.is_active = true;

create view public.captain_trips_view as
select
  t.id,
  t.route_id,
  t.vessel_id,
  t.travel_date,
  t.departure_time,
  t.arrival_time,
  t.available_seats,
  t.status,
  t.captain_id,
  t.fare_multiplier,
  t.is_checkin_closed,
  t.checkin_closed_at,
  t.checkin_closed_by,
  t.manifest_generated_at,
  t.manifest_sent_at,
  t.created_at,
  t.updated_at,
  r.name as route_name,
  oi.name as from_island_name,
  di.name as to_island_name,
  v.name as vessel_name,
  v.seating_capacity as capacity,
  r.base_fare,
  cp.full_name as captain_name,
  COALESCE(booking_stats.confirmed_bookings, 0::bigint) as confirmed_bookings,
  COALESCE(booking_stats.booked_seats, 0::bigint::numeric) as booked_seats,
  COALESCE(
    booking_stats.checked_in_passengers,
    0::bigint::numeric
  ) as checked_in_passengers,
  COALESCE(booking_stats.total_revenue, 0::numeric) as total_revenue,
  COALESCE(booking_stats.total_revenue, 0::numeric) as revenue,
  case
    when v.seating_capacity > 0 then round(
      COALESCE(booking_stats.booked_seats, 0::bigint::numeric) / v.seating_capacity::numeric * 100::numeric,
      2
    )
    else 0::numeric
  end as occupancy_rate,
  case
    when t.departure_time::time with time zone < CURRENT_TIME
    and t.travel_date = CURRENT_DATE then 'departed'::character varying
    when t.departure_time::time with time zone <= (CURRENT_TIME + '00:30:00'::interval)
    and t.travel_date = CURRENT_DATE then 'boarding'::character varying
    when t.travel_date < CURRENT_DATE then 'completed'::character varying
    when t.travel_date > CURRENT_DATE then 'scheduled'::character varying
    else COALESCE(t.status, 'scheduled'::character varying)
  end as computed_status,
  case
    when t.travel_date = CURRENT_DATE
    and t.departure_time::time with time zone > (CURRENT_TIME - '00:30:00'::interval)
    and t.departure_time::time with time zone <= (CURRENT_TIME + '00:30:00'::interval)
    and not t.is_checkin_closed then true
    else false
  end as is_boarding_open
from
  trips t
  left join routes r on t.route_id = r.id
  left join islands oi on r.from_island_id = oi.id
  left join islands di on r.to_island_id = di.id
  left join vessels v on t.vessel_id = v.id
  left join user_profiles cp on t.captain_id = cp.id
  left join (
    select
      b.trip_id,
      count(
        case
          when b.status = any (
            array[
              'confirmed'::booking_status,
              'checked_in'::booking_status,
              'completed'::booking_status
            ]
          ) then 1
          else null::integer
        end
      ) as confirmed_bookings,
      COALESCE(
        sum(
          case
            when b.status = any (
              array[
                'confirmed'::booking_status,
                'checked_in'::booking_status,
                'completed'::booking_status
              ]
            ) then COALESCE(passenger_counts.passenger_count, 0::bigint)
            else 0::bigint
          end
        ),
        0::numeric
      ) as booked_seats,
      COALESCE(
        sum(
          case
            when b.check_in_status = true
            and (
              b.status = any (
                array[
                  'confirmed'::booking_status,
                  'checked_in'::booking_status,
                  'completed'::booking_status
                ]
              )
            ) then COALESCE(passenger_counts.passenger_count, 0::bigint)
            else 0::bigint
          end
        ),
        0::numeric
      ) as checked_in_passengers,
      sum(
        case
          when b.status = any (
            array[
              'confirmed'::booking_status,
              'checked_in'::booking_status,
              'completed'::booking_status
            ]
          ) then b.total_fare
          else 0::numeric
        end
      ) as total_revenue
    from
      bookings b
      left join (
        select
          p.booking_id,
          count(*) as passenger_count
        from
          passengers p
        group by
          p.booking_id
      ) passenger_counts on b.id = passenger_counts.booking_id
    group by
      b.trip_id
  ) booking_stats on t.id = booking_stats.trip_id
where
  t.is_active = true
order by
  t.travel_date,
  t.departure_time;

create table public.check_in_logs (
  id uuid not null default gen_random_uuid (),
  booking_id uuid not null,
  captain_id uuid not null,
  passenger_count integer not null default 0,
  check_in_time timestamp with time zone not null default CURRENT_TIMESTAMP,
  notes text null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint check_in_logs_pkey primary key (id),
  constraint check_in_logs_booking_id_fkey foreign KEY (booking_id) references bookings (id),
  constraint check_in_logs_captain_id_fkey foreign KEY (captain_id) references user_profiles (id)
) TABLESPACE pg_default;

create index IF not exists idx_check_in_logs_booking_id on public.check_in_logs using btree (booking_id) TABLESPACE pg_default;

create index IF not exists idx_check_in_logs_captain_id on public.check_in_logs using btree (captain_id) TABLESPACE pg_default;

create index IF not exists idx_check_in_logs_check_in_time on public.check_in_logs using btree (check_in_time) TABLESPACE pg_default;

create table public.check_ins (
  id uuid not null default gen_random_uuid (),
  booking_id uuid not null,
  check_in_location character varying(100) not null,
  check_in_time timestamp with time zone not null default CURRENT_TIMESTAMP,
  checked_in_by uuid not null,
  constraint check_ins_pkey primary key (id),
  constraint check_ins_booking_id_key unique (booking_id),
  constraint check_ins_booking_id_fkey foreign KEY (booking_id) references bookings (id),
  constraint check_ins_checked_in_by_fkey foreign KEY (checked_in_by) references auth.users (id)
) TABLESPACE pg_default;

create materialized view public.content_dashboard_stats as
select
  (
    select
      count(*) as count
    from
      terms_and_conditions
  ) as total_terms,
  (
    select
      count(*) as count
    from
      terms_and_conditions
    where
      terms_and_conditions.is_active = true
  ) as active_terms,
  (
    select
      count(distinct terms_and_conditions.version) as count
    from
      terms_and_conditions
  ) as terms_versions,
  (
    select
      count(*) as count
    from
      terms_and_conditions
    where
      terms_and_conditions.created_at >= (CURRENT_DATE - '30 days'::interval)
  ) as recent_terms,
  (
    select
      count(*) as count
    from
      promotions
  ) as total_promotions,
  (
    select
      count(*) as count
    from
      promotions
    where
      promotions.is_active = true
  ) as active_promotions,
  (
    select
      count(*) as count
    from
      promotions
    where
      promotions.start_date <= CURRENT_DATE
      and promotions.end_date >= CURRENT_DATE
      and promotions.is_active = true
  ) as current_promotions,
  (
    select
      count(*) as count
    from
      promotions
    where
      promotions.start_date > CURRENT_DATE
      and promotions.is_active = true
  ) as upcoming_promotions,
  (
    select
      count(*) as count
    from
      promotions
    where
      promotions.end_date < CURRENT_DATE
  ) as expired_promotions,
  (
    select
      avg(promotions.discount_percentage) as avg
    from
      promotions
    where
      promotions.is_active = true
  ) as avg_discount_percentage,
  (
    select
      count(*) as count
    from
      translations
  ) as total_translations,
  (
    select
      count(*) as count
    from
      translations
    where
      translations.is_active = true
  ) as active_translations,
  (
    select
      count(distinct translations.language_code) as count
    from
      translations
  ) as supported_languages,
  (
    select
      count(distinct translations.key) as count
    from
      translations
  ) as unique_translation_keys,
  (
    select
      count(*) as count
    from
      translations
    where
      translations.created_at >= (CURRENT_DATE - '7 days'::interval)
  ) as recent_translations,
  CURRENT_TIMESTAMP as last_updated;

create view public.content_management_summary as
select
  'terms'::text as content_type,
  count(*) as total_count,
  count(*) filter (
    where
      terms_and_conditions.is_active = true
  ) as active_count,
  count(*) filter (
    where
      terms_and_conditions.is_active = false
  ) as inactive_count,
  count(distinct terms_and_conditions.version) as version_count
from
  terms_and_conditions
union all
select
  'promotions'::text as content_type,
  count(*) as total_count,
  count(*) filter (
    where
      promotions.is_active = true
  ) as active_count,
  count(*) filter (
    where
      promotions.is_active = false
  ) as inactive_count,
  count(*) filter (
    where
      promotions.start_date <= CURRENT_DATE
      and promotions.end_date >= CURRENT_DATE
      and promotions.is_active = true
  ) as version_count
from
  promotions
union all
select
  'translations'::text as content_type,
  count(*) as total_count,
  count(*) filter (
    where
      translations.is_active = true
  ) as active_count,
  count(*) filter (
    where
      translations.is_active = false
  ) as inactive_count,
  count(distinct translations.language_code) as version_count
from
  translations;

create table public.email_logs (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid null,
  email_type character varying(50) not null,
  recipient character varying(255) not null,
  status character varying(50) not null default 'sent'::character varying,
  sent_at timestamp with time zone not null default now(),
  error_message text null,
  created_at timestamp with time zone not null default now(),
  constraint email_logs_pkey primary key (id),
  constraint email_logs_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_email_logs_email_type on public.email_logs using btree (email_type) TABLESPACE pg_default;

create index IF not exists idx_email_logs_sent_at on public.email_logs using btree (sent_at) TABLESPACE pg_default;

create index IF not exists idx_email_logs_user_id on public.email_logs using btree (user_id) TABLESPACE pg_default;

create view public.enhanced_operations_stats_view as
select
  (
    select
      count(*) as count
    from
      routes
    where
      routes.is_active = true
  ) as active_routes,
  (
    select
      count(*) as count
    from
      routes
  ) as total_routes,
  (
    select
      count(*) as count
    from
      vessels
    where
      vessels.is_active = true
  ) as active_vessels,
  (
    select
      count(*) as count
    from
      vessels
  ) as total_vessels,
  (
    select
      count(*) as count
    from
      trips
    where
      trips.travel_date = CURRENT_DATE
      and trips.is_active = true
  ) as today_trips,
  (
    select
      count(*) as count
    from
      trips
    where
      trips.travel_date = CURRENT_DATE
      and trips.is_active = true
      and trips.departure_time::time with time zone < CURRENT_TIME
  ) as completed_trips_today,
  (
    select
      count(*) as count
    from
      bookings b
      join trips t on b.trip_id = t.id
    where
      t.travel_date = CURRENT_DATE
      and (
        b.status = any (
          array[
            'confirmed'::booking_status,
            'checked_in'::booking_status
          ]
        )
      )
  ) as today_bookings,
  (
    select
      COALESCE(sum(b.total_fare), 0::numeric) as "coalesce"
    from
      bookings b
      join trips t on b.trip_id = t.id
    where
      t.travel_date = CURRENT_DATE
      and (
        b.status = any (
          array[
            'confirmed'::booking_status,
            'checked_in'::booking_status
          ]
        )
      )
  ) as today_revenue,
  (
    select
      COALESCE(sum(b.total_fare), 0::numeric) as "coalesce"
    from
      bookings b
      join trips t on b.trip_id = t.id
    where
      t.travel_date >= (CURRENT_DATE - '30 days'::interval)
      and (
        b.status = any (
          array[
            'confirmed'::booking_status,
            'checked_in'::booking_status
          ]
        )
      )
  ) as revenue_30d,
  (
    select
      COALESCE(sum(v.seating_capacity), 0::bigint) as "coalesce"
    from
      trips t
      join vessels v on t.vessel_id = v.id
    where
      t.travel_date = CURRENT_DATE
      and t.is_active = true
  ) as today_total_capacity,
  (
    select
      case
        when capacity_data.total_capacity > 0 then round(
          capacity_data.total_bookings / capacity_data.total_capacity::numeric * 100::numeric,
          2
        )
        else 0::numeric
      end as "case"
    from
      (
        select
          COALESCE(sum(v.seating_capacity), 0::bigint) as total_capacity,
          COALESCE(sum(booking_stats.confirmed_bookings), 0::numeric) as total_bookings
        from
          trips t
          join vessels v on t.vessel_id = v.id
          left join (
            select
              b.trip_id,
              count(
                case
                  when b.status = any (
                    array[
                      'confirmed'::booking_status,
                      'checked_in'::booking_status
                    ]
                  ) then 1
                  else null::integer
                end
              ) as confirmed_bookings
            from
              bookings b
            group by
              b.trip_id
          ) booking_stats on t.id = booking_stats.trip_id
        where
          t.travel_date = CURRENT_DATE
          and t.is_active = true
      ) capacity_data
  ) as today_utilization;

create table public.faq_categories (
  id uuid not null default gen_random_uuid (),
  name character varying(100) not null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  description text null,
  order_index integer not null default 0,
  is_active boolean not null default true,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint faq_categories_pkey primary key (id),
  constraint faq_categories_name_key unique (name),
  constraint faq_categories_order_index_positive check ((order_index >= 0))
) TABLESPACE pg_default;

create index IF not exists idx_faq_categories_active on public.faq_categories using btree (is_active) TABLESPACE pg_default;

create index IF not exists idx_faq_categories_name on public.faq_categories using btree (name) TABLESPACE pg_default;

create index IF not exists idx_faq_categories_order on public.faq_categories using btree (order_index) TABLESPACE pg_default;

create trigger faq_categories_updated_at_trigger BEFORE
update on faq_categories for EACH row
execute FUNCTION update_updated_at_column ();

create trigger trigger_compact_faq_categories
after DELETE on faq_categories for EACH row
execute FUNCTION compact_faq_category_order ();

create trigger trigger_reorder_faq_categories_insert BEFORE INSERT on faq_categories for EACH row
execute FUNCTION reorder_faq_categories_on_insert ();

create trigger trigger_reorder_faq_categories_update BEFORE
update OF order_index on faq_categories for EACH row when (old.order_index is distinct from new.order_index)
execute FUNCTION reorder_faq_categories_on_insert ();

create view public.faq_categories_with_stats as
select
  fc.id,
  fc.name,
  fc.created_at,
  fc.description,
  fc.order_index,
  fc.is_active,
  fc.updated_at,
  COALESCE(faq_counts.total_faqs, 0::bigint) as faq_count,
  COALESCE(faq_counts.active_faqs, 0::bigint) as active_faq_count
from
  faq_categories fc
  left join (
    select
      faqs.category_id,
      count(*) as total_faqs,
      count(*) filter (
        where
          faqs.is_active = true
      ) as active_faqs
    from
      faqs
    group by
      faqs.category_id
  ) faq_counts on fc.id = faq_counts.category_id
order by
  fc.order_index,
  fc.name;

create table public.faqs (
  id uuid not null default gen_random_uuid (),
  category_id uuid not null,
  question text not null,
  answer text not null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  is_active boolean not null default true,
  order_index integer not null default 0,
  constraint faqs_pkey primary key (id),
  constraint faqs_category_id_fkey foreign KEY (category_id) references faq_categories (id),
  constraint faqs_order_index_positive check ((order_index >= 0))
) TABLESPACE pg_default;

create index IF not exists idx_faqs_active on public.faqs using btree (is_active) TABLESPACE pg_default;

create index IF not exists idx_faqs_category_active on public.faqs using btree (category_id, is_active) TABLESPACE pg_default;

create index IF not exists idx_faqs_category_id on public.faqs using btree (category_id) TABLESPACE pg_default;

create index IF not exists idx_faqs_order on public.faqs using btree (category_id, order_index) TABLESPACE pg_default;

create trigger faqs_updated_at_trigger BEFORE
update on faqs for EACH row
execute FUNCTION update_updated_at_column ();

create trigger trigger_compact_faqs
after DELETE on faqs for EACH row
execute FUNCTION compact_faq_order ();

create trigger trigger_reorder_faqs_insert BEFORE INSERT on faqs for EACH row
execute FUNCTION reorder_faqs_on_insert ();

create trigger trigger_reorder_faqs_update BEFORE
update OF order_index,
category_id on faqs for EACH row when (
  old.order_index is distinct from new.order_index
  or old.category_id is distinct from new.category_id
)
execute FUNCTION reorder_faqs_on_insert ();

create view public.faqs_with_category as
select
  f.id,
  f.category_id,
  f.question,
  f.answer,
  f.created_at,
  f.updated_at,
  f.is_active,
  f.order_index,
  fc.name as category_name,
  fc.order_index as category_order_index
from
  faqs f
  left join faq_categories fc on f.category_id = fc.id
order by
  fc.order_index,
  f.order_index,
  f.created_at;

create table public.islands (
  id uuid not null default gen_random_uuid (),
  name character varying(100) not null,
  zone text not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  zone_id uuid null,
  constraint islands_pkey primary key (id),
  constraint islands_name_key unique (name),
  constraint islands_zone_id_fkey foreign KEY (zone_id) references zones (id)
) TABLESPACE pg_default;

create index IF not exists idx_islands_zone_active_name on public.islands using btree (zone_id, is_active, name) TABLESPACE pg_default;

create index IF not exists idx_islands_zone_id on public.islands using btree (zone_id) TABLESPACE pg_default;

create index IF not exists idx_islands_zone_id_active on public.islands using btree (zone_id, is_active) TABLESPACE pg_default
where
  (zone_id is not null);

create trigger zones_stats_change_trigger
after INSERT
or DELETE
or
update on islands for EACH row
execute FUNCTION notify_zone_stats_change ();

create view public.islands_with_zones as
select
  i.id,
  i.name,
  i.zone as old_zone_text,
  i.zone_id,
  i.is_active,
  i.created_at,
  z.name as zone_name,
  z.code as zone_code,
  z.description as zone_description,
  z.is_active as zone_is_active
from
  islands i
  left join zones z on i.zone_id = z.id;

create table public.manifest_email_logs (
  id uuid not null default gen_random_uuid (),
  manifest_id uuid not null,
  recipient_email character varying(255) not null,
  email_status character varying(20) not null default 'pending'::character varying,
  sent_at timestamp with time zone null,
  error_message text null,
  resend_message_id character varying(100) null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint manifest_email_logs_pkey primary key (id),
  constraint manifest_email_logs_manifest_id_fkey foreign KEY (manifest_id) references passenger_manifests (id),
  constraint manifest_email_logs_status_check check (
    (
      (email_status)::text = any (
        array[
          ('pending'::character varying)::text,
          ('sent'::character varying)::text,
          ('failed'::character varying)::text,
          ('bounced'::character varying)::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_manifest_email_logs_manifest_id on public.manifest_email_logs using btree (manifest_id) TABLESPACE pg_default;

create index IF not exists idx_manifest_email_logs_status on public.manifest_email_logs using btree (email_status, created_at) TABLESPACE pg_default;

create table public.manifest_shares (
  id uuid not null default gen_random_uuid (),
  manifest_id uuid not null,
  email_address character varying(100) null,
  phone_number character varying(20) null,
  share_time timestamp with time zone not null default CURRENT_TIMESTAMP,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint manifest_shares_pkey primary key (id)
) TABLESPACE pg_default;

create table public.mass_messages (
  id uuid not null default gen_random_uuid (),
  trip_id uuid null,
  travel_date date null,
  from_island character varying(100) null,
  to_island character varying(100) null,
  message_content text not null,
  recipient_count integer not null,
  failed_count integer not null default 0,
  sent_by uuid not null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint mass_messages_pkey primary key (id),
  constraint mass_messages_sent_by_fkey foreign KEY (sent_by) references auth.users (id),
  constraint mass_messages_trip_id_fkey foreign KEY (trip_id) references trips (id)
) TABLESPACE pg_default;

create table public.modifications (
  id uuid not null default gen_random_uuid (),
  old_booking_id uuid not null,
  new_booking_id uuid not null,
  modification_reason text not null,
  fare_difference numeric(10, 2) not null,
  requires_additional_payment boolean not null,
  refund_details jsonb null,
  payment_details jsonb null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint modifications_pkey primary key (id),
  constraint modifications_new_booking_id_fkey foreign KEY (new_booking_id) references bookings (id),
  constraint modifications_old_booking_id_fkey foreign KEY (old_booking_id) references bookings (id)
) TABLESPACE pg_default;

create table public.operation_team_emails (
  id uuid not null default gen_random_uuid (),
  email character varying(255) not null,
  full_name character varying(100) not null,
  role character varying(50) null default 'operations'::character varying,
  is_active boolean not null default true,
  receive_manifests boolean not null default true,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint operation_team_emails_pkey primary key (id),
  constraint operation_team_emails_email_key unique (email)
) TABLESPACE pg_default;

create index IF not exists idx_operation_team_emails_active on public.operation_team_emails using btree (is_active, receive_manifests) TABLESPACE pg_default;

create view public.operations_routes_view as
select
  r.id,
  r.from_island_id,
  r.to_island_id,
  r.base_fare,
  r.is_active,
  r.created_at,
  r.name,
  r.distance,
  r.duration,
  r.description,
  r.status,
  oi.name as from_island_name,
  di.name as to_island_name,
  COALESCE(
    r.name,
    concat(oi.name, ' to ', di.name)::character varying
  ) as route_name,
  COALESCE(route_stats.total_trips_30d, 0::bigint) as total_trips_30d,
  COALESCE(route_stats.total_bookings_30d, 0::bigint) as total_bookings_30d,
  COALESCE(route_stats.avg_occupancy_30d, 0::numeric) as avg_occupancy_30d,
  COALESCE(route_stats.total_revenue_30d, 0::numeric) as total_revenue_30d
from
  routes r
  left join islands oi on r.from_island_id = oi.id
  left join islands di on r.to_island_id = di.id
  left join (
    select
      t.route_id,
      count(distinct t.id) as total_trips_30d,
      count(b.id) as total_bookings_30d,
      round(
        case
          when count(distinct t.id) > 0
          and avg(v.seating_capacity) > 0::numeric then count(b.id)::numeric * 100.0 / (
            count(distinct t.id)::numeric * avg(v.seating_capacity)
          )
          else 0::numeric
        end,
        2
      ) as avg_occupancy_30d,
      sum(
        case
          when b.status = 'confirmed'::booking_status then b.total_fare
          else 0::numeric
        end
      ) as total_revenue_30d
    from
      trips t
      left join bookings b on t.id = b.trip_id
      left join vessels v on t.vessel_id = v.id
    where
      t.travel_date >= (CURRENT_DATE - '30 days'::interval)
    group by
      t.route_id
  ) route_stats on r.id = route_stats.route_id;

create view public.operations_stats_view as
select
  active_routes,
  total_routes,
  active_vessels,
  total_vessels,
  today_trips,
  completed_trips_today,
  today_bookings,
  today_revenue,
  revenue_30d,
  today_total_capacity,
  today_utilization
from
  enhanced_operations_stats_view;

create view public.operations_trips_view as
select
  t.id,
  t.route_id,
  t.vessel_id,
  t.travel_date,
  t.departure_time,
  t.arrival_time,
  t.available_seats,
  t.is_active,
  t.status,
  t.fare_multiplier,
  t.captain_id,
  t.created_at,
  t.updated_at,
  r.name as route_name,
  r.base_fare,
  r.distance,
  r.duration,
  r.is_active as route_is_active,
  oi.name as from_island_name,
  di.name as to_island_name,
  v.name as vessel_name,
  v.seating_capacity as capacity,
  v.vessel_type,
  v.is_active as vessel_is_active,
  cp.full_name as captain_name,
  cp.email as captain_email,
  COALESCE(booking_stats.bookings, 0::bigint) as bookings,
  COALESCE(
    booking_stats.total_passengers,
    0::bigint::numeric
  ) as booked_seats,
  COALESCE(booking_stats.confirmed_bookings, 0::bigint) as confirmed_bookings,
  COALESCE(
    booking_stats.checked_in_passengers,
    0::bigint::numeric
  ) as checked_in_passengers,
  COALESCE(booking_stats.total_revenue, 0::numeric) as trip_revenue,
  COALESCE(booking_stats.total_revenue, 0::numeric) as total_revenue,
  case
    when t.departure_time::time with time zone < CURRENT_TIME
    and t.travel_date = CURRENT_DATE then 'departed'::character varying
    when t.departure_time::time with time zone <= (CURRENT_TIME + '00:30:00'::interval)
    and t.travel_date = CURRENT_DATE then 'boarding'::character varying
    when t.travel_date < CURRENT_DATE then 'completed'::character varying
    when t.travel_date > CURRENT_DATE then 'scheduled'::character varying
    else COALESCE(t.status, 'scheduled'::character varying)
  end as computed_status,
  case
    when v.seating_capacity > 0 then round(
      COALESCE(
        booking_stats.total_passengers,
        0::bigint::numeric
      ) / v.seating_capacity::numeric * 100::numeric,
      2
    )
    else 0::numeric
  end as occupancy_rate
from
  trips t
  left join routes r on t.route_id = r.id
  left join islands oi on r.from_island_id = oi.id
  left join islands di on r.to_island_id = di.id
  left join vessels v on t.vessel_id = v.id
  left join user_profiles cp on t.captain_id = cp.id
  left join (
    select
      b.trip_id,
      count(*) filter (
        where
          b.status = any (
            array[
              'confirmed'::booking_status,
              'checked_in'::booking_status,
              'completed'::booking_status
            ]
          )
      ) as bookings,
      count(distinct b.id) filter (
        where
          b.status = any (
            array[
              'confirmed'::booking_status,
              'checked_in'::booking_status,
              'completed'::booking_status
            ]
          )
      ) as confirmed_bookings,
      COALESCE(
        sum(
          case
            when b.status = any (
              array[
                'confirmed'::booking_status,
                'checked_in'::booking_status,
                'completed'::booking_status
              ]
            ) then COALESCE(passenger_counts.passenger_count, 0::bigint)
            else 0::bigint
          end
        ),
        0::numeric
      ) as total_passengers,
      COALESCE(
        sum(
          case
            when b.check_in_status = true
            and (
              b.status = any (
                array[
                  'confirmed'::booking_status,
                  'checked_in'::booking_status,
                  'completed'::booking_status
                ]
              )
            ) then COALESCE(passenger_counts.passenger_count, 0::bigint)
            else 0::bigint
          end
        ),
        0::numeric
      ) as checked_in_passengers,
      sum(
        case
          when b.status = any (
            array[
              'confirmed'::booking_status,
              'checked_in'::booking_status,
              'completed'::booking_status
            ]
          ) then b.total_fare
          else 0::numeric
        end
      ) as total_revenue
    from
      bookings b
      left join (
        select
          p.booking_id,
          count(*) as passenger_count
        from
          passengers p
        group by
          p.booking_id
      ) passenger_counts on b.id = passenger_counts.booking_id
    group by
      b.trip_id
  ) booking_stats on t.id = booking_stats.trip_id
order by
  t.travel_date,
  t.departure_time;

create view public.operations_vessels_view as
select
  v.id,
  v.name,
  v.make,
  v.model,
  v.seating_capacity,
  v.status,
  v.vessel_type,
  v.registration_number,
  v.captain_name,
  v.is_active,
  v.created_at,
  v.updated_at,
  COALESCE(trip_stats_30d.total_trips, 0::bigint) as total_trips_30d,
  COALESCE(trip_stats_30d.total_bookings, 0::numeric) as total_bookings_30d,
  COALESCE(trip_stats_30d.total_passengers, 0::numeric) as total_passengers_30d,
  COALESCE(trip_stats_30d.total_revenue, 0::numeric) as total_revenue_30d,
  COALESCE(trip_stats_30d.days_in_service, 0::bigint) as days_in_service_30d,
  COALESCE(today_stats.trips_today, 0::bigint) as trips_today,
  COALESCE(today_stats.bookings_today, 0::numeric) as bookings_today,
  COALESCE(today_stats.passengers_today, 0::numeric) as passengers_today,
  COALESCE(today_stats.revenue_today, 0::numeric) as revenue_today,
  COALESCE(week_stats.trips_7d, 0::bigint) as trips_7d,
  COALESCE(week_stats.bookings_7d, 0::numeric) as bookings_7d,
  COALESCE(week_stats.revenue_7d, 0::numeric) as revenue_7d,
  case
    when v.seating_capacity > 0
    and trip_stats_30d.total_trips > 0 then round(
      trip_stats_30d.total_passengers / (v.seating_capacity * trip_stats_30d.total_trips)::numeric * 100::numeric,
      2
    )
    else 0::numeric
  end as capacity_utilization_30d,
  case
    when trip_stats_30d.total_trips > 0 then round(
      trip_stats_30d.total_passengers / trip_stats_30d.total_trips::numeric,
      2
    )
    else 0::numeric
  end as avg_passengers_per_trip
from
  vessels v
  left join (
    select
      t.vessel_id,
      count(*) as total_trips,
      COALESCE(sum(bs.confirmed_bookings), 0::numeric) as total_bookings,
      COALESCE(sum(bs.total_passengers), 0::numeric) as total_passengers,
      COALESCE(sum(bs.total_revenue), 0::numeric) as total_revenue,
      count(distinct t.travel_date) as days_in_service
    from
      trips t
      left join (
        select
          b.trip_id,
          count(
            case
              when b.status = any (
                array[
                  'confirmed'::booking_status,
                  'checked_in'::booking_status
                ]
              ) then 1
              else null::integer
            end
          ) as confirmed_bookings,
          COALESCE(
            sum(
              case
                when b.status = any (
                  array[
                    'confirmed'::booking_status,
                    'checked_in'::booking_status
                  ]
                ) then passenger_counts.passenger_count
                else 0::bigint
              end
            ),
            0::numeric
          ) as total_passengers,
          sum(
            case
              when b.status = any (
                array[
                  'confirmed'::booking_status,
                  'checked_in'::booking_status
                ]
              ) then b.total_fare
              else 0::numeric
            end
          ) as total_revenue
        from
          bookings b
          left join (
            select
              passengers.booking_id,
              count(*) as passenger_count
            from
              passengers
            group by
              passengers.booking_id
          ) passenger_counts on b.id = passenger_counts.booking_id
        group by
          b.trip_id
      ) bs on t.id = bs.trip_id
    where
      t.travel_date >= (CURRENT_DATE - '30 days'::interval)
      and t.is_active = true
    group by
      t.vessel_id
  ) trip_stats_30d on v.id = trip_stats_30d.vessel_id
  left join (
    select
      t.vessel_id,
      count(*) as trips_today,
      COALESCE(sum(bs.confirmed_bookings), 0::numeric) as bookings_today,
      COALESCE(sum(bs.total_passengers), 0::numeric) as passengers_today,
      COALESCE(sum(bs.total_revenue), 0::numeric) as revenue_today
    from
      trips t
      left join (
        select
          b.trip_id,
          count(
            case
              when b.status = any (
                array[
                  'confirmed'::booking_status,
                  'checked_in'::booking_status
                ]
              ) then 1
              else null::integer
            end
          ) as confirmed_bookings,
          COALESCE(
            sum(
              case
                when b.status = any (
                  array[
                    'confirmed'::booking_status,
                    'checked_in'::booking_status
                  ]
                ) then passenger_counts.passenger_count
                else 0::bigint
              end
            ),
            0::numeric
          ) as total_passengers,
          sum(
            case
              when b.status = any (
                array[
                  'confirmed'::booking_status,
                  'checked_in'::booking_status
                ]
              ) then b.total_fare
              else 0::numeric
            end
          ) as total_revenue
        from
          bookings b
          left join (
            select
              passengers.booking_id,
              count(*) as passenger_count
            from
              passengers
            group by
              passengers.booking_id
          ) passenger_counts on b.id = passenger_counts.booking_id
        group by
          b.trip_id
      ) bs on t.id = bs.trip_id
    where
      t.travel_date = CURRENT_DATE
      and t.is_active = true
    group by
      t.vessel_id
  ) today_stats on v.id = today_stats.vessel_id
  left join (
    select
      t.vessel_id,
      count(*) as trips_7d,
      COALESCE(sum(bs.confirmed_bookings), 0::numeric) as bookings_7d,
      COALESCE(sum(bs.total_revenue), 0::numeric) as revenue_7d
    from
      trips t
      left join (
        select
          b.trip_id,
          count(
            case
              when b.status = any (
                array[
                  'confirmed'::booking_status,
                  'checked_in'::booking_status
                ]
              ) then 1
              else null::integer
            end
          ) as confirmed_bookings,
          sum(
            case
              when b.status = any (
                array[
                  'confirmed'::booking_status,
                  'checked_in'::booking_status
                ]
              ) then b.total_fare
              else 0::numeric
            end
          ) as total_revenue
        from
          bookings b
        group by
          b.trip_id
      ) bs on t.id = bs.trip_id
    where
      t.travel_date >= (CURRENT_DATE - '7 days'::interval)
      and t.is_active = true
    group by
      t.vessel_id
  ) week_stats on v.id = week_stats.vessel_id
order by
  v.name;

create table public.passenger_manifests (
  id uuid not null default gen_random_uuid (),
  trip_id uuid not null,
  manifest_number character varying(20) not null,
  total_passengers integer not null default 0,
  checked_in_passengers integer not null default 0,
  no_show_passengers integer not null default 0,
  captain_id uuid not null,
  captain_name character varying(100) not null,
  captain_notes text null,
  weather_conditions character varying(200) null,
  delay_reason text null,
  actual_departure_time timestamp with time zone null,
  manifest_data jsonb not null,
  email_sent boolean not null default false,
  email_sent_at timestamp with time zone null,
  email_recipients text[] null,
  status character varying(20) not null default 'generated'::character varying,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint passenger_manifests_pkey primary key (id),
  constraint passenger_manifests_manifest_number_key unique (manifest_number),
  constraint passenger_manifests_trip_id_key unique (trip_id),
  constraint passenger_manifests_captain_id_fkey foreign KEY (captain_id) references user_profiles (id),
  constraint passenger_manifests_trip_id_fkey foreign KEY (trip_id) references trips (id),
  constraint passenger_manifests_status_check check (
    (
      (status)::text = any (
        array[
          ('generated'::character varying)::text,
          ('sent'::character varying)::text,
          ('archived'::character varying)::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_passenger_manifests_captain_id on public.passenger_manifests using btree (captain_id) TABLESPACE pg_default;

create index IF not exists idx_passenger_manifests_created_at on public.passenger_manifests using btree (created_at) TABLESPACE pg_default;

create index IF not exists idx_passenger_manifests_status on public.passenger_manifests using btree (status) TABLESPACE pg_default;

create index IF not exists idx_passenger_manifests_trip_id on public.passenger_manifests using btree (trip_id) TABLESPACE pg_default;

create table public.passengers (
  id uuid not null default gen_random_uuid (),
  booking_id uuid not null,
  seat_id uuid null,
  passenger_name character varying(100) not null,
  passenger_contact_number character varying(20) not null,
  special_assistance_request text null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  status character varying(20) null default 'active'::character varying,
  status_reason text null,
  status_updated_at timestamp with time zone null default now(),
  status_updated_by uuid null,
  passenger_id_proof character varying null,
  constraint passengers_pkey primary key (id),
  constraint unique_booking_seat unique (booking_id, seat_id),
  constraint passengers_booking_id_fkey foreign KEY (booking_id) references bookings (id),
  constraint passengers_seat_id_fkey foreign KEY (seat_id) references seats (id) on update CASCADE on delete set null,
  constraint passengers_status_updated_by_fkey foreign KEY (status_updated_by) references user_profiles (id),
  constraint passengers_status_check check (
    (
      (status)::text = any (
        array[
          ('active'::character varying)::text,
          ('inactive'::character varying)::text,
          ('suspended'::character varying)::text,
          ('blocked'::character varying)::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_passengers_booking_id on public.passengers using btree (booking_id) TABLESPACE pg_default;

create index IF not exists idx_passengers_seat_id on public.passengers using btree (seat_id) TABLESPACE pg_default;

create trigger update_passengers_status_timestamp BEFORE
update on passengers for EACH row
execute FUNCTION update_status_timestamp ();

create table public.payments (
  id uuid not null default gen_random_uuid (),
  booking_id uuid not null,
  payment_method public.payment_method not null,
  amount numeric(10, 2) not null,
  currency character varying(3) not null default 'MVR'::character varying,
  status public.payment_status not null default 'pending'::payment_status,
  receipt_number character varying(20) null,
  transfer_slip_image text null,
  wallet_id uuid null,
  transaction_date timestamp with time zone null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  session_id character varying(100) null,
  constraint payments_pkey primary key (id),
  constraint payments_receipt_number_key unique (receipt_number),
  constraint payments_booking_id_fkey foreign KEY (booking_id) references bookings (id)
) TABLESPACE pg_default;

create index IF not exists idx_payments_booking_id on public.payments using btree (booking_id) TABLESPACE pg_default;

create index IF not exists idx_payments_booking_status_date on public.payments using btree (booking_id, status, created_at) TABLESPACE pg_default;

create index IF not exists idx_payments_status_created_at on public.payments using btree (status, created_at) TABLESPACE pg_default;

create table public.permission_audit_logs (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  action character varying(50) not null,
  entity_type character varying(50) not null,
  entity_id uuid not null,
  old_values jsonb null,
  new_values jsonb null,
  performed_by uuid not null,
  ip_address character varying(45) null,
  user_agent text null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint permission_audit_logs_pkey primary key (id),
  constraint permission_audit_logs_performed_by_fkey foreign KEY (performed_by) references user_profiles (id),
  constraint permission_audit_logs_user_id_fkey foreign KEY (user_id) references user_profiles (id)
) TABLESPACE pg_default;

create index IF not exists idx_permission_audit_entity on public.permission_audit_logs using btree (entity_type, entity_id) TABLESPACE pg_default;

create index IF not exists idx_permission_audit_performed_by on public.permission_audit_logs using btree (performed_by, created_at) TABLESPACE pg_default;

create index IF not exists idx_permission_audit_user on public.permission_audit_logs using btree (user_id, created_at) TABLESPACE pg_default;

create table public.permission_categories (
  id uuid not null default gen_random_uuid (),
  name character varying(100) not null,
  description text null,
  order_index integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint permission_categories_pkey primary key (id),
  constraint permission_categories_name_key unique (name)
) TABLESPACE pg_default;

create index IF not exists idx_permission_categories_active on public.permission_categories using btree (is_active, order_index) TABLESPACE pg_default;

create index IF not exists idx_permission_categories_order on public.permission_categories using btree (order_index) TABLESPACE pg_default;

create trigger update_permission_categories_updated_at BEFORE
update on permission_categories for EACH row
execute FUNCTION update_updated_at_column ();

create view public.permission_categories_with_stats as
select
  pc.id,
  pc.name,
  pc.description,
  pc.order_index,
  pc.is_active,
  pc.created_at,
  pc.updated_at,
  count(p.id) as total_permissions,
  count(p.id) filter (
    where
      p.is_active = true
  ) as active_permissions
from
  permission_categories pc
  left join permissions p on pc.id = p.category_id
group by
  pc.id,
  pc.name,
  pc.description,
  pc.order_index,
  pc.is_active,
  pc.created_at,
  pc.updated_at
order by
  pc.order_index,
  pc.name;

create table public.permissions (
  id uuid not null default gen_random_uuid (),
  name character varying(200) not null,
  description text not null,
  resource character varying(50) not null,
  action character varying(50) not null,
  level character varying(20) not null,
  category_id uuid not null,
  dependencies uuid[] null default '{}'::uuid[],
  is_critical boolean not null default false,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint permissions_pkey primary key (id),
  constraint permissions_name_key unique (name),
  constraint unique_permission_resource_action unique (resource, action, level),
  constraint permissions_category_id_fkey foreign KEY (category_id) references permission_categories (id) on delete CASCADE,
  constraint permissions_level_check check (
    (
      (level)::text = any (
        array[
          ('read'::character varying)::text,
          ('write'::character varying)::text,
          ('delete'::character varying)::text,
          ('admin'::character varying)::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_permissions_active on public.permissions using btree (is_active) TABLESPACE pg_default;

create index IF not exists idx_permissions_category on public.permissions using btree (category_id, is_active) TABLESPACE pg_default;

create index IF not exists idx_permissions_level on public.permissions using btree (level) TABLESPACE pg_default;

create index IF not exists idx_permissions_resource_action on public.permissions using btree (resource, action) TABLESPACE pg_default;

create trigger update_permissions_updated_at BEFORE
update on permissions for EACH row
execute FUNCTION update_updated_at_column ();

create view public.permissions_with_category as
select
  p.id,
  p.name,
  p.description,
  p.resource,
  p.action,
  p.level,
  p.dependencies,
  p.is_critical,
  p.is_active,
  p.created_at,
  p.updated_at,
  pc.id as category_id,
  pc.name as category_name
from
  permissions p
  join permission_categories pc on p.category_id = pc.id
where
  p.is_active = true
order by
  pc.order_index,
  p.name;

create table public.promotion_routes (
  id uuid not null default gen_random_uuid (),
  promotion_id uuid not null,
  route_id uuid not null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint promotion_routes_pkey primary key (id),
  constraint unique_promotion_route unique (promotion_id, route_id),
  constraint promotion_routes_promotion_id_fkey foreign KEY (promotion_id) references promotions (id),
  constraint promotion_routes_route_id_fkey foreign KEY (route_id) references routes (id)
) TABLESPACE pg_default;

create table public.promotions (
  id uuid not null default gen_random_uuid (),
  name character varying(100) not null,
  description text null,
  discount_percentage numeric(5, 2) not null,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  is_first_time_booking_only boolean not null default false,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint promotions_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_promotions_active on public.promotions using btree (is_active) TABLESPACE pg_default;

create index IF not exists idx_promotions_dates on public.promotions using btree (start_date, end_date) TABLESPACE pg_default;

create index IF not exists idx_promotions_discount on public.promotions using btree (discount_percentage) TABLESPACE pg_default;

create trigger content_activity_trigger_promotions
after INSERT
or DELETE
or
update on promotions for EACH row
execute FUNCTION log_content_activity ();

create trigger content_change_notify_promotions
after INSERT
or DELETE
or
update on promotions for EACH row
execute FUNCTION notify_content_change ();

create trigger promotions_updated_at_trigger BEFORE
update on promotions for EACH row
execute FUNCTION update_updated_at_column ();

create trigger validate_promotion_dates_trigger BEFORE INSERT
or
update on promotions for EACH row
execute FUNCTION validate_promotion_dates ();

create view public.promotions_with_status as
select
  id,
  name,
  description,
  discount_percentage,
  start_date,
  end_date,
  is_first_time_booking_only,
  is_active,
  created_at,
  updated_at,
  case
    when start_date <= CURRENT_DATE
    and end_date >= CURRENT_DATE
    and is_active = true then 'current'::text
    when start_date > CURRENT_DATE
    and is_active = true then 'upcoming'::text
    when end_date < CURRENT_DATE then 'expired'::text
    when is_active = false then 'inactive'::text
    else 'unknown'::text
  end as status,
  case
    when end_date < CURRENT_DATE then true
    else false
  end as is_expired,
  case
    when start_date > CURRENT_DATE then true
    else false
  end as is_upcoming,
  case
    when start_date <= CURRENT_DATE
    and end_date >= CURRENT_DATE
    and is_active = true then true
    else false
  end as is_current
from
  promotions p
order by
  start_date desc,
  created_at desc;

create view public.realtime_seat_availability as
select
  t.id as trip_id,
  t.travel_date,
  t.departure_time,
  r.name as route_name,
  v.name as vessel_name,
  s.id as seat_id,
  s.seat_number,
  s.row_number,
  s.is_window,
  s.is_aisle,
  s.seat_type,
  s.seat_class,
  s.is_disabled,
  s.is_premium,
  s.price_multiplier,
  s.position_x,
  s.position_y,
  case
    when sr.booking_id is not null then 'confirmed'::text
    when sr.temp_reservation_expiry is not null
    and sr.temp_reservation_expiry > CURRENT_TIMESTAMP then 'temp_reserved'::text
    else 'available'::text
  end as status,
  sr.user_id as reserved_by,
  sr.temp_reservation_expiry,
  sr.booking_id,
  sr.last_activity
from
  trips t
  join routes r on t.route_id = r.id
  join vessels v on t.vessel_id = v.id
  join seats s on s.vessel_id = v.id
  left join seat_reservations sr on sr.trip_id = t.id
  and sr.seat_id = s.id
where
  t.is_active = true
order by
  t.travel_date,
  t.departure_time,
  s.row_number,
  s.seat_number;

create view public.recent_activity_view as
select
  'booking_created'::text as activity_type,
  concat(
    'New booking ',
    b.booking_number,
    ' created by ',
    up.full_name
  ) as description,
  b.created_at,
  b.id as related_id,
  'booking'::text as related_type,
  up.full_name as user_name,
  null::numeric as amount
from
  bookings b
  join user_profiles up on b.user_id = up.id
where
  b.created_at >= (now() - '24:00:00'::interval)
union all
select
  'payment_completed'::text as activity_type,
  concat(
    'Payment of $',
    p.amount,
    ' completed for booking ',
    b.booking_number
  ) as description,
  p.created_at,
  p.booking_id as related_id,
  'payment'::text as related_type,
  up.full_name as user_name,
  p.amount
from
  payments p
  join bookings b on p.booking_id = b.id
  join user_profiles up on b.user_id = up.id
where
  p.status = 'completed'::payment_status
  and p.created_at >= (now() - '24:00:00'::interval)
union all
select
  'user_registered'::text as activity_type,
  concat(
    'New ',
    user_profiles.role,
    ' registered: ',
    user_profiles.full_name
  ) as description,
  user_profiles.created_at,
  user_profiles.id as related_id,
  'user'::text as related_type,
  user_profiles.full_name as user_name,
  null::numeric as amount
from
  user_profiles
where
  user_profiles.created_at >= (now() - '24:00:00'::interval)
order by
  3 desc
limit
  50;

create table public.reports (
  id uuid not null default gen_random_uuid (),
  report_type public.report_type not null,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  route_id uuid null,
  status character varying(50) null,
  format public.report_format not null,
  report_url text not null,
  row_count integer not null,
  generated_by uuid not null,
  generated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint reports_pkey primary key (id),
  constraint reports_generated_by_fkey foreign KEY (generated_by) references auth.users (id),
  constraint reports_route_id_fkey foreign KEY (route_id) references routes (id)
) TABLESPACE pg_default;

create table public.role_template_permissions (
  id uuid not null default gen_random_uuid (),
  role_template_id uuid not null,
  permission_id uuid not null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint role_template_permissions_pkey primary key (id),
  constraint unique_role_template_permission unique (role_template_id, permission_id),
  constraint role_template_permissions_permission_id_fkey foreign KEY (permission_id) references permissions (id) on delete CASCADE,
  constraint role_template_permissions_role_template_id_fkey foreign KEY (role_template_id) references role_templates (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_role_template_permissions_permission on public.role_template_permissions using btree (permission_id) TABLESPACE pg_default;

create index IF not exists idx_role_template_permissions_template on public.role_template_permissions using btree (role_template_id) TABLESPACE pg_default;

create table public.role_templates (
  id uuid not null default gen_random_uuid (),
  name character varying(100) not null,
  description text null,
  is_system_role boolean not null default false,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint role_templates_pkey primary key (id),
  constraint role_templates_name_key unique (name)
) TABLESPACE pg_default;

create index IF not exists idx_role_templates_active on public.role_templates using btree (is_active) TABLESPACE pg_default;

create index IF not exists idx_role_templates_system on public.role_templates using btree (is_system_role, is_active) TABLESPACE pg_default;

create trigger update_role_templates_updated_at BEFORE
update on role_templates for EACH row
execute FUNCTION update_updated_at_column ();

create view public.role_templates_with_stats as
select
  rt.id,
  rt.name,
  rt.description,
  rt.is_system_role,
  rt.is_active,
  rt.created_at,
  rt.updated_at,
  count(rtp.permission_id) as permission_count,
  array_agg(rtp.permission_id) filter (
    where
      rtp.permission_id is not null
  ) as permission_ids
from
  role_templates rt
  left join role_template_permissions rtp on rt.id = rtp.role_template_id
where
  rt.is_active = true
group by
  rt.id,
  rt.name,
  rt.description,
  rt.is_system_role,
  rt.is_active,
  rt.created_at,
  rt.updated_at
order by
  rt.is_system_role desc,
  rt.name;

create view public.round_trip_bookings as
select
  departure.id as departure_booking_id,
  departure.booking_number as departure_booking_number,
  departure.user_id,
  departure.trip_id as departure_trip_id,
  departure.status as departure_status,
  departure.total_fare as departure_fare,
  departure.created_at,
  departure.updated_at,
  return_booking.id as return_booking_id,
  return_booking.booking_number as return_booking_number,
  return_booking.trip_id as return_trip_id,
  return_booking.status as return_status,
  return_booking.total_fare as return_fare,
  departure.total_fare + return_booking.total_fare as total_round_trip_fare
from
  bookings departure
  left join bookings return_booking on departure.return_booking_id = return_booking.id
where
  departure.is_round_trip = true;

create view public.round_trip_bookings_grouped as
select
  round_trip_group_id,
  user_id,
  min(created_at) as created_at,
  max(updated_at) as updated_at,
  sum(total_fare) as total_fare,
  array_agg(
    id
    order by
      return_booking_id nulls first
  ) as booking_ids,
  array_agg(
    booking_number
    order by
      return_booking_id nulls first
  ) as booking_numbers,
  array_agg(
    trip_id
    order by
      return_booking_id nulls first
  ) as trip_ids,
  array_agg(
    status
    order by
      return_booking_id nulls first
  ) as statuses,
  case
    when count(distinct status) = 1 then (array_agg(status)) [1]
    when 'cancelled'::booking_status = any (array_agg(status)) then 'cancelled'::booking_status
    when 'completed'::booking_status = any (array_agg(status)) then 'completed'::booking_status
    when 'confirmed'::booking_status = any (array_agg(status)) then 'confirmed'::booking_status
    else 'pending_payment'::booking_status
  end as group_status
from
  bookings rt
where
  is_round_trip = true
  and round_trip_group_id is not null
group by
  round_trip_group_id,
  user_id;

create table public.route_activity_logs (
  id uuid not null default gen_random_uuid (),
  route_id uuid not null,
  action character varying(50) not null,
  old_values jsonb null,
  new_values jsonb null,
  user_id uuid null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint route_activity_logs_pkey primary key (id),
  constraint route_activity_logs_route_id_fkey foreign KEY (route_id) references routes (id) on delete CASCADE,
  constraint route_activity_logs_user_id_fkey foreign KEY (user_id) references user_profiles (id)
) TABLESPACE pg_default;

create index IF not exists idx_route_activity_logs_created_at on public.route_activity_logs using btree (created_at) TABLESPACE pg_default;

create index IF not exists idx_route_activity_logs_route_id on public.route_activity_logs using btree (route_id) TABLESPACE pg_default;

create view public.route_performance_view as
select
  r.id,
  r.from_island_id,
  r.to_island_id,
  r.base_fare,
  r.is_active,
  r.created_at,
  concat(i1.name, ' to ', i2.name) as route_name,
  i1.name as from_island_name,
  i2.name as to_island_name,
  COALESCE(route_stats.total_trips, 0::bigint) as total_trips_30d,
  COALESCE(route_stats.total_bookings, 0::bigint) as total_bookings_30d,
  COALESCE(route_stats.confirmed_bookings, 0::bigint) as confirmed_bookings_30d,
  COALESCE(route_stats.total_revenue, 0::numeric) as total_revenue_30d,
  COALESCE(route_stats.average_occupancy, 0::numeric) as average_occupancy_30d,
  round(
    case
      when COALESCE(route_stats.total_bookings, 0::bigint) = 0 then 0::numeric
      else COALESCE(route_stats.cancelled_bookings, 0::bigint)::numeric / route_stats.total_bookings::numeric * 100::numeric
    end,
    2
  ) as cancellation_rate_30d,
  round(
    case
      when COALESCE(route_stats.confirmed_bookings, 0::bigint) = 0 then 0::numeric
      else route_stats.total_revenue / route_stats.confirmed_bookings::numeric
    end,
    2
  ) as average_fare_30d
from
  routes r
  join islands i1 on r.from_island_id = i1.id
  join islands i2 on r.to_island_id = i2.id
  left join (
    select
      t.route_id,
      count(distinct t.id) as total_trips,
      count(b.id) as total_bookings,
      count(
        case
          when b.status = 'confirmed'::booking_status then 1
          else null::integer
        end
      ) as confirmed_bookings,
      count(
        case
          when b.status = 'cancelled'::booking_status then 1
          else null::integer
        end
      ) as cancelled_bookings,
      sum(
        case
          when b.status = 'confirmed'::booking_status then b.total_fare
          else 0::numeric
        end
      ) as total_revenue,
      round(
        case
          when count(distinct t.id) = 0 then 0::numeric
          else count(b.id)::numeric / count(distinct t.id)::numeric
        end,
        2
      ) as average_occupancy
    from
      trips t
      left join bookings b on t.id = b.trip_id
    where
      t.travel_date >= (CURRENT_DATE - '30 days'::interval)
    group by
      t.route_id
  ) route_stats on r.id = route_stats.route_id;

create table public.route_price_history (
  id uuid not null default gen_random_uuid (),
  route_id uuid not null,
  base_fare numeric(10, 2) not null,
  effective_from timestamp with time zone not null,
  effective_to timestamp with time zone null,
  changed_by uuid not null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint route_price_history_pkey primary key (id),
  constraint route_price_history_changed_by_fkey foreign KEY (changed_by) references auth.users (id),
  constraint route_price_history_route_id_fkey foreign KEY (route_id) references routes (id)
) TABLESPACE pg_default;

create table public.route_segment_fares (
  id uuid not null default gen_random_uuid (),
  route_id uuid not null,
  from_stop_id uuid not null,
  to_stop_id uuid not null,
  fare_amount numeric(10, 2) not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint route_segment_fares_pkey primary key (id),
  constraint unique_route_segment unique (route_id, from_stop_id, to_stop_id),
  constraint route_segment_fares_from_stop_id_fkey foreign KEY (from_stop_id) references route_stops (id) on delete CASCADE,
  constraint route_segment_fares_route_id_fkey foreign KEY (route_id) references routes (id) on delete CASCADE,
  constraint route_segment_fares_to_stop_id_fkey foreign KEY (to_stop_id) references route_stops (id) on delete CASCADE,
  constraint route_segment_fares_fare_amount_check check ((fare_amount >= (0)::numeric)),
  constraint check_different_stops check ((from_stop_id <> to_stop_id))
) TABLESPACE pg_default;

create index IF not exists idx_route_segment_fares_from on public.route_segment_fares using btree (from_stop_id) TABLESPACE pg_default;

create index IF not exists idx_route_segment_fares_route on public.route_segment_fares using btree (route_id) TABLESPACE pg_default;

create index IF not exists idx_route_segment_fares_segment on public.route_segment_fares using btree (from_stop_id, to_stop_id) TABLESPACE pg_default;

create index IF not exists idx_route_segment_fares_to on public.route_segment_fares using btree (to_stop_id) TABLESPACE pg_default;

create trigger route_segment_fares_updated_at BEFORE
update on route_segment_fares for EACH row
execute FUNCTION update_route_stops_timestamp ();

create view public.route_segment_fares_view as
select
  rsf.id,
  rsf.route_id,
  rsf.from_stop_id,
  rsf.to_stop_id,
  rsf.fare_amount,
  rsf.created_at,
  rsf.updated_at,
  rs_from.stop_sequence as from_stop_sequence,
  rs_from.island_id as from_island_id,
  i_from.name as from_island_name,
  i_from.zone as from_zone,
  rs_to.stop_sequence as to_stop_sequence,
  rs_to.island_id as to_island_id,
  i_to.name as to_island_name,
  i_to.zone as to_zone,
  rs_to.stop_sequence - rs_from.stop_sequence as segments_count,
  r.name as route_name
from
  route_segment_fares rsf
  join route_stops rs_from on rsf.from_stop_id = rs_from.id
  join route_stops rs_to on rsf.to_stop_id = rs_to.id
  join islands i_from on rs_from.island_id = i_from.id
  join islands i_to on rs_to.island_id = i_to.id
  join routes r on rsf.route_id = r.id;

create table public.route_stops (
  id uuid not null default gen_random_uuid (),
  route_id uuid not null,
  island_id uuid not null,
  stop_sequence integer not null,
  stop_type character varying(20) not null default 'both'::character varying,
  estimated_travel_time integer null,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint route_stops_pkey primary key (id),
  constraint unique_route_stop_sequence unique (route_id, stop_sequence),
  constraint route_stops_island_id_fkey foreign KEY (island_id) references islands (id),
  constraint route_stops_route_id_fkey foreign KEY (route_id) references routes (id) on delete CASCADE,
  constraint check_stop_sequence_positive check ((stop_sequence > 0)),
  constraint route_stops_stop_type_check check (
    (
      (stop_type)::text = any (
        array[
          ('pickup'::character varying)::text,
          ('dropoff'::character varying)::text,
          ('both'::character varying)::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_route_stops_island on public.route_stops using btree (island_id) TABLESPACE pg_default;

create index IF not exists idx_route_stops_route_id on public.route_stops using btree (route_id) TABLESPACE pg_default;

create index IF not exists idx_route_stops_sequence on public.route_stops using btree (route_id, stop_sequence) TABLESPACE pg_default;

create index IF not exists idx_route_stops_stop_type on public.route_stops using btree (stop_type) TABLESPACE pg_default;

create trigger route_stops_updated_at BEFORE
update on route_stops for EACH row
execute FUNCTION update_route_stops_timestamp ();

create view public.route_utilization_view as
select
  r.id,
  r.name,
  r.from_island_id,
  r.to_island_id,
  r.base_fare,
  r.is_active,
  oi.name as from_island_name,
  di.name as to_island_name,
  COALESCE(today_stats.trips_today, 0::bigint) as trips_today,
  COALESCE(week_stats.trips_next_7_days, 0::bigint) as trips_next_7_days,
  COALESCE(month_stats.trips_last_30_days, 0::bigint) as trips_last_30_days,
  COALESCE(month_stats.revenue_30d, 0::numeric) as revenue_30d,
  case
    when not r.is_active then 'inactive'::text
    when COALESCE(today_stats.trips_today, 0::bigint) = 0
    and COALESCE(week_stats.trips_next_7_days, 0::bigint) = 0 then 'idle'::text
    when COALESCE(today_stats.trips_today, 0::bigint) > 0 then 'active_today'::text
    when COALESCE(week_stats.trips_next_7_days, 0::bigint) > 0 then 'scheduled'::text
    else 'idle'::text
  end as utilization_status
from
  routes r
  left join islands oi on r.from_island_id = oi.id
  left join islands di on r.to_island_id = di.id
  left join (
    select
      trips.route_id,
      count(*) as trips_today
    from
      trips
    where
      trips.travel_date = CURRENT_DATE
      and trips.is_active = true
    group by
      trips.route_id
  ) today_stats on r.id = today_stats.route_id
  left join (
    select
      trips.route_id,
      count(*) as trips_next_7_days
    from
      trips
    where
      trips.travel_date >= CURRENT_DATE
      and trips.travel_date <= (CURRENT_DATE + '7 days'::interval)
      and trips.is_active = true
    group by
      trips.route_id
  ) week_stats on r.id = week_stats.route_id
  left join (
    select
      t.route_id,
      count(*) as trips_last_30_days,
      sum(COALESCE(b.total_fare, 0::numeric)) as revenue_30d
    from
      trips t
      left join bookings b on t.id = b.trip_id
      and b.status = 'confirmed'::booking_status
    where
      t.travel_date >= (CURRENT_DATE - '30 days'::interval)
      and t.is_active = true
    group by
      t.route_id
  ) month_stats on r.id = month_stats.route_id;

create table public.routes (
  id uuid not null default gen_random_uuid (),
  from_island_id uuid null,
  to_island_id uuid null,
  base_fare numeric(10, 2) not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  status character varying(20) null default 'active'::character varying,
  name character varying(255) null,
  distance character varying(50) null,
  duration character varying(50) null,
  description text null,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint routes_pkey primary key (id),
  constraint routes_from_island_id_fkey foreign KEY (from_island_id) references islands (id),
  constraint routes_to_island_id_fkey foreign KEY (to_island_id) references islands (id),
  constraint chk_route_fare_positive check ((base_fare >= (0)::numeric))
) TABLESPACE pg_default;

create index IF not exists idx_routes_from_to on public.routes using btree (from_island_id, to_island_id) TABLESPACE pg_default;

create index IF not exists idx_routes_active on public.routes using btree (is_active) TABLESPACE pg_default;

create index IF not exists idx_routes_active_only on public.routes using btree (id, name, base_fare) TABLESPACE pg_default
where
  (is_active = true);

create index IF not exists idx_routes_created_at on public.routes using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_routes_islands_active on public.routes using btree (from_island_id, to_island_id, is_active) TABLESPACE pg_default;

create index IF not exists idx_routes_name on public.routes using btree (name) TABLESPACE pg_default;

create index IF not exists idx_routes_name_active on public.routes using btree (name, is_active) TABLESPACE pg_default;

create index IF not exists idx_routes_status on public.routes using btree (status) TABLESPACE pg_default;

create index IF not exists idx_routes_status_active on public.routes using btree (status, is_active) TABLESPACE pg_default;

create index IF not exists idx_routes_updated_at on public.routes using btree (updated_at) TABLESPACE pg_default;

create trigger audit_routes_trigger
after INSERT
or DELETE
or
update on routes for EACH row
execute FUNCTION enhanced_audit_trigger ();

create trigger route_activity_trigger
after INSERT
or DELETE
or
update on routes for EACH row
execute FUNCTION log_route_activity ();

create trigger routes_stats_change_trigger
after INSERT
or DELETE
or
update on routes for EACH row
execute FUNCTION notify_zone_stats_change ();

create trigger routes_updated_at_trigger BEFORE
update on routes for EACH row
execute FUNCTION update_routes_updated_at ();

create trigger trigger_set_route_name BEFORE INSERT
or
update on routes for EACH row
execute FUNCTION set_route_name ();

create view public.routes_simple_view as
select
  r.id,
  r.name,
  r.from_island_id,
  r.to_island_id,
  r.base_fare,
  r.status,
  r.is_active,
  oi.name as from_island_name,
  di.name as to_island_name,
  COALESCE(
    r.name,
    concat(oi.name, ' → ', di.name)::character varying
  ) as route_display_name
from
  routes r
  left join islands oi on r.from_island_id = oi.id
  left join islands di on r.to_island_id = di.id;

create view public.routes_stats_view as
select
  id,
  name,
  base_fare,
  distance,
  duration,
  description,
  status,
  is_active,
  created_at,
  updated_at,
  from_island_name,
  to_island_name,
  total_stops,
  total_segments,
  total_trips_30d,
  total_bookings_30d,
  average_occupancy_30d,
  total_revenue_30d,
  cancellation_rate_30d,
  popularity_score
from
  routes_with_stops_view;

create view public.routes_with_stops_view as
select
  r.id,
  r.name,
  r.base_fare,
  r.distance,
  r.duration,
  r.description,
  r.status,
  r.is_active,
  r.created_at,
  r.updated_at,
  first_stop.island_name as from_island_name,
  last_stop.island_name as to_island_name,
  COALESCE(stop_counts.total_stops, 0::bigint) as total_stops,
  COALESCE(segment_counts.actual_segments, 0::bigint) as total_segments,
  COALESCE(stats.total_trips_30d, 0::bigint) as total_trips_30d,
  COALESCE(stats.total_bookings_30d, 0::bigint) as total_bookings_30d,
  COALESCE(stats.average_occupancy_30d, 0::numeric) as average_occupancy_30d,
  COALESCE(stats.total_revenue_30d, 0::numeric) as total_revenue_30d,
  COALESCE(stats.cancellation_rate_30d, 0::numeric) as cancellation_rate_30d,
  COALESCE(stats.popularity_score, 0::numeric) as popularity_score
from
  routes r
  left join (
    select
      rs.route_id,
      i.name as island_name
    from
      route_stops rs
      join islands i on rs.island_id = i.id
    where
      rs.stop_sequence = 1
  ) first_stop on r.id = first_stop.route_id
  left join (
    select distinct
      on (rs.route_id) rs.route_id,
      i.name as island_name
    from
      route_stops rs
      join islands i on rs.island_id = i.id
    order by
      rs.route_id,
      rs.stop_sequence desc
  ) last_stop on r.id = last_stop.route_id
  left join (
    select
      route_stops.route_id,
      count(*) as total_stops
    from
      route_stops
    group by
      route_stops.route_id
  ) stop_counts on r.id = stop_counts.route_id
  left join (
    select
      route_id,
      count(*) as actual_segments
    from
      route_segment_fares
    group by
      route_id
  ) segment_counts on r.id = segment_counts.route_id
  left join (
    select
      t.route_id,
      count(distinct t.id) as total_trips_30d,
      count(b.id) as total_bookings_30d,
      round(
        case
          when count(distinct t.id) > 0
          and avg(v.seating_capacity) > 0::numeric then count(b.id)::numeric * 100.0 / (
            count(distinct t.id)::numeric * avg(v.seating_capacity)
          )
          else 0::numeric
        end,
        2
      ) as average_occupancy_30d,
      sum(
        case
          when b.status = 'confirmed'::booking_status then b.total_fare
          else 0::numeric
        end
      ) as total_revenue_30d,
      round(
        case
          when count(b.id) > 0 then count(
            case
              when b.status = 'cancelled'::booking_status then 1
              else null::integer
            end
          )::numeric / count(b.id)::numeric * 100::numeric
          else 0::numeric
        end,
        2
      ) as cancellation_rate_30d,
      round(
        count(b.id)::numeric * 0.7 + sum(
          case
            when b.status = 'confirmed'::booking_status then b.total_fare
            else 0::numeric
          end
        ) / 100::numeric * 0.3,
        2
      ) as popularity_score
    from
      trips t
      left join bookings b on t.id = b.trip_id
      left join vessels v on t.vessel_id = v.id
    where
      t.travel_date >= (CURRENT_DATE - '30 days'::interval)
    group by
      t.route_id
  ) stats on r.id = stats.route_id;

create view public.seat_availability_by_segment as
select
  t.id as trip_id,
  t.travel_date,
  t.departure_time,
  r.id as route_id,
  r.name as route_name,
  s.id as seat_id,
  s.seat_number,
  s.row_number,
  s.is_window,
  s.is_aisle,
  s.seat_type,
  s.seat_class,
  s.price_multiplier,
  s.position_x,
  s.position_y,
  rs_from.id as from_stop_id,
  rs_from.stop_sequence as from_sequence,
  i_from.name as from_island,
  rs_to.id as to_stop_id,
  rs_to.stop_sequence as to_sequence,
  i_to.name as to_island,
  is_seat_available_for_segment (
    t.id,
    s.id,
    rs_from.stop_sequence,
    rs_to.stop_sequence
  ) as is_available
from
  trips t
  join vessels v on t.vessel_id = v.id
  join seats s on v.id = s.vessel_id
  join routes r on t.route_id = r.id
  join route_stops rs_from on r.id = rs_from.route_id
  join route_stops rs_to on r.id = rs_to.route_id
  join islands i_from on rs_from.island_id = i_from.id
  join islands i_to on rs_to.island_id = i_to.id
where
  rs_to.stop_sequence > rs_from.stop_sequence
  and (
    rs_from.stop_type::text = any (
      array[
        'pickup'::character varying::text,
        'both'::character varying::text
      ]
    )
  )
  and (
    rs_to.stop_type::text = any (
      array[
        'dropoff'::character varying::text,
        'both'::character varying::text
      ]
    )
  )
  and s.is_disabled = false
  and t.is_active = true;

create table public.seat_reservations (
  id uuid not null default gen_random_uuid (),
  trip_id uuid not null,
  seat_id uuid not null,
  booking_id uuid null,
  is_available boolean not null default true,
  is_reserved boolean not null default false,
  reservation_expiry timestamp with time zone null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  user_id uuid null,
  session_id text null,
  temp_reserved_at timestamp with time zone null,
  temp_reservation_expiry timestamp with time zone null,
  last_activity timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint seat_reservations_pkey primary key (id),
  constraint unique_trip_seat unique (trip_id, seat_id),
  constraint seat_reservations_booking_id_fkey foreign KEY (booking_id) references bookings (id),
  constraint seat_reservations_seat_id_fkey foreign KEY (seat_id) references seats (id) on update CASCADE on delete CASCADE,
  constraint seat_reservations_trip_id_fkey foreign KEY (trip_id) references trips (id),
  constraint seat_reservations_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

create index IF not exists idx_realtime_seat_availability on public.seat_reservations using btree (
  trip_id,
  seat_id,
  booking_id,
  temp_reservation_expiry
) TABLESPACE pg_default;

create index IF not exists idx_seat_reservations_last_activity on public.seat_reservations using btree (last_activity) TABLESPACE pg_default;

create index IF not exists idx_seat_reservations_seat_id on public.seat_reservations using btree (seat_id) TABLESPACE pg_default;

create index IF not exists idx_seat_reservations_temp_expiry on public.seat_reservations using btree (temp_reservation_expiry) TABLESPACE pg_default
where
  (temp_reservation_expiry is not null);

create index IF not exists idx_seat_reservations_temp_reserved on public.seat_reservations using btree (trip_id, temp_reserved_at) TABLESPACE pg_default
where
  (temp_reserved_at is not null);

create index IF not exists idx_seat_reservations_trip_booking on public.seat_reservations using btree (trip_id, booking_id) TABLESPACE pg_default;

create index IF not exists idx_seat_reservations_trip_id on public.seat_reservations using btree (trip_id) TABLESPACE pg_default;

create index IF not exists idx_seat_reservations_trip_seat on public.seat_reservations using btree (trip_id, seat_id) TABLESPACE pg_default;

create index IF not exists idx_seat_reservations_user_session on public.seat_reservations using btree (user_id, session_id) TABLESPACE pg_default
where
  (user_id is not null);

create table public.seat_segment_reservations (
  id uuid not null default gen_random_uuid (),
  trip_id uuid not null,
  seat_id uuid not null,
  booking_id uuid not null,
  passenger_id uuid null,
  boarding_stop_id uuid not null,
  destination_stop_id uuid not null,
  boarding_stop_sequence integer not null,
  destination_stop_sequence integer not null,
  reserved_at timestamp with time zone null default now(),
  user_id uuid null,
  session_id text null,
  created_at timestamp with time zone null default now(),
  constraint seat_segment_reservations_pkey primary key (id),
  constraint seat_segment_reservations_boarding_stop_id_fkey foreign KEY (boarding_stop_id) references route_stops (id),
  constraint seat_segment_reservations_booking_id_fkey foreign KEY (booking_id) references bookings (id) on delete CASCADE,
  constraint seat_segment_reservations_destination_stop_id_fkey foreign KEY (destination_stop_id) references route_stops (id),
  constraint seat_segment_reservations_passenger_id_fkey foreign KEY (passenger_id) references passengers (id) on delete set null,
  constraint seat_segment_reservations_user_id_fkey foreign KEY (user_id) references auth.users (id),
  constraint seat_segment_reservations_seat_id_fkey foreign KEY (seat_id) references seats (id) on delete CASCADE,
  constraint seat_segment_reservations_trip_id_fkey foreign KEY (trip_id) references trips (id) on delete CASCADE,
  constraint check_valid_reservation_segment check (
    (
      destination_stop_sequence > boarding_stop_sequence
    )
  ),
  constraint check_different_reservation_stops check ((boarding_stop_id <> destination_stop_id))
) TABLESPACE pg_default;

create index IF not exists idx_seat_segment_res_booking on public.seat_segment_reservations using btree (booking_id) TABLESPACE pg_default;

create index IF not exists idx_seat_segment_res_passenger on public.seat_segment_reservations using btree (passenger_id) TABLESPACE pg_default
where
  (passenger_id is not null);

create index IF not exists idx_seat_segment_res_seat on public.seat_segment_reservations using btree (seat_id) TABLESPACE pg_default;

create index IF not exists idx_seat_segment_res_segment on public.seat_segment_reservations using btree (
  trip_id,
  seat_id,
  boarding_stop_sequence,
  destination_stop_sequence
) TABLESPACE pg_default;

create index IF not exists idx_seat_segment_res_trip on public.seat_segment_reservations using btree (trip_id) TABLESPACE pg_default;

create index IF not exists idx_seat_segment_res_user on public.seat_segment_reservations using btree (user_id, session_id) TABLESPACE pg_default
where
  (user_id is not null);

create table public.seats (
  id uuid not null default gen_random_uuid (),
  vessel_id uuid not null,
  seat_number character varying(50) not null,
  row_number integer not null,
  position_x integer not null,
  position_y integer not null,
  is_window boolean null default false,
  is_aisle boolean null default false,
  is_row_aisle boolean null default false,
  seat_type character varying(50) null default 'standard'::character varying,
  seat_class character varying(50) null default 'economy'::character varying,
  is_disabled boolean null default false,
  is_premium boolean null default false,
  price_multiplier numeric(5, 2) null default 1.00,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint seats_pkey primary key (id),
  constraint unique_seat_position_per_vessel unique (vessel_id, position_x, position_y),
  constraint seats_vessel_id_fkey foreign KEY (vessel_id) references vessels (id) on delete CASCADE,
  constraint check_price_multiplier_positive check ((price_multiplier > (0)::numeric)),
  constraint seats_seat_type_check check (
    (
      (seat_type)::text = any (
        array[
          ('standard'::character varying)::text,
          ('premium'::character varying)::text,
          ('crew'::character varying)::text,
          ('disabled'::character varying)::text
        ]
      )
    )
  ),
  constraint seats_seat_class_check check (
    (
      (seat_class)::text = any (
        array[
          ('economy'::character varying)::text,
          ('business'::character varying)::text,
          ('first'::character varying)::text
        ]
      )
    )
  ),
  constraint check_seat_number_format check (((seat_number)::text ~ '^[A-Za-z0-9]+$'::text)),
  constraint check_seat_position_positive check (
    (
      (position_x > 0)
      and (position_y > 0)
      and (row_number > 0)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_seats_class on public.seats using btree (seat_class) TABLESPACE pg_default;

create index IF not exists idx_seats_disabled on public.seats using btree (is_disabled) TABLESPACE pg_default;

create index IF not exists idx_seats_position on public.seats using btree (position_x, position_y) TABLESPACE pg_default;

create index IF not exists idx_seats_premium on public.seats using btree (is_premium) TABLESPACE pg_default;

create index IF not exists idx_seats_row_col on public.seats using btree (row_number, position_x) TABLESPACE pg_default;

create index IF not exists idx_seats_type on public.seats using btree (seat_type) TABLESPACE pg_default;

create index IF not exists idx_seats_type_class on public.seats using btree (seat_type, seat_class) TABLESPACE pg_default;

create index IF not exists idx_seats_vessel_class on public.seats using btree (vessel_id, seat_class) TABLESPACE pg_default;

create index IF not exists idx_seats_vessel_disabled on public.seats using btree (vessel_id, is_disabled) TABLESPACE pg_default;

create index IF not exists idx_seats_vessel_id on public.seats using btree (vessel_id) TABLESPACE pg_default;

create index IF not exists idx_seats_vessel_position on public.seats using btree (vessel_id, position_x, position_y) TABLESPACE pg_default;

create index IF not exists idx_seats_vessel_premium on public.seats using btree (vessel_id, is_premium) TABLESPACE pg_default;

create index IF not exists idx_seats_vessel_type on public.seats using btree (vessel_id, seat_type) TABLESPACE pg_default;

create trigger seats_updated_at_trigger BEFORE
update on seats for EACH row
execute FUNCTION update_updated_at_column ();

create view public.stop_progress_details_view as
select
  tsp.id,
  tsp.trip_id,
  tsp.stop_id,
  tsp.stop_sequence,
  tsp.stop_type,
  tsp.status,
  tsp.arrived_at,
  tsp.departed_at,
  tsp.boarding_started_at,
  tsp.boarding_completed_at,
  tsp.manifest_sent_at,
  tsp.captain_id,
  up.full_name as captain_name,
  i.name as island_name,
  i.zone as island_zone,
  t.travel_date,
  t.departure_time,
  r.name as route_name,
  case
    when t.current_stop_id = tsp.stop_id then true
    else false
  end as is_current_stop,
  case
    when tsp.status::text = 'completed'::text
    or tsp.status::text = 'departed'::text then true
    else false
  end as is_completed
from
  trip_stop_progress tsp
  join route_stops rs on tsp.stop_id = rs.id
  join islands i on rs.island_id = i.id
  join trips t on tsp.trip_id = t.id
  join routes r on t.route_id = r.id
  left join user_profiles up on tsp.captain_id = up.id
order by
  tsp.trip_id,
  tsp.stop_sequence;

create table public.system_health_metrics (
  id uuid not null default gen_random_uuid (),
  metric_name character varying(100) not null,
  metric_value numeric not null,
  metric_type character varying(50) not null,
  unit character varying(20) null,
  tags jsonb null,
  threshold_warning numeric null,
  threshold_critical numeric null,
  recorded_at timestamp with time zone null default CURRENT_TIMESTAMP,
  constraint system_health_metrics_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_system_health_name_time on public.system_health_metrics using btree (metric_name, recorded_at) TABLESPACE pg_default;

create index IF not exists idx_system_health_recorded_at on public.system_health_metrics using btree (recorded_at) TABLESPACE pg_default;

create table public.terms_and_conditions (
  id uuid not null default gen_random_uuid (),
  title character varying(200) not null,
  content text not null,
  version character varying(10) not null,
  effective_date timestamp with time zone not null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  is_active boolean not null default true,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint terms_and_conditions_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_terms_active on public.terms_and_conditions using btree (is_active) TABLESPACE pg_default;

create index IF not exists idx_terms_effective_date on public.terms_and_conditions using btree (effective_date) TABLESPACE pg_default;

create index IF not exists idx_terms_version on public.terms_and_conditions using btree (version) TABLESPACE pg_default;

create trigger content_activity_trigger_terms
after INSERT
or DELETE
or
update on terms_and_conditions for EACH row
execute FUNCTION log_content_activity ();

create trigger content_change_notify_terms
after INSERT
or DELETE
or
update on terms_and_conditions for EACH row
execute FUNCTION notify_content_change ();

create trigger terms_updated_at_trigger BEFORE
update on terms_and_conditions for EACH row
execute FUNCTION update_updated_at_column ();

create trigger validate_terms_version_trigger BEFORE INSERT
or
update on terms_and_conditions for EACH row
execute FUNCTION validate_terms_version ();

create view public.terms_with_stats as
select
  id,
  title,
  content,
  version,
  effective_date,
  created_at,
  is_active,
  updated_at,
  case
    when effective_date <= CURRENT_DATE
    and is_active = true then 'current'::text
    when effective_date > CURRENT_DATE
    and is_active = true then 'upcoming'::text
    when is_active = false then 'inactive'::text
    else 'expired'::text
  end as status,
  length(content) as content_length,
  array_length(string_to_array(content, ' '::text), 1) as word_count
from
  terms_and_conditions t
order by
  effective_date desc,
  created_at desc;

create view public.ticket_validation_view as
select
  b.id as booking_id,
  b.booking_number,
  b.status,
  b.check_in_status,
  b.checked_in_at,
  b.checked_in_by,
  b.total_fare,
  b.user_id,
  b.agent_id,
  b.agent_client_id,
  t.travel_date,
  t.departure_time,
  fi.name as from_island_name,
  case
    when fi.zone is not null then fi.zone
    else null::text
  end as from_island_zone,
  ti.name as to_island_name,
  case
    when ti.zone is not null then ti.zone
    else null::text
  end as to_island_zone,
  r.base_fare,
  v.name as vessel_name,
  COALESCE(passenger_counts.passenger_count, 0::bigint) as passenger_count,
  captain.full_name as checked_in_by_name
from
  bookings b
  join trips t on b.trip_id = t.id
  join routes r on t.route_id = r.id
  join islands fi on r.from_island_id = fi.id
  join islands ti on r.to_island_id = ti.id
  join vessels v on t.vessel_id = v.id
  left join (
    select
      passengers.booking_id,
      count(*) as passenger_count
    from
      passengers
    group by
      passengers.booking_id
  ) passenger_counts on b.id = passenger_counts.booking_id
  left join user_profiles captain on b.checked_in_by = captain.id;

create table public.tickets (
  id uuid not null default gen_random_uuid (),
  booking_id uuid not null,
  qr_code_data text not null,
  issue_date date not null,
  issue_time time without time zone not null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint tickets_pkey primary key (id),
  constraint tickets_booking_id_key unique (booking_id),
  constraint tickets_booking_id_fkey foreign KEY (booking_id) references bookings (id)
) TABLESPACE pg_default;

create view public.today_schedule_view as
select
  t.id,
  t.route_id,
  t.vessel_id,
  t.travel_date,
  t.departure_time,
  t.arrival_time,
  t.available_seats,
  t.status,
  t.captain_id,
  concat(oi.name, ' → ', di.name) as route_name,
  oi.name as from_island_name,
  di.name as to_island_name,
  v.name as vessel_name,
  v.seating_capacity as capacity,
  cp.full_name as captain_name,
  cp.email as captain_email,
  COALESCE(booking_stats.confirmed_bookings, 0::bigint) as bookings,
  COALESCE(booking_stats.total_passengers, 0::numeric) as booked_seats,
  COALESCE(booking_stats.total_revenue, 0::numeric) as trip_revenue,
  COALESCE(booking_stats.total_revenue, 0::numeric) as total_revenue,
  case
    when t.departure_time::time with time zone < CURRENT_TIME then 'departed'::text
    when t.departure_time::time with time zone <= (CURRENT_TIME + '00:30:00'::interval) then 'boarding'::text
    else 'scheduled'::text
  end as computed_status,
  case
    when v.seating_capacity > 0 then round(
      COALESCE(booking_stats.confirmed_bookings, 0::bigint)::numeric / v.seating_capacity::numeric * 100::numeric,
      2
    )
    else 0::numeric
  end as occupancy_rate
from
  trips t
  left join routes r on t.route_id = r.id
  left join islands oi on r.from_island_id = oi.id
  left join islands di on r.to_island_id = di.id
  left join vessels v on t.vessel_id = v.id
  left join user_profiles cp on t.captain_id = cp.id
  left join (
    select
      b.trip_id,
      count(
        case
          when b.status = any (
            array[
              'confirmed'::booking_status,
              'checked_in'::booking_status
            ]
          ) then 1
          else null::integer
        end
      ) as confirmed_bookings,
      COALESCE(
        sum(
          case
            when b.status = any (
              array[
                'confirmed'::booking_status,
                'checked_in'::booking_status
              ]
            ) then passenger_counts.passenger_count
            else 0::bigint
          end
        ),
        0::numeric
      ) as total_passengers,
      sum(
        case
          when b.status = any (
            array[
              'confirmed'::booking_status,
              'checked_in'::booking_status
            ]
          ) then b.total_fare
          else 0::numeric
        end
      ) as total_revenue
    from
      bookings b
      left join (
        select
          passengers.booking_id,
          count(*) as passenger_count
        from
          passengers
        group by
          passengers.booking_id
      ) passenger_counts on b.id = passenger_counts.booking_id
    group by
      b.trip_id
  ) booking_stats on t.id = booking_stats.trip_id
where
  t.travel_date = CURRENT_DATE
  and t.is_active = true
order by
  t.departure_time;

create view public.todays_schedule_view as
select
  t.id,
  t.route_id,
  t.vessel_id,
  t.travel_date,
  t.departure_time,
  t.available_seats,
  t.status,
  t.fare_multiplier,
  t.booked_seats,
  t.is_active,
  t.created_at,
  case
    when t.departure_time::time with time zone <= (CURRENT_TIME - '01:00:00'::interval) then 'departed'::text
    when t.departure_time::time with time zone <= (CURRENT_TIME + '00:30:00'::interval) then 'boarding'::text
    else 'scheduled'::text
  end as current_status,
  r.base_fare,
  COALESCE(
    r.name,
    concat(oi.name, ' to ', di.name)::character varying
  ) as route_name,
  oi.name as from_island_name,
  di.name as to_island_name,
  v.name as vessel_name,
  v.seating_capacity as capacity,
  COALESCE(booking_stats.confirmed_bookings, 0::bigint) as confirmed_bookings,
  round(
    case
      when v.seating_capacity > 0 then COALESCE(booking_stats.confirmed_bookings, 0::bigint)::numeric * 100.0 / v.seating_capacity::numeric
      else 0::numeric
    end,
    2
  ) as occupancy_rate
from
  trips t
  left join routes r on t.route_id = r.id
  left join islands oi on r.from_island_id = oi.id
  left join islands di on r.to_island_id = di.id
  left join vessels v on t.vessel_id = v.id
  left join (
    select
      b.trip_id,
      count(
        case
          when b.status = any (
            array[
              'confirmed'::booking_status,
              'checked_in'::booking_status
            ]
          ) then 1
          else null::integer
        end
      ) as confirmed_bookings
    from
      bookings b
    group by
      b.trip_id
  ) booking_stats on t.id = booking_stats.trip_id
where
  t.travel_date = CURRENT_DATE
  and t.is_active = true
order by
  t.departure_time;

create view public.trip_availability as
select
  r.id as route_id,
  fi.name as from_island,
  ti.name as to_island,
  t.travel_date,
  count(t.id) as total_trips,
  sum(t.available_seats) as total_available_seats,
  string_agg(
    t.departure_time::text,
    ', '::text
    order by
      t.departure_time
  ) as departure_times
from
  routes r
  join islands fi on r.from_island_id = fi.id
  join islands ti on r.to_island_id = ti.id
  left join trips t on r.id = t.route_id
  and t.is_active = true
where
  r.is_active = true
  and (
    t.travel_date is null
    or t.travel_date >= CURRENT_DATE
  )
group by
  r.id,
  fi.name,
  ti.name,
  t.travel_date
order by
  r.id,
  t.travel_date;

create table public.trip_fare_overrides (
  id uuid not null default gen_random_uuid (),
  trip_id uuid not null,
  from_stop_id uuid not null,
  to_stop_id uuid not null,
  override_fare_amount numeric(10, 2) not null,
  reason text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint trip_fare_overrides_pkey primary key (id),
  constraint unique_trip_fare_override unique (trip_id, from_stop_id, to_stop_id),
  constraint trip_fare_overrides_from_stop_id_fkey foreign KEY (from_stop_id) references route_stops (id),
  constraint trip_fare_overrides_to_stop_id_fkey foreign KEY (to_stop_id) references route_stops (id),
  constraint trip_fare_overrides_trip_id_fkey foreign KEY (trip_id) references trips (id) on delete CASCADE,
  constraint trip_fare_overrides_override_fare_amount_check check ((override_fare_amount >= (0)::numeric)),
  constraint check_different_override_stops check ((from_stop_id <> to_stop_id))
) TABLESPACE pg_default;

create index IF not exists idx_trip_fare_overrides_from on public.trip_fare_overrides using btree (from_stop_id) TABLESPACE pg_default;

create index IF not exists idx_trip_fare_overrides_to on public.trip_fare_overrides using btree (to_stop_id) TABLESPACE pg_default;

create index IF not exists idx_trip_fare_overrides_trip on public.trip_fare_overrides using btree (trip_id) TABLESPACE pg_default;

create trigger trip_fare_overrides_updated_at BEFORE
update on trip_fare_overrides for EACH row
execute FUNCTION update_route_stops_timestamp ();

create table public.trip_stop_progress (
  id uuid not null default gen_random_uuid (),
  trip_id uuid not null,
  stop_id uuid not null,
  stop_sequence integer not null,
  stop_type character varying(20) not null default 'both'::character varying,
  status character varying(20) null default 'pending'::character varying,
  arrived_at timestamp with time zone null,
  departed_at timestamp with time zone null,
  boarding_started_at timestamp with time zone null,
  boarding_completed_at timestamp with time zone null,
  manifest_sent_at timestamp with time zone null,
  captain_id uuid null,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint trip_stop_progress_pkey primary key (id),
  constraint unique_trip_stop_progress unique (trip_id, stop_id),
  constraint trip_stop_progress_stop_id_fkey foreign KEY (stop_id) references route_stops (id),
  constraint trip_stop_progress_captain_id_fkey foreign KEY (captain_id) references user_profiles (id),
  constraint trip_stop_progress_trip_id_fkey foreign KEY (trip_id) references trips (id) on delete CASCADE,
  constraint trip_stop_progress_stop_type_check check (
    (
      (stop_type)::text = any (
        (
          array[
            'pickup'::character varying,
            'dropoff'::character varying,
            'both'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint trip_stop_progress_status_check check (
    (
      (status)::text = any (
        (
          array[
            'pending'::character varying,
            'arrived'::character varying,
            'boarding'::character varying,
            'departed'::character varying,
            'completed'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint check_stop_sequence_positive check ((stop_sequence > 0))
) TABLESPACE pg_default;

create index IF not exists idx_trip_stop_progress_trip on public.trip_stop_progress using btree (trip_id) TABLESPACE pg_default;

create index IF not exists idx_trip_stop_progress_stop on public.trip_stop_progress using btree (stop_id) TABLESPACE pg_default;

create index IF not exists idx_trip_stop_progress_status on public.trip_stop_progress using btree (status) TABLESPACE pg_default;

create index IF not exists idx_trip_stop_progress_captain on public.trip_stop_progress using btree (captain_id) TABLESPACE pg_default;

create index IF not exists idx_trip_stop_progress_trip_status on public.trip_stop_progress using btree (trip_id, status) TABLESPACE pg_default;

create trigger trip_stop_progress_updated_at BEFORE
update on trip_stop_progress for EACH row
execute FUNCTION update_trip_stop_progress_updated_at ();

create table public.trips (
  id uuid not null default gen_random_uuid (),
  route_id uuid not null,
  travel_date date not null,
  departure_time time without time zone not null,
  vessel_id uuid not null,
  available_seats integer not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  status character varying(20) null default 'scheduled'::character varying,
  fare_multiplier numeric(3, 2) null default 1.0,
  booked_seats integer null default 0,
  arrival_time time without time zone null,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  captain_id uuid null,
  is_checkin_closed boolean not null default false,
  checkin_closed_at timestamp with time zone null,
  checkin_closed_by uuid null,
  manifest_generated_at timestamp with time zone null,
  manifest_sent_at timestamp with time zone null,
  current_stop_sequence integer null default 1,
  current_stop_id uuid null,
  trip_progress_status character varying(20) null default 'not_started'::character varying,
  constraint trips_pkey primary key (id),
  constraint unique_trip_vessel unique (route_id, travel_date, departure_time, vessel_id),
  constraint trips_route_id_fkey foreign KEY (route_id) references routes (id),
  constraint trips_current_stop_id_fkey foreign KEY (current_stop_id) references route_stops (id),
  constraint trips_captain_id_fkey foreign KEY (captain_id) references user_profiles (id),
  constraint trips_checkin_closed_by_fkey foreign KEY (checkin_closed_by) references user_profiles (id),
  constraint trips_vessel_id_fkey foreign KEY (vessel_id) references vessels (id),
  constraint chk_trip_available_seats_valid check ((available_seats >= 0)),
  constraint trips_trip_progress_status_check check (
    (
      (trip_progress_status)::text = any (
        (
          array[
            'not_started'::character varying,
            'boarding_in_progress'::character varying,
            'in_transit'::character varying,
            'completed'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_trips_captain_active on public.trips using btree (captain_id, is_active, travel_date) TABLESPACE pg_default
where
  (
    (captain_id is not null)
    and (is_active = true)
  );

create index IF not exists idx_trips_captain_date on public.trips using btree (captain_id, travel_date) TABLESPACE pg_default
where
  (captain_id is not null);

create index IF not exists idx_trips_captain_date_status on public.trips using btree (captain_id, travel_date, status) TABLESPACE pg_default
where
  (captain_id is not null);

create index IF not exists idx_trips_captain_id on public.trips using btree (captain_id) TABLESPACE pg_default
where
  (captain_id is not null);

create index IF not exists idx_trips_captain_status on public.trips using btree (captain_id, status) TABLESPACE pg_default
where
  (captain_id is not null);

create index IF not exists idx_trips_checkin_closed on public.trips using btree (is_checkin_closed, checkin_closed_at) TABLESPACE pg_default;

create index IF not exists idx_trips_checkin_closed_by on public.trips using btree (checkin_closed_by) TABLESPACE pg_default
where
  (checkin_closed_by is not null);

create index IF not exists idx_trips_date_departure on public.trips using btree (travel_date, departure_time, is_active) TABLESPACE pg_default;

create index IF not exists idx_trips_route_date on public.trips using btree (route_id, travel_date) TABLESPACE pg_default;

create index IF not exists idx_trips_route_date_active on public.trips using btree (route_id, travel_date, is_active) TABLESPACE pg_default;

create index IF not exists idx_trips_route_date_time_vessel on public.trips using btree (route_id, travel_date, departure_time, vessel_id) TABLESPACE pg_default;

create index IF not exists idx_trips_route_id on public.trips using btree (route_id) TABLESPACE pg_default;

create index IF not exists idx_trips_route_vessel on public.trips using btree (route_id, vessel_id) TABLESPACE pg_default;

create index IF not exists idx_trips_status on public.trips using btree (status) TABLESPACE pg_default;

create index IF not exists idx_trips_today_active on public.trips using btree (travel_date, is_active, status) TABLESPACE pg_default;

create index IF not exists idx_trips_travel_date on public.trips using btree (travel_date) TABLESPACE pg_default;

create index IF not exists idx_trips_travel_date_active on public.trips using btree (travel_date, is_active) TABLESPACE pg_default
where
  (is_active = true);

create index IF not exists idx_trips_travel_date_route on public.trips using btree (travel_date, route_id) TABLESPACE pg_default;

create index IF not exists idx_trips_travel_date_status on public.trips using btree (travel_date, status) TABLESPACE pg_default;

create index IF not exists idx_trips_vessel_date on public.trips using btree (vessel_id, travel_date) TABLESPACE pg_default
where
  (is_active = true);

create index IF not exists idx_trips_vessel_date_active on public.trips using btree (vessel_id, travel_date, is_active) TABLESPACE pg_default;

create index IF not exists idx_trips_vessel_date_status on public.trips using btree (vessel_id, travel_date, is_active) TABLESPACE pg_default;

create index IF not exists idx_trips_current_stop on public.trips using btree (current_stop_id) TABLESPACE pg_default;

create index IF not exists idx_trips_progress_status on public.trips using btree (trip_progress_status) TABLESPACE pg_default;

create index IF not exists idx_trips_current_sequence on public.trips using btree (current_stop_sequence) TABLESPACE pg_default;

create trigger audit_trips_trigger
after INSERT
or DELETE
or
update on trips for EACH row
execute FUNCTION enhanced_audit_trigger ();

create view public.trips_with_available_seats as
select
  t.id,
  t.route_id,
  t.vessel_id,
  t.travel_date,
  t.departure_time,
  t.is_active,
  t.created_at,
  v.name as vessel_name,
  v.seating_capacity,
  get_trip_available_seats (t.id) as available_seats
from
  trips t
  join vessels v on t.vessel_id = v.id
where
  t.is_active = true;

create table public.user_permissions (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  permission_id uuid not null,
  granted_by uuid not null,
  granted_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  expires_at timestamp with time zone null,
  is_active boolean not null default true,
  notes text null,
  constraint user_permissions_pkey primary key (id),
  constraint unique_user_permission unique (user_id, permission_id),
  constraint user_permissions_granted_by_fkey foreign KEY (granted_by) references user_profiles (id),
  constraint user_permissions_permission_id_fkey foreign KEY (permission_id) references permissions (id) on delete CASCADE,
  constraint user_permissions_user_id_fkey foreign KEY (user_id) references user_profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_user_permissions_active on public.user_permissions using btree (is_active, expires_at) TABLESPACE pg_default;

create index IF not exists idx_user_permissions_expires on public.user_permissions using btree (expires_at) TABLESPACE pg_default
where
  (expires_at is not null);

create index IF not exists idx_user_permissions_permission on public.user_permissions using btree (permission_id) TABLESPACE pg_default;

create index IF not exists idx_user_permissions_user on public.user_permissions using btree (user_id, is_active) TABLESPACE pg_default;

create trigger permission_changes_audit_trigger
after INSERT
or DELETE
or
update on user_permissions for EACH row
execute FUNCTION log_permission_changes ();

create view public.user_permissions_summary as
select
  up.id,
  up.full_name,
  up.email,
  up.role,
  up.is_super_admin,
  up.is_active,
  up.created_at,
  array_agg(distinct uper.permission_id) filter (
    where
      uper.permission_id is not null
      and uper.is_active = true
      and (
        uper.expires_at is null
        or uper.expires_at > CURRENT_TIMESTAMP
      )
  ) as direct_permissions,
  count(distinct p.id) filter (
    where
      uper.is_active = true
      and (
        uper.expires_at is null
        or uper.expires_at > CURRENT_TIMESTAMP
      )
  ) as active_permission_count
from
  user_profiles up
  left join user_permissions uper on up.id = uper.user_id
  left join permissions p on uper.permission_id = p.id
where
  up.is_super_admin = true
  or up.role = 'admin'::user_role
group by
  up.id,
  up.full_name,
  up.email,
  up.role,
  up.is_super_admin,
  up.is_active,
  up.created_at
order by
  up.full_name;

create table public.user_profiles (
  id uuid not null,
  full_name character varying(100) not null,
  mobile_number character varying(20) not null,
  date_of_birth date not null,
  role public.user_role not null default 'customer'::user_role,
  accepted_terms boolean not null default false,
  agent_discount numeric(5, 2) null,
  credit_ceiling numeric(10, 2) null,
  free_tickets_remaining integer null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  credit_balance numeric(10, 2) null default 0,
  free_tickets_allocation integer null default 0,
  preferred_language character varying(5) null default 'en'::character varying,
  text_direction character varying(3) null default 'ltr'::character varying,
  email character varying(255) null,
  is_super_admin boolean not null default false,
  last_login timestamp with time zone null,
  status character varying(20) null default 'active'::character varying,
  status_reason text null,
  status_updated_at timestamp with time zone null default now(),
  status_updated_by uuid null,
  constraint user_profiles_pkey primary key (id),
  constraint user_profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint user_profiles_status_updated_by_fkey foreign KEY (status_updated_by) references user_profiles (id),
  constraint chk_agent_discount_range check (
    (
      (agent_discount is null)
      or (
        (agent_discount >= (0)::numeric)
        and (agent_discount <= (100)::numeric)
      )
    )
  ),
  constraint chk_credit_balance_valid check (
    (
      (credit_balance is null)
      or (credit_balance >= (0)::numeric)
    )
  ),
  constraint user_profiles_status_check check (
    (
      (status)::text = any (
        array[
          ('active'::character varying)::text,
          ('inactive'::character varying)::text,
          ('suspended'::character varying)::text,
          ('blocked'::character varying)::text
        ]
      )
    )
  ),
  constraint chk_credit_ceiling_valid check (
    (
      (credit_ceiling is null)
      or (credit_ceiling >= (0)::numeric)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_user_profiles_active_role_updated on public.user_profiles using btree (is_active, role, updated_at) TABLESPACE pg_default;

create index IF not exists idx_user_profiles_email on public.user_profiles using btree (email) TABLESPACE pg_default
where
  (email is not null);

create index IF not exists idx_user_profiles_full_name on public.user_profiles using btree (full_name) TABLESPACE pg_default;

create index IF not exists idx_user_profiles_last_login on public.user_profiles using btree (last_login) TABLESPACE pg_default
where
  (last_login is not null);

create index IF not exists idx_user_profiles_role on public.user_profiles using btree (role) TABLESPACE pg_default;

create index IF not exists idx_user_profiles_role_active on public.user_profiles using btree (role, is_active) TABLESPACE pg_default
where
  (
    role = any (array['agent'::user_role, 'customer'::user_role])
  );

create index IF not exists idx_user_profiles_role_active_created on public.user_profiles using btree (role, is_active, created_at) TABLESPACE pg_default;

create index IF not exists idx_user_profiles_role_agent on public.user_profiles using btree (id) TABLESPACE pg_default
where
  (role = 'agent'::user_role);

create index IF not exists idx_user_profiles_role_captain on public.user_profiles using btree (role, is_active) TABLESPACE pg_default
where
  (role = 'captain'::user_role);

create index IF not exists idx_user_profiles_role_created_at on public.user_profiles using btree (role, created_at) TABLESPACE pg_default;

create index IF not exists idx_user_profiles_super_admin on public.user_profiles using btree (is_super_admin, is_active) TABLESPACE pg_default;

create trigger audit_user_profiles_trigger
after INSERT
or DELETE
or
update on user_profiles for EACH row
execute FUNCTION enhanced_audit_trigger ();

create trigger trg_update_user_profile_timestamp BEFORE
update on user_profiles for EACH row
execute FUNCTION update_user_profile_timestamp ();

create trigger update_user_profiles_status_timestamp BEFORE
update on user_profiles for EACH row
execute FUNCTION update_status_timestamp ();
create view public.vessel_details_view as
select
  v.id,
  v.name,
  v.make,
  v.model,
  v.seating_capacity,
  v.is_active,
  v.created_at,
  v.status,
  v.vessel_type,
  v.registration_number,
  v.captain_name,
  v.contact_number,
  v.maintenance_schedule,
  v.last_maintenance_date,
  v.next_maintenance_date,
  v.insurance_expiry_date,
  v.license_expiry_date,
  v.max_speed,
  v.fuel_capacity,
  v.description,
  v.notes,
  v.updated_at,
  vs.total_seats,
  vs.active_seats,
  vs.disabled_seats,
  vs.premium_seats,
  vs.crew_seats,
  vs.window_seats,
  vs.aisle_seats,
  vs.utilization_rate,
  vs.revenue_potential,
  get_vessel_seat_layout (v.id) as seat_layout_data
from
  vessels v
  left join vessel_seats_view vs on v.id = vs.vessel_id;

create view public.vessel_seats_view as
select
  vessel_id,
  count(*) as total_seats,
  count(*) filter (
    where
      is_disabled = false
  ) as active_seats,
  count(*) filter (
    where
      is_disabled = true
  ) as disabled_seats,
  count(*) filter (
    where
      is_premium = true
  ) as premium_seats,
  count(*) filter (
    where
      seat_type::text = 'crew'::text
  ) as crew_seats,
  count(*) filter (
    where
      is_window = true
  ) as window_seats,
  count(*) filter (
    where
      is_aisle = true
  ) as aisle_seats,
  round(
    count(*) filter (
      where
        is_disabled = false
    )::numeric / count(*)::numeric * 100::numeric,
    2
  ) as utilization_rate,
  round(
    avg(price_multiplier) * count(*) filter (
      where
        is_disabled = false
    )::numeric,
    2
  ) as revenue_potential
from
  seats
group by
  vessel_id;

create table public.vessel_tracking (
  id uuid not null default gen_random_uuid (),
  vessel_id uuid not null,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  heading numeric(5, 2) null,
  speed numeric(5, 2) null,
  recorded_at timestamp with time zone not null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint vessel_tracking_pkey primary key (id),
  constraint vessel_tracking_vessel_id_fkey foreign KEY (vessel_id) references vessels (id)
) TABLESPACE pg_default;

create view public.vessel_utilization_view as
select
  v.id,
  v.name,
  v.make,
  v.model,
  v.seating_capacity,
  v.status,
  v.is_active,
  COALESCE(today_stats.trips_today, 0::bigint) as trips_today,
  COALESCE(week_stats.trips_next_7_days, 0::bigint) as trips_next_7_days,
  COALESCE(month_stats.trips_last_30_days, 0::bigint) as trips_last_30_days,
  COALESCE(month_stats.revenue_30d, 0::numeric) as revenue_30d,
  case
    when not v.is_active then 'inactive'::text
    when COALESCE(today_stats.trips_today, 0::bigint) = 0
    and COALESCE(week_stats.trips_next_7_days, 0::bigint) = 0 then 'idle'::text
    when COALESCE(today_stats.trips_today, 0::bigint) > 0 then 'active_today'::text
    when COALESCE(week_stats.trips_next_7_days, 0::bigint) > 0 then 'scheduled'::text
    else 'idle'::text
  end as utilization_status
from
  vessels v
  left join (
    select
      trips.vessel_id,
      count(*) as trips_today
    from
      trips
    where
      trips.travel_date = CURRENT_DATE
      and trips.is_active = true
    group by
      trips.vessel_id
  ) today_stats on v.id = today_stats.vessel_id
  left join (
    select
      trips.vessel_id,
      count(*) as trips_next_7_days
    from
      trips
    where
      trips.travel_date >= CURRENT_DATE
      and trips.travel_date <= (CURRENT_DATE + '7 days'::interval)
      and trips.is_active = true
    group by
      trips.vessel_id
  ) week_stats on v.id = week_stats.vessel_id
  left join (
    select
      t.vessel_id,
      count(*) as trips_last_30_days,
      sum(COALESCE(b.total_fare, 0::numeric)) as revenue_30d
    from
      trips t
      left join bookings b on t.id = b.trip_id
      and b.status = 'confirmed'::booking_status
    where
      t.travel_date >= (CURRENT_DATE - '30 days'::interval)
      and t.is_active = true
    group by
      t.vessel_id
  ) month_stats on v.id = month_stats.vessel_id;

create table public.vessels (
  id uuid not null default gen_random_uuid (),
  name character varying(100) not null,
  seating_capacity integer not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  status character varying(20) null default 'active'::character varying,
  vessel_type character varying(20) null default 'passenger'::character varying,
  registration_number character varying(50) null,
  captain_name character varying(100) null,
  contact_number character varying(20) null,
  maintenance_schedule text null,
  last_maintenance_date date null,
  next_maintenance_date date null,
  insurance_expiry_date date null,
  license_expiry_date date null,
  max_speed integer null,
  fuel_capacity integer null,
  description text null,
  notes text null,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  make character varying(100) null,
  model character varying(100) null,
  constraint vessels_pkey primary key (id),
  constraint vessels_name_key unique (name),
  constraint chk_vessel_capacity_positive check ((seating_capacity > 0)),
  constraint chk_vessel_status check (
    (
      (status)::text = any (
        array[
          ('active'::character varying)::text,
          ('maintenance'::character varying)::text,
          ('inactive'::character varying)::text
        ]
      )
    )
  ),
  constraint chk_vessel_type check (
    (
      (vessel_type)::text = any (
        array[
          ('passenger'::character varying)::text,
          ('cargo'::character varying)::text,
          ('mixed'::character varying)::text,
          ('luxury'::character varying)::text,
          ('speedboat'::character varying)::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_vessels_active on public.vessels using btree (is_active) TABLESPACE pg_default;

create index IF not exists idx_vessels_active_only on public.vessels using btree (id, name, seating_capacity) TABLESPACE pg_default
where
  (is_active = true);

create index IF not exists idx_vessels_captain on public.vessels using btree (captain_name) TABLESPACE pg_default;

create index IF not exists idx_vessels_expiry_dates on public.vessels using btree (insurance_expiry_date, license_expiry_date) TABLESPACE pg_default;

create index IF not exists idx_vessels_insurance on public.vessels using btree (insurance_expiry_date) TABLESPACE pg_default;

create index IF not exists idx_vessels_license on public.vessels using btree (license_expiry_date) TABLESPACE pg_default;

create index IF not exists idx_vessels_maintenance on public.vessels using btree (last_maintenance_date, next_maintenance_date) TABLESPACE pg_default;

create index IF not exists idx_vessels_maintenance_dates on public.vessels using btree (last_maintenance_date, next_maintenance_date) TABLESPACE pg_default;

create index IF not exists idx_vessels_make on public.vessels using btree (make) TABLESPACE pg_default;

create index IF not exists idx_vessels_make_model on public.vessels using btree (make, model) TABLESPACE pg_default;

create index IF not exists idx_vessels_model on public.vessels using btree (model) TABLESPACE pg_default;

create index IF not exists idx_vessels_registration on public.vessels using btree (registration_number) TABLESPACE pg_default;

create index IF not exists idx_vessels_status on public.vessels using btree (status) TABLESPACE pg_default;

create index IF not exists idx_vessels_status_active on public.vessels using btree (status, is_active) TABLESPACE pg_default;

create index IF not exists idx_vessels_type on public.vessels using btree (vessel_type) TABLESPACE pg_default;

create index IF not exists idx_vessels_type_status on public.vessels using btree (vessel_type, status) TABLESPACE pg_default;

create trigger audit_vessels_trigger
after INSERT
or DELETE
or
update on vessels for EACH row
execute FUNCTION enhanced_audit_trigger ();

create trigger create_vessel_layout_trigger
after INSERT on vessels for EACH row
execute FUNCTION create_vessel_default_layout ();

create trigger vessels_updated_at_trigger BEFORE
update on vessels for EACH row
execute FUNCTION update_vessel_updated_at ();

create table public.view_performance_metrics (
  id uuid not null default gen_random_uuid (),
  view_name character varying(100) not null,
  query_duration_ms integer null,
  rows_returned integer null,
  query_timestamp timestamp with time zone null default CURRENT_TIMESTAMP,
  query_plan_hash character varying(100) null,
  constraint view_performance_metrics_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_view_performance_view_time on public.view_performance_metrics using btree (view_name, query_timestamp) TABLESPACE pg_default;

create table public.wallet_transactions (
  id uuid not null default gen_random_uuid (),
  wallet_id uuid not null,
  amount numeric(10, 2) not null,
  transaction_type character varying(20) not null,
  reference_id character varying(255) null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  user_id uuid null,
  user_name text null,
  status character varying(20) null default 'completed'::character varying,
  description text null,
  constraint wallet_transactions_pkey primary key (id),
  constraint wallet_transactions_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete set null,
  constraint wallet_transactions_wallet_id_fkey foreign KEY (wallet_id) references wallets (id)
) TABLESPACE pg_default;

create index IF not exists idx_wallet_transactions_created_at on public.wallet_transactions using btree (created_at) TABLESPACE pg_default;

create index IF not exists idx_wallet_transactions_status on public.wallet_transactions using btree (status) TABLESPACE pg_default;

create index IF not exists idx_wallet_transactions_type on public.wallet_transactions using btree (transaction_type) TABLESPACE pg_default;

create index IF not exists idx_wallet_transactions_user_id on public.wallet_transactions using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_wallet_transactions_wallet_id on public.wallet_transactions using btree (wallet_id) TABLESPACE pg_default;

create table public.wallets (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  balance numeric(10, 2) not null default 0,
  currency character varying(3) not null default 'MVR'::character varying,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint wallets_pkey primary key (id),
  constraint wallets_user_id_key unique (user_id),
  constraint wallets_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

create index IF not exists idx_wallets_balance on public.wallets using btree (balance) TABLESPACE pg_default;

create index IF not exists idx_wallets_created_at on public.wallets using btree (created_at) TABLESPACE pg_default;

create index IF not exists idx_wallets_user_id on public.wallets using btree (user_id) TABLESPACE pg_default;

create table public.zone_activity_logs (
  id uuid not null default gen_random_uuid (),
  zone_id uuid not null,
  action character varying(50) not null,
  old_values jsonb null,
  new_values jsonb null,
  user_id uuid null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint zone_activity_logs_pkey primary key (id),
  constraint zone_activity_logs_user_id_fkey foreign KEY (user_id) references user_profiles (id),
  constraint zone_activity_logs_zone_id_fkey foreign KEY (zone_id) references zones (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_zone_activity_logs_created_at on public.zone_activity_logs using btree (created_at) TABLESPACE pg_default;

create index IF not exists idx_zone_activity_logs_zone_id on public.zone_activity_logs using btree (zone_id) TABLESPACE pg_default;

create view public.zone_detailed_stats_view as
with
  zone_islands as (
    select
      z_1.id as zone_id,
      count(i.id) as total_islands,
      count(
        case
          when i.is_active = true then 1
          else null::integer
        end
      ) as active_islands,
      string_agg(
        i.name::text,
        ', '::text
        order by
          (i.name::text)
      ) as island_names
    from
      zones z_1
      left join islands i on z_1.id = i.zone_id
    group by
      z_1.id
  ),
  zone_routes as (
    select
      z_1.id as zone_id,
      count(distinct r.id) as total_routes,
      count(
        distinct case
          when r.is_active = true then r.id
          else null::uuid
        end
      ) as active_routes,
      sum(distinct r.base_fare) as total_base_fare,
      avg(distinct r.base_fare) as avg_base_fare
    from
      zones z_1
      left join islands i on z_1.id = i.zone_id
      left join routes r on i.id = r.from_island_id
      or i.id = r.to_island_id
    group by
      z_1.id
  ),
  zone_trips as (
    select
      z_1.id as zone_id,
      count(distinct t.id) as total_trips_30d,
      count(
        distinct case
          when t.travel_date >= (CURRENT_DATE - '7 days'::interval) then t.id
          else null::uuid
        end
      ) as trips_7d,
      count(
        distinct case
          when t.travel_date = CURRENT_DATE then t.id
          else null::uuid
        end
      ) as trips_today
    from
      zones z_1
      left join islands i on z_1.id = i.zone_id
      left join routes r on i.id = r.from_island_id
      or i.id = r.to_island_id
      left join trips t on r.id = t.route_id
      and t.travel_date >= (CURRENT_DATE - '30 days'::interval)
    group by
      z_1.id
  ),
  zone_bookings as (
    select
      z_1.id as zone_id,
      count(distinct b.id) as total_bookings_30d,
      count(
        distinct case
          when b.status = 'confirmed'::booking_status then b.id
          else null::uuid
        end
      ) as confirmed_bookings_30d,
      COALESCE(
        sum(
          case
            when b.status = 'confirmed'::booking_status then b.total_fare
            else 0::numeric
          end
        ),
        0::numeric
      ) as total_revenue_30d
    from
      zones z_1
      left join islands i on z_1.id = i.zone_id
      left join routes r on i.id = r.from_island_id
      or i.id = r.to_island_id
      left join trips t on r.id = t.route_id
      left join bookings b on t.id = b.trip_id
      and b.created_at >= (CURRENT_DATE - '30 days'::interval)
    group by
      z_1.id
  )
select
  z.id,
  z.name,
  z.code,
  z.description,
  z.is_active,
  z.order_index,
  z.created_at,
  z.updated_at,
  COALESCE(zi.total_islands, 0::bigint) as total_islands,
  COALESCE(zi.active_islands, 0::bigint) as active_islands,
  COALESCE(zi.island_names, ''::text) as island_names,
  COALESCE(zr.total_routes, 0::bigint) as total_routes,
  COALESCE(zr.active_routes, 0::bigint) as active_routes,
  COALESCE(zr.avg_base_fare, 0::numeric) as avg_base_fare,
  COALESCE(zt.total_trips_30d, 0::bigint) as total_trips_30d,
  COALESCE(zt.trips_7d, 0::bigint) as trips_7d,
  COALESCE(zt.trips_today, 0::bigint) as trips_today,
  COALESCE(zb.total_bookings_30d, 0::bigint) as total_bookings_30d,
  COALESCE(zb.confirmed_bookings_30d, 0::bigint) as confirmed_bookings_30d,
  COALESCE(zb.total_revenue_30d, 0::numeric) as total_revenue_30d,
  round(
    case
      when COALESCE(zb.total_bookings_30d, 0::bigint) > 0 then COALESCE(zb.confirmed_bookings_30d, 0::bigint)::numeric / zb.total_bookings_30d::numeric * 100::numeric
      else 0::numeric
    end,
    2
  ) as booking_conversion_rate_30d
from
  zones z
  left join zone_islands zi on z.id = zi.zone_id
  left join zone_routes zr on z.id = zr.zone_id
  left join zone_trips zt on z.id = zt.zone_id
  left join zone_bookings zb on z.id = zb.zone_id
order by
  z.order_index,
  z.name;

create view public.zone_management_summary as
select
  count(*) as total_zones,
  count(
    case
      when is_active then 1
      else null::integer
    end
  ) as active_zones,
  count(
    case
      when not is_active then 1
      else null::integer
    end
  ) as inactive_zones,
  sum(total_islands) as total_islands_across_zones,
  sum(active_islands) as active_islands_across_zones,
  sum(total_routes) as total_routes_across_zones,
  sum(active_routes) as active_routes_across_zones,
  round(avg(total_islands), 2) as avg_islands_per_zone,
  round(avg(total_routes), 2) as avg_routes_per_zone
from
  zones_stats_view;

create table public.zones (
  id uuid not null default gen_random_uuid (),
  name character varying(100) not null,
  code character varying(10) not null,
  description text null,
  is_active boolean not null default true,
  order_index integer not null default 0,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint zones_pkey primary key (id),
  constraint zones_code_key unique (code),
  constraint zones_name_key unique (name),
  constraint zones_order_index_positive check ((order_index >= 0))
) TABLESPACE pg_default;

create index IF not exists idx_zones_active on public.zones using btree (is_active) TABLESPACE pg_default;

create index IF not exists idx_zones_code on public.zones using btree (code) TABLESPACE pg_default;

create index IF not exists idx_zones_name on public.zones using btree (name) TABLESPACE pg_default;

create index IF not exists idx_zones_order on public.zones using btree (order_index) TABLESPACE pg_default;

create trigger audit_zones_trigger
after INSERT
or DELETE
or
update on zones for EACH row
execute FUNCTION enhanced_audit_trigger ();

create trigger trigger_compact_zones
after DELETE on zones for EACH row
execute FUNCTION compact_zone_order ();

create trigger trigger_reorder_zones_insert BEFORE INSERT on zones for EACH row
execute FUNCTION reorder_zones_on_insert ();

create trigger zones_activity_trigger
after INSERT
or DELETE
or
update on zones for EACH row
execute FUNCTION log_zone_activity ();

create trigger zones_updated_at_trigger BEFORE
update on zones for EACH row
execute FUNCTION update_zones_updated_at ();

create trigger trigger_reorder_zones_update BEFORE
update OF order_index on zones for EACH row when (old.order_index is distinct from new.order_index)
execute FUNCTION reorder_zones_on_insert ();

create view public.zones_stats_view as
with
  zone_islands as (
    select
      z_1.id as zone_id,
      count(i.id) as total_islands,
      count(
        case
          when i.is_active = true then 1
          else null::integer
        end
      ) as active_islands
    from
      zones z_1
      left join islands i on z_1.id = i.zone_id
    group by
      z_1.id
  ),
  zone_routes as (
    select
      z_1.id as zone_id,
      count(distinct r.id) as total_routes,
      count(
        distinct case
          when r.is_active = true then r.id
          else null::uuid
        end
      ) as active_routes
    from
      zones z_1
      left join islands i on z_1.id = i.zone_id
      left join routes r on i.id = r.from_island_id
      or i.id = r.to_island_id
    group by
      z_1.id
  )
select
  z.id,
  z.name,
  z.code,
  z.description,
  z.is_active,
  z.order_index,
  z.created_at,
  z.updated_at,
  COALESCE(zi.total_islands, 0::bigint) as total_islands,
  COALESCE(zi.active_islands, 0::bigint) as active_islands,
  COALESCE(zr.total_routes, 0::bigint) as total_routes,
  COALESCE(zr.active_routes, 0::bigint) as active_routes
from
  zones z
  left join zone_islands zi on z.id = zi.zone_id
  left join zone_routes zr on z.id = zr.zone_id
order by
  z.order_index,
  z.name;


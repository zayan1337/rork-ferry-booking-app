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

create index IF not exists idx_activity_logs_user_id on public.activity_logs using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_activity_logs_created_at on public.activity_logs using btree (created_at) TABLESPACE pg_default;

create index IF not exists idx_activity_logs_user_action_date on public.activity_logs using btree (user_id, action, created_at) TABLESPACE pg_default;

create index IF not exists idx_activity_logs_entity on public.activity_logs using btree (entity_type, entity_id) TABLESPACE pg_default
where
  (entity_type is not null);

create index IF not exists idx_activity_logs_action_date on public.activity_logs using btree (action, created_at) TABLESPACE pg_default;

create index IF not exists idx_activity_logs_session on public.activity_logs using btree (session_id) TABLESPACE pg_default
where
  (session_id is not null);

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
  p.status as payment_status,
  p.amount as payment_amount,
  p.payment_method
from
  bookings b
  left join user_profiles up on b.user_id = up.id
  left join trips t on b.trip_id = t.id
  left join vessels v on t.vessel_id = v.id
  left join routes r on t.route_id = r.id
  left join islands i1 on r.from_island_id = i1.id
  left join islands i2 on r.to_island_id = i2.id
  left join user_profiles agent on b.agent_id = agent.id
  left join payments p on b.id = p.booking_id;


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

create index IF not exists idx_admin_notifications_recipient_unread on public.admin_notifications using btree (recipient_id, is_read, created_at) TABLESPACE pg_default;

create index IF not exists idx_admin_notifications_role_unread on public.admin_notifications using btree (recipient_role, is_read, created_at) TABLESPACE pg_default
where
  (recipient_role is not null);

create index IF not exists idx_admin_notifications_priority on public.admin_notifications using btree (priority, created_at) TABLESPACE pg_default
where
  (is_read = false);


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

create view public.admin_users_view as
select
  up.id,
  up.email,
  up.full_name,
  up.mobile_number,
  up.date_of_birth,
  up.role,
  up.is_active,
  up.is_super_admin,
  up.created_at,
  up.updated_at,
  COALESCE(user_stats.total_bookings, 0::bigint) as total_bookings,
  COALESCE(user_stats.confirmed_bookings, 0::bigint) as confirmed_bookings,
  COALESCE(user_stats.cancelled_bookings, 0::bigint) as cancelled_bookings,
  COALESCE(user_stats.total_spent, 0::numeric) as total_spent,
  user_stats.last_booking_date,
  case
    when up.role = 'agent'::user_role then COALESCE(agent_stats.agent_bookings, 0::bigint)
    else 0::bigint
  end as agent_bookings,
  case
    when up.role = 'agent'::user_role then COALESCE(agent_stats.agent_revenue, 0::numeric)
    else 0::numeric
  end as agent_revenue,
  case
    when user_stats.last_booking_date >= (CURRENT_DATE - '30 days'::interval) then true
    else false
  end as is_recently_active
from
  user_profiles up
  left join (
    select
      bookings.user_id,
      count(*) as total_bookings,
      count(
        case
          when bookings.status = 'confirmed'::booking_status then 1
          else null::integer
        end
      ) as confirmed_bookings,
      count(
        case
          when bookings.status = 'cancelled'::booking_status then 1
          else null::integer
        end
      ) as cancelled_bookings,
      sum(
        case
          when bookings.status = 'confirmed'::booking_status then bookings.total_fare
          else 0::numeric
        end
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
      sum(
        case
          when bookings.status = 'confirmed'::booking_status then bookings.total_fare
          else 0::numeric
        end
      ) as agent_revenue
    from
      bookings
    where
      bookings.agent_id is not null
    group by
      bookings.agent_id
  ) agent_stats on up.id = agent_stats.agent_id;


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

create index IF not exists idx_agent_clients_agent_id on public.agent_clients using btree (agent_id) TABLESPACE pg_default;

create index IF not exists idx_agent_clients_agent_email on public.agent_clients using btree (agent_id, email) TABLESPACE pg_default;

create unique INDEX IF not exists idx_agent_client_with_account on public.agent_clients using btree (agent_id, client_id) TABLESPACE pg_default
where
  (client_id is not null);

create unique INDEX IF not exists idx_agent_client_without_account on public.agent_clients using btree (agent_id, email) TABLESPACE pg_default
where
  (client_id is null);



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
  constraint bookings_pkey primary key (id),
  constraint bookings_booking_number_key unique (booking_number),
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

create index IF not exists idx_bookings_user_id on public.bookings using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_bookings_status on public.bookings using btree (status) TABLESPACE pg_default;

create index IF not exists idx_bookings_status_trip on public.bookings using btree (status, trip_id) TABLESPACE pg_default;

create index IF not exists idx_bookings_trip_status on public.bookings using btree (trip_id, status) TABLESPACE pg_default;

create index IF not exists idx_bookings_agent_id on public.bookings using btree (agent_id) TABLESPACE pg_default
where
  (agent_id is not null);

create index IF not exists idx_bookings_agent_client_id on public.bookings using btree (agent_client_id) TABLESPACE pg_default
where
  (agent_client_id is not null);

create index IF not exists idx_bookings_created_at_status on public.bookings using btree (created_at, status) TABLESPACE pg_default;

create index IF not exists idx_bookings_agent_created_at on public.bookings using btree (agent_id, created_at) TABLESPACE pg_default
where
  (agent_id is not null);

create index IF not exists idx_bookings_status_trip_travel on public.bookings using btree (status, trip_id) TABLESPACE pg_default;

create index IF not exists idx_bookings_user_status_date on public.bookings using btree (user_id, status, created_at) TABLESPACE pg_default;

create index IF not exists idx_bookings_agent_user on public.bookings using btree (agent_id, user_id) TABLESPACE pg_default;

create index IF not exists idx_bookings_return_booking_id on public.bookings using btree (return_booking_id) TABLESPACE pg_default
where
  (return_booking_id is not null);

create index IF not exists idx_bookings_round_trip_group on public.bookings using btree (round_trip_group_id) TABLESPACE pg_default
where
  (round_trip_group_id is not null);

create trigger audit_bookings_trigger
after INSERT
or DELETE
or
update on bookings for EACH row
execute FUNCTION enhanced_audit_trigger ();

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

create trigger trg_update_trip_available_seats_bookings
after INSERT
or DELETE
or
update OF status on bookings for EACH row
execute FUNCTION update_trip_available_seats ();

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


create table public.faq_categories (
  id uuid not null default gen_random_uuid (),
  name character varying(100) not null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint faq_categories_pkey primary key (id),
  constraint faq_categories_name_key unique (name)
) TABLESPACE pg_default;

create table public.faqs (
  id uuid not null default gen_random_uuid (),
  category_id uuid not null,
  question text not null,
  answer text not null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint faqs_pkey primary key (id),
  constraint faqs_category_id_fkey foreign KEY (category_id) references faq_categories (id)
) TABLESPACE pg_default;

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

create index IF not exists idx_islands_zone_id on public.islands using btree (zone_id) TABLESPACE pg_default;

create table public.manifest_passengers (
  id uuid not null default gen_random_uuid (),
  manifest_id uuid not null,
  passenger_id uuid not null,
  seat_number character varying(10) not null,
  boarding_location character varying(100) not null,
  destination character varying(100) not null,
  check_in_time timestamp with time zone not null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint manifest_passengers_pkey primary key (id),
  constraint unique_manifest_passenger unique (manifest_id, passenger_id),
  constraint manifest_passengers_manifest_id_fkey foreign KEY (manifest_id) references passenger_manifests (id),
  constraint manifest_passengers_passenger_id_fkey foreign KEY (passenger_id) references passengers (id)
) TABLESPACE pg_default;

create index IF not exists idx_manifest_passengers_manifest_id on public.manifest_passengers using btree (manifest_id) TABLESPACE pg_default;

create table public.manifest_shares (
  id uuid not null default gen_random_uuid (),
  manifest_id uuid not null,
  email_address character varying(100) null,
  phone_number character varying(20) null,
  share_time timestamp with time zone not null default CURRENT_TIMESTAMP,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint manifest_shares_pkey primary key (id),
  constraint manifest_shares_manifest_id_fkey foreign KEY (manifest_id) references passenger_manifests (id)
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
  ) as completed_trips_today,
  (
    select
      count(*) as count
    from
      bookings b
      join trips t on b.trip_id = t.id
    where
      t.travel_date = CURRENT_DATE
  ) as today_bookings,
  (
    select
      count(*) as count
    from
      bookings b
      join trips t on b.trip_id = t.id
    where
      t.travel_date = CURRENT_DATE
      and b.status = 'confirmed'::booking_status
  ) as confirmed_bookings_today,
  (
    select
      COALESCE(sum(b.total_fare), 0::numeric) as "coalesce"
    from
      bookings b
      join trips t on b.trip_id = t.id
    where
      t.travel_date = CURRENT_DATE
      and b.status = 'confirmed'::booking_status
  ) as today_revenue,
  (
    select
      COALESCE(sum(b.total_fare), 0::numeric) as "coalesce"
    from
      bookings b
      join trips t on b.trip_id = t.id
    where
      t.travel_date >= (CURRENT_DATE - '30 days'::interval)
      and b.status = 'confirmed'::booking_status
  ) as revenue_30d;

create view public.operations_trips_view as
select
  t.id,
  t.route_id,
  t.vessel_id,
  t.travel_date,
  t.departure_time,
  t.available_seats,
  t.is_active,
  t.created_at,
  case
    when t.travel_date < CURRENT_DATE then 'completed'::text
    when t.travel_date = CURRENT_DATE
    and t.departure_time::time with time zone < CURRENT_TIME then 'departed'::text
    when t.travel_date = CURRENT_DATE
    and t.departure_time::time with time zone <= (CURRENT_TIME + '00:30:00'::interval) then 'boarding'::text
    when t.travel_date = CURRENT_DATE then 'scheduled'::text
    else 'scheduled'::text
  end as computed_status,
  r.base_fare,
  concat(oi.name, ' to ', di.name) as route_name,
  oi.name as from_island_name,
  di.name as to_island_name,
  v.name as vessel_name,
  v.seating_capacity as capacity,
  COALESCE(booking_stats.total_bookings, 0::bigint) as bookings,
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
      bookings.trip_id,
      count(*) as total_bookings,
      count(
        case
          when bookings.status = any (
            array[
              'confirmed'::booking_status,
              'checked_in'::booking_status
            ]
          ) then 1
          else null::integer
        end
      ) as confirmed_bookings
    from
      bookings
    group by
      bookings.trip_id
  ) booking_stats on t.id = booking_stats.trip_id;

create view public.operations_vessels_view as
select
  v.id,
  v.name,
  v.seating_capacity,
  v.is_active,
  v.created_at,
  case
    when current_trip.trip_id is not null then 'in_service'::text
    when not v.is_active then 'maintenance'::text
    else 'available'::text
  end as status,
  COALESCE(vessel_stats.total_trips_30d, 0::bigint) as total_trips_30d,
  COALESCE(vessel_stats.capacity_utilization_30d, 0::numeric) as capacity_utilization_30d,
  COALESCE(vessel_stats.total_revenue_30d, 0::numeric) as total_revenue_30d,
  COALESCE(vessel_stats.avg_passengers_per_trip, 0::numeric) as avg_passengers_per_trip,
  current_trip.current_route,
  current_trip.next_departure
from
  vessels v
  left join (
    select
      t.vessel_id,
      count(t.id) as total_trips_30d,
      round(
        avg(
          case
            when v2.seating_capacity > 0 then booking_counts.confirmed_bookings::numeric * 100.0 / v2.seating_capacity::numeric
            else 0::numeric
          end
        ),
        2
      ) as capacity_utilization_30d,
      sum(booking_counts.revenue) as total_revenue_30d,
      round(avg(booking_counts.confirmed_bookings), 2) as avg_passengers_per_trip
    from
      trips t
      left join vessels v2 on t.vessel_id = v2.id
      left join (
        select
          bookings.trip_id,
          count(
            case
              when bookings.status = any (
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
              when bookings.status = 'confirmed'::booking_status then bookings.total_fare
              else 0::numeric
            end
          ) as revenue
        from
          bookings
        group by
          bookings.trip_id
      ) booking_counts on t.id = booking_counts.trip_id
    where
      t.travel_date >= (CURRENT_DATE - '30 days'::interval)
    group by
      t.vessel_id
  ) vessel_stats on v.id = vessel_stats.vessel_id
  left join (
    select distinct
      t.vessel_id,
      t.id as trip_id,
      concat(oi.name, ' to ', di.name) as current_route,
      min(t.departure_time) as next_departure
    from
      trips t
      left join routes r on t.route_id = r.id
      left join islands oi on r.from_island_id = oi.id
      left join islands di on r.to_island_id = di.id
    where
      t.travel_date = CURRENT_DATE
      and t.departure_time::time with time zone >= CURRENT_TIME
    group by
      t.vessel_id,
      t.id,
      oi.name,
      di.name
  ) current_trip on v.id = current_trip.vessel_id;

create table public.passenger_manifests (
  id uuid not null default gen_random_uuid (),
  trip_id uuid not null,
  scheduled_departure_time timestamp with time zone not null,
  actual_departure_time timestamp with time zone null,
  status public.manifest_status not null default 'in_progress'::manifest_status,
  passenger_count integer not null default 0,
  captain_confirmed boolean not null default false,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint passenger_manifests_pkey primary key (id),
  constraint passenger_manifests_trip_id_fkey foreign KEY (trip_id) references trips (id)
) TABLESPACE pg_default;

create table public.passengers (
  id uuid not null default gen_random_uuid (),
  booking_id uuid not null,
  seat_id uuid not null,
  passenger_name character varying(100) not null,
  passenger_contact_number character varying(20) not null,
  special_assistance_request text null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint passengers_pkey primary key (id),
  constraint unique_booking_seat unique (booking_id, seat_id),
  constraint passengers_booking_id_fkey foreign KEY (booking_id) references bookings (id),
  constraint passengers_seat_id_fkey foreign KEY (seat_id) references seats (id)
) TABLESPACE pg_default;

create index IF not exists idx_passengers_booking_id on public.passengers using btree (booking_id) TABLESPACE pg_default;

create trigger trg_update_trip_available_seats_passengers
after INSERT
or DELETE on passengers for EACH row
execute FUNCTION update_trip_available_seats ();

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
  constraint payments_pkey primary key (id),
  constraint payments_receipt_number_key unique (receipt_number),
  constraint payments_booking_id_fkey foreign KEY (booking_id) references bookings (id)
) TABLESPACE pg_default;

create index IF not exists idx_payments_booking_id on public.payments using btree (booking_id) TABLESPACE pg_default;

create index IF not exists idx_payments_status_created_at on public.payments using btree (status, created_at) TABLESPACE pg_default;

create index IF not exists idx_payments_booking_status_date on public.payments using btree (booking_id, status, created_at) TABLESPACE pg_default;

create table public.permissions (
  id uuid not null default gen_random_uuid (),
  name character varying(100) not null,
  description text null,
  resource character varying(50) not null,
  action character varying(50) not null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint permissions_pkey primary key (id),
  constraint permissions_name_key unique (name)
) TABLESPACE pg_default;

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
  constraint promotions_pkey primary key (id)
) TABLESPACE pg_default;

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


create table public.role_permissions (
  id uuid not null default gen_random_uuid (),
  role public.user_role not null,
  permission_id uuid not null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint role_permissions_pkey primary key (id),
  constraint role_permissions_role_permission_id_key unique (role, permission_id),
  constraint role_permissions_permission_id_fkey foreign KEY (permission_id) references permissions (id) on delete CASCADE
) TABLESPACE pg_default;

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

create table public.routes (
  id uuid not null default gen_random_uuid (),
  from_island_id uuid not null,
  to_island_id uuid not null,
  base_fare numeric(10, 2) not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  status character varying(20) null default 'active'::character varying,
  name character varying(255) null,
  distance character varying(50) null,
  duration character varying(50) null,
  description text null,
  constraint routes_pkey primary key (id),
  constraint unique_route_islands unique (from_island_id, to_island_id),
  constraint routes_from_island_id_fkey foreign KEY (from_island_id) references islands (id),
  constraint routes_to_island_id_fkey foreign KEY (to_island_id) references islands (id),
  constraint chk_route_fare_positive check ((base_fare >= (0)::numeric)),
  constraint different_islands check ((from_island_id <> to_island_id))
) TABLESPACE pg_default;

create index IF not exists idx_routes_status on public.routes using btree (status) TABLESPACE pg_default;

create index IF not exists idx_routes_active on public.routes using btree (is_active) TABLESPACE pg_default;

create index IF not exists idx_routes_name on public.routes using btree (name) TABLESPACE pg_default;

create index IF not exists idx_routes_from_to on public.routes using btree (from_island_id, to_island_id) TABLESPACE pg_default;

create trigger audit_routes_trigger
after INSERT
or DELETE
or
update on routes for EACH row
execute FUNCTION enhanced_audit_trigger ();

create trigger trigger_set_route_name BEFORE INSERT
or
update on routes for EACH row
execute FUNCTION set_route_name ();


create table public.seat_reservations (
  id uuid not null default gen_random_uuid (),
  trip_id uuid not null,
  seat_id uuid not null,
  booking_id uuid null,
  is_available boolean not null default true,
  is_reserved boolean not null default false,
  reservation_expiry timestamp with time zone null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint seat_reservations_pkey primary key (id),
  constraint unique_trip_seat unique (trip_id, seat_id),
  constraint seat_reservations_booking_id_fkey foreign KEY (booking_id) references bookings (id),
  constraint seat_reservations_seat_id_fkey foreign KEY (seat_id) references seats (id),
  constraint seat_reservations_trip_id_fkey foreign KEY (trip_id) references trips (id)
) TABLESPACE pg_default;

create index IF not exists idx_seat_reservations_trip_id on public.seat_reservations using btree (trip_id) TABLESPACE pg_default;

create index IF not exists idx_seat_reservations_trip_seat on public.seat_reservations using btree (trip_id, seat_id) TABLESPACE pg_default;

create index IF not exists idx_seat_reservations_trip_booking on public.seat_reservations using btree (trip_id, booking_id) TABLESPACE pg_default;

create trigger trg_update_trip_available_seats
after INSERT
or DELETE
or
update on seat_reservations for EACH row
execute FUNCTION update_trip_available_seats ();

create table public.seats (
  id uuid not null default gen_random_uuid (),
  vessel_id uuid not null,
  seat_number character varying(10) not null,
  row_number integer not null,
  is_window boolean not null default false,
  is_aisle boolean not null default false,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint seats_pkey primary key (id),
  constraint unique_seat unique (vessel_id, seat_number),
  constraint seats_vessel_id_fkey foreign KEY (vessel_id) references vessels (id)
) TABLESPACE pg_default;


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
  constraint terms_and_conditions_pkey primary key (id)
) TABLESPACE pg_default;

create view public.ticket_validation_view as
select
  b.id as booking_id,
  b.booking_number,
  b.status,
  b.check_in_status,
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
  v.name as vessel_name
from
  bookings b
  join trips t on b.trip_id = t.id
  join routes r on t.route_id = r.id
  join islands fi on r.from_island_id = fi.id
  join islands ti on r.to_island_id = ti.id
  join vessels v on t.vessel_id = v.id;

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
  t.departure_time,
  t.available_seats,
  concat(oi.name, ' to ', di.name) as route_name,
  oi.name as from_island_name,
  di.name as to_island_name,
  v.name as vessel_name,
  v.seating_capacity as capacity,
  case
    when t.departure_time::time with time zone < CURRENT_TIME then 'departed'::text
    when t.departure_time::time with time zone <= (CURRENT_TIME + '00:30:00'::interval) then 'boarding'::text
    else 'scheduled'::text
  end as status,
  COALESCE(booking_stats.confirmed_bookings, 0::bigint) as bookings
from
  trips t
  left join routes r on t.route_id = r.id
  left join islands oi on r.from_island_id = oi.id
  left join islands di on r.to_island_id = di.id
  left join vessels v on t.vessel_id = v.id
  left join (
    select
      bookings.trip_id,
      count(
        case
          when bookings.status = any (
            array[
              'confirmed'::booking_status,
              'checked_in'::booking_status
            ]
          ) then 1
          else null::integer
        end
      ) as confirmed_bookings
    from
      bookings
    group by
      bookings.trip_id
  ) booking_stats on t.id = booking_stats.trip_id
where
  t.travel_date = CURRENT_DATE
  and t.is_active = true
order by
  t.departure_time;

create table public.translations (
  id uuid not null default gen_random_uuid (),
  key character varying(255) not null,
  language_code character varying(5) not null,
  translation text not null,
  context character varying(100) null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint translations_pkey primary key (id),
  constraint unique_translation unique (key, language_code)
) TABLESPACE pg_default;

create index IF not exists idx_translations_key_lang on public.translations using btree (key, language_code) TABLESPACE pg_default;

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
  constraint trips_pkey primary key (id),
  constraint unique_trip unique (route_id, travel_date, departure_time),
  constraint trips_route_id_fkey foreign KEY (route_id) references routes (id),
  constraint trips_vessel_id_fkey foreign KEY (vessel_id) references vessels (id),
  constraint chk_trip_available_seats_valid check ((available_seats >= 0))
) TABLESPACE pg_default;

create index IF not exists idx_trips_route_id on public.trips using btree (route_id) TABLESPACE pg_default;

create index IF not exists idx_trips_travel_date on public.trips using btree (travel_date) TABLESPACE pg_default;

create index IF not exists idx_trips_status on public.trips using btree (status) TABLESPACE pg_default;

create index IF not exists idx_trips_travel_date_status on public.trips using btree (travel_date, status) TABLESPACE pg_default;

create index IF not exists idx_trips_route_vessel on public.trips using btree (route_id, vessel_id) TABLESPACE pg_default;

create index IF not exists idx_trips_travel_date_route on public.trips using btree (travel_date, route_id) TABLESPACE pg_default;

create index IF not exists idx_trips_vessel_date_status on public.trips using btree (vessel_id, travel_date, is_active) TABLESPACE pg_default;

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
  constraint user_permissions_pkey primary key (id),
  constraint user_permissions_unique_user_permission unique (user_id, permission_id),
  constraint user_permissions_granted_by_fkey foreign KEY (granted_by) references user_profiles (id),
  constraint user_permissions_permission_id_fkey foreign KEY (permission_id) references permissions (id) on delete CASCADE,
  constraint user_permissions_user_id_fkey foreign KEY (user_id) references user_profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_user_permissions_user_id on public.user_permissions using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_user_permissions_permission_id on public.user_permissions using btree (permission_id) TABLESPACE pg_default;

create index IF not exists idx_user_permissions_granted_by on public.user_permissions using btree (granted_by) TABLESPACE pg_default;

create trigger trigger_log_permission_activity
after INSERT
or DELETE on user_permissions for EACH row
execute FUNCTION log_permission_activity ();

create view public.user_permissions_view as
select
  up.id,
  up.full_name,
  up.email,
  up.role,
  up.is_super_admin,
  up.is_active,
  COALESCE(
    json_agg(
      distinct jsonb_build_object(
        'id',
        p.id,
        'name',
        p.name,
        'description',
        p.description,
        'resource',
        p.resource,
        'action',
        p.action,
        'source',
        'individual',
        'granted_by',
        granter.full_name,
        'granted_at',
        user_perms.granted_at,
        'expires_at',
        user_perms.expires_at
      )
    ) filter (
      where
        p.id is not null
    ),
    '[]'::json
  ) as individual_permissions,
  COALESCE(
    json_agg(
      distinct jsonb_build_object(
        'id',
        rp.id,
        'name',
        rp.name,
        'description',
        rp.description,
        'resource',
        rp.resource,
        'action',
        rp.action,
        'source',
        'role'
      )
    ) filter (
      where
        rp.id is not null
    ),
    '[]'::json
  ) as role_permissions
from
  user_profiles up
  left join user_permissions user_perms on up.id = user_perms.user_id
  and user_perms.is_active = true
  left join permissions p on user_perms.permission_id = p.id
  left join user_profiles granter on user_perms.granted_by = granter.id
  left join role_permissions role_perms on up.role = role_perms.role
  left join permissions rp on role_perms.permission_id = rp.id
where
  up.role = any (array['admin'::user_role, 'agent'::user_role])
group by
  up.id,
  up.full_name,
  up.email,
  up.role,
  up.is_super_admin,
  up.is_active;

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
  constraint user_profiles_pkey primary key (id),
  constraint user_profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
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
  constraint chk_credit_ceiling_valid check (
    (
      (credit_ceiling is null)
      or (credit_ceiling >= (0)::numeric)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_user_profiles_role on public.user_profiles using btree (role) TABLESPACE pg_default;

create index IF not exists idx_user_profiles_role_agent on public.user_profiles using btree (id) TABLESPACE pg_default
where
  (role = 'agent'::user_role);

create index IF not exists idx_user_profiles_role_created_at on public.user_profiles using btree (role, created_at) TABLESPACE pg_default;

create index IF not exists idx_user_profiles_active_role_updated on public.user_profiles using btree (is_active, role, updated_at) TABLESPACE pg_default;

create index IF not exists idx_user_profiles_email on public.user_profiles using btree (email) TABLESPACE pg_default
where
  (email is not null);

create index IF not exists idx_user_profiles_role_active on public.user_profiles using btree (role, is_active) TABLESPACE pg_default
where
  (
    role = any (array['agent'::user_role, 'customer'::user_role])
  );

create index IF not exists idx_user_profiles_super_admin on public.user_profiles using btree (is_super_admin) TABLESPACE pg_default
where
  (is_super_admin = true);

create trigger audit_user_profiles_trigger
after INSERT
or DELETE
or
update on user_profiles for EACH row
execute FUNCTION enhanced_audit_trigger ();

create trigger trg_update_user_profile_timestamp BEFORE
update on user_profiles for EACH row
execute FUNCTION update_user_profile_timestamp ();

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
  v.seating_capacity,
  v.is_active,
  v.created_at,
  COALESCE(
    vessel_stats.status,
    case
      when v.is_active then 'active'::text
      else 'inactive'::text
    end
  ) as status,
  COALESCE(vessel_stats.total_trips, 0::bigint) as total_trips_30d,
  COALESCE(vessel_stats.total_bookings, 0::bigint) as total_bookings_30d,
  COALESCE(vessel_stats.total_passengers, 0::numeric) as total_passengers_30d,
  COALESCE(vessel_stats.total_revenue, 0::numeric) as total_revenue_30d,
  round(
    case
      when COALESCE(vessel_stats.total_trips, 0::bigint) = 0 then 0::numeric
      else vessel_stats.total_passengers / (vessel_stats.total_trips * v.seating_capacity)::numeric * 100::numeric
    end,
    2
  ) as capacity_utilization_30d,
  round(
    case
      when COALESCE(vessel_stats.total_trips, 0::bigint) = 0 then 0::numeric
      else vessel_stats.total_passengers / vessel_stats.total_trips::numeric
    end,
    2
  ) as avg_passengers_per_trip,
  COALESCE(vessel_stats.days_in_service, 0::bigint) as days_in_service_30d
from
  vessels v
  left join (
    select
      t.vessel_id,
      count(*) as total_trips,
      count(b.id) as total_bookings,
      COALESCE(sum(passenger_counts.passenger_count), 0::numeric) as total_passengers,
      sum(
        case
          when b.status = 'confirmed'::booking_status then b.total_fare
          else 0::numeric
        end
      ) as total_revenue,
      count(distinct t.travel_date) as days_in_service,
      case
        when v2.is_active then 'active'::text
        else 'inactive'::text
      end as status
    from
      trips t
      left join vessels v2 on t.vessel_id = v2.id
      left join bookings b on t.id = b.trip_id
      left join (
        select
          p.booking_id,
          count(*) as passenger_count
        from
          passengers p
        group by
          p.booking_id
      ) passenger_counts on b.id = passenger_counts.booking_id
    where
      t.travel_date >= (CURRENT_DATE - '30 days'::interval)
    group by
      t.vessel_id,
      v2.is_active
  ) vessel_stats on v.id = vessel_stats.vessel_id;

create table public.vessels (
  id uuid not null default gen_random_uuid (),
  name character varying(100) not null,
  seating_capacity integer not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  status character varying(20) null default 'active'::character varying,
  constraint vessels_pkey primary key (id),
  constraint vessels_name_key unique (name),
  constraint chk_vessel_capacity_positive check ((seating_capacity > 0))
) TABLESPACE pg_default;

create index IF not exists idx_vessels_status on public.vessels using btree (status) TABLESPACE pg_default;

create index IF not exists idx_vessels_active on public.vessels using btree (is_active) TABLESPACE pg_default;

create trigger audit_vessels_trigger
after INSERT
or DELETE
or
update on vessels for EACH row
execute FUNCTION enhanced_audit_trigger ();

create table public.vessels (
  id uuid not null default gen_random_uuid (),
  name character varying(100) not null,
  seating_capacity integer not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  status character varying(20) null default 'active'::character varying,
  constraint vessels_pkey primary key (id),
  constraint vessels_name_key unique (name),
  constraint chk_vessel_capacity_positive check ((seating_capacity > 0))
) TABLESPACE pg_default;

create index IF not exists idx_vessels_status on public.vessels using btree (status) TABLESPACE pg_default;

create index IF not exists idx_vessels_active on public.vessels using btree (is_active) TABLESPACE pg_default;

create trigger audit_vessels_trigger
after INSERT
or DELETE
or
update on vessels for EACH row
execute FUNCTION enhanced_audit_trigger ();


create table public.wallet_transactions (
  id uuid not null default gen_random_uuid (),
  wallet_id uuid not null,
  amount numeric(10, 2) not null,
  transaction_type character varying(20) not null,
  reference_id uuid null,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint wallet_transactions_pkey primary key (id),
  constraint wallet_transactions_wallet_id_fkey foreign KEY (wallet_id) references wallets (id)
) TABLESPACE pg_default;

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

create index IF not exists idx_zone_activity_logs_zone_id on public.zone_activity_logs using btree (zone_id) TABLESPACE pg_default;

create index IF not exists idx_zone_activity_logs_created_at on public.zone_activity_logs using btree (created_at) TABLESPACE pg_default;

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

create index IF not exists idx_zones_order on public.zones using btree (order_index) TABLESPACE pg_default;

create index IF not exists idx_zones_name on public.zones using btree (name) TABLESPACE pg_default;

create index IF not exists idx_zones_code on public.zones using btree (code) TABLESPACE pg_default;

create trigger audit_zones_trigger
after INSERT
or DELETE
or
update on zones for EACH row
execute FUNCTION enhanced_audit_trigger ();

create trigger zones_activity_trigger
after INSERT
or DELETE
or
update on zones for EACH row
execute FUNCTION log_zone_activity ();

create trigger zones_updated_at_trigger BEFORE
update on zones for EACH row
execute FUNCTION update_zones_updated_at ();

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

  
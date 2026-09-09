-- Shared Giftköder reports (unowned, no login).
-- Only id/lat/lng/status/created_at — no nickname, no PLZ.

create table if not exists edge_reports (
  id         text primary key,
  lat        double precision not null,
  lng        double precision not null,
  status     varchar(20) not null default 'unbestätigt',
  created_at timestamptz not null default now()
);

create index if not exists edge_reports_created_at_idx on edge_reports (created_at desc);

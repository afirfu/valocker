create table if not exists users (
  id bigint generated always as identity primary key,
  username text not null unique,
  password_salt text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token text primary key,
  user_id bigint not null references users (id) on delete cascade,
  expires_at timestamptz not null
);

create table if not exists picks (
  user_id bigint not null references users (id) on delete cascade,
  pick_key text not null,
  skin_name text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, pick_key)
);

create table if not exists labels (
  user_id bigint not null references users (id) on delete cascade,
  pick_key text not null,
  color text not null default '',
  slant integer not null default 0,
  bold integer not null default 0,
  underline integer not null default 0,
  primary key (user_id, pick_key)
);

alter table labels add column if not exists underline integer not null default 0;

create table if not exists layouts (
  user_id bigint primary key references users (id) on delete cascade,
  payload jsonb not null
);

create table if not exists crosshairs (
  user_id bigint primary key references users (id) on delete cascade,
  payload jsonb not null
);

create table if not exists avatars (
  user_id bigint primary key references users (id) on delete cascade,
  agent text not null
);

create table if not exists generate_log (
  user_id bigint not null references users (id) on delete cascade,
  day date not null,
  count integer not null default 0,
  primary key (user_id, day)
);

create table if not exists workshop_commits (
  id text primary key,
  user_id bigint not null references users (id) on delete cascade,
  weapon text not null,
  parent_id text,
  name text not null default '',
  notes text not null default '',
  prompt text not null default '',
  still_path text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists workshop_publishes (
  user_id bigint not null references users (id) on delete cascade,
  weapon text not null,
  commit_id text not null,
  still_path text not null default '',
  username text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, weapon, commit_id)
);

revoke all on table users, sessions, picks, labels, layouts, crosshairs, avatars, generate_log, workshop_commits, workshop_publishes from anon, authenticated;
grant all on table users, sessions, picks, labels, layouts, crosshairs, avatars, generate_log, workshop_commits, workshop_publishes to service_role;

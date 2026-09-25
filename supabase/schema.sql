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
  primary key (user_id, pick_key)
);

revoke all on table users, sessions, picks, labels from anon, authenticated;
grant all on table users, sessions, picks, labels to service_role;

-- GF BF app schema (profiles, rooms, chat, gifts, phone OTP)

create table if not exists profiles (
  user_id text primary key,
  display_name text not null,
  avatar_hue integer not null default 320,
  bio text not null default '',
  coins integer not null default 500,
  charm integer not null default 0,
  level integer not null default 1,
  xp integer not null default 0,
  lang text not null default 'bn',
  phone text unique,
  last_daily_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists follows (
  follower_id text not null,
  following_id text not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);
create index if not exists follows_following_idx on follows (following_id);

create table if not exists rooms (
  id text primary key,
  title text not null,
  topic text not null default '',
  host_id text,
  is_live boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rooms_live_idx on rooms (is_live, updated_at desc);

create table if not exists room_members (
  room_id text not null references rooms(id) on delete cascade,
  user_id text not null,
  role text not null default 'listener',
  seat integer,
  muted boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index if not exists room_members_user_idx on room_members (user_id);

create table if not exists messages (
  id text primary key,
  room_id text not null,
  user_id text not null,
  body text not null,
  kind text not null default 'chat',
  gift_id text,
  created_at timestamptz not null default now()
);
create index if not exists messages_room_idx on messages (room_id, created_at);

create table if not exists gift_sends (
  id text primary key,
  room_id text,
  from_id text not null,
  to_id text not null,
  gift_id text not null,
  cost integer not null,
  created_at timestamptz not null default now()
);
create index if not exists gift_sends_user_idx on gift_sends (from_id, created_at desc);

create table if not exists phone_otps (
  phone text primary key,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists phone_accounts (
  phone text primary key,
  login_email text not null unique,
  login_password text not null,
  display_name text not null,
  created_at timestamptz not null default now()
);

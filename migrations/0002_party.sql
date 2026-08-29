-- GF BF party rooms, profiles, chat, gifts
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
  created_at timestamptz not null default now()
);

create table if not exists rooms (
  id text primary key,
  host_id text not null,
  title text not null,
  topic text not null default '',
  is_private boolean not null default false,
  max_seats integer not null default 8,
  created_at timestamptz not null default now()
);
create index if not exists rooms_created_idx on rooms (created_at desc);

create table if not exists room_members (
  room_id text not null,
  user_id text not null,
  role text not null,
  seat integer,
  muted boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index if not exists room_members_room_idx on room_members (room_id);

create table if not exists room_messages (
  id text primary key,
  room_id text not null,
  user_id text not null,
  body text not null,
  kind text not null default 'chat',
  gift_id text,
  created_at timestamptz not null default now()
);
create index if not exists room_messages_room_idx on room_messages (room_id, created_at);

create table if not exists gift_sends (
  id text primary key,
  room_id text not null,
  from_user text not null,
  to_user text not null,
  gift_id text not null,
  cost integer not null,
  created_at timestamptz not null default now()
);

create table if not exists follows (
  follower_id text not null,
  following_id text not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

insert into rooms (id, host_id, title, topic, is_private, max_seats)
values
  ('rose-lounge', 'system', 'Rose Lounge', 'Late night talks · রাতের গল্প', false, 8),
  ('bf-gf-party', 'system', 'GF BF Party', 'Flirty party room · পার্টি রুম', false, 8),
  ('music-night', 'system', 'Music Night', 'Sing & vibe · গান আর আড্ডা', false, 8)
on conflict (id) do nothing;

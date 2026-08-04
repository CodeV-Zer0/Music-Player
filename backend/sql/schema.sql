-- Run this in your Supabase SQL editor

create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);

create table if not exists artists (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique
);

create table if not exists albums (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  artist_id uuid references artists(id) on delete cascade,
  cover_key text, -- storage key for cover art
  year int
);

create table if not exists tracks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  album_id uuid references albums(id) on delete set null,
  artist_id uuid references artists(id) on delete cascade,
  duration_seconds int,
  track_number int,
  file_key text not null, -- storage key in R2/S3
  created_at timestamptz default now()
);

create table if not exists playlists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists playlist_tracks (
  playlist_id uuid references playlists(id) on delete cascade,
  track_id uuid references tracks(id) on delete cascade,
  position int not null,
  primary key (playlist_id, track_id)
);

create table if not exists play_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  track_id uuid references tracks(id) on delete cascade,
  played_at timestamptz default now()
);

create index if not exists idx_tracks_title on tracks using gin (to_tsvector('english', title));
create index if not exists idx_artists_name on artists using gin (to_tsvector('english', name));

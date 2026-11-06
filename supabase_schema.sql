-- 1. Tabel Profil Pengguna (Autentikasi PIN Sederhana Berdua)
create table profiles (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  passcode text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabel Moments (Menyimpan riwayat foto kiriman)
create table moments (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references profiles(id) not null,
  image_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Aktifkan Keamanan Row Level Security (RLS)
alter table profiles enable row level security;
alter table moments enable row level security;

-- 4. Buat Kebijakan Akses (Policy) Publik Terverifikasi
create policy "Allow read access to profiles" on profiles
  for select using (true);

create policy "Allow read/write moments for authenticated app" on moments
  for all using (true);

-- (Catatan: Anda juga perlu membuat bucket Storage baru di dashboard Supabase dengan nama: "private-photos" dan atur ke mode Public).

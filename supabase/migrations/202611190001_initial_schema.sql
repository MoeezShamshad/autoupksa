create extension if not exists pgcrypto;

create type public.admin_role as enum (
  'owner', 'super_admin', 'product_manager', 'inventory_manager',
  'content_manager', 'support_manager'
);
create type public.content_status as enum ('draft', 'published', 'archived');

create table public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.admin_role not null default 'product_manager',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admin_profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text not null default '',
  slug text not null unique,
  description_en text not null default '',
  description_ar text not null default '',
  logo_path text,
  website_url text,
  display_order integer not null default 0,
  active boolean not null default true,
  seo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name_en text not null,
  name_ar text not null default '',
  slug text not null unique,
  description_en text not null default '',
  description_ar text not null default '',
  image_path text,
  parent_id uuid references public.categories(id) on delete restrict,
  display_order integer not null default 0,
  featured boolean not null default false,
  active boolean not null default true,
  seo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  sku text not null unique,
  name_en text not null,
  name_ar text not null default '',
  short_description_en text not null default '',
  short_description_ar text not null default '',
  description_en text not null default '',
  description_ar text not null default '',
  usage_en text not null default '',
  usage_ar text not null default '',
  brand_id uuid references public.brands(id) on delete set null,
  category_id uuid references public.categories(id) on delete restrict,
  package_type text not null default 'other-commercial'
    check (package_type in ('retail', 'gallon', 'other-commercial')),
  image_url text,
  regular_price numeric(12,2) check (regular_price is null or regular_price >= 0),
  sale_price numeric(12,2) check (sale_price is null or sale_price >= 0),
  wholesale_price numeric(12,2) check (wholesale_price is null or wholesale_price >= 0),
  cost_price numeric(12,2) check (cost_price is null or cost_price >= 0),
  currency char(3) not null default 'SAR',
  price_on_request boolean not null default true,
  featured boolean not null default false,
  bestseller boolean not null default false,
  status public.content_status not null default 'draft',
  seo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_en text not null default '',
  alt_ar text not null default '',
  display_order integer not null default 0,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  unique(product_id, storage_path)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name_en text not null,
  name_ar text not null default '',
  sku text not null unique,
  barcode text,
  package_size text not null,
  regular_price numeric(12,2) check (regular_price is null or regular_price >= 0),
  sale_price numeric(12,2) check (sale_price is null or sale_price >= 0),
  wholesale_price numeric(12,2) check (wholesale_price is null or wholesale_price >= 0),
  image_path text,
  available boolean not null default true,
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory (
  variant_id uuid primary key references public.product_variants(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  reserved integer not null default 0 check (reserved >= 0 and reserved <= quantity),
  updated_at timestamptz not null default now()
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  admin_id uuid references public.admin_profiles(id) on delete set null,
  previous_quantity integer not null,
  new_quantity integer not null check (new_quantity >= 0),
  adjustment integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_name text,
  phone text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  status text not null default 'new'
    check (status in ('new','contacted','quotation_sent','negotiation','confirmed','completed','cancelled')),
  message text not null default '',
  internal_notes text not null default '',
  source text not null default 'website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name_snapshot text not null,
  sku_snapshot text not null default '',
  variant_snapshot text not null default '',
  quantity integer not null check (quantity > 0),
  unit_price_snapshot numeric(12,2),
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  status text not null default 'new',
  currency char(3) not null default 'SAR',
  total numeric(12,2) not null default 0 check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name_snapshot text not null,
  sku_snapshot text not null default '',
  variant_snapshot text not null default '',
  quantity integer not null check (quantity > 0),
  unit_price_snapshot numeric(12,2) not null check (unit_price_snapshot >= 0),
  created_at timestamptz not null default now()
);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  quotation_id uuid references public.quotations(id) on delete set null,
  kind text not null default 'product',
  message text not null default '',
  status text not null default 'new',
  internal_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.website_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.admin_profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.admin_app_state (
  id smallint primary key check (id = 1),
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  content jsonb not null default '{}'::jsonb,
  display_order integer not null default 0,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  label_en text not null,
  label_ar text not null default '',
  href text not null,
  display_order integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.static_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_en text not null,
  title_ar text not null default '',
  content_en text not null default '',
  content_ar text not null default '',
  status public.content_status not null default 'draft',
  seo jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.media_library (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  alt_en text not null default '',
  alt_ar text not null default '',
  uploaded_by uuid references public.admin_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.product_seo (
  product_id uuid primary key references public.products(id) on delete cascade,
  title text not null default '',
  meta_description text not null default '',
  canonical_url text,
  og_image_path text,
  indexable boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.page_seo (
  id uuid primary key default gen_random_uuid(),
  page_path text not null unique,
  title text not null default '',
  meta_description text not null default '',
  canonical_url text,
  og_image_path text,
  indexable boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.url_redirects (
  old_path text primary key,
  new_path text not null,
  created_at timestamptz not null default now()
);

create index products_status_category_idx on public.products(status, category_id);
create index products_brand_idx on public.products(brand_id);
create index products_name_en_search_idx on public.products using gin (to_tsvector('simple', name_en));
create index products_name_ar_idx on public.products using gin (to_tsvector('simple', name_ar));
create index product_variants_product_idx on public.product_variants(product_id);
create index product_variants_sku_idx on public.product_variants(sku);
create index inventory_movements_variant_created_idx on public.inventory_movements(variant_id, created_at desc);
create index quotations_status_created_idx on public.quotations(status, created_at desc);
create index inquiries_status_created_idx on public.inquiries(status, created_at desc);
create index activity_created_idx on public.admin_activity_logs(created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles
    where id = auth.uid() and active = true
  );
$$;

create or replace function public.has_admin_role(allowed public.admin_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles
    where id = auth.uid() and active = true and role = any(allowed)
  );
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'admin_profiles','brands','categories','products','product_variants',
    'customers','quotations','orders','inquiries','homepage_sections',
    'navigation_items','static_pages'
  ] loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name, table_name
    );
  end loop;
end;
$$;

alter table public.admin_profiles enable row level security;
alter table public.admin_activity_logs enable row level security;
alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.customers enable row level security;
alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inquiries enable row level security;
alter table public.website_settings enable row level security;
alter table public.admin_app_state enable row level security;
alter table public.homepage_sections enable row level security;
alter table public.navigation_items enable row level security;
alter table public.static_pages enable row level security;
alter table public.media_library enable row level security;
alter table public.product_seo enable row level security;
alter table public.page_seo enable row level security;
alter table public.url_redirects enable row level security;

create policy "Public can read published products" on public.products
  for select using (status = 'published');
create policy "Admins can manage products" on public.products
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Public can read active categories" on public.categories
  for select using (active = true);
create policy "Admins can manage categories" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Public can read active brands" on public.brands
  for select using (active = true);
create policy "Admins can manage brands" on public.brands
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Public can read product images for published products" on public.product_images
  for select using (exists (
    select 1 from public.products p where p.id = product_id and p.status = 'published'
  ));
create policy "Admins can manage product images" on public.product_images
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Public can read variants for published products" on public.product_variants
  for select using (available and exists (
    select 1 from public.products p where p.id = product_id and p.status = 'published'
  ));
create policy "Admins can manage variants" on public.product_variants
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Public can read inventory for published products" on public.inventory
  for select using (exists (
    select 1 from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = variant_id and p.status = 'published'
  ));
create policy "Inventory managers can update inventory" on public.inventory
  for all using (public.has_admin_role(array['owner','super_admin','inventory_manager']::public.admin_role[]))
  with check (public.has_admin_role(array['owner','super_admin','inventory_manager']::public.admin_role[]));
create policy "Admins can read administrative tables" on public.admin_profiles
  for select using (id = auth.uid() or public.has_admin_role(array['owner','super_admin']::public.admin_role[]));

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'admin_activity_logs','inventory_movements','customers','quotations',
    'quotation_items','orders','order_items','inquiries','website_settings',
    'homepage_sections','navigation_items','static_pages','media_library',
    'product_seo','page_seo','url_redirects'
  ] loop
    execute format(
      'create policy %I on public.%I for all using (public.is_admin()) with check (public.is_admin())',
      table_name || '_admin_access', table_name
    );
  end loop;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-media', 'product-media', true, 10485760, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do nothing;

create policy "Public read product media" on storage.objects
  for select using (bucket_id = 'product-media');
create policy "Admins upload product media" on storage.objects
  for insert with check (
    bucket_id = 'product-media' and public.is_admin()
  );
create policy "Admins update product media" on storage.objects
  for update using (
    bucket_id = 'product-media' and public.is_admin()
  ) with check (
    bucket_id = 'product-media' and public.is_admin()
  );
create policy "Admins delete product media" on storage.objects
  for delete using (
    bucket_id = 'product-media' and public.is_admin()
  );

CREATE TABLE public.user_roles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  role         text NOT NULL CHECK (role IN ('store_operator', 'region_manager', 'executive_manager', 'system_admin')),
  store_id     uuid REFERENCES public.stores(id),
  region       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
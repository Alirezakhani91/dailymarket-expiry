CREATE TABLE public.customers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name    text NOT NULL,
  phone        text,
  region       text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sales (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id         uuid NOT NULL REFERENCES public.expiry_batches(id),
  customer_id      uuid NOT NULL REFERENCES public.customers(id),
  quantity_sold    integer NOT NULL CHECK (quantity_sold > 0),
  final_price      numeric(12,2) NOT NULL,
  delivery_status  text NOT NULL DEFAULT 'pending'
                     CHECK (delivery_status IN ('pending', 'delivered', 'cancelled')),
  sold_by          uuid NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
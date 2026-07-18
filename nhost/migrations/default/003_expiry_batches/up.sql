CREATE TABLE public.expiry_batches (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id            uuid NOT NULL REFERENCES public.stores(id),
  product_name        text NOT NULL,
  quantity             integer NOT NULL CHECK (quantity > 0),
  unit                text NOT NULL DEFAULT 'عدد',
  expiry_date         date NOT NULL,
  discount_percent    numeric(5,2) DEFAULT 0,
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'needs_correction', 'approved', 'sold', 'rejected')),
  created_by          uuid NOT NULL,
  reviewed_by         uuid,
  review_note         text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
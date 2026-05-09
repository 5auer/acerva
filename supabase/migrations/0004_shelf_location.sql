-- ============================================================
-- 0004 — Localização nas prateleiras (etiqueta física)
-- ============================================================

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS shelf_location TEXT;

CREATE INDEX IF NOT EXISTS books_shelf_idx ON public.books (library_id, shelf_location);

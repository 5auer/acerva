-- ============================================================
-- 0003 — Descarte de exemplar com motivo
-- ============================================================

-- Add 'discarded' to copy_status enum (idempotent)
ALTER TYPE copy_status ADD VALUE IF NOT EXISTS 'discarded';

-- Add discard tracking columns
ALTER TABLE public.book_copies
  ADD COLUMN IF NOT EXISTS discard_reason TEXT,
  ADD COLUMN IF NOT EXISTS discarded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS discarded_by_user_id UUID;

-- RPC: discard a copy (soft remove with reason)
CREATE OR REPLACE FUNCTION public.discard_copy(_copy_id UUID, _reason TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c book_copies%ROWTYPE;
BEGIN
  SELECT * INTO _c FROM book_copies WHERE id = _copy_id FOR UPDATE;
  IF _c IS NULL THEN RAISE EXCEPTION 'Exemplar não encontrado'; END IF;
  IF NOT has_library_role(auth.uid(), 'admin', _c.library_id) THEN
    RAISE EXCEPTION 'Apenas bibliotecária';
  END IF;
  IF _c.status = 'loaned' THEN
    RAISE EXCEPTION 'Exemplar está emprestado. Devolva primeiro antes de descartar.';
  END IF;
  IF _c.status = 'reserved' THEN
    RAISE EXCEPTION 'Exemplar está reservado. Cancele a reserva primeiro.';
  END IF;
  IF length(coalesce(_reason, '')) < 3 THEN
    RAISE EXCEPTION 'Informe o motivo do descarte (mín. 3 caracteres)';
  END IF;
  UPDATE book_copies SET
    status = 'discarded',
    discard_reason = _reason,
    discarded_at = now(),
    discarded_by_user_id = auth.uid()
   WHERE id = _copy_id;
END $$;

-- RPC: restore a discarded copy back to available
CREATE OR REPLACE FUNCTION public.restore_copy(_copy_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _c book_copies%ROWTYPE;
BEGIN
  SELECT * INTO _c FROM book_copies WHERE id = _copy_id FOR UPDATE;
  IF _c IS NULL THEN RAISE EXCEPTION 'Exemplar não encontrado'; END IF;
  IF NOT has_library_role(auth.uid(), 'admin', _c.library_id) THEN
    RAISE EXCEPTION 'Apenas bibliotecária';
  END IF;
  IF _c.status <> 'discarded' THEN
    RAISE EXCEPTION 'Exemplar não está descartado';
  END IF;
  UPDATE book_copies SET
    status = 'available',
    discard_reason = NULL,
    discarded_at = NULL,
    discarded_by_user_id = NULL
   WHERE id = _copy_id;
END $$;

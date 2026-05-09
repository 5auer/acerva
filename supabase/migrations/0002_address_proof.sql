-- ============================================================
-- 0002 — Address + comprovante de residência por membership
-- ============================================================

ALTER TABLE public.library_memberships
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS address_number TEXT,
  ADD COLUMN IF NOT EXISTS address_complement TEXT,
  ADD COLUMN IF NOT EXISTS address_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS address_city TEXT,
  ADD COLUMN IF NOT EXISTS address_state TEXT,
  ADD COLUMN IF NOT EXISTS address_zip TEXT,
  ADD COLUMN IF NOT EXISTS address_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS address_proof_submitted_at TIMESTAMPTZ;

-- Update submit_document to also accept address fields (backward compatible)
DROP FUNCTION IF EXISTS public.submit_document(UUID, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.submit_document(
  _library_id UUID,
  _doc_type TEXT,
  _doc_number TEXT,
  _doc_image_url TEXT,
  _address TEXT DEFAULT NULL,
  _address_number TEXT DEFAULT NULL,
  _address_complement TEXT DEFAULT NULL,
  _address_neighborhood TEXT DEFAULT NULL,
  _address_city TEXT DEFAULT NULL,
  _address_state TEXT DEFAULT NULL,
  _address_zip TEXT DEFAULT NULL,
  _address_proof_url TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM libraries WHERE id = _library_id) THEN
    RAISE EXCEPTION 'Biblioteca não encontrada';
  END IF;
  IF _doc_type NOT IN ('cnh','rg') THEN RAISE EXCEPTION 'Tipo de documento inválido'; END IF;

  INSERT INTO library_memberships (
    library_id, user_id, doc_type, doc_number, doc_image_url,
    doc_submitted_at, verification_status, rejection_reason,
    address, address_number, address_complement, address_neighborhood,
    address_city, address_state, address_zip,
    address_proof_url, address_proof_submitted_at
  ) VALUES (
    _library_id, auth.uid(), _doc_type, _doc_number, _doc_image_url,
    now(), 'submitted', NULL,
    _address, _address_number, _address_complement, _address_neighborhood,
    _address_city, _address_state, _address_zip,
    _address_proof_url,
    CASE WHEN _address_proof_url IS NOT NULL THEN now() ELSE NULL END
  )
  ON CONFLICT (library_id, user_id) DO UPDATE SET
    doc_type = EXCLUDED.doc_type,
    doc_number = EXCLUDED.doc_number,
    doc_image_url = EXCLUDED.doc_image_url,
    doc_submitted_at = now(),
    verification_status = 'submitted',
    rejection_reason = NULL,
    address = COALESCE(EXCLUDED.address, library_memberships.address),
    address_number = COALESCE(EXCLUDED.address_number, library_memberships.address_number),
    address_complement = COALESCE(EXCLUDED.address_complement, library_memberships.address_complement),
    address_neighborhood = COALESCE(EXCLUDED.address_neighborhood, library_memberships.address_neighborhood),
    address_city = COALESCE(EXCLUDED.address_city, library_memberships.address_city),
    address_state = COALESCE(EXCLUDED.address_state, library_memberships.address_state),
    address_zip = COALESCE(EXCLUDED.address_zip, library_memberships.address_zip),
    address_proof_url = COALESCE(EXCLUDED.address_proof_url, library_memberships.address_proof_url),
    address_proof_submitted_at = CASE
      WHEN EXCLUDED.address_proof_url IS NOT NULL THEN now()
      ELSE library_memberships.address_proof_submitted_at
    END,
    updated_at = now();
END $$;

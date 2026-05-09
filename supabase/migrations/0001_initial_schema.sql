?-- ============================================================
-- ACERVA — Initial schema (multi-tenant, Postgres / Supabase)
-- ============================================================

-- ===== Enums (idempotent) =====
DO $$ BEGIN CREATE TYPE app_role            AS ENUM ('admin','user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE verification_status AS ENUM ('pending','submitted','verified','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE copy_status         AS ENUM ('available','loaned','reserved','maintenance'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE loan_status         AS ENUM ('active','returned','overdue'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE reservation_status  AS ENUM ('pending','fulfilled','cancelled','expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notify_status       AS ENUM ('pending','notified','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE suggestion_status   AS ENUM ('open','accepted','rejected','acquired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== Constants (used by functions) =====
CREATE OR REPLACE FUNCTION public.acerva_const(_key TEXT) RETURNS INT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _key
    WHEN 'LOAN_DAYS'         THEN 15
    WHEN 'MAX_RENEWALS'      THEN 1
    WHEN 'MAX_ACTIVE_LOANS'  THEN 3
    WHEN 'RESERVATION_HOURS' THEN 24
    ELSE NULL END
$$;

-- ============================================================
-- Tables
-- ============================================================

-- Tenant root
CREATE TABLE IF NOT EXISTS public.libraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Platform-level super admins (cross-tenant)
CREATE TABLE IF NOT EXISTS public.super_admins (
  user_id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-user identity (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  name TEXT,
  email TEXT,
  cpf VARCHAR(14),
  phone VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-(library, user) verification + block status
CREATE TABLE IF NOT EXISTS public.library_memberships (
  library_id UUID NOT NULL REFERENCES public.libraries(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  verification_status verification_status NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  is_blocked   BOOLEAN NOT NULL DEFAULT false,
  blocked_until TIMESTAMPTZ,
  block_reason TEXT,
  doc_type     TEXT,                  -- 'cnh' | 'rg'
  doc_number   TEXT,
  doc_image_url TEXT,
  doc_submitted_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (library_id, user_id)
);

-- Roles per library (and global for super_admin via NULL library_id, unused here)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  library_id UUID REFERENCES public.libraries(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_with_library_unique
  ON public.user_roles (user_id, role, library_id) WHERE library_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_global_unique
  ON public.user_roles (user_id, role) WHERE library_id IS NULL;

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES public.libraries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (library_id, slug)
);

CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES public.libraries(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT,
  publisher TEXT,
  publication_year INT,
  isbn TEXT,
  cover_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS books_library_idx ON public.books (library_id);
CREATE INDEX IF NOT EXISTS books_title_idx ON public.books USING gin (to_tsvector('portuguese', title || ' ' || author));

CREATE TABLE IF NOT EXISTS public.book_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES public.libraries(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  copy_code TEXT NOT NULL,
  status copy_status NOT NULL DEFAULT 'available',
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (library_id, copy_code)
);
CREATE INDEX IF NOT EXISTS copies_book_idx ON public.book_copies (book_id);
CREATE INDEX IF NOT EXISTS copies_status_idx ON public.book_copies (library_id, status);

CREATE TABLE IF NOT EXISTS public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES public.libraries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE RESTRICT,
  copy_id UUID NOT NULL REFERENCES public.book_copies(id) ON DELETE RESTRICT,
  loaned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date TIMESTAMPTZ NOT NULL,
  returned_at TIMESTAMPTZ,
  renewal_count INT NOT NULL DEFAULT 0,
  days_late INT NOT NULL DEFAULT 0,
  status loan_status NOT NULL DEFAULT 'active',
  notes TEXT,
  loaned_by_user_id UUID,
  returned_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS loans_user_idx ON public.loans (user_id, library_id);
CREATE INDEX IF NOT EXISTS loans_status_idx ON public.loans (library_id, status);
CREATE INDEX IF NOT EXISTS loans_book_idx ON public.loans (book_id);

CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES public.libraries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  copy_id UUID REFERENCES public.book_copies(id) ON DELETE SET NULL,
  status reservation_status NOT NULL DEFAULT 'pending',
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  fulfilled_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS reservations_user_idx ON public.reservations (user_id, library_id);
CREATE INDEX IF NOT EXISTS reservations_status_idx ON public.reservations (library_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS reservations_one_pending_per_user_book
  ON public.reservations (user_id, book_id) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS public.book_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES public.libraries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);
CREATE INDEX IF NOT EXISTS reviews_book_idx ON public.book_reviews (book_id);

CREATE TABLE IF NOT EXISTS public.book_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES public.libraries(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS views_book_idx ON public.book_views (book_id, viewed_at);
CREATE INDEX IF NOT EXISTS views_library_idx ON public.book_views (library_id, viewed_at);

CREATE TABLE IF NOT EXISTS public.book_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES public.libraries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  reason TEXT,
  status suggestion_status NOT NULL DEFAULT 'open',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS suggestions_library_idx ON public.book_suggestions (library_id, status);

CREATE TABLE IF NOT EXISTS public.notify_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID NOT NULL REFERENCES public.libraries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  status notify_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS notify_unique_pending
  ON public.notify_requests (user_id, book_id, library_id) WHERE status = 'pending';

-- ============================================================
-- Helpers (referenced by RLS policies and business functions)
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_super_admin(_uid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM super_admins WHERE user_id = _uid)
$$;

CREATE OR REPLACE FUNCTION public.has_library_role(_user_id UUID, _role app_role, _library_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
     WHERE user_id = _user_id AND role = _role AND library_id = _library_id
  ) OR EXISTS (SELECT 1 FROM super_admins WHERE user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.period_start(_period TEXT)
RETURNS TIMESTAMPTZ LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE lower(_period)
    WHEN 'month'    THEN date_trunc('month', now())
    WHEN 'semester' THEN
      CASE WHEN EXTRACT(MONTH FROM now()) <= 6
        THEN date_trunc('year', now())
        ELSE date_trunc('year', now()) + interval '6 months'
      END
    WHEN 'year'     THEN date_trunc('year', now())
    WHEN 'all'      THEN '-infinity'::timestamptz
    ELSE date_trunc('month', now())
  END
$$;

-- ============================================================
-- Auto-create profile + 'user' role on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Enable RLS
-- ============================================================
ALTER TABLE public.libraries           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admins        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_copies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_reviews        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_views          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_suggestions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notify_requests     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies (drop existing first for idempotency)
-- ============================================================
DO $$ DECLARE r record;
BEGIN
  FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname='public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Libraries: anyone (incl. anon) can read; only super_admin writes.
CREATE POLICY libraries_public_read ON public.libraries
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY libraries_super_write ON public.libraries
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Super admins: see your own row or all if super.
CREATE POLICY super_admins_self ON public.super_admins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_super_admin(auth.uid()));
CREATE POLICY super_admins_super_write ON public.super_admins
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Profiles: own row, super, or library admin of a library where this profile is a member.
CREATE POLICY profiles_select_own_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM library_memberships m
       WHERE m.user_id = profiles.id
         AND has_library_role(auth.uid(), 'admin', m.library_id)
    )
  );
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR is_super_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR is_super_admin(auth.uid()));
CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Memberships: own or library admin of that library.
CREATE POLICY memberships_select_own_or_admin ON public.library_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_library_role(auth.uid(), 'admin', library_id));
CREATE POLICY memberships_insert_self ON public.library_memberships
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY memberships_update_own_or_admin ON public.library_memberships
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR has_library_role(auth.uid(), 'admin', library_id))
  WITH CHECK (user_id = auth.uid() OR has_library_role(auth.uid(), 'admin', library_id));

-- User roles
CREATE POLICY user_roles_select_own_or_admin ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR is_super_admin(auth.uid())
    OR (library_id IS NOT NULL AND has_library_role(auth.uid(), 'admin', library_id))
  );
CREATE POLICY user_roles_admin_insert ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin(auth.uid())
    OR (library_id IS NOT NULL AND has_library_role(auth.uid(), 'admin', library_id))
  );
CREATE POLICY user_roles_admin_delete ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (library_id IS NOT NULL AND has_library_role(auth.uid(), 'admin', library_id))
  );

-- Categories: public read, admin write
CREATE POLICY categories_public_read ON public.categories
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY categories_admin_write ON public.categories
  FOR ALL TO authenticated
  USING (has_library_role(auth.uid(), 'admin', library_id))
  WITH CHECK (has_library_role(auth.uid(), 'admin', library_id));

-- Books: public read, admin write
CREATE POLICY books_public_read ON public.books
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY books_admin_write ON public.books
  FOR ALL TO authenticated
  USING (has_library_role(auth.uid(), 'admin', library_id))
  WITH CHECK (has_library_role(auth.uid(), 'admin', library_id));

-- Copies: public read (status only matters for "available" hint), admin write
CREATE POLICY copies_public_read ON public.book_copies
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY copies_admin_write ON public.book_copies
  FOR ALL TO authenticated
  USING (has_library_role(auth.uid(), 'admin', library_id))
  WITH CHECK (has_library_role(auth.uid(), 'admin', library_id));

-- Loans: own + admin
CREATE POLICY loans_select_own_or_admin ON public.loans
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_library_role(auth.uid(), 'admin', library_id));
CREATE POLICY loans_admin_write ON public.loans
  FOR ALL TO authenticated
  USING (has_library_role(auth.uid(), 'admin', library_id))
  WITH CHECK (has_library_role(auth.uid(), 'admin', library_id));

-- Reservations: own select; admin all
CREATE POLICY reservations_select_own_or_admin ON public.reservations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_library_role(auth.uid(), 'admin', library_id));
CREATE POLICY reservations_admin_all ON public.reservations
  FOR ALL TO authenticated
  USING (has_library_role(auth.uid(), 'admin', library_id))
  WITH CHECK (has_library_role(auth.uid(), 'admin', library_id));

-- Reviews: public read, own write
CREATE POLICY reviews_public_read ON public.book_reviews
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY reviews_own_write ON public.book_reviews
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR has_library_role(auth.uid(), 'admin', library_id))
  WITH CHECK (user_id = auth.uid());

-- Views: anyone can insert (we'll dedupe in RPC), only admin reads
CREATE POLICY views_admin_read ON public.book_views
  FOR SELECT TO authenticated
  USING (has_library_role(auth.uid(), 'admin', library_id));
CREATE POLICY views_public_insert ON public.book_views
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Suggestions
CREATE POLICY suggestions_insert_self ON public.book_suggestions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY suggestions_select_own_or_admin ON public.book_suggestions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_library_role(auth.uid(), 'admin', library_id));
CREATE POLICY suggestions_admin_update ON public.book_suggestions
  FOR UPDATE TO authenticated
  USING (has_library_role(auth.uid(), 'admin', library_id))
  WITH CHECK (has_library_role(auth.uid(), 'admin', library_id));
CREATE POLICY suggestions_admin_delete ON public.book_suggestions
  FOR DELETE TO authenticated
  USING (has_library_role(auth.uid(), 'admin', library_id));

-- Notify requests
CREATE POLICY notify_select_own_or_admin ON public.notify_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_library_role(auth.uid(), 'admin', library_id));
CREATE POLICY notify_update_own ON public.notify_requests
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY notify_delete_own ON public.notify_requests
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- Business logic (SECURITY DEFINER functions)
-- ============================================================

-- ----- Document submission -----
CREATE OR REPLACE FUNCTION public.submit_document(
  _library_id UUID,
  _doc_type TEXT,
  _doc_number TEXT,
  _doc_image_url TEXT
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
    doc_submitted_at, verification_status, rejection_reason
  ) VALUES (
    _library_id, auth.uid(), _doc_type, _doc_number, _doc_image_url,
    now(), 'submitted', NULL
  )
  ON CONFLICT (library_id, user_id) DO UPDATE SET
    doc_type = EXCLUDED.doc_type,
    doc_number = EXCLUDED.doc_number,
    doc_image_url = EXCLUDED.doc_image_url,
    doc_submitted_at = now(),
    verification_status = 'submitted',
    rejection_reason = NULL,
    updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.review_verification(
  _library_id UUID,
  _user_id UUID,
  _approve BOOLEAN,
  _reason TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_library_role(auth.uid(), 'admin', _library_id) THEN
    RAISE EXCEPTION 'Apenas bibliotecária';
  END IF;
  IF _approve THEN
    UPDATE library_memberships SET
      verification_status = 'verified',
      rejection_reason = NULL,
      updated_at = now()
     WHERE library_id = _library_id AND user_id = _user_id;
  ELSE
    UPDATE library_memberships SET
      verification_status = 'rejected',
      rejection_reason = _reason,
      updated_at = now()
     WHERE library_id = _library_id AND user_id = _user_id;
  END IF;
END $$;

-- ----- Reservations -----
CREATE OR REPLACE FUNCTION public.create_reservation(_book_id UUID, _library_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _vstatus verification_status;
  _blocked BOOLEAN;
  _copy UUID;
  _existing UUID;
  _res UUID;
  _active_count INT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT verification_status, is_blocked INTO _vstatus, _blocked
    FROM library_memberships WHERE user_id = _uid AND library_id = _library_id;
  IF _vstatus IS NULL OR _vstatus IS DISTINCT FROM 'verified' THEN
    RAISE EXCEPTION 'Cadastro precisa estar verificado pela bibliotecária';
  END IF;
  IF _blocked THEN RAISE EXCEPTION 'Conta bloqueada'; END IF;

  -- Already reserved?
  SELECT id INTO _existing FROM reservations
   WHERE user_id = _uid AND book_id = _book_id AND status = 'pending' LIMIT 1;
  IF _existing IS NOT NULL THEN
    RAISE EXCEPTION 'Você já tem uma reserva ativa deste livro';
  END IF;

  -- Already on loan with this user?
  SELECT id INTO _existing FROM loans
   WHERE user_id = _uid AND book_id = _book_id AND status = 'active' LIMIT 1;
  IF _existing IS NOT NULL THEN
    RAISE EXCEPTION 'Você já tem este livro emprestado';
  END IF;

  -- Loan-cap check: pending reservations + active loans
  SELECT COUNT(*) INTO _active_count FROM (
    SELECT id FROM loans
     WHERE user_id = _uid AND library_id = _library_id AND status = 'active'
    UNION ALL
    SELECT id FROM reservations
     WHERE user_id = _uid AND library_id = _library_id AND status = 'pending'
  ) x;
  IF _active_count >= acerva_const('MAX_ACTIVE_LOANS') THEN
    RAISE EXCEPTION 'Limite de % livros simultâneos atingido', acerva_const('MAX_ACTIVE_LOANS');
  END IF;

  -- Pick an available copy
  SELECT id INTO _copy FROM book_copies
   WHERE book_id = _book_id AND library_id = _library_id AND status = 'available'
   ORDER BY acquired_at LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF _copy IS NULL THEN RAISE EXCEPTION 'Sem exemplares disponíveis'; END IF;

  UPDATE book_copies SET status = 'reserved' WHERE id = _copy;

  INSERT INTO reservations (book_id, copy_id, user_id, library_id)
   VALUES (_book_id, _copy, _uid, _library_id) RETURNING id INTO _res;
  RETURN _res;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_reservation(_reservation_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r reservations%ROWTYPE;
BEGIN
  SELECT * INTO _r FROM reservations WHERE id = _reservation_id FOR UPDATE;
  IF _r IS NULL THEN RAISE EXCEPTION 'Reserva não encontrada'; END IF;
  IF _r.user_id <> auth.uid() AND NOT has_library_role(auth.uid(), 'admin', _r.library_id) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  IF _r.status <> 'pending' THEN RAISE EXCEPTION 'Reserva não está pendente'; END IF;

  UPDATE reservations SET status = 'cancelled', cancelled_at = now() WHERE id = _reservation_id;

  IF _r.copy_id IS NOT NULL THEN
    UPDATE book_copies SET status = 'available'
     WHERE id = _r.copy_id AND status = 'reserved';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fulfill_reservation(_reservation_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r reservations%ROWTYPE; _loan UUID;
BEGIN
  SELECT * INTO _r FROM reservations WHERE id = _reservation_id FOR UPDATE;
  IF _r IS NULL THEN RAISE EXCEPTION 'Reserva não encontrada'; END IF;
  IF NOT has_library_role(auth.uid(), 'admin', _r.library_id) THEN
    RAISE EXCEPTION 'Apenas bibliotecária';
  END IF;
  IF _r.status <> 'pending' THEN RAISE EXCEPTION 'Reserva não está pendente'; END IF;

  INSERT INTO loans (
    user_id, copy_id, book_id, library_id, due_date, loaned_by_user_id, status
  ) VALUES (
    _r.user_id, _r.copy_id, _r.book_id, _r.library_id,
    now() + (acerva_const('LOAN_DAYS') || ' days')::interval,
    auth.uid(), 'active'
  ) RETURNING id INTO _loan;

  UPDATE book_copies SET status = 'loaned' WHERE id = _r.copy_id;
  UPDATE reservations SET status = 'fulfilled', fulfilled_at = now() WHERE id = _reservation_id;
  RETURN _loan;
END $$;

CREATE OR REPLACE FUNCTION public.expire_old_reservations()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count INT := 0;
BEGIN
  WITH expired AS (
    UPDATE reservations SET status = 'expired'
     WHERE status = 'pending' AND expires_at < now()
     RETURNING copy_id
  )
  UPDATE book_copies SET status = 'available'
   WHERE id IN (SELECT copy_id FROM expired WHERE copy_id IS NOT NULL)
     AND status = 'reserved';
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END $$;

-- ----- Loans -----
CREATE OR REPLACE FUNCTION public.create_loan_direct(
  _user_id UUID, _book_id UUID, _library_id UUID, _notes TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _vstatus verification_status; _blocked BOOLEAN;
  _active INT; _copy UUID; _loan UUID;
BEGIN
  IF NOT has_library_role(auth.uid(), 'admin', _library_id) THEN
    RAISE EXCEPTION 'Apenas bibliotecária';
  END IF;

  SELECT verification_status, is_blocked INTO _vstatus, _blocked
    FROM library_memberships WHERE user_id = _user_id AND library_id = _library_id;
  IF _vstatus IS NULL OR _vstatus IS DISTINCT FROM 'verified' THEN
    RAISE EXCEPTION 'Leitor não está verificado';
  END IF;
  IF _blocked THEN RAISE EXCEPTION 'Leitor está bloqueado'; END IF;

  SELECT COUNT(*) INTO _active FROM loans
   WHERE user_id = _user_id AND library_id = _library_id AND status = 'active';
  IF _active >= acerva_const('MAX_ACTIVE_LOANS') THEN
    RAISE EXCEPTION 'Limite de % livros simultâneos atingido', acerva_const('MAX_ACTIVE_LOANS');
  END IF;

  SELECT id INTO _copy FROM book_copies
   WHERE book_id = _book_id AND library_id = _library_id AND status = 'available'
   ORDER BY acquired_at LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF _copy IS NULL THEN RAISE EXCEPTION 'Sem exemplar disponível'; END IF;

  INSERT INTO loans (user_id, book_id, copy_id, library_id, due_date, loaned_by_user_id, notes, status)
   VALUES (_user_id, _book_id, _copy, _library_id,
           now() + (acerva_const('LOAN_DAYS') || ' days')::interval,
           auth.uid(), _notes, 'active')
   RETURNING id INTO _loan;

  UPDATE book_copies SET status = 'loaned' WHERE id = _copy;
  RETURN _loan;
END $$;

CREATE OR REPLACE FUNCTION public.return_loan(_loan_id UUID)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _l loans%ROWTYPE; _late INT;
BEGIN
  SELECT * INTO _l FROM loans WHERE id = _loan_id FOR UPDATE;
  IF _l IS NULL THEN RAISE EXCEPTION 'Empréstimo não encontrado'; END IF;
  IF NOT has_library_role(auth.uid(), 'admin', _l.library_id) THEN
    RAISE EXCEPTION 'Apenas bibliotecária';
  END IF;
  IF _l.status = 'returned' THEN RAISE EXCEPTION 'Empréstimo já devolvido'; END IF;

  _late := GREATEST(0, EXTRACT(DAY FROM (now() - _l.due_date))::INT);

  UPDATE loans SET
    status = 'returned',
    returned_at = now(),
    returned_by_user_id = auth.uid(),
    days_late = _late
   WHERE id = _loan_id;

  UPDATE book_copies SET status = 'available' WHERE id = _l.copy_id;

  IF _late > 0 THEN
    UPDATE library_memberships SET
      is_blocked = true,
      block_reason = 'Devolução com ' || _late || ' dia(s) de atraso',
      updated_at = now()
     WHERE user_id = _l.user_id AND library_id = _l.library_id;
  END IF;

  RETURN _late;
END $$;

CREATE OR REPLACE FUNCTION public.renew_loan(_loan_id UUID)
RETURNS TIMESTAMPTZ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _l loans%ROWTYPE; _new_due TIMESTAMPTZ;
BEGIN
  SELECT * INTO _l FROM loans WHERE id = _loan_id FOR UPDATE;
  IF _l IS NULL THEN RAISE EXCEPTION 'Empréstimo não encontrado'; END IF;
  IF _l.user_id <> auth.uid() AND NOT has_library_role(auth.uid(), 'admin', _l.library_id) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  IF _l.status <> 'active' THEN RAISE EXCEPTION 'Empréstimo não está ativo'; END IF;
  IF _l.renewal_count >= acerva_const('MAX_RENEWALS') THEN
    RAISE EXCEPTION 'Empréstimo já foi renovado o máximo permitido';
  END IF;
  IF _l.due_date < now() THEN
    RAISE EXCEPTION 'Empréstimo está em atraso. Procure a biblioteca.';
  END IF;

  _new_due := _l.due_date + (acerva_const('LOAN_DAYS') || ' days')::interval;
  UPDATE loans SET due_date = _new_due, renewal_count = renewal_count + 1
   WHERE id = _loan_id;
  RETURN _new_due;
END $$;

CREATE OR REPLACE FUNCTION public.unblock_user(_library_id UUID, _user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_library_role(auth.uid(), 'admin', _library_id) THEN
    RAISE EXCEPTION 'Apenas bibliotecária';
  END IF;
  UPDATE library_memberships SET
    is_blocked = false, block_reason = NULL, blocked_until = NULL, updated_at = now()
   WHERE user_id = _user_id AND library_id = _library_id;
END $$;

-- ----- Reviews / views / suggestions / notify -----
CREATE OR REPLACE FUNCTION public.upsert_book_review(
  _book_id UUID, _library_id UUID, _rating INT, _comment TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid(); _vstatus verification_status; _id UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _rating < 1 OR _rating > 5 THEN RAISE EXCEPTION 'Nota deve ser de 1 a 5'; END IF;

  SELECT verification_status INTO _vstatus
    FROM library_memberships WHERE user_id = _uid AND library_id = _library_id;
  IF _vstatus IS NULL OR _vstatus IS DISTINCT FROM 'verified' THEN
    RAISE EXCEPTION 'Cadastro precisa estar verificado para avaliar';
  END IF;

  INSERT INTO book_reviews (user_id, book_id, library_id, rating, comment)
   VALUES (_uid, _book_id, _library_id, _rating, _comment)
  ON CONFLICT (user_id, book_id) DO UPDATE
    SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = now()
  RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.record_book_view(_book_id UUID, _library_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO book_views (book_id, library_id, user_id) VALUES (_book_id, _library_id, auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.create_book_suggestion(
  _library_id UUID, _title TEXT, _author TEXT DEFAULT NULL, _reason TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF length(coalesce(_title,'')) < 2 THEN RAISE EXCEPTION 'Título obrigatório'; END IF;
  INSERT INTO book_suggestions (library_id, user_id, title, author, reason)
   VALUES (_library_id, auth.uid(), _title, _author, _reason) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.create_notify_request(_book_id UUID, _library_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid UUID := auth.uid(); _vstatus verification_status; _existing UUID; _id UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT verification_status INTO _vstatus
    FROM library_memberships WHERE user_id = _uid AND library_id = _library_id;
  IF _vstatus IS NULL OR _vstatus IS DISTINCT FROM 'verified' THEN
    RAISE EXCEPTION 'Cadastro precisa estar verificado';
  END IF;
  SELECT id INTO _existing FROM notify_requests
   WHERE user_id = _uid AND book_id = _book_id AND library_id = _library_id AND status = 'pending';
  IF _existing IS NOT NULL THEN RETURN _existing; END IF;
  INSERT INTO notify_requests (user_id, book_id, library_id)
   VALUES (_uid, _book_id, _library_id) RETURNING id INTO _id;
  RETURN _id;
END $$;

-- Trigger: when copy becomes available, mark pending notify_requests as 'notified'
CREATE OR REPLACE FUNCTION public.notify_on_copy_available()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'available' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'available') THEN
    UPDATE notify_requests SET status = 'notified', notified_at = now()
     WHERE book_id = NEW.book_id AND library_id = NEW.library_id AND status = 'pending';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS book_copies_notify_available ON public.book_copies;
CREATE TRIGGER book_copies_notify_available
  AFTER INSERT OR UPDATE OF status ON public.book_copies
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_copy_available();

-- ----- Admin role management & user listing -----
CREATE OR REPLACE FUNCTION public.set_admin_role(
  _library_id UUID, _user_id UUID, _make_admin BOOLEAN
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (is_super_admin(auth.uid()) OR has_library_role(auth.uid(), 'admin', _library_id)) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;
  IF _user_id = auth.uid() AND NOT _make_admin THEN
    RAISE EXCEPTION 'Você não pode remover seu próprio acesso';
  END IF;
  IF _make_admin THEN
    INSERT INTO user_roles (user_id, role, library_id) VALUES (_user_id, 'admin', _library_id)
    ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM user_roles
     WHERE user_id = _user_id AND role = 'admin' AND library_id = _library_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.list_library_users(_library_id UUID)
RETURNS TABLE (
  id UUID, name TEXT, email TEXT, cpf TEXT, phone TEXT,
  verification_status verification_status, is_blocked BOOLEAN,
  is_admin BOOLEAN, joined_at TIMESTAMPTZ
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id, p.name, p.email, p.cpf, p.phone,
    COALESCE(m.verification_status, 'pending'::verification_status),
    COALESCE(m.is_blocked, false),
    EXISTS(
      SELECT 1 FROM user_roles ur
       WHERE ur.user_id = p.id AND ur.role = 'admin' AND ur.library_id = _library_id
    ),
    COALESCE(m.joined_at, p.created_at)
  FROM profiles p
  LEFT JOIN library_memberships m ON m.user_id = p.id AND m.library_id = _library_id
  WHERE has_library_role(auth.uid(), 'admin', _library_id)
    AND (
      m.library_id IS NOT NULL
      OR EXISTS (SELECT 1 FROM loans l WHERE l.user_id = p.id AND l.library_id = _library_id)
    )
  ORDER BY COALESCE(m.joined_at, p.created_at) DESC
$$;

-- ----- Rankings & stats -----
CREATE OR REPLACE FUNCTION public.get_top_readers(
  _library_id UUID, _period TEXT DEFAULT 'month', _limit INT DEFAULT 10
) RETURNS TABLE (user_id UUID, name TEXT, total BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.user_id,
         COALESCE(p.name, split_part(p.email, '@', 1), 'Leitor') AS name,
         COUNT(*)::BIGINT
    FROM loans l
    LEFT JOIN profiles p ON p.id = l.user_id
   WHERE l.library_id = _library_id AND l.loaned_at >= period_start(_period)
   GROUP BY l.user_id, p.name, p.email
   ORDER BY COUNT(*) DESC, name ASC
   LIMIT _limit
$$;

CREATE OR REPLACE FUNCTION public.get_top_books(
  _library_id UUID, _period TEXT DEFAULT 'month', _limit INT DEFAULT 10
) RETURNS TABLE (book_id UUID, title TEXT, author TEXT, cover_url TEXT, total BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.book_id, b.title, b.author, b.cover_url, COUNT(*)::BIGINT
    FROM book_views v
    JOIN books b ON b.id = v.book_id
   WHERE v.library_id = _library_id AND v.viewed_at >= period_start(_period)
   GROUP BY v.book_id, b.title, b.author, b.cover_url
   ORDER BY COUNT(*) DESC, b.title ASC
   LIMIT _limit
$$;

CREATE OR REPLACE FUNCTION public.get_most_loaned_books(
  _library_id UUID, _limit INT DEFAULT 8
) RETURNS TABLE (book_id UUID, title TEXT, author TEXT, cover_url TEXT, total BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.title, b.author, b.cover_url, COUNT(l.id)::BIGINT
    FROM books b JOIN loans l ON l.book_id = b.id
   WHERE b.library_id = _library_id
   GROUP BY b.id ORDER BY COUNT(l.id) DESC, b.title
   LIMIT _limit
$$;

CREATE OR REPLACE FUNCTION public.get_public_stats(_library_id UUID)
RETURNS TABLE (
  total_books BIGINT, total_copies BIGINT, total_readers BIGINT,
  total_loans BIGINT, total_categories BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT COUNT(*) FROM books WHERE library_id = _library_id),
    (SELECT COUNT(*) FROM book_copies WHERE library_id = _library_id),
    (SELECT COUNT(*) FROM library_memberships WHERE library_id = _library_id AND verification_status = 'verified'),
    (SELECT COUNT(*) FROM loans WHERE library_id = _library_id),
    (SELECT COUNT(*) FROM categories WHERE library_id = _library_id)
$$;

-- ----- Super admin -----
CREATE OR REPLACE FUNCTION public.create_library(
  _slug TEXT, _name TEXT, _city TEXT DEFAULT NULL,
  _state TEXT DEFAULT NULL, _description TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id UUID;
BEGIN
  IF NOT is_super_admin(auth.uid()) THEN RAISE EXCEPTION 'Apenas super-administrador'; END IF;
  INSERT INTO libraries (slug, name, city, state, description)
   VALUES (_slug, _name, _city, _state, _description) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.list_libraries_admin()
RETURNS TABLE (
  id UUID, slug TEXT, name TEXT, city TEXT, state TEXT,
  is_active BOOLEAN, created_at TIMESTAMPTZ,
  admin_count BIGINT, book_count BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.id, l.slug, l.name, l.city, l.state, l.is_active, l.created_at,
    (SELECT COUNT(*) FROM user_roles WHERE library_id = l.id AND role = 'admin'),
    (SELECT COUNT(*) FROM books WHERE library_id = l.id)
  FROM libraries l
  WHERE is_super_admin(auth.uid())
  ORDER BY l.created_at DESC
$$;

-- ============================================================
-- Storage buckets (created via supabase-js admin in seed step)
-- ============================================================
-- We will create buckets 'covers' (public) and 'documents' (private)
-- separately via the seed script (not via SQL).

-- ============================================================
-- Initial library: Cruz e Sousa (Schroeder/SC)
-- ============================================================
INSERT INTO public.libraries (slug, name, city, state, description) VALUES (
  'cruz-e-sousa',
  'Biblioteca Pública Municipal Cruz e Sousa',
  'Schroeder',
  'SC',
  'A biblioteca pública de Schroeder, no Vale do Itapocu.'
)
ON CONFLICT (slug) DO NOTHING;

-- Default categories for Cruz e Sousa (matching Manus seed)
INSERT INTO public.categories (library_id, name, slug)
SELECT l.id, c.name, c.slug
  FROM public.libraries l,
       (VALUES
         ('Lit. Brasileira',  'lit-brasileira'),
         ('Lit. Estrangeira', 'lit-estrangeira'),
         ('Infantojuvenil',   'infantojuvenil'),
         ('História',         'historia'),
         ('Romance',          'romance'),
         ('Poesia',           'poesia'),
         ('Educação',         'educacao'),
         ('Cidade de Schroeder', 'schroeder')
       ) AS c(name, slug)
 WHERE l.slug = 'cruz-e-sousa'
ON CONFLICT (library_id, slug) DO NOTHING;

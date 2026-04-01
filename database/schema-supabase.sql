-- ═══════════════════════════════════════════
-- AUREALUXE — Schema de Supabase
-- Ejecutar este SQL en el editor SQL de Supabase
-- ═══════════════════════════════════════════

-- Snapshot de extensiones instaladas en el proyecto (31-03-2026)
-- CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
-- CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
-- CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
-- plpgsql es extension base del motor.

-- Crear tabla de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha TIMESTAMPTZ DEFAULT now(),
  total DECIMAL(10,2),
  subtotal DECIMAL(10,2),
  descuento DECIMAL(10,2) DEFAULT 0,
  envio DECIMAL(10,2) DEFAULT 0,
  estado TEXT DEFAULT 'pendiente',
  cliente_nombre TEXT NOT NULL,
  cliente_email TEXT NOT NULL,
  cliente_telefono TEXT NOT NULL,
  cliente_direccion TEXT,
  cliente_ciudad TEXT,
  cliente_referencia TEXT,
  cupon_usado TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Crear tabla de items del pedido
CREATE TABLE IF NOT EXISTS pedido_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  categoria TEXT,
  precio DECIMAL(10,2) NOT NULL,
  cantidad INT NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_items ENABLE ROW LEVEL SECURITY;

-- Crear políticas de seguridad para lectura/escritura pública
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pedidos'
      AND policyname = 'allow insert pedidos'
  ) THEN
    CREATE POLICY "allow insert pedidos" ON pedidos FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pedidos'
      AND policyname = 'allow select pedidos'
  ) THEN
    CREATE POLICY "allow select pedidos" ON pedidos FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pedidos'
      AND policyname = 'allow update pedidos'
  ) THEN
    CREATE POLICY "allow update pedidos" ON pedidos FOR UPDATE USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pedido_items'
      AND policyname = 'allow insert items'
  ) THEN
    CREATE POLICY "allow insert items" ON pedido_items FOR INSERT WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pedido_items'
      AND policyname = 'allow select items'
  ) THEN
    CREATE POLICY "allow select items" ON pedido_items FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pedido_items'
      AND policyname = 'allow update items'
  ) THEN
    CREATE POLICY "allow update items" ON pedido_items FOR UPDATE USING (true);
  END IF;
END $$;

-- Crear índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_email ON pedidos(cliente_email);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos(created_at);
CREATE INDEX IF NOT EXISTS idx_pedido_items_pedido_id ON pedido_items(pedido_id);

-- Comentarios documentales
COMMENT ON TABLE pedidos IS 'Almacena todos los pedidos realizados en AureaLuxe';
COMMENT ON TABLE pedido_items IS 'Detalle de items incluidos en cada pedido';
COMMENT ON COLUMN pedidos.estado IS 'Estados: pendiente, procesado, enviado, entregado, cancelado';

-- ═══════════════════════════════════════════
-- Contacto Web
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS contact_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  asunto TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  origen TEXT NOT NULL DEFAULT 'web_contacto',
  sent_to TEXT NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'pending',
  email_provider TEXT,
  email_provider_id TEXT,
  email_error TEXT
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email_status ON contact_messages(email_status);

COMMENT ON TABLE contact_messages IS 'Mensajes enviados desde el formulario de contacto web';

-- ═══════════════════════════════════════════
-- Registro de Usuarios (Auth + perfiles)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_email_lower_idx ON user_profiles (lower(email));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND policyname = 'insert own profile'
  ) THEN
    CREATE POLICY "insert own profile"
      ON user_profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND policyname = 'select own profile'
  ) THEN
    CREATE POLICY "select own profile"
      ON user_profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND policyname = 'update own profile'
  ) THEN
    CREATE POLICY "update own profile"
      ON user_profiles
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, nombre, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO UPDATE
    SET nombre = EXCLUDED.nombre,
        email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_profile();

COMMENT ON TABLE user_profiles IS 'Perfil básico de usuarios registrados mediante Supabase Auth';

-- ═══════════════════════════════════════════
-- Auto-RLS para tablas nuevas (objeto existente en Supabase)
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table', 'partitioned table')
  LOOP
    IF cmd.schema_name IS NOT NULL
      AND cmd.schema_name IN ('public')
      AND cmd.schema_name NOT IN ('pg_catalog', 'information_schema')
      AND cmd.schema_name NOT LIKE 'pg_toast%'
      AND cmd.schema_name NOT LIKE 'pg_temp%'
    THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
    ELSE
      RAISE LOG 'rls_auto_enable: skip % (schema no objetivo: %)', cmd.object_identity, cmd.schema_name;
    END IF;
  END LOOP;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_event_trigger
    WHERE evtname = 'ensure_rls'
  ) THEN
    EXECUTE $sql$
      CREATE EVENT TRIGGER ensure_rls
      ON ddl_command_end
      WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      EXECUTE FUNCTION public.rls_auto_enable()
    $sql$;
  END IF;
END $$;

COMMENT ON FUNCTION public.rls_auto_enable() IS 'Habilita RLS automaticamente en tablas nuevas del esquema public';

-- Event triggers detectados en el proyecto (referencia)
-- ensure_rls (custom del proyecto)
-- graphql_watch_ddl, graphql_watch_drop, issue_graphql_placeholder,
-- issue_pg_cron_access, issue_pg_graphql_access, issue_pg_net_access,
-- pgrst_ddl_watch, pgrst_drop_watch (gestionados por Supabase)

-- ═══════════════════════════════════════════
-- Reseñas y Calificaciones de Productos
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS product_reviews (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_nombre TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  reviewer_name TEXT,
  reviewer_email TEXT NOT NULL,
  is_verified_purchase BOOLEAN NOT NULL DEFAULT false,
  estado TEXT NOT NULL DEFAULT 'aprobada' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, reviewer_email)
);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_estado ON product_reviews(estado);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON product_reviews(created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_reviews'
      AND policyname = 'public read approved reviews'
  ) THEN
    CREATE POLICY "public read approved reviews"
      ON product_reviews
      FOR SELECT
      USING (estado = 'aprobada');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_reviews'
      AND policyname = 'authenticated insert own review'
  ) THEN
    CREATE POLICY "authenticated insert own review"
      ON product_reviews
      FOR INSERT
      TO authenticated
      WITH CHECK (reviewer_email = auth.email());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'product_reviews'
      AND policyname = 'authenticated update own review'
  ) THEN
    CREATE POLICY "authenticated update own review"
      ON product_reviews
      FOR UPDATE
      TO authenticated
      USING (reviewer_email = auth.email())
      WITH CHECK (reviewer_email = auth.email());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_product_reviews_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_reviews_updated_at ON product_reviews;
CREATE TRIGGER trg_product_reviews_updated_at
  BEFORE UPDATE ON product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_product_reviews_updated_at();

COMMENT ON TABLE product_reviews IS 'Reseñas y calificaciones por producto de usuarios registrados';

-- ═══════════════════════════════════════════
-- Direcciones Guardadas por Usuario (Checkout)
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  destinatario_nombre TEXT,
  telefono TEXT,
  direccion TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  referencia TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, label)
);

ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_default ON user_addresses(user_id, is_default);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_addresses'
      AND policyname = 'select own addresses'
  ) THEN
    CREATE POLICY "select own addresses"
      ON user_addresses
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_addresses'
      AND policyname = 'insert own addresses'
  ) THEN
    CREATE POLICY "insert own addresses"
      ON user_addresses
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_addresses'
      AND policyname = 'update own addresses'
  ) THEN
    CREATE POLICY "update own addresses"
      ON user_addresses
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_addresses'
      AND policyname = 'delete own addresses'
  ) THEN
    CREATE POLICY "delete own addresses"
      ON user_addresses
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_user_addresses_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_addresses_updated_at ON user_addresses;
CREATE TRIGGER trg_user_addresses_updated_at
  BEFORE UPDATE ON user_addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_user_addresses_updated_at();

COMMENT ON TABLE user_addresses IS 'Direcciones guardadas por usuario para acelerar el checkout';

-- ═══════════════════════════════════════════
-- Metricas y Embudo de Conversion
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS conversion_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'add_to_cart', 'checkout_started', 'purchase_completed')),
  visitor_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_email TEXT,
  page_path TEXT,
  page_title TEXT,
  referrer TEXT,
  product_id TEXT,
  product_name TEXT,
  category TEXT,
  brand TEXT,
  quantity INT,
  value NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'COP',
  order_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE conversion_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'conversion_events'
      AND policyname = 'allow public insert conversion events'
  ) THEN
    CREATE POLICY "allow public insert conversion events"
      ON conversion_events
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversion_events_event_type ON conversion_events(event_type);
CREATE INDEX IF NOT EXISTS idx_conversion_events_occurred_at ON conversion_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversion_events_page_path ON conversion_events(page_path);
CREATE INDEX IF NOT EXISTS idx_conversion_events_session_id ON conversion_events(session_id);
CREATE INDEX IF NOT EXISTS idx_conversion_events_visitor_id ON conversion_events(visitor_id);

CREATE OR REPLACE VIEW conversion_funnel_daily AS
SELECT
  date_trunc('day', occurred_at)::date AS day,
  count(DISTINCT session_id) FILTER (WHERE event_type = 'page_view') AS visitas,
  count(DISTINCT session_id) FILTER (WHERE event_type = 'add_to_cart') AS agregados_carrito,
  count(DISTINCT session_id) FILTER (WHERE event_type = 'checkout_started') AS checkout_iniciado,
  count(DISTINCT session_id) FILTER (WHERE event_type = 'purchase_completed') AS compra_final,
  round(
    (count(DISTINCT session_id) FILTER (WHERE event_type = 'add_to_cart')::numeric
    / NULLIF(count(DISTINCT session_id) FILTER (WHERE event_type = 'page_view'), 0)) * 100,
    2
  ) AS tasa_visita_a_carrito,
  round(
    (count(DISTINCT session_id) FILTER (WHERE event_type = 'checkout_started')::numeric
    / NULLIF(count(DISTINCT session_id) FILTER (WHERE event_type = 'add_to_cart'), 0)) * 100,
    2
  ) AS tasa_carrito_a_checkout,
  round(
    (count(DISTINCT session_id) FILTER (WHERE event_type = 'purchase_completed')::numeric
    / NULLIF(count(DISTINCT session_id) FILTER (WHERE event_type = 'checkout_started'), 0)) * 100,
    2
  ) AS tasa_checkout_a_compra
FROM conversion_events
GROUP BY 1
ORDER BY 1 DESC;

CREATE OR REPLACE VIEW conversion_funnel_summary_30d AS
WITH base AS (
  SELECT
    session_id,
    bool_or(event_type = 'page_view') AS visited,
    bool_or(event_type = 'add_to_cart') AS added,
    bool_or(event_type = 'checkout_started') AS started,
    bool_or(event_type = 'purchase_completed') AS bought
  FROM conversion_events
  WHERE occurred_at >= now() - INTERVAL '30 days'
  GROUP BY session_id
)
SELECT
  count(*) FILTER (WHERE visited) AS visitas,
  count(*) FILTER (WHERE added) AS agregados_carrito,
  count(*) FILTER (WHERE started) AS checkout_iniciado,
  count(*) FILTER (WHERE bought) AS compra_final,
  round((count(*) FILTER (WHERE added)::numeric / NULLIF(count(*) FILTER (WHERE visited), 0)) * 100, 2) AS tasa_visita_a_carrito,
  round((count(*) FILTER (WHERE started)::numeric / NULLIF(count(*) FILTER (WHERE added), 0)) * 100, 2) AS tasa_carrito_a_checkout,
  round((count(*) FILTER (WHERE bought)::numeric / NULLIF(count(*) FILTER (WHERE started), 0)) * 100, 2) AS tasa_checkout_a_compra,
  round((count(*) FILTER (WHERE bought)::numeric / NULLIF(count(*) FILTER (WHERE visited), 0)) * 100, 2) AS tasa_visita_a_compra
FROM base;

COMMENT ON TABLE conversion_events IS 'Eventos de conversion del ecommerce para analisis de embudo';
COMMENT ON VIEW conversion_funnel_daily IS 'Embudo de conversion diario por sesiones';
COMMENT ON VIEW conversion_funnel_summary_30d IS 'Resumen de embudo de conversion de los ultimos 30 dias';

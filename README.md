# AUREALUXE — Tienda E-Commerce Multipágina

![AUREALUXE](assets/img/logo/aurea-logo.png)

## 📱 ¿Qué es AUREALUXE?

**AUREALUXE** es una tienda web de e-commerce moderna y completamente funcional, desarrollada con **HTML5, CSS3 y JavaScript vanilla**. Está optimizada para desplegar en **Vercel** sin costos adicionales y utiliza **Supabase** como base de datos y servicio de autenticación.

Es la solución perfecta para pequeños y medianos negocios que desean tener presencia online sin depender de plataformas pesadas. Incluye todas las funcionalidades esenciales de un e-commerce: catálogo de productos, carrito persistente, autenticación de usuarios, seguimiento de pedidos y análisis de conversión.

---

## ✨ Características Principales

### 🛍️ Gestión de Productos
- Catálogo dinámico de productos con búsqueda y filtros
- Imágenes optimizadas con carrousel
- Descripciones detalladas y especificaciones
- Precios actualizables desde Supabase

### 🛒 Carrito de Compras
- Carrito persistente (se guarda en localStorage)
- Agregar/eliminar/actualizar cantidad de productos
- Cálculo automático de totales y impuestos
- Sincronización con perfil del usuario autenticado

### 💳 Checkout y Pedidos
- Pagos simulados y guardados directamente en Supabase
- Creación automática de órdenes y detalles de líneas
- Estados de pedido: `procesado`, `enviado`, `entregado`
- Confirmación y resumen de compra

### 👤 Autenticación y Perfil
- Registro seguro de usuarios con validación
- Login/Logout con manejo de sesiones
- Recuperación de contraseña por email
- Perfil de usuario con historial de compras

### 📧 Email y Notificaciones
- Confirmación de regstro automática
- Notificaciones de estado de pedido
- Newsletter opt-in en ofertas
- Mensajes de contacto desde el sitio

### 📊 Análisis y Seguimiento
- Embudo de conversión (30 días): vistas → agregaciones → pedidos
- Tracking de eventos de usuario
- Reporte de ingresos por período
- Dashboard en Supabase para monitoreo

### 🎯 Campañas y Ofertas
- Página de ofertas especiales
- Newsletter con descuentos exclusivos
- Landing page para campañas
- Gestión de suscriptores

### 📍 Seguimiento de Pedidos
- Estado real del envío
- Historial de cambios
- Contacto directo con soporte

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
|-----------|-----------|
| **Frontend** | HTML5, CSS3, JavaScript (vanilla) |
| **Backend** | Supabase (Postgres + Auth) |
| **Base de Datos** | PostgreSQL (Supabase) |
| **Almacenamiento** | Supabase Storage |
| **Hosting** | Vercel (deployments automáticos) |
| **Versionado** | Git + GitHub |

---

## 📂 Estructura de Carpetas

```
AUREALUXE/
├── index.html                 # Página de inicio
├── productos.html             # Catálogo de productos
├── carrito.html               # Carrito y checkout
├── estado-envio.html          # Seguimiento de pedidos
├── ofertas.html               # Ofertas y newsletter
├── login.html                 # Autenticación de usuario
├── registro.html              # Registro de nuevos usuarios
├── contacto.html              # Formulario de contacto
├── nosotros.html              # Información de la empresa
├── forgot-password.html       # Recuperación de contraseña
│
├── assets/
│   ├── css/                   # Estilos por página
│   │   ├── style.css
│   │   ├── carrito.css
│   │   ├── productos.css
│   │   ├── login.css
│   │   ├── registro.css
│   │   ├── ofertas.css
│   │   ├── contacto.css
│   │   └── nosotros.css
│   │
│   ├── js/                    # Scripts por funcionalidad
│   │   ├── script.js          # Global (nav, utils, listeners)
│   │   ├── carrito.js         # Carrito y checkout
│   │   ├── carrito-sync.js    # Sincronización con Supabase
│   │   ├── productos.js       # Catálogo dinámico
│   │   ├── login.js           # Autenticación
│   │   ├── registro.js        # Registro de usuarios
│   │   ├── contacto.js        # Formulario de contacto
│   │   ├── ofertas.js         # Newsletter y ofertas
│   │   ├── nosotros.js        # Página sobre nosotros
│   │   └── supabase-init.js   # Configuración de Supabase
│   │
│   ├── img/
│   │   ├── logo/              # Logo de la marca
│   │   ├── Banner/            # Imágenes principales
│   │   └── Carrucel/          # Imágenes de productos
│   │
│   └── icons/                 # Iconos SVG/PNG
│
├── database/
│   └── schema-supabase.sql    # Esquema completo y vistas
│
├── .gitignore                 # Archivos ignorados en git
├── README.md                  # Este archivo
├── LIMPIEZA-CODIGO.md         # Registro de cambios
├── CARRITO-README.md          # Documentación específica del carrito
└── vercel.json                # Configuración de despliegue Vercel

```

---

## 🚀 Instalación y Configuración

### Requisitos Previos
- **Node.js** (opcional, para herramientas locales)
- **Git** instalado en tu máquina
- Cuenta en **GitHub**
- Cuenta en **Vercel**
- Proyecto de **Supabase** ya creado y configurado

### Paso 1: Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto (tienda-aurealuxe o similar)
3. Espera a que se inicialice (5-10 min)
4. Ve a **SQL Editor** → **Nuevos query** → Copia todo el contenido de `database/schema-supabase.sql`
5. Ejecuta el query para crear tablas, vistas y triggers

### Paso 2: Obtener Credenciales de Supabase

1. En tu proyecto Supabase, ve a **Settings** → **API**
2. Copia:
   - **Project URL** (ej: `https://xxxxx.supabase.co`)
   - **Anon Key** (la key pública)
3. Guarda estas credenciales temporalmente

### Paso 3: Actualizar Configuración del Proyecto

En los archivos JavaScript, actualiza estas constantes con tus datos:

**Archivos a modificar:**
- `assets/js/supabase-init.js`
- `assets/js/script.js`
- `assets/js/carrito-sync.js`

**Variables a actualizar:**
```javascript
// En cada archivo releave:
const SUPABASE_URL = "https://tu-proyecto.supabase.co";
const SUPABASE_KEY = "tu-anon-key-aqui";
```

### Paso 4: Subir a GitHub

```bash
# Clona o descarga el repositorio
cd "tu-carpeta-aurealuxe"

# Inicializa git (si no está hecho)
git init

# Agrega todos los archivos
git add .

# Primer commit
git commit -m "chore: initial release - AUREALUXE ecommerce"

# Cambia rama a 'main'
git branch -M main

# Añade tu repositorio remoto
git remote add origin https://github.com/TU_USUARIO/aurealuxe.git

# Sube el código
git push -u origin main
```

### Paso 5: Desplegar en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Haz login con tu cuenta de GitHub
3. Haz clic en **Import Project**
4. Selecciona el repositorio `aurealuxe`
5. **Framework Preset:** `Other`
6. **Root Directory:** `./`
7. Haz clic en **Deploy**

Vercel empezará a construir y desplegar automáticamente. La URL estará disponible en segundos.

---

## 🎮 Uso Post-Despliegue

### Flujo Típico de Usuario

1. **Exploración**
   - Usuario accede a la tienda (`index.html`)
   - Navega por `productos.html` para ver el catálogo
   - Puede ver ofertas especiales en `ofertas.html`

2. **Compra**
   - Agrega productos al carrito
   - Va a `carrito.html` (checkout)
   - Revisa su resumen de compra
   - Presiona "Finalizar compra"
   - El pedido se guarda automáticamente en Supabase con estado `procesado`

3. **Seguimiento**
   - Usuario accede a `estado-envio.html` para ver su pedido
   - Ve el estado actual y historial del envío

4. **Autenticación (Opcional)**
   - Usuario puede registrarse en `registro.html`
   - Valida su email y accede a su cuenta
   - Su perfil y historial de compras se mantienen sincronizados

### Validación Rápida Post-Deploy

```bash
# Checklist de validación:
☐ Página de inicio carga sin errores 404
☐ Imágenes del logo y carrousel se ven correctamente
☐ Agregar un producto al carrito funciona
☐ Confirmar pedido en checkout guardó datos en Supabase
☐ Estado de envío muestra el pedido creado
☐ Newsletter opt-in en ofertas envía datos
☐ Login/Registro funcionan (con confirmación de email)
☐ Footer incluye logo de AUREALUXE
```

---

## 🔐 Variables de Entorno

No se necesitan archivos `.env` tradicionales. Las credenciales de Supabase están embebidas de forma segura en el código JavaScript (la key pública):

```javascript
// Segura: Key pública, solo lectura/insert en filas auth
const SUPABASE_KEY = "eyJ..."; // Anon Key de Supabase

// NO incluir: Secret keys o claves privadas
```

## 📊 Base de Datos

### Tablas Principales

| Tabla | Descripción |
|-------|-----------|
| `users` | Perfiles de usuario (integrada con Auth de Supabase) |
| `products` | Catálogo de productos |
| `orders` | Pedidos completados |
| `order_items` | Ítems de cada pedido |
| `subscriptions` | Suscriptores a newsletter |
| `contacts` | Mensajes desde formulario de contacto |

### Vistas para Análisis

| Vista | Propósito |
|-------|-----------|
| `conversion_funnel_summary_30d` | Embudo: vistas → agregaciones → pedidos (últimos 30 días) |
| `daily_revenue_summary` | Ingresos diarios |

Lee el archivo `database/schema-supabase.sql` para ver la definición completa.

---

## 💳 Sistema de Pagos Simulado

Para **desarrollo y demostración**, los pagos funcionan así:

1. Usuario completa el formulario de checkout
2. Presiona "Finalizar compra"
3. Sistema crea un registro en la tabla `orders` con estado `procesado`
4. Se crean registros en `order_items` para cada producto
5. Carrito se limpia y usuario se redirige a `estado-envio.html`
6. Usuario puede ver su pedido en la tabla `orders` de Supabase

### Para Cambiar a Pasarela de Pago Real

Cuando estés listo para integrar pagos reales (Stripe, Wompi, etc.):

1. Modifica `assets/js/carrito.js` en la función `finalizarCompra()`
2. Agrega llamada a tu API de pagos
3. Solo guarda la orden en Supabase si el pago fue exitoso
4. Documenta los cambios en un archivo nuevo

---

## 📧 Funciones Edge (Supabase)

El proyecto predefinido no requiere funciones edge, pero puedes añadir:

- **Envío de emails** automáticos (confirmación, estado de pedido)
- **Webhooks** para integraciones externas
- **Rate limiting** y seguridad

Ve a Supabase → Functions para crear nuevas funciones.

---

## 🐛 Troubleshooting

### Error: "No puedo ver los productos"
- Verifica que `SUPABASE_URL` y `SUPABASE_KEY` estén correcto en `script.js`
- Asegúrate de que la tabla `products` tenga datos en Supabase

### Error: 404 en imágenes
- Verifica las rutas en `/assets/img/` respecto a las referencias en HTML
- En Vercel, asegúrate de que los archivos estén en la raíz correcta

### Error: Emails no se envían
- Necesitas crear una función edge en Supabase Server Client
- O integrar un servicio como SendGrid o Mailgun

### El carrito se borra al recargar
- Esto es normal si no estás autenticado. Con autenticación, los datos se sincronizan
- Usa localStorage para guardar carrito anónimo (ya implementado)

---

## 📚 Documentación Adicional

- **LIMPIEZA-CODIGO.md**: Historial de refactoring y cambios
- **CARRITO-README.md**: Documentación específica del módulo carrito

---

## ❓ Preguntas Frecuentes (FAQ)

### ¿Cómo agrego productos a la tienda?

1. Ve a tu proyecto Supabase
2. En **SQL Editor**, ejecuta:
```sql
INSERT INTO products (name, description, price, stock, image_url, category)
VALUES ('Producto Test', 'Descripción...', 29.99, 50, 'url-imagen.jpg', 'categoria');
```
3. Los productos aparecerán automáticamente en `productos.html`

### ¿El carrito funciona sin autenticación?

**Sí.** El carrito usa `localStorage` para usuarios anónimos. Con autenticación, los datos se sincronizan a Supabase y persisten en múltiples dispositivos.

### ¿Cómo cambio el logo?

1. Reemplaza la imagen en `assets/img/logo/aurea-logo.png`
2. Asegúrate que sea PNG o JPG
3. Dimensión recomendada: 200x200px o similar

### ¿Puedo usar AUREALUXE sin Supabase?

No. Supabase es obligatorio para:
- Autenticación de usuarios
- Almacenamiento de productos
- Guardado de pedidos
- Analytics

### ¿Vercel tiene costo?

No. El hosting en Vercel es **gratuito** para proyectos estáticos. Incluye:
- Deploy automático desde GitHub
- SSL/HTTPS incluido
- URL personalizada

### ¿Cada cuánto debo actualizar?

- **AUREALUXE**: Verifica GitHub regularmente para seguridad
- **Supabase**: Mantén auto-backups activos
- **Dependencias**: No hay dependencias externas (vanilla JS)

### ¿Cómo agrego idioma adicional?

1. Duplica los archivos HTML (ej: `productos-en.html`)
2. Traduce el contenido manualmente
3. Duplica los CSS/JS con sufijo de idioma
4. Añade selector de idioma en navbar

### ¿El pago simulado es seguro?

**Para desarrollo:** Sí, esconde datos reales.
**Para producción:** Reemplázalo con Stripe/Wompi antes de lanzar.

---

## 🔐 Seguridad y Mejores Prácticas

### ✅ Checklist de Seguridad

- [x] No incluir claves secretas en el código
- [x] Usar Anon Key (pública) de Supabase
- [x] RLS (Row Level Security) en tablas Supabase
- [x] Validación en frontend y backend
- [x] HTTPS en producción (Vercel lo hace automático)
- [x] No almacenar datos sensibles en localStorage

### 🛡️ Configuración de Seguridad Supabase

En tu proyecto Supabase, HABILITA Row Level Security (RLS):

```sql
-- Para tabla 'orders' (solo usuarios ven sus propios pedidos)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios solo ven sus propios pedidos"
  ON orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Similar para 'subscriptions', 'contacts', etc.
```

### ⚠️ Manejo de Credenciales

```javascript
// ✅ CORRECTO: Key pública en el código
const SUPABASE_URL = "https://xxxxx.supabase.co";
const SUPABASE_KEY = "eyJ..."; // Anon Key

// ❌ NUNCA: Secret key en el código
const SECRET_KEY = "sbp_..."; // NO HAGAS ESTO
```

---

## 🚀 Optimizaciones y Tips

### Performance

1. **Lazy loading de imágenes:**
```html
<img src="producto.jpg" loading="lazy" alt="Producto">
```

2. **Minificación CSS/JS** (Vercel lo hace automático)

3. **Caché en navegador:**
```javascript
// En script.js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}
```

### SEO

Cada página tiene metadatos. Para mejorar SEO:

1. Añade `<meta name="description">` en cada HTML
2. Usa `<meta og:...>` para redes sociales
3. Estructura datos con JSON-LD

### Analytics

Ya está integrado. Para ver datos:

1. Ve a Supabase → `analytics_events` tabla
2. Ve a `conversion_funnel_summary_30d` para embudo de ventas
3. Usa `daily_revenue_summary` para reportes

---

## 📦 Deployments y Versiones

### Local Development

```bash
cd aurealuxe
python -m http.server 8000
# Abre http://localhost:8000
```

### Staging (Pre-Producción)

1. Crea rama `develop` en GitHub
2. Linkea otra rama en Vercel para pre-visualizar cambios
3. Merge a `main` solo cuando todo esté validado

### Producción

- Branch `main` siempre en Vercel
- Tags en Git para releases: `v1.0.0`, `v1.1.0`, etc.

---

## 🔄 Flujo de Actualización

Cuando hagas cambios:

```bash
# 1. Crea rama
git checkout -b feature/nueva-funcionalidad

# 2. Haz cambios y commits
git add .
git commit -m "feat: nueva funcionalidad"

# 3. Push a rama
git push origin feature/nueva-funcionalidad

# 4. Pull Request en GitHub (optional)

# 5. Merge a main
git checkout main
git merge feature/nueva-funcionalidad
git push origin main

# Vercel redeploy automáticamente
```

---

## 🤝 Contribuciones

Si quieres contribuir:

1. Fork el repositorio
2. Crea rama: `git checkout -b mejora/tu-cambio`
3. Commits descriptivos
4. Push y abre Pull Request
5. Incluye descripción de cambios

### Estándar de commits:

```
feat:    Nueva funcionalidad
fix:     Corrección de bug
docs:    Cambios en documentación
style:   Formato de código
refactor: Reorganización sin cambiar funcionalidad
perf:    Optimización de performance
test:    Añadir/actualizar tests
chore:   Mantenimiento
```

---

## 📈 Roadmap Futuro

**Versión 2.0 (Próximas mejoras):**
- [ ] Admin Dashboard (gestionar productos)
- [ ] Sistema de descuentos (cupones, promociones)
- [ ] Reviews y ratings de productos
- [ ] Historial de búsquedas (personalizadas)
- [ ] Wishlist compartible
- [ ] PWA (aplicación instalable)
- [ ] Push notifications
- [ ] Soporte multiidioma

**Versión 3.0 (Integraciones reales):**
- [ ] Stripe/Wompi pagos reales
- [ ] SendGrid para emails automatizados
- [ ] Google Analytics + Hotjar
- [ ] Integración con inventario
- [ ] API pública para terceros

---

## 🎬 Casos de Uso Reales

### Tienda de Ropa Online
- AUREALUXE + categorías de tallas/colores
- Integración con Wompi (Colombia)
- Newsletter con tendencias

### e-Book Store
- Hosting en Supabase Storage
- Link de descarga en email automático
- Analytics de descargas

### Marketplace Local
- Multi-vendedor usando rol en Supabase Auth
- Dashboard vendedor
- Sistema de comisiones

### SaaS Landing Page
- Catálogo de planes (en lugar de productos)
- Pago por Stripe
- Acceso a app tras pago

---

## 📞 Soporte y Comunidad

- **Documentación Supabase**: https://supabase.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **HTML/CSS/JS**: https://developer.mozilla.org

¿Problemas? Abre un [issue en GitHub](https://github.com/TU_USUARIO/aurealuxe/issues).

---

## 🎓 Tecnologías Aprendidas en Este Proyecto

- ✅ Vanilla JavaScript (sin frameworks)
- ✅ Supabase Auth y Postgres
- ✅ REST API y realtime updates
- ✅ Deploy con Vercel
- ✅ Git workflow profesional
- ✅ HTML semántico y CSS responsivo

---

## 💡 Mejoras Futuras

- [ ] Implementar pagos reales (Stripe/Wompi)
- [ ] Agregar PWA (Progressive Web App)
- [ ] Soporte multiidioma
- [ ] Sistema de reseñas de productos
- [ ] Admin dashboard
- [ ] Integración con redes sociales
- [ ] Recomendaciones impulsadas por IA

---

## 📄 Licencia

Este proyecto está disponible bajo licencia **MIT**. Siéntete libre de usar, modificar y distribuir.

---

## 📞 Contacto y Soporte

¿Preguntas o sugerencias?
- **Email**: contacto@aurealuxe.com (configurable)
- **GitHub Issues**: [Abre un issue en el repositorio](https://github.com/TU_USUARIO/aurealuxe/issues)
- **Página de contacto**: Disponible en `contacto.html`

---

**Hecho con ❤️ para emprendedores digitales.**

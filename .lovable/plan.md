
# Plan: Neocharge — Tienda premium de productos de carga/energía

## 1. Punto de partida
- Importar el contenido del ZIP `neocharge-main.zip` (productos, copy, imágenes, lógica) y reaplicarlo sobre una base **nueva** y mejorada en Lovable. No copiamos el código tal cual: extraemos lo valioso (textos, productos, fotos, branding) y lo montamos sobre el stack actual (React + Tailwind + shadcn).
- Idioma: **español** en toda la UI.
- Pagos / catálogo: **Shopify** (productos físicos con inventario y envío). Empezamos creando una *development store* gratuita en Lovable y luego se puede reclamar para vender real.

## 2. Sistema de diseño (claro, moderno, premium)
Estilo: limpio tipo Apple/Linear/Tesla pero con personalidad “energía” — blanco luminoso, mucho aire, tipografía grande, detalles sutiles de color eléctrico.

- **Paleta clara**:
  - Fondo principal blanco roto / marfil suave
  - Tinta casi-negra para texto
  - **Acento eléctrico** (un único color de marca: azul eléctrico o verde-lima energía, definido en `index.css` como token HSL)
  - Grises neutros bien escalonados para superficies, bordes y muted
  - Gradientes muy sutiles (radial wash detrás de hero y secciones clave)
- **Tipografía**: una sans serif moderna (Inter / Geist / Space Grotesk) con jerarquía generosa: H1 ~64–80px desktop, line-height ajustado, kerning fino.
- **Tokens**: todo se centraliza en `index.css` (HSL) y `tailwind.config.ts` — nada de colores hardcoded en componentes. Variants extra para botones (`hero`, `ghost-electric`, `outline-soft`), cards (`product`, `feature`, `glass`).
- **Sombras y radios**: sombras suaves multicapa, esquinas redondeadas consistentes (12–20px), bordes hairline 1px en gris muy claro.
- **Modo**: solo claro (sin dark toggle, como pediste).
- **Accesibilidad**: contraste AA, focus visible en todos los interactivos, `prefers-reduced-motion` respetado.

## 3. Estructura del sitio (rutas)
- `/` — Home
- `/tienda` — listado de productos (con filtros y búsqueda)
- `/producto/:handle` — detalle de producto
- `/carrito` — carrito lateral + página completa
- `/checkout` — redirección segura a Shopify Checkout
- `/cuenta` — login / registro / pedidos / direcciones (opcional)
- `/sobre-nosotros` — historia de marca
- `/contacto` — formulario de contacto
- `/preguntas-frecuentes` — FAQ
- `/envios-y-devoluciones`, `/garantia`, `/privacidad`, `/terminos` — legales
- `/404` — página de error con personalidad

## 4. Home (página principal)
Secciones, en orden:
1. **Nav sticky con glass** translúcido al hacer scroll, logo, links, buscador, ícono cuenta, ícono carrito con contador animado.
2. **Hero** a pantalla completa: titular grande + subtítulo + dos CTAs (“Comprar ahora” / “Ver productos”), imagen/render del producto estrella con un **glow eléctrico** detrás, partículas sutiles flotando, badge de “Envío gratis desde X”.
3. **Tira de logos / sellos de confianza** (medios, certificaciones, “+10.000 clientes”).
4. **Producto destacado**: card grande con imagen, specs clave en pills, botón añadir al carrito directo.
5. **Grid de categorías** (3–4 cards con hover-zoom y overlay de degradado).
6. **“Por qué Neocharge”**: 3–4 features con íconos animados (carga rápida, garantía, envío, soporte).
7. **Bestsellers**: carrusel horizontal de productos con scroll-snap.
8. **Cómo funciona / specs técnicas** con visual interactivo (tabs o stepper animado).
9. **Testimonios** en cards con foto y rating.
10. **FAQ** (accordion).
11. **Newsletter** (email capture con validación y toast de éxito).
12. **Footer** completo con links, redes, métodos de pago, idioma/moneda.

## 5. Animaciones e interacciones inmersivas
- **Reveal on scroll** (Intersection Observer) en cada bloque: fade + translateY suave, escalonado.
- **Parallax sutil** en hero (imagen y glow se mueven a ritmos distintos).
- **Cursor magnético** en botones primarios y CTAs.
- **Hover de productos**: imagen con leve zoom + cambio a 2ª imagen + botón “Añadir” aparece deslizando.
- **Botón añadir al carrito**: micro-animación (check ✓ + bump del contador del nav + toast).
- **Carrito lateral (Sheet)** con slide-in desde la derecha, líneas de producto editables (qty +/-), subtotal animado, botón checkout grande.
- **Page transitions** suaves entre rutas.
- **Números que cuentan** en sección de stats (clientes, países, etc.).
- **Partículas / glow** en hero usando CSS puro (sin libs pesadas) — si hace falta más, Framer Motion para orquestación.
- Todo respeta `prefers-reduced-motion` (degrada a fades simples).

## 6. Funciones de e-commerce (Shopify)
- **Catálogo** sincronizado desde Shopify (productos, variantes, precios, stock, imágenes).
- **Listado /tienda**: grid responsive, filtros por categoría/precio, ordenar (precio, novedad, popularidad), búsqueda con debounce.
- **Detalle de producto**: galería con zoom, selector de variantes (color/tamaño), stock en vivo, descripción rica, specs en tabla, productos relacionados, añadir al carrito y “comprar ya”.
- **Carrito** persistente (localStorage + sesión Shopify): añadir, eliminar, cambiar cantidad, código de descuento, cálculo de envío estimado.
- **Checkout**: redirección al checkout seguro de Shopify (maneja pagos, impuestos, envío real).
- **Cuentas opcionales**: registro/login Shopify Customer; ver historial de pedidos, tracking, direcciones guardadas, wishlist en localStorage si no hay cuenta.
- **Estados vacíos** bonitos (carrito vacío, búsqueda sin resultados, etc.).
- **Loading skeletons** en cada fetch.
- **Manejo de errores** con toasts claros en español.

## 7. Páginas de soporte
- **Sobre nosotros**: storytelling de marca, misión, foto de equipo, timeline.
- **Contacto**: formulario (nombre, email, asunto, mensaje) que envía a un endpoint o email; validación con react-hook-form + zod.
- **FAQ**: accordion agrupado por temas (compras, envíos, garantía, técnico).
- **Legales**: páginas estándar con tipografía legible.

## 8. SEO, performance y calidad
- Meta tags dinámicos por página (title, description, OG image).
- Schema.org Product + Organization.
- Imágenes optimizadas (loading lazy, tamaños responsive).
- Lighthouse objetivo 90+ en performance y accesibilidad.
- Sitemap y robots.txt.

## 9. Pasos de ejecución (al aprobar el plan)
1. Extraer el ZIP, leer todo el contenido (productos, textos, imágenes, branding) y guardar memoria del proyecto.
2. Definir el sistema de diseño en `index.css` y `tailwind.config.ts` (tokens HSL, fuentes, sombras, animaciones).
3. Crear layout base (Nav sticky, Footer, Toaster, providers).
4. Activar **Shopify** (development store nueva) y cargar los productos extraídos del ZIP.
5. Construir Home con todas las secciones y animaciones inmersivas.
6. Construir tienda, detalle de producto y carrito conectados a Shopify.
7. Añadir cuentas opcionales, contacto, FAQ y páginas legales.
8. QA visual responsive (móvil, tablet, desktop), revisar todos los flujos (añadir al carrito, checkout, login), pulir microinteracciones.

> Nota: la activación de Shopify abrirá un botón de aprobación cuando llegue el momento. Empezamos con una *development store* (gratis mientras desarrollamos); más adelante puedes “reclamarla” para vender de verdad (trial de 30 días y luego plan Shopify).

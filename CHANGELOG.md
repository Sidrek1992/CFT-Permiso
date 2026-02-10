# Changelog

Todas las modificaciones notables del proyecto se documentan en este archivo.

## [1.3.1] - 2026-02-10

### 🔐 Seguridad
- Endurecida validación de entorno en backend: `AUTH_PASSWORD_HASH` ahora es obligatorio y validado en formato SHA-256
- Comparación segura de hash con `timingSafeEqual` y límites anti fuerza bruta en login
- Rate limit, límites de tamaño y timeout para consultas de IA
- Persistencia local de sesiones con flush automático y limpieza de expiradas (`server/sessionStore.js`)
- Encabezados de seguridad HTTP básicos añadidos en API

### ✅ Reglas de negocio y consistencia
- Validación de saldos al crear y aprobar solicitudes (`utils/requestRules.ts`)
- Validación semántica adicional en imports: fechas válidas, rango, días consistentes y solapamientos aprobados
- Corregido dato inicial inconsistente en solicitud parcial (`constants.ts`)

### ♿ UX / Accesibilidad
- Limpieza automática de selecciones stale en Dashboard y Reportes
- Soporte de teclado en filas seleccionables (`Enter`/`Espacio`)
- Calendario ahora abre en mes actual o próxima ausencia aprobada

### ⚡ Robustez técnica
- `localStorage` persiste con debounce para reducir escrituras
- Utilidades HTTP centralizadas para parseo JSON seguro y construcción de URLs de API
- Import JSON/Excel con validación de extensión y tamaño máximo de archivo

### 🛡 Dependencias
- `jspdf` actualizado a `^4.1.0` para resolver vulnerabilidades críticas previas
- Permanece pendiente vulnerabilidad conocida en `xlsx` (sin fix disponible en npm audit)

## [1.3.0] - 2026-02-10

### 🔐 Seguridad
- Se movió autenticación al backend (`/api/auth/*`) con sesiones temporales
- El consumo de Gemini ahora se realiza vía API backend (`/api/ai/ask`) y no desde el bundle frontend
- Se agregó plantilla de variables de entorno para hash de contraseña y configuración de sesión

### ⚡ Rendimiento
- Se aplicó lazy loading para módulos principales de la app
- `xlsx` y `jspdf` pasan a carga dinámica bajo demanda
- Se configuró `manualChunks` en Vite para mejorar partición de bundle

### ✅ Calidad y consistencia
- Se corrigió desalineación de saldos: ahora se recalculan desde solicitudes aprobadas
- Se reforzó validación de importaciones JSON/Excel (estructura, enums, fechas y referencias)
- Se añadió soporte completo de tipos para entorno Vite (`vite-env.d.ts`)
- Se incorporaron pruebas unitarias para utilidades críticas

### 🛠️ DX
- Nuevos scripts: `dev:api`, `test`, `test:watch`, `lint`
- Se agregaron tipos de React para dejar `typecheck` operativo

## [1.2.0] - 2026-02-10

### 🔒 Seguridad
- Contraseña ahora se verifica mediante hash SHA-256 (Web Crypto API) en lugar de texto plano
- Documentada exposición de API key de Gemini en `.env.example` con advertencias
- Se eliminó el uso de `any` en imports de Excel (ahora `Record<string, unknown>`)

### 🐛 Corrección de Errores
- **Fechas:** Corregido bug crítico en solicitud #109 donde fecha inicio era posterior a fecha fin
- **Fechas:** Solucionado bug de zona horaria en cálculos de fechas (ahora usa hora local)
- **Sidebar:** Corregido bug que ocultaba el sidebar en vista mobile
- **Filtros:** Implementados filtros de estado y tipo que no funcionaban en Solicitudes
- **Reversión:** Implementada lógica para devolver días cuando se rechaza una solicitud
- **División por cero:** Añadida protección en barra de progreso de EmployeeProfile

### ✨ Nuevas Funcionalidades
- **Paginación:** Solicitudes ahora muestra resultados paginados
- **Confirmación:** Diálogo de confirmación al aprobar solicitudes
- **Calendario:** Indicadores visuales de feriados nacionales en días del calendario
- **Calendario:** Leyenda de colores por tipo de permiso
- **Validación:** Validación de datos al importar JSON/Excel (estructura y tipos)
- **Foco modal:** Focus trap en modales (EmployeeProfile) con Escape para cerrar

### ♿ Accesibilidad
- ARIA labels en todos los botones interactivos, tablas, y formularios
- Atributos `role`, `aria-modal`, `aria-live`, `aria-hidden` en componentes
- Etiquetas `<label>` asociadas a inputs con `htmlFor`/`id`
- Atributo `scope="col"` en headers de tablas
- Skip-to-content link en `index.html`
- Toast con `role="alert"` y `aria-live="assertive"`
- Sidebar con `role="navigation"` y `aria-label`
- Chat AI con `role="log"` y `aria-live="polite"`
- Botones de iconos con `aria-hidden="true"` en iconos decorativos

### 🧹 Calidad de Código
- **Utilidades centralizadas:**
  - `dateUtils.ts` — Formateo de fechas en español, cálculo de días hábiles
  - `colorUtils.ts` — Mapeo unificado de colores por tipo/estado/turno
  - `reportUtils.ts` — Generación de reportes reutilizable (eliminó duplicación Dashboard/Reports)
  - `validators.ts` — Validación de esquema para datos importados
- Documentación JSDoc completa en `types.ts`
- Eliminados imports no usados (`LayoutTemplate`, `COLORS`, `RechartsTooltip`, etc.)
- Eliminada duplicación de lógica de reportes entre Dashboard y Reports

### 📦 Configuración
- `tsconfig.json`: Activado `strict`, `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`
- `tsconfig.json`: Removida referencia a tipos de `node` (innecesarios para app de browser)
- `package.json`: Añadido script `typecheck` para verificación de tipos
- `package.json`: Versión actualizada a 1.2.0 con descripción del proyecto
- `.env.example`: Plantilla de variables de entorno documentada
- `index.html`: Meta description, theme-color, y skip-to-content link

### 📖 Documentación
- `README.md` reescrito con descripción completa, stack, estructura, scripts, y notas de seguridad
- `CHANGELOG.md` creado con historial de cambios detallado

---

## [1.0.0] - 2026-01-15

### Lanzamiento Inicial
- Dashboard con estadísticas y gráficos
- Gestión CRUD de funcionarios
- Solicitudes de permiso (feriado legal, administrativo, licencia médica, sin goce, post natal)
- Calendario mensual de ausencias
- Generación de reportes por email
- Asistente IA con Google Gemini
- Exportar/Importar datos en JSON y Excel
- Generación de PDF de solicitudes
- Configuración de plantillas de email

<div align="center">

# 🏢 Gestión HR Institucional

**Sistema de Gestión de Recursos Humanos para Instituciones Educativas**

![Version](https://img.shields.io/badge/version-1.3.1-indigo)
![React](https://img.shields.io/badge/React-19-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6)
![Vite](https://img.shields.io/badge/Vite-6-646CFF)

</div>

---

## 📋 Descripción

Sistema web completo para la gestión del personal de instituciones de formación técnica (CFT). Permite administrar funcionarios, solicitudes de permisos (feriado legal, administrativo, licencia médica), generar reportes diarios por email, y exportar/importar datos en JSON y Excel.

## ✨ Funcionalidades Principales

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | Vista general con estadísticas, estado diario del personal, y gráficos |
| **Calendario** | Vista mensual de ausencias con indicadores de feriados nacionales |
| **Funcionarios** | CRUD completo de empleados con perfil detallado y saldos |
| **Solicitudes** | Gestión de permisos con filtros, paginación, y generación de PDF |
| **Reportes** | Generación de informes categorizados por tipo de ausencia |
| **Asistente IA** | Chat potenciado por Google Gemini para consultas rápidas |
| **Configuración** | Plantillas de email, respaldos JSON/Excel, parámetros institucionales |

## 🛠️ Stack Tecnológico

- **Frontend:** React 19 + TypeScript 5.8
- **Backend API:** Express 5 (autenticación + proxy Gemini)
- **Bundler:** Vite 6
- **Gráficos:** Recharts
- **Iconos:** Lucide React
- **PDF:** jsPDF
- **Excel:** SheetJS (xlsx)
- **IA:** Google Gemini API (`@google/genai`)
- **Estilos:** Tailwind CSS + Inter Font

## 🚀 Instalación y Ejecución

### Prerrequisitos

- [Node.js](https://nodejs.org/) v18 o superior
- Una API Key de [Google AI Studio](https://aistudio.google.com/apikey) (para el Asistente IA)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/Sidrek1992/CFT-Permiso.git
cd CFT-Permiso

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local (al menos AUTH_PASSWORD_HASH y GEMINI_API_KEY)

# 4. Ejecutar backend API (terminal 1)
npm run dev:api

# 5. Ejecutar frontend (terminal 2)
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

## 📁 Estructura del Proyecto

```
CFT-Permiso/
├── components/          # Componentes React de la aplicación
│   ├── AIAssistant.tsx   # Chat con asistente IA
│   ├── CalendarView.tsx  # Vista de calendario mensual
│   ├── Dashboard.tsx     # Panel principal con estadísticas
│   ├── EmployeeList.tsx  # Lista y gestión de funcionarios
│   ├── EmployeeProfile.tsx # Modal de perfil detallado
│   ├── LeaveRequests.tsx # Gestión de solicitudes
│   ├── LoginScreen.tsx   # Pantalla de autenticación
│   ├── Reports.tsx       # Generación de reportes
│   ├── Settings.tsx      # Configuración del sistema
│   ├── Sidebar.tsx       # Navegación lateral
│   └── Toast.tsx         # Notificaciones emergentes
├── services/
│   ├── geminiService.ts  # Cliente frontend para API interna
│   └── http.ts           # Utilidades HTTP (URL base + parse seguro)
├── server/
│   ├── index.js          # API Express (auth + Gemini)
│   └── sessionStore.js   # Persistencia local de sesiones
├── utils/               # Utilidades compartidas
│   ├── colorUtils.ts    # Mapeo de colores por tipo de permiso
│   ├── dateUtils.ts     # Formateo y cálculo de fechas
│   ├── balanceUtils.ts  # Recalculo de saldos por solicitudes
│   ├── reportUtils.ts   # Generación de reportes
│   ├── requestRules.ts  # Reglas de negocio de saldo
│   └── validators.ts    # Validación de datos importados
├── App.tsx              # Componente raíz y estado global
├── constants.ts         # Datos iniciales y feriados nacionales
├── types.ts             # Tipos e interfaces TypeScript
├── index.tsx            # Punto de entrada
├── index.html           # HTML base
├── vite.config.ts       # Configuración de Vite
├── tsconfig.json        # Configuración de TypeScript
├── package.json         # Dependencias y scripts
├── .env.example         # Plantilla de variables de entorno
└── CHANGELOG.md         # Historial de cambios
```

## 🔧 Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run dev:api` | Inicia la API backend local |
| `npm run build` | Genera el build de producción |
| `npm run preview` | Previsualiza el build de producción |
| `npm run typecheck` | Verifica tipos TypeScript |
| `npm run test` | Ejecuta pruebas con Vitest |
| `npm run lint` | Ejecuta chequeo estático (TypeScript) |

## ⚠️ Notas de Seguridad

- La autenticación se valida en backend con sesiones persistidas en archivo local. Para producción, migrar a Redis/DB, usar HTTPS y rotar secretos.
- La API Key de Gemini se mantiene en el backend y ya no viaja en el bundle frontend.
- El endpoint de IA incluye límites de tasa y tamaño de payload para reducir abuso/costos.
- Los datos se almacenan en `localStorage` del navegador. Para persistencia real, usar una base de datos.

## 📄 Licencia

Sistema de uso interno institucional. © 2026

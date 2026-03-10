# Plan de Reestructuración del Proyecto POS

## 1. Análisis del Estado Actual

### 1.1 Estructura Actual Identificada

```
Sis_post-web-github/
├── backend/
│   ├── server.js                    # ⚠️ MONOLÍTICO (356KB)
│   ├── auth-middleware.js
│   ├── auth-utils.js
│   ├── credentials-endpoints.js
│   ├── debts-endpoints.js
│   ├── users-endpoints.js
│   ├── migrate-endpoints.js
│   ├── database-sqlite.js
│   ├── database-utils.js
│   ├── response-middleware.js
│   ├── error-handler.js
│   ├── repositories/
│   │   ├── base-repository.js
│   │   ├── customers-repository.js
│   │   ├── debts-repository.js       # ⚠️ 27KB - muy grande
│   │   └── sales-repository.js
│   ├── api/
│   │   └── customers.js
│   ├── middleware/
│   │   └── endpoint-redirect.js
│   ├── validators/
│   │   └── debt-validator.js
│   └── *.js                         # ⚠️ ~50 scripts de diagnóstico/migración
│
├── frontend/
│   ├── dashboard.js                 # ⚠️ 288KB - MONOLÍTICO
│   ├── dashboard.html               # ⚠️ 396KB - MUY GRANDE
│   ├── index.html                   # ⚠️ 149KB
│   ├── script.js                    # 63KB
│   ├── dashboard.css                # 16KB
│   ├── cierre-caja-functions.js     # 16KB
│   ├── dashboard-performance.js     # 21KB
│   └── otros archivos de diagnóstico
│
├── shared/                          # ⚠️ Código duplicado
│   ├── error-handler.js            # Duplicado de backend/error-handler.js
│   ├── error-middleware.js
│   ├── auth.js
│   ├── cuenta-corriente-manager.js # 20KB
│   └── ...
│
├── code-analysis/                   # ⚠️ Debería ser un proyecto separado
│   ├── services/
│   ├── models/
│   ├── vscode-extension/
│   └── ...
│
├── models/
│   └── Xenova/                      # Modelos ML
│
├── tools/                           # Utilidades varias
│   ├── assets/
│   ├── backups/
│   └── ...
│
├── launchers/                       # Scripts de inicio
│
└── docs/                            # Documentación
```

### 1.2 Problemas Identificados

| Problema | Impacto |severity|
|----------|---------|---------|
| `backend/server.js` de 356KB | Difícil de mantener, debuggear y entender | 🔴 Crítico |
| `frontend/dashboard.js` de 288KB | Carga lenta, código spaghetti | 🔴 Crítico |
| `frontend/dashboard.html` de 396KB | HTML inline excesivo, difícil mantenimiento | 🔴 Crítico |
| Código duplicado | Inconsistencias, mayor tamaño | 🟠 Alto |
| 50+ scripts de diagnóstico en backend/ | Confusión, riesgo de ejecución accidental | 🟠 Alto |
| Mezcla de concerns | Backend hace太多 cosas | 🟠 Alto |
| Falta de modularidad | No hay patrón claro de arquitectura | 🟠 Alto |
| code-analysis/ dentro del proyecto | Debería ser submodule o proyecto separado | 🟡 Medio |

---

## 2. Arquitectura Propuesta

### 2.1 Estructura de Directorios Nueva

```
sis-post/
├── backend/                          # API REST Node.js/Express
│   ├── src/
│   │   ├── index.js                 # Entry point (minimalo)
│   │   ├── app.js                  # Configuración Express
│   │   ├── config/
│   │   │   ├── database.js         # Configuración SQLite
│   │   │   └── env.js               # Variables de entorno
│   │   ├── routes/                  # Rutas organizadas por dominio
│   │   │   ├── auth.js
│   │   │   ├── products.js
│   │   │   ├── sales.js
│   │   │   ├── customers.js
│   │   │   ├── debts.js
│   │   │   ├── caja.js
│   │   │   └── index.js            # Router central
│   │   ├── controllers/            # Lógica de negocio
│   │   │   ├── auth-controller.js
│   │   │   ├── product-controller.js
│   │   │   ├── sale-controller.js
│   │   │   ├── customer-controller.js
│   │   │   ├── debt-controller.js
│   │   │   └── caja-controller.js
│   │   ├── models/                  # Modelos de base de datos
│   │   │   ├── database.js
│   │   │   ├── Product.js
│   │   │   ├── Customer.js
│   │   │   ├── Sale.js
│   │   │   ├── Debt.js
│   │   │   ├── User.js
│   │   │   └── Cierre.js
│   │   ├── repositories/           # Acceso a datos
│   │   │   ├── BaseRepository.js
│   │   │   ├── ProductRepository.js
│   │   │   ├── CustomerRepository.js
│   │   │   ├── SaleRepository.js
│   │   │   ├── DebtRepository.js
│   │   │   └── UserRepository.js
│   │   ├── middleware/              # Middleware Express
│   │   │   ├── auth.js
│   │   │   ├── error-handler.js
│   │   │   ├── validator.js
│   │   │   └── logger.js
│   │   ├── services/               # Servicios externos
│   │   │   ├── PdfService.js
│   │   │   ├── NotificationService.js
│   │   │   └── ExportService.js
│   │   ├── utils/                   # Utilidades
│   │   │   ├── constants.js
│   │   │   ├── helpers.js
│   │   │   └── validators.js
│   │   └── migrations/              # Migraciones DB
│   │       ├── 001_initial_schema.sql
│   │       └── 002_*.sql
│   ├── data/                        # Archivos SQLite
│   │   └── pos.db
│   ├── package.json
│   └── .env.example
│
├── frontend/                         # Frontend Vanilla JS
│   ├── src/
│   │   ├── index.html              # Entry point
│   │   ├── app.js                  # App initialization
│   │   ├── config/
│   │   │   └── api.js              # Config API endpoints
│   │   ├── core/                   # Core functionality
│   │   │   ├── Router.js           # Simple SPA router
│   │   │   ├── Store.js            # State management
│   │   │   ├── ApiClient.js        # HTTP client
│   │   │   └── EventBus.js         # Event system
│   │   ├── components/             # Componentes UI
│   │   │   ├── Header/
│   │   │   ├── Sidebar/
│   │   │   ├── ProductCard/
│   │   │   ├── Cart/
│   │   │   ├── Modal/
│   │   │   ├── DataTable/
│   │   │   └── ...
│   │   ├── pages/                   # Vistas/Páginas
│   │   │   ├── Dashboard/
│   │   │   │   ├── index.html
│   │   │   │   ├── dashboard.js
│   │   │   │   └── dashboard.css
│   │   │   ├── Sales/
│   │   │   ├── Products/
│   │   │   ├── Customers/
│   │   │   ├── Caja/
│   │   │   └── Reports/
│   │   ├── services/               # Servicios frontend
│   │   │   ├── AuthService.js
│   │   │   ├── ProductService.js
│   │   │   ├── SaleService.js
│   │   │   └── DebtService.js
│   │   ├── utils/                   # Utilidades
│   │   │   ├── formatters.js
│   │   │   ├── validators.js
│   │   │   └── constants.js
│   │   └── styles/                  # Estilos globales
│   │       ├── variables.css
│   │       ├── base.css
│   │       └── components.css
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   ├── package.json
│   └── vite.config.js              # Build tool
│
├── shared/                          # Código compartido
│   ├── constants.js
│   ├── types.js                     # Type definitions (JSDoc)
│   └── utils/
│
├── docs/                            # Documentación
│
└── package.json                     # Root package.json para workspace
```

### 2.2 Patrón de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  Pages  │  │   UI    │  │ Services│  │  Core   │        │
│  │         │  │Components│  │         │  │Router.js│        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       └────────────┴────────────┴────────────┘              │
│                         │                                    │
│                    ApiClient                                │
└─────────────────────────┼───────────────────────────────────┘
                          │ HTTP/REST
┌─────────────────────────┼───────────────────────────────────┐
│                         │           BACKEND                  │
│                    ┌────┴────┐                               │
│                    │ Routes  │  (Express Router)            │
│                    └────┬────┘                               │
│       ┌─────────────────┼─────────────────┐                 │
│  ┌────┴────┐      ┌─────┴─────┐    ┌──────┴──────┐         │
│  │Controller│     │ Controller│    │ Controller  │         │
│  │ (Sales)  │     │(Products) │    │ (Customers) │         │
│  └────┬────┘      └─────┬─────┘    └──────┬──────┘         │
│       └─────────────────┼─────────────────┘                 │
│                    ┌────┴────┐                               │
│                    │Services │  (Business Logic)            │
│                    └────┬────┘                               │
│       ┌─────────────────┼─────────────────┐                 │
│  ┌────┴────┐      ┌─────┴─────┐    ┌──────┴──────┐         │
│  │Repository│     │Repository │    │ Repository  │         │
│  │  (DAO)   │     │   (DAO)   │    │    (DAO)    │         │
│  └────┬────┘      └─────┬─────┘    └──────┬──────┘         │
│       └─────────────────┼─────────────────┘                 │
│                    ┌────┴────┐                               │
│                    │   DB    │  (SQLite)                     │
│                    └─────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Plan de Implementación (Fases)

### Fase 1: Preparación y Análisis (Semana 1)

- [ ] **1.1** Documentar todos los endpoints actuales de `server.js`
- [ ] **1.2** Mapear todas las tablas de la base de datos SQLite
- [ ] **1.3** Identificar todas las dependencias entre módulos
- [ ] **1.4** Crear tests básicos de smoke para endpoints actuales
- [ ] **1.5** Respaldar la base de datos actual

### Fase 2: Estructura Base del Backend (Semana 2)

- [ ] **2.1** Crear nueva estructura de directorios backend
- [ ] **2.2** Configurar package.json con dependencias
- [ ] **2.3** Crear servidor Express básico (`src/index.js`)
- [ ] **2.4** Implementar configuración de base de datos
- [ ] **2.5** Configurar middleware básico (CORS, compression, JSON)
- [ ] **2.6** Crear sistema de logging básico

### Fase 3: Migración de Endpoints por Dominio (Semanas 3-4)

#### 3.1 Authentication
- [ ] **3.1.1** Migrar `auth-middleware.js` → `src/middleware/auth.js`
- [ ] **3.1.2** Migrar `auth-utils.js` → `src/utils/auth.js`
- [ ] **3.1.3** Migrar endpoints de auth → `src/routes/auth.js`
- [ ] **3.1.4** Crear `UserRepository` y `User` model

#### 3.2 Products
- [ ] **3.2.1** Crear `ProductRepository` y `Product` model
- [ ] **3.2.2** Migrar lógica de productos a `src/repositories/`
- [ ] **3.2.3** Crear `ProductController` y `src/routes/products.js`

#### 3.3 Sales
- [ ] **3.3.1** Crear `SaleRepository` y `Sale` model
- [ ] **3.3.2** Migrar lógica de ventas
- [ ] **3.3.3** Crear `SaleController` y `src/routes/sales.js`

#### 3.4 Customers
- [ ] **3.4.1** Migrar `backend/api/customers.js` y repositorio
- [ ] **3.4.2** Crear `CustomerController` y `src/routes/customers.js`

#### 3.5 Debts (Cuenta Corriente)
- [ ] **3.5.1** Migrar lógica de deudas desde monolithic
- [ ] **3.5.2** Crear `DebtRepository` optimizado
- [ ] **3.5.3** Crear `DebtController` y `src/routes/debts.js`

#### 3.6 Caja/Cierre
- [ ] **3.6.1** Migrar lógica de cierre de caja
- [ ] **3.6.2** Crear `CajaController` y `src/routes/caja.js`

### Fase 4: Refactorización del Frontend (Semanas 5-6)

- [ ] **4.1** Configurar build con Vite
- [ ] **4.2** Crear estructura de directorios frontend
- [ ] **4.3** Implementar Core (Router, Store, ApiClient, EventBus)
- [ ] **4.4** Extraer componentes UI reutilizables
- [ ] **4.5** Migrar dashboard.html a múltiples páginas
- [ ] **4.6** Migrar dashboard.js a módulos organizados

### Fase 5: Optimización y Limpieza (Semana 7)

- [ ] **5.1** Eliminar código duplicado
- [ ] **5.2** Consolidar utilidades
- [ ] **5.3** Agregar validación centralizada
- [ ] **5.4** Implementar manejo de errores consistente
- [ ] **5.5** Agregar tests unitarios

### Fase 6: Documentación y Deploy (Semana 8)

- [ ] **6.1** Crear README con instrucciones de instalación
- [ ] **6.2** Documentar API endpoints
- [ ] **6.3** Crear script de migración de datos
- [ ] **6.4** Configurar CI/CD básico
- [ ] **6.5** Testing de integración

---

## 4. Criterios de Éxito

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| Tamaño server.js | 356KB | < 30KB por archivo |
| Tamaño dashboard.js | 288KB | < 10KB por módulo |
| Número de archivos en backend/ root | ~60 | < 10 |
| Puntos de entrada | 1 (server.js) | Múltiples (routes/*) |
| Tests | 0 | > 50覆盖率>70% |
| Acoplamiento | Alto | Bajo (inyección dependencias) |

---

## 5. Notas Importantes

### 5.1 Estrategia de Migración Incremental

1. **Parallel Run**: Mantener ambos sistemas corriendo temporalmente
2. **Feature Flags**: Poder toggle entre código viejo y nuevo
3. **Mismo API**: No cambiar contratos de endpoints durante migración
4. **Database First**: La DB permanece igual, solo se migra código

### 5.2 Sistemas Existentes a Preservar (NO DUPLICAR)

#### Sistema de Autenticación (ya implementado)

| Archivo | Función |
|---------|---------|
| [`shared/auth.js`](shared/auth.js) | Modal de login unificado, manejo de sesión |
| [`frontend/auth-integration.js`](frontend/auth-integration.js) | Integración del ApiClient con auth |
| [`backend/auth-middleware.js`](backend/auth-middleware.js) | Middleware JWT/Basic Auth con bcrypt |
| [`backend/auth-utils.js`](backend/auth-utils.js) | Utilidades de autenticación, logs |
| [`backend/users-endpoints.js`](backend/users-endpoints.js) | Endpoints de login, users, profiles |

**Características:**
- Login con usuario/contraseña
- Almacenamiento en sessionStorage
- Modal de login unificado
- Control de intentos fallidos (bloqueo 15 min después de 5 intentos)
- Roles de usuario (admin, cajero, invitado)

---

#### Sistema de Productos y Lotes

**Arquitectura actual:**
```
Proveedor → Pedido → ConfirmarLlegada → Crear Lotes → Venta FIFO → Stock
                                                               ↓
                                                    Cancelación → Stock LIFO
```

**Tabla `productos`:**
- id, codigo, nombre, descripcion, precio, stock, categoria, codigo_barras, activo, lote_actual_id

**Tabla `lotes`:**
- id, producto_id, numero_lote, fecha_vencimiento, cantidad_inicial, cantidad_actual, costo_unitario, estado

**Estados de lote:** `activo` (vigente), `descartado`

**Flujo de venta:**
1. Sistema FIFO (First In, First Out)
2. Solo se venden lotes vigentes (no vencidos)
3. Stock calculado automáticamente desde suma de `cantidad_actual` de lotes activos

**Modales relacionados:**
- `addModal` - Crear producto
- `editModal` - Editar producto
- `createLoteModal` - Crear lote manualmente
- `editLoteModal` - Editar lote
- `confirmDeliveryModal` - Confirmar pedido y crear lotes automáticamente

### 5.3 Elementos a Eliminar/Archivar

- ❌ Scripts de diagnóstico en backend/ root
- ❌ Código duplicado en shared/
- ❌ Carpetas de backups dentro del proyecto
- ❌ Proyecto code-analysis/ (mover a repo separado)

---

## 6. Comandos de Ejecución

```bash
# Desarrollo
cd backend && npm run dev

# Frontend (con Vite)
cd frontend && npm run dev

# Producción
cd backend && npm start

# Tests
npm test
```

---

## 7. Progreso de Implementación (2026-03-07)

### 7.1 Completado ✅

#### Backend (refactorizando_sis_post/backend/)
- ✅ Estructura base modular con Express.js
- ✅ Rutas organizadas por dominio (auth, products, sales, customers, debts, caja, lotes)
- ✅ Sistema de autenticación JWT
- ✅ Endpoints de productos con cálculo dinámico de stock desde lotes
- ✅ Sistema de lotes (lotes.js) con CRUD completo
- ✅ Sistema FIFO para ventas (First In, First Out)
- ✅ Sistema LIFO para cancelaciones (Last In, First Out)
- ✅ Sincronización automática de stock al crear/actualizar/eliminar lotes
- ✅ Página de Lotes en frontend

#### Frontend (refactorizando_sis_post/frontend/)
- ✅ Estructura SPA con Vite
- ✅ Router, Store, ApiClient, EventBus
- ✅ Sistema de escaneo de código de barras
- ✅ Página Dashboard con productos
- ✅ Página Productos
- ✅ Página Clientes
- ✅ Página Lotes
- ✅ Integración con API del backend

### 7.2 Completado en esta sesión (2026-03-07 16:25) ✅

#### Backend
- ✅ Implementación de stock calculado dinámicamente desde lotes activos
- ✅ Función helper updateProductStock() para sincronizar stock al crear/actualizar/eliminar lotes
- ✅ Sistema FIFO (First In, First Out) para ventas - deduce del lote más viejo primero
- ✅ Sistema LIFO (Last In, First Out) para cancelaciones - restaura al lote más nuevo primero
- ✅ Actualización automática de productos con stock desde lotes
- ✅ Corregido SQL en customers.js y debts.js (cambiado `pagado` por `estado`)

#### Frontend
- ✅ Actualizado DashboardPage.js para usar stock_calculado
- ✅ Actualizado ProductsPage.js para usar stock_calculado
- ✅ Actualizado ProductService.js para usar stock_calculado en getLowStock

### 7.3 Pendiente ⚠️

#### Backend
- ⚠️ Depurar lógica de cancelación (el stock no vuelve al valor correcto)
- ⚠️ Implementar endpoint de caja/cierre diario
- ⚠️ Agregar validación de stock disponible antes de venta
- ⚠️ Migrar sistema de promociones/descuentos
- ⚠️ Tests unitarios

#### Frontend
- ⚠️ Página de Caja (apertura/cierre)
- ⚠️ Carrito de compras en el Dashboard
- ⚠️ Modal de venta rápida
- ⚠️ Mejoras en UX/UI
- ⚠️ Optimización de rendimiento

### 7.3 Sistema de Lotes - Detalles Técnicos

```
Arquitectura:
- Stock se calcula dinámicamente desde lotes activos con fecha_vencimiento >= now
- Solo se vende desde lotes no vencidos (estado = 'activo')
- FIFO: Primer lote en entrar = primer lote en salir
- Al vender: deduce del lote más viejo primero
- Al cancelar: restaura al lote más nuevo primero (LIFO)
- Si no hay lotes válidos: crea nuevo lote con datos de la cancelación

Tabla lotes:
- id, producto_id, numero_lote, fecha_vencimiento
- cantidad_inicial, cantidad_actual, costo_unitario
- estado: 'activo' | 'descartado'
```

---

*Documento generado para planificación de refactorización*
*Fecha: 2026-03-06*
*Última actualización: 2026-03-07*

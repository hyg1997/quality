# Arquitectura del Sistema

## 📋 Resumen Ejecutivo

Este documento describe la arquitectura completa del sistema de autenticación y gestión de usuarios desarrollado con Next.js 15, implementando patrones modernos de React y mejores prácticas de desarrollo.

## 🏗️ Arquitectura General

### Stack Tecnológico

- **Frontend**: Next.js 15 con App Router
- **Autenticación**: NextAuth.js v5
- **Base de Datos**: SQLite con Prisma ORM
- **Estilos**: Tailwind CSS
- **Lenguaje**: TypeScript
- **Iconos**: Lucide React
- **2FA**: Authenticator apps (TOTP)

### Estructura de Directorios

```
src/
├── app/                    # App Router de Next.js
│   ├── (dashboard)/       # Rutas protegidas
│   ├── auth/              # Páginas de autenticación
│   ├── api/               # API Routes
│   └── globals.css        # Estilos globales
├── components/            # Componentes reutilizables
│   ├── ui/               # Componentes UI base
│   ├── layouts/          # Layouts de página
│   └── ErrorBoundary.tsx # Manejo de errores
├── contexts/             # Contextos de React
├── hooks/                # Hooks personalizados
├── lib/                  # Utilidades y configuraciones
├── middleware/           # Middleware de API
├── services/             # Servicios API centralizados
└── tests/                # Tests unitarios
```

## 🎭 Sistema de Componentes

### Componentes UI Base

#### Modal System
- **Modal**: Componente base con portal rendering
- **ConfirmModal**: Modal de confirmación con tipos visuales
- **FormModal**: Modal especializado para formularios

**Características:**
- Portal rendering para overlay global
- Animaciones de entrada y salida
- Accesibilidad completa (ARIA)
- Prevención de scroll del body
- Cierre con Escape y overlay click

#### DataTable
- Tabla genérica tipada con TypeScript
- Definición declarativa de columnas
- Acciones contextuales por fila
- Paginación integrada
- Estados de carga y vacío

#### Layouts
- **PageLayout**: Layout principal con título y acciones
- **SectionLayout**: Layout para secciones internas
- **AppLayout**: Layout raíz con error boundaries

### Optimizaciones de Performance

- **React.memo**: Aplicado a componentes puros
- **useCallback**: Para funciones estables
- **useMemo**: Para valores computados costosos
- **Lazy loading**: Para componentes pesados

## 🎣 Sistema de Hooks

### Hooks Personalizados

#### usePermissions
```typescript
const { hasPermission, isAdmin, can, cannot } = usePermissions()
```
- Verificaciones de permisos memoizadas
- Funciones helper para renderizado condicional
- Integración con NextAuth session

#### useApi
```typescript
const { get, post, put, delete, loading, error } = useApi()
```
- Cliente HTTP centralizado
- Manejo automático de errores
- Estados de carga integrados
- Notificaciones automáticas

#### useForm
```typescript
const { values, errors, handleSubmit, getFieldProps } = useForm({
  initialValues,
  validationRules,
  onSubmit
})
```
- Validación en tiempo real
- Manejo de estado de formularios
- Props automáticas para inputs
- Validaciones personalizadas

#### useNotifications
```typescript
const { success, error, warning, info, clearAll } = useNotifications()
```
- API simplificada para notificaciones
- Patrones comunes predefinidos
- Gestión de estado reactivo

## 🏢 Servicios API

### Arquitectura de Servicios

#### ApiClient Base
```typescript
class ApiClient {
  async get<T>(endpoint: string): Promise<ApiResponse<T>>
  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>>
  // ... otros métodos HTTP
}
```

#### UserService
```typescript
class UserService {
  async getUsers(): Promise<ApiResponse<User[]>>
  async createUser(userData: CreateUserData): Promise<ApiResponse<User>>
  canDeleteUser(user: User): boolean
  formatUserDisplayName(user: User): string
  // ... más métodos
}
```

#### RoleService
```typescript
class RoleService {
  async getRoles(): Promise<ApiResponse<Role[]>>
  async getPermissions(): Promise<ApiResponse<Permission[]>>
  validateRoleLevel(level: number): ValidationResult
  // ... más métodos
}
```

### Beneficios de los Servicios
- Lógica de negocio encapsulada
- Reutilización entre componentes
- Testing simplificado
- Mantenimiento centralizado

## 🛡️ Middleware de API

### Sistema de Validación
```typescript
const validateUser = createValidationMiddleware(commonSchemas.createUser)
```
- Validación automática de requests
- Esquemas reutilizables
- Mensajes de error localizados
- Tipos soportados: string, number, email, uuid

### Rate Limiting
```typescript
const rateLimiter = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100
})
```
- Protección contra abuso
- Configuraciones por endpoint
- Headers estándar de rate limit
- Limpieza automática de registros

### Logging
```typescript
const logger = createLoggingMiddleware({
  logRequests: true,
  logResponses: true,
  logErrors: true
})
```
- Trazabilidad completa de requests
- IDs únicos para correlación
- Filtrado de datos sensibles
- Métricas de performance

## 🔐 Sistema de Autenticación

### NextAuth.js Configuration
```typescript
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [CredentialsProvider],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt: async ({ token, user }) => { /* ... */ },
    session: async ({ session, token }) => { /* ... */ }
  }
}
```

### Flujo de Autenticación
1. **Login**: Verificación de credenciales
2. **2FA Check**: Validación de TOTP si está habilitado
3. **Session Creation**: JWT con roles y permisos
4. **Route Protection**: Middleware de autenticación

### Sistema de Permisos
```typescript
interface Permission {
  id: string
  name: string        // "users:read"
  resource: string    // "users"
  action: string      // "read"
}

interface Role {
  id: string
  name: string
  level: number       // 1-100, 80+ para admins
  permissions: Permission[]
}
```

## 📊 Base de Datos

### Esquema Prisma
```prisma
model User {
  id                String   @id @default(cuid())
  email            String   @unique
  username         String?  @unique
  fullName         String
  password         String
  status           UserStatus @default(ACTIVE)
  twoFactorEnabled Boolean  @default(false)
  twoFactorSecret  String?
  roles            UserRole[]
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

model Role {
  id          String @id @default(cuid())
  name        String @unique
  displayName String
  description String?
  level       Int
  isProtected Boolean @default(false)
  permissions RolePermission[]
  users       UserRole[]
}

model Permission {
  id          String @id @default(cuid())
  name        String @unique
  displayName String
  description String?
  resource    String
  action      String
  roles       RolePermission[]
}
```

### Relaciones
- **User ↔ Role**: Relación muchos a muchos
- **Role ↔ Permission**: Relación muchos a muchos
- **Jerarquía de Roles**: Por nivel numérico

## 🔔 Sistema de Notificaciones

### Arquitectura
```typescript
interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}
```

### Componentes
- **NotificationContainer**: Portal con posicionamiento
- **NotificationItem**: Item individual con animaciones
- **useNotifications**: Hook para gestión

### Características
- Auto-dismiss configurable
- Animaciones de entrada/salida
- Barra de progreso para temporizados
- Posicionamiento flexible
- Límite máximo de notificaciones

## 🚀 Optimizaciones de Performance

### Estrategias Implementadas

1. **Memoización de Componentes**
   - React.memo para componentes puros
   - useCallback para funciones estables
   - useMemo para cálculos costosos

2. **Optimización de Re-renders**
   - Context value memoization
   - Stable function references
   - Conditional rendering optimization

3. **Code Splitting**
   - Lazy loading de componentes
   - Dynamic imports para rutas
   - Bundle optimization

4. **Caching**
   - API response caching
   - Static generation donde sea posible
   - Browser caching headers

## 📈 Métricas y Monitoreo

### Logging Levels
- **DEBUG**: Información detallada de desarrollo
- **INFO**: Operaciones normales
- **WARN**: Situaciones que requieren atención
- **ERROR**: Errores que requieren intervención

### Métricas Tracked
- Response times por endpoint
- Rate limit violations
- Authentication failures
- Error rates por componente
- User activity patterns

## 🔧 Herramientas de Desarrollo

### Configuración
- **ESLint**: Linting de código
- **Prettier**: Formateo automático
- **TypeScript**: Tipado estático
- **Tailwind CSS**: Utility-first CSS

### Scripts Disponibles
```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "db:push": "prisma db push",
  "db:seed": "tsx scripts/seed-modern.ts"
}
```

## 🧪 Testing Strategy

### Tipos de Tests
1. **Unit Tests**: Componentes individuales
2. **Integration Tests**: Flujos completos
3. **E2E Tests**: Casos de uso reales

### Herramientas Recomendadas
- **Jest**: Test runner
- **React Testing Library**: Testing de componentes
- **MSW**: Mocking de APIs
- **Playwright**: E2E testing

## 🚀 Deployment

### Consideraciones
- **Environment Variables**: Configuración por ambiente
- **Database Migrations**: Prisma migrations
- **Static Assets**: Optimización de imágenes
- **CDN**: Para assets estáticos

### Checklist de Deployment
- [ ] Variables de entorno configuradas
- [ ] Base de datos migrada
- [ ] Seeds ejecutados
- [ ] SSL configurado
- [ ] Monitoring habilitado

## 📚 Recursos Adicionales

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Guide](https://next-auth.js.org/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Hook Form](https://react-hook-form.com/)

---

**Última actualización**: Enero 2025
**Versión**: 1.0.0
**Mantenido por**: Equipo de Desarrollo
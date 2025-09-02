# Guía de Desarrollo

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+ 
- npm o yarn
- Git

### Instalación
```bash
# Clonar el repositorio
git clone <repository-url>
cd nextjs-auth-migration

# Instalar dependencias
npm install

# Configurar base de datos
npm run db:push
npm run db:seed

# Iniciar servidor de desarrollo
npm run dev
```

### Variables de Entorno
Crea un archivo `.env.local` con:
```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# App
NEXT_PUBLIC_APP_NAME="Sistema de Gestión"
NEXT_PUBLIC_APP_VERSION="1.0.0"
```

## 🏗️ Arquitectura de Desarrollo

### Estructura de Componentes

#### Crear un Nuevo Componente UI
```typescript
// src/components/ui/MyComponent/MyComponent.tsx
'use client'

import { memo, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface MyComponentProps {
  className?: string
  children?: React.ReactNode
  // ... otras props
}

function MyComponentBase({ className, children, ...props }: MyComponentProps) {
  const handleClick = useCallback(() => {
    // Lógica del componente
  }, [])

  return (
    <div className={cn('base-classes', className)} {...props}>
      {children}
    </div>
  )
}

// Memoizar para performance
export const MyComponent = memo(MyComponentBase)
export default MyComponent
```

#### Exportar en Index
```typescript
// src/components/ui/MyComponent/index.ts
export { MyComponent } from './MyComponent'
export type { MyComponentProps } from './MyComponent'
```

### Crear un Hook Personalizado
```typescript
// src/hooks/useMyHook.ts
'use client'

import { useState, useCallback, useMemo } from 'react'

export function useMyHook(initialValue?: string) {
  const [value, setValue] = useState(initialValue || '')
  
  // Memoizar funciones para performance
  const updateValue = useCallback((newValue: string) => {
    setValue(newValue)
  }, [])
  
  // Memoizar valores computados
  const computedValue = useMemo(() => {
    return value.toUpperCase()
  }, [value])
  
  return {
    value,
    updateValue,
    computedValue
  }
}

export default useMyHook
```

### Crear un Servicio API
```typescript
// src/services/api/myService.ts
import { apiClient, type ApiResponse } from './base'

export interface MyEntity {
  id: string
  name: string
  // ... otras propiedades
}

export interface CreateMyEntityData {
  name: string
  // ... datos de creación
}

export class MyService {
  async getAll(): Promise<ApiResponse<MyEntity[]>> {
    return apiClient.get('/api/my-entities')
  }
  
  async getById(id: string): Promise<ApiResponse<MyEntity>> {
    return apiClient.get(`/api/my-entities/${id}`)
  }
  
  async create(data: CreateMyEntityData): Promise<ApiResponse<MyEntity>> {
    return apiClient.post('/api/my-entities', data)
  }
  
  async update(id: string, data: Partial<CreateMyEntityData>): Promise<ApiResponse<MyEntity>> {
    return apiClient.put(`/api/my-entities/${id}`, data)
  }
  
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/api/my-entities/${id}`)
  }
  
  // Métodos helper de negocio
  canDelete(entity: MyEntity): boolean {
    // Lógica de negocio
    return true
  }
  
  formatDisplayName(entity: MyEntity): string {
    return entity.name
  }
}

export const myService = new MyService()
```

## 🎨 Guías de Estilo

### Convenciones de Naming

#### Archivos y Directorios
- **Componentes**: PascalCase (`UserCard.tsx`)
- **Hooks**: camelCase con prefijo `use` (`useUserData.ts`)
- **Servicios**: camelCase (`userService.ts`)
- **Utilidades**: camelCase (`formatDate.ts`)
- **Tipos**: PascalCase (`UserData.ts`)

#### Variables y Funciones
```typescript
// ✅ Correcto
const userName = 'John'
const isUserActive = true
const handleUserClick = () => {}
const getUserById = (id: string) => {}

// ❌ Incorrecto
const user_name = 'John'
const IsUserActive = true
const HandleUserClick = () => {}
```

#### Interfaces y Types
```typescript
// ✅ Correcto - Props con sufijo Props
interface UserCardProps {
  user: User
  onEdit: (user: User) => void
}

// ✅ Correcto - Datos sin sufijo
interface User {
  id: string
  name: string
}

// ✅ Correcto - Datos de creación con sufijo Data
interface CreateUserData {
  name: string
  email: string
}
```

### Estructura de Componentes
```typescript
// 1. Imports externos
import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// 2. Imports internos
import { Button } from '@/components/ui'
import { usePermissions } from '@/hooks/usePermissions'
import { userService } from '@/services/api'

// 3. Tipos e interfaces
interface MyComponentProps {
  // ...
}

// 4. Componente principal
export function MyComponent({ ...props }: MyComponentProps) {
  // 4.1. Hooks de estado
  const [loading, setLoading] = useState(false)
  
  // 4.2. Hooks personalizados
  const { hasPermission } = usePermissions()
  const router = useRouter()
  
  // 4.3. Funciones memoizadas
  const handleSubmit = useCallback(async () => {
    // Lógica
  }, [])
  
  // 4.4. Efectos
  useEffect(() => {
    // Efectos
  }, [])
  
  // 4.5. Early returns
  if (!hasPermission('users:read')) {
    return <div>Sin permisos</div>
  }
  
  // 4.6. Render principal
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

## 🔧 Herramientas de Desarrollo

### ESLint Configuration
```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### Prettier Configuration
```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### VS Code Settings
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## 🧪 Testing Guidelines

### Estructura de Tests
```typescript
// src/tests/components/MyComponent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MyComponent } from '@/components/MyComponent'

// Mock de dependencias
jest.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: jest.fn().mockReturnValue(true)
  })
}))

describe('MyComponent', () => {
  const defaultProps = {
    // props por defecto
  }
  
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  it('renders correctly', () => {
    render(<MyComponent {...defaultProps} />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
  
  it('handles user interaction', () => {
    const onClickMock = jest.fn()
    render(<MyComponent {...defaultProps} onClick={onClickMock} />)
    
    fireEvent.click(screen.getByRole('button'))
    expect(onClickMock).toHaveBeenCalledTimes(1)
  })
})
```

### Testing de Hooks
```typescript
// src/tests/hooks/useMyHook.test.ts
import { renderHook, act } from '@testing-library/react'
import { useMyHook } from '@/hooks/useMyHook'

describe('useMyHook', () => {
  it('initializes with default value', () => {
    const { result } = renderHook(() => useMyHook('initial'))
    expect(result.current.value).toBe('initial')
  })
  
  it('updates value correctly', () => {
    const { result } = renderHook(() => useMyHook())
    
    act(() => {
      result.current.updateValue('new value')
    })
    
    expect(result.current.value).toBe('new value')
  })
})
```

## 🚀 Performance Best Practices

### Optimización de Re-renders
```typescript
// ✅ Correcto - Memoización adecuada
const MyComponent = memo(({ data, onUpdate }) => {
  const handleClick = useCallback((id: string) => {
    onUpdate(id)
  }, [onUpdate])
  
  const processedData = useMemo(() => {
    return data.map(item => ({ ...item, processed: true }))
  }, [data])
  
  return (
    <div>
      {processedData.map(item => (
        <Item key={item.id} data={item} onClick={handleClick} />
      ))}
    </div>
  )
})

// ❌ Incorrecto - Recreación en cada render
const MyComponent = ({ data, onUpdate }) => {
  const handleClick = (id: string) => { // Se recrea en cada render
    onUpdate(id)
  }
  
  const processedData = data.map(item => ({ // Se recalcula en cada render
    ...item, 
    processed: true 
  }))
  
  return (
    <div>
      {processedData.map(item => (
        <Item key={item.id} data={item} onClick={handleClick} />
      ))}
    </div>
  )
}
```

### Lazy Loading
```typescript
// Componentes pesados
const HeavyComponent = lazy(() => import('./HeavyComponent'))

function MyPage() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  )
}
```

## 🔍 Debugging

### React DevTools
- Instalar React Developer Tools
- Usar Profiler para identificar re-renders
- Inspeccionar props y state

### Console Debugging
```typescript
// Debugging condicional
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', data)
}

// Debugging de performance
console.time('expensive-operation')
// ... operación costosa
console.timeEnd('expensive-operation')
```

### Error Boundaries
```typescript
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true }
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>
    }
    
    return this.props.children
  }
}
```

## 📦 Build y Deployment

### Build de Producción
```bash
# Build optimizado
npm run build

# Analizar bundle
npm run analyze

# Iniciar en producción
npm start
```

### Variables de Entorno por Ambiente
```bash
# .env.development
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_DEBUG=true

# .env.production
NEXT_PUBLIC_API_URL=https://api.production.com
NEXT_PUBLIC_DEBUG=false
```

### Checklist Pre-Deploy
- [ ] Tests pasando
- [ ] Build sin errores
- [ ] Variables de entorno configuradas
- [ ] Base de datos migrada
- [ ] Performance auditado
- [ ] Seguridad revisada

## 🤝 Contribución

### Flujo de Trabajo
1. Crear branch desde `main`
2. Desarrollar feature
3. Escribir tests
4. Crear Pull Request
5. Code Review
6. Merge a `main`

### Commit Messages
```bash
# Formato: tipo(scope): descripción
feat(auth): add 2FA support
fix(ui): resolve modal z-index issue
docs(api): update authentication guide
refactor(hooks): optimize usePermissions performance
```

### Code Review Checklist
- [ ] Código sigue convenciones
- [ ] Tests incluidos
- [ ] Performance considerado
- [ ] Accesibilidad verificada
- [ ] Documentación actualizada

---

**¿Necesitas ayuda?** Consulta la [documentación de arquitectura](./ARCHITECTURE.md) o contacta al equipo de desarrollo.
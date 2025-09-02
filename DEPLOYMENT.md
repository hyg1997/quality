# Guía de Deployment

## 🚀 Preparación para Producción

### Checklist Pre-Deployment

#### ✅ Código y Build
- [ ] Todos los tests pasan
- [ ] Build de producción sin errores
- [ ] Bundle size optimizado
- [ ] Performance auditado
- [ ] Código revisado y aprobado

#### ✅ Configuración
- [ ] Variables de entorno configuradas
- [ ] Secrets seguros configurados
- [ ] Base de datos de producción lista
- [ ] Migraciones ejecutadas
- [ ] Seeds de producción aplicados

#### ✅ Seguridad
- [ ] HTTPS configurado
- [ ] Headers de seguridad configurados
- [ ] Rate limiting habilitado
- [ ] Logging de seguridad activo
- [ ] Backup de base de datos configurado

## 🌐 Opciones de Deployment

### 1. Vercel (Recomendado)

#### Configuración Automática
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy desde el directorio del proyecto
vercel

# Deploy a producción
vercel --prod
```

#### Variables de Entorno en Vercel
```bash
# Configurar variables desde CLI
vercel env add NEXTAUTH_SECRET production
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_URL production
```

#### vercel.json
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

### 2. Netlify

#### netlify.toml
```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### 3. Docker

#### Dockerfile
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables must be present at build time
ARG NEXTAUTH_SECRET
ARG DATABASE_URL
ARG NEXTAUTH_URL

ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

## 🔧 Configuración de Producción

### Variables de Entorno

#### .env.production
```env
# App
NODE_ENV=production
NEXT_PUBLIC_APP_NAME="Sistema de Gestión"
NEXT_PUBLIC_APP_VERSION="1.0.0"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"

# NextAuth
NEXTAUTH_SECRET="your-super-secret-key-min-32-chars"
NEXTAUTH_URL="https://yourdomain.com"

# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Logging
LOG_LEVEL="info"
ENABLE_LOGGING="true"

# Security
ENABLE_RATE_LIMITING="true"
RATE_LIMIT_MAX="100"
RATE_LIMIT_WINDOW="900000"

# Performance
ENABLE_COMPRESSION="true"
ENABLE_CACHING="true"
```

### next.config.ts para Producción
```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ]
  },
  
  // Image optimization
  images: {
    domains: ['yourdomain.com'],
    formats: ['image/webp', 'image/avif']
  },
  
  // Bundle analyzer (development only)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      config.plugins.push(
        new (require('@next/bundle-analyzer')({
          enabled: true
        }))()
      )
      return config
    }
  })
}

module.exports = nextConfig
```

## 🗄️ Base de Datos

### Migraciones de Producción
```bash
# Generar migración
npx prisma migrate dev --name production-setup

# Aplicar migraciones en producción
npx prisma migrate deploy

# Generar cliente Prisma
npx prisma generate

# Ejecutar seeds
npx tsx scripts/seed-modern.ts
```

### Backup de Base de Datos
```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# SQLite backup
cp prisma/dev.db backup-$(date +%Y%m%d).db
```

### Script de Backup Automático
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="myapp"

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

# Backup de base de datos
pg_dump $DATABASE_URL > $BACKUP_DIR/db_backup_$DATE.sql

# Comprimir backup
gzip $BACKUP_DIR/db_backup_$DATE.sql

# Eliminar backups antiguos (más de 7 días)
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completado: db_backup_$DATE.sql.gz"
```

## 📊 Monitoreo y Logging

### Configuración de Logging
```typescript
// lib/logger.ts
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}

export default logger
```

### Health Check Endpoint
```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION,
      database: 'connected'
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed'
      },
      { status: 503 }
    )
  }
}
```

## 🔒 Seguridad en Producción

### Configuración de CORS
```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // CORS headers
  const response = NextResponse.next()
  
  response.headers.set('Access-Control-Allow-Origin', 'https://yourdomain.com')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  return response
}

export const config = {
  matcher: '/api/:path*'
}
```

### Rate Limiting en Producción
```typescript
// app/api/auth/signin/route.ts
import { createRateLimitMiddleware } from '@/middleware/api'

const rateLimiter = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxRequests: 5, // 5 intentos por IP
  message: 'Demasiados intentos de login'
})

export async function POST(request: Request) {
  // Aplicar rate limiting
  const rateLimitResult = await rateLimiter(request)
  if (rateLimitResult.status === 429) {
    return rateLimitResult
  }
  
  // Lógica de autenticación...
}
```

## 📈 Performance en Producción

### Configuración de CDN
```typescript
// next.config.ts
const nextConfig = {
  assetPrefix: process.env.NODE_ENV === 'production' 
    ? 'https://cdn.yourdomain.com' 
    : '',
    
  images: {
    loader: 'custom',
    loaderFile: './lib/imageLoader.ts'
  }
}
```

### Image Loader Personalizado
```typescript
// lib/imageLoader.ts
export default function cloudinaryLoader({ src, width, quality }) {
  const params = ['f_auto', 'c_limit', `w_${width}`, `q_${quality || 'auto'}`]
  return `https://res.cloudinary.com/your-cloud/image/fetch/${params.join(',')}/${src}`
}
```

## 🚨 Troubleshooting

### Problemas Comunes

#### 1. Error de Build
```bash
# Limpiar cache
rm -rf .next
npm run build

# Verificar dependencias
npm audit
npm audit fix
```

#### 2. Error de Base de Datos
```bash
# Resetear migraciones
npx prisma migrate reset
npx prisma migrate deploy
```

#### 3. Error de Memoria
```bash
# Aumentar memoria para Node.js
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Logs de Debugging
```typescript
// Habilitar logs detallados
process.env.DEBUG = 'next:*'
process.env.NEXTAUTH_DEBUG = 'true'
```

## 📋 Checklist Post-Deployment

### Verificación Inmediata
- [ ] Aplicación carga correctamente
- [ ] Login funciona
- [ ] Base de datos conectada
- [ ] API endpoints responden
- [ ] SSL certificado válido

### Verificación de Funcionalidad
- [ ] Crear usuario funciona
- [ ] Gestión de roles funciona
- [ ] 2FA funciona correctamente
- [ ] Notificaciones se muestran
- [ ] Formularios validan correctamente

### Verificación de Performance
- [ ] Tiempo de carga < 3 segundos
- [ ] Lighthouse score > 90
- [ ] Bundle size optimizado
- [ ] Imágenes optimizadas

### Verificación de Seguridad
- [ ] Headers de seguridad configurados
- [ ] Rate limiting activo
- [ ] Logs de seguridad funcionando
- [ ] Backup automático configurado

## 🔄 Proceso de Actualización

### Deployment Continuo
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Rollback Plan
```bash
# Rollback en Vercel
vercel rollback [deployment-url]

# Rollback de base de datos
npx prisma migrate reset
# Restaurar desde backup
psql $DATABASE_URL < backup-YYYYMMDD.sql
```

---

**¡Tu aplicación está lista para producción!** 🚀

Para soporte adicional, consulta la [documentación de desarrollo](./DEVELOPMENT.md) o contacta al equipo de DevOps.
# Migración a Turso - Documentación

## ✅ Migración Completada

La base de datos ha sido migrada exitosamente de SQLite a Turso (libSQL).

## 🔧 Configuración Actual

### Variables de Entorno
```env
# Turso Database Configuration
TURSO_DATABASE_URL="libsql://control-calidad-db-hyg1997.aws-us-east-1.turso.io"
TURSO_AUTH_TOKEN="[TOKEN_GENERADO]"
DATABASE_URL="libsql://control-calidad-db-hyg1997.aws-us-east-1.turso.io"
```

### Dependencias Instaladas
- `@libsql/client`: Cliente para conectar con libSQL/Turso
- `@prisma/adapter-libsql`: Adaptador de Prisma para libSQL
- Turso CLI instalado globalmente

### Archivos Modificados
1. **prisma/schema.prisma**: Agregado `previewFeatures = ["driverAdapters"]`
2. **src/lib/prisma.ts**: Configurado adaptador libSQL
3. **.env**: Agregadas variables de entorno de Turso

## 📊 Datos Migrados

### Tablas Migradas
- ✅ users (1 registro)
- ✅ roles
- ✅ permissions
- ✅ user_roles
- ✅ role_permissions
- ✅ user_sessions
- ✅ refresh_tokens
- ✅ audit_logs
- ✅ products (12 registros)
- ✅ parameters
- ✅ master_parameters
- ✅ records
- ✅ controls
- ✅ photos
- ✅ password_resets
- ✅ accounts
- ✅ verification_tokens

## 🚀 Comandos Útiles

### Conectar a la base de datos
```bash
turso db shell control-calidad-db
```

### Ver información de la base de datos
```bash
turso db show control-calidad-db
```

### Crear nuevo token de autenticación
```bash
turso db tokens create control-calidad-db
```

### Ejecutar consultas directas
```bash
turso db shell control-calidad-db "SELECT COUNT(*) FROM users;"
```

## 🔄 Backup y Restauración

### Backup actual creado
- **Archivo**: `backup_data.sql` (250KB)
- **Contenido**: Dump completo de la base SQLite original

### Para restaurar desde backup
```bash
turso db shell control-calidad-db < backup_data.sql
```

## ⚠️ Notas Importantes

1. **Token de Seguridad**: El token de autenticación debe mantenerse seguro y no debe ser committeado al repositorio.

2. **Backup SQLite**: El archivo `prisma/dev.db` original se mantiene como backup.

3. **Variables de Entorno**: Asegúrate de que las variables `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` estén configuradas en producción.

4. **Prisma Client**: El cliente de Prisma ahora usa el adaptador libSQL automáticamente.

## 🧪 Verificación

- ✅ Servidor de desarrollo iniciado correctamente
- ✅ Conexión a Turso establecida
- ✅ Datos migrados completamente
- ✅ Aplicación funcionando en http://localhost:3000

## 📞 Soporte

Para más información sobre Turso:
- [Documentación oficial](https://docs.turso.tech/)
- [Prisma con libSQL](https://www.prisma.io/docs/orm/overview/databases/turso)

---
**Migración completada el**: $(date)
**Base de datos**: control-calidad-db
**Región**: aws-us-east-1
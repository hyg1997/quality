import { NextRequest, NextResponse } from 'next/server'

export interface ValidationRule {
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'email' | 'uuid'
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: unknown) => string | null
}

export interface ValidationSchema {
  [key: string]: ValidationRule
}

export interface ValidationError {
  field: string
  message: string
}

// Simple validation function
function validateData(data: Record<string, unknown>, schema: ValidationSchema): ValidationError[] {
  const errors: ValidationError[] = []
  
  for (const [field, rule] of Object.entries(schema)) {
    const value = data[field]
    
    // Required validation
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({ field, message: `${field} es requerido` })
      continue
    }
    
    // Skip other validations if field is not provided and not required
    if (value === undefined || value === null) continue
    
    // Type validation
    if (rule.type) {
      const error = validateType(value, rule.type, field)
      if (error) errors.push(error)
    }
    
    // String validations
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push({ field, message: `${field} debe tener al menos ${rule.minLength} caracteres` })
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push({ field, message: `${field} no puede tener más de ${rule.maxLength} caracteres` })
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push({ field, message: `${field} tiene un formato inválido` })
      }
    }
    
    // Number validations
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push({ field, message: `${field} debe ser mayor o igual a ${rule.min}` })
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push({ field, message: `${field} debe ser menor o igual a ${rule.max}` })
      }
    }
    
    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value)
      if (customError) {
        errors.push({ field, message: customError })
      }
    }
  }
  
  return errors
}

function validateType(value: unknown, type: string, field: string): ValidationError | null {
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        return { field, message: `${field} debe ser una cadena de texto` }
      }
      break
    case 'number':
      if (typeof value !== 'number' && !Number.isFinite(Number(value))) {
        return { field, message: `${field} debe ser un número` }
      }
      break
    case 'boolean':
      if (typeof value !== 'boolean') {
        return { field, message: `${field} debe ser verdadero o falso` }
      }
      break
    case 'email':
      if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return { field, message: `${field} debe ser un email válido` }
      }
      break
    case 'uuid':
      if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
        return { field, message: `${field} debe ser un UUID válido` }
      }
      break
  }
  return null
}

// Base validation middleware
export function createValidationMiddleware(
  schema: ValidationSchema,
  options: {
    validateBody?: boolean
    validateQuery?: boolean
    validateParams?: boolean
  } = {}
) {
  return async (request: NextRequest, context?: { params?: Record<string, string> }) => {
    try {
      const { validateBody = true, validateQuery = false, validateParams = false } = options
      
      let dataToValidate: Record<string, unknown> = {}
      
      // Validate request body
      if (validateBody && (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH')) {
        try {
          const body = await request.json()
          if (typeof body === 'object' && body !== null) {
            dataToValidate = { ...dataToValidate, ...body }
          }
        } catch {
          return NextResponse.json(
            { error: 'Invalid JSON in request body' },
            { status: 400 }
          )
        }
      }
      
      // Validate query parameters
      if (validateQuery) {
        const url = new URL(request.url)
        const queryParams = Object.fromEntries(url.searchParams.entries())
        dataToValidate = { ...dataToValidate, ...queryParams }
      }
      
      // Validate route parameters
      if (validateParams && context?.params) {
        dataToValidate = { ...dataToValidate, ...context.params }
      }
      
      // Perform validation
      const errors = validateData(dataToValidate, schema)
      
      if (errors.length > 0) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: errors
          },
          { status: 400 }
        )
      }
      
      // Add validated data to request headers for next middleware/handler
      const headers = new Headers(request.headers)
      headers.set('x-validated-data', JSON.stringify(dataToValidate))
      
      return NextResponse.next({
        request: {
          headers
        }
      })
      
    } catch {
      console.error('Validation middleware error')
      return NextResponse.json(
        { error: 'Internal server error during validation' },
        { status: 500 }
      )
    }
  }
}

// Common validation schemas
export const commonSchemas = {
  // User schemas
  createUser: {
    email: { required: true, type: 'email' as const },
    username: { type: 'string' as const, minLength: 2 },
    fullName: { required: true, type: 'string' as const, minLength: 2 },
    password: { required: true, type: 'string' as const, minLength: 8 },
    roleIds: { type: 'string' as const } // Array validation would need custom logic
  },
  
  updateUser: {
    email: { type: 'email' as const },
    username: { type: 'string' as const, minLength: 2 },
    fullName: { type: 'string' as const, minLength: 2 },
    password: { type: 'string' as const, minLength: 8 },
    roleIds: { type: 'string' as const }
  },
  
  // Role schemas
  createRole: {
    name: { required: true, type: 'string' as const, minLength: 2 },
    displayName: { required: true, type: 'string' as const, minLength: 2 },
    description: { type: 'string' as const },
    level: { required: true, type: 'number' as const, min: 1, max: 79 },
    permissions: { required: true, type: 'string' as const }
  },
  
  updateRole: {
    name: { type: 'string' as const, minLength: 2 },
    displayName: { type: 'string' as const, minLength: 2 },
    description: { type: 'string' as const },
    level: { type: 'number' as const, min: 1, max: 79 },
    permissions: { type: 'string' as const }
  },
  
  // Auth schemas
  login: {
    email: { required: true, type: 'email' as const },
    password: { required: true, type: 'string' as const, minLength: 1 }
  },
  
  resetPassword: {
    token: { required: true, type: 'string' as const, minLength: 1 },
    password: { required: true, type: 'string' as const, minLength: 8 }
  },
  
  // Common parameter schemas
  uuidParam: {
    id: { required: true, type: 'uuid' as const }
  },
  
  paginationQuery: {
    page: { type: 'number' as const, min: 1 },
    limit: { type: 'number' as const, min: 1, max: 100 },
    search: { type: 'string' as const },
    sortBy: { type: 'string' as const },
    sortOrder: { type: 'string' as const, custom: (value: unknown) => {
      if (typeof value === 'string' && ['asc', 'desc'].includes(value)) {
        return null
      }
      return 'sortOrder debe ser "asc" o "desc"'
    }}
  }
}

// Helper function to get validated data from request
export function getValidatedData<T = Record<string, unknown>>(request: NextRequest): T | null {
  const validatedDataHeader = request.headers.get('x-validated-data')
  if (!validatedDataHeader) return null
  
  try {
    return JSON.parse(validatedDataHeader) as T
  } catch {
    return null
  }
}

export default createValidationMiddleware
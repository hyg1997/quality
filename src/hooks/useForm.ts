'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

type ValidationRule<T> = {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: T[keyof T], formData: T) => string | null
}

type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T>
}

type FormErrors<T> = {
  [K in keyof T]?: string
}

interface UseFormOptions<T> {
  initialValues: T
  validationRules?: ValidationRules<T>
  onSubmit?: (data: T) => Promise<void> | void
  validateOnChange?: boolean
  validateOnBlur?: boolean
}

export function useForm<T extends Record<string, unknown>>({
  initialValues,
  validationRules = {},
  onSubmit,
  validateOnChange = false,
  validateOnBlur = true
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<FormErrors<T>>({})
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValid, setIsValid] = useState(true)

  // Keep track of previous initialValues to avoid infinite loops
  const prevInitialValuesRef = useRef<T>(initialValues)
  
  // Reinitialize form when initialValues change (deep comparison)
  useEffect(() => {
    const hasChanged = JSON.stringify(prevInitialValuesRef.current) !== JSON.stringify(initialValues)
    
    if (hasChanged) {
      setValues(initialValues)
      setErrors({})
      setTouched({} as Record<keyof T, boolean>)
      prevInitialValuesRef.current = initialValues
    }
  }, [initialValues])

  // Validate a single field
  const validateField = useCallback((name: keyof T, value: T[keyof T]): string | null => {
    const rules = validationRules[name]
    if (!rules) return null

    // Required validation
    if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return 'Este campo es requerido'
    }

    // Skip other validations if field is empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return null
    }

    const stringValue = String(value)

    // Min length validation
    if (rules.minLength && stringValue.length < rules.minLength) {
      return `Debe tener al menos ${rules.minLength} caracteres`
    }

    // Max length validation
    if (rules.maxLength && stringValue.length > rules.maxLength) {
      return `No puede tener más de ${rules.maxLength} caracteres`
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(stringValue)) {
      return 'Formato inválido'
    }

    // Custom validation
    if (rules.custom) {
      return rules.custom(value, values)
    }

    return null
  }, [validationRules, values])

  // Validate all fields
  const validateForm = useCallback((): FormErrors<T> => {
    const newErrors: FormErrors<T> = {}
    
    Object.keys(validationRules).forEach((key) => {
      const fieldName = key as keyof T
      const error = validateField(fieldName, values[fieldName])
      if (error) {
        newErrors[fieldName] = error
      }
    })

    return newErrors
  }, [validationRules, values, validateField])

  // Update form validity
  useEffect(() => {
    const formErrors = validateForm()
    setIsValid(Object.keys(formErrors).length === 0)
  }, [validateForm])

  // Set field value
  const setValue = useCallback((name: keyof T, value: T[keyof T]) => {
    setValues(prev => ({ ...prev, [name]: value }))
    
    if (validateOnChange) {
      const error = validateField(name, value)
      setErrors(prev => ({ ...prev, [name]: error || undefined }))
    }
  }, [validateField, validateOnChange])

  // Set multiple values
  const setMultipleValues = useCallback((newValues: Partial<T>) => {
    setValues(prev => ({ ...prev, ...newValues }))
  }, [])

  // Handle field blur
  const handleBlur = useCallback((name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }))
    
    if (validateOnBlur) {
      const error = validateField(name, values[name])
      setErrors(prev => ({ ...prev, [name]: error || undefined }))
    }
  }, [validateField, validateOnBlur, values])

  // Handle form submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }

    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key as keyof T] = true
      return acc
    }, {} as Record<keyof T, boolean>)
    setTouched(allTouched)

    // Validate form
    const formErrors = validateForm()
    setErrors(formErrors)

    // If there are errors, don't submit
    if (Object.keys(formErrors).length > 0) {
      return
    }

    if (onSubmit) {
      setIsSubmitting(true)
      try {
        await onSubmit(values)
      } finally {
        setIsSubmitting(false)
      }
    }
  }, [values, validateForm, onSubmit])

  // Reset form
  const reset = useCallback((newValues?: T) => {
    setValues(newValues || initialValues)
    setErrors({})
    setTouched({} as Record<keyof T, boolean>)
    setIsSubmitting(false)
  }, [initialValues])

  // Get field props for easy integration with inputs
  const getFieldProps = useCallback((name: keyof T) => {
    return {
      name: String(name),
      value: values[name] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setValue(name, e.target.value as T[keyof T])
      },
      onBlur: () => handleBlur(name),
      error: touched[name] ? errors[name] : undefined
    }
  }, [values, errors, touched, setValue, handleBlur])

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    setValue,
    setValues: setMultipleValues,
    handleBlur,
    handleSubmit,
    reset,
    getFieldProps,
    validateField,
    validateForm
  }
}

export default useForm
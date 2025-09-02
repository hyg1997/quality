"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { Lock, Check } from "lucide-react"

function TwoFactorVerifyContent() {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const username = searchParams.get('username')
  const password = searchParams.get('password')
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  useEffect(() => {
    // Si no hay credenciales, redirigir al login
    if (!username || !password) {
      router.push('/auth/signin')
    }
  }, [username, password, router])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token) {
      setError('Ingresa el código de verificación')
      return
    }

    if (!username || !password) {
      setError('Sesión expirada, inicia sesión nuevamente')
      router.push('/auth/signin')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Verificar 2FA
      const response = await fetch('/api/auth/2fa/login-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, token })
      })

      const data = await response.json()

      if (response.ok) {
        // Si la verificación es exitosa, hacer login con NextAuth
        const result = await signIn('credentials', {
          username,
          password,
          redirect: false
        })

        if (result?.ok) {
          router.push(callbackUrl)
        } else {
          setError('Error al iniciar sesión')
        }
      } else {
        setError(data.error || 'Error al verificar el código')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    router.push('/auth/signin')
  }

  if (!username || !password) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Lock className="text-white h-8 w-8" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Verificación de Dos Factores
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Ingresa el código de 6 dígitos de tu aplicación de autenticación
          </p>
        </div>

        <form className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg" onSubmit={handleVerify}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
              Código de Verificación
            </label>
            <input
              id="token"
              name="token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm transition-colors duration-200 text-center text-2xl font-mono tracking-widest"
              placeholder="000000"
              maxLength={6}
              autoComplete="one-time-code"
            />
            <p className="mt-1 text-xs text-gray-500">
              Ingresa el código de 6 dígitos de tu aplicación de autenticación
            </p>
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading || token.length !== 6}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verificando...
                </div>
              ) : (
                <span className="flex items-center">
                  <Check className="mr-2 h-4 w-4" />
                  Verificar Código
                </span>
              )}
            </button>
            
            <button
              type="button"
              onClick={handleBackToLogin}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              ← Volver al Login
            </button>
          </div>
        </form>

        <div className="text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>¿No tienes acceso a tu aplicación de autenticación?</strong><br />
                  Contacta al administrador del sistema para obtener ayuda.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TwoFactorVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    }>
      <TwoFactorVerifyContent />
    </Suspense>
  )
}
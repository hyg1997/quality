"use client"
import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import Image from "next/image"
interface TwoFactorStatus {
  enabled: boolean
  hasSecret: boolean
  isAdmin: boolean
}
interface SetupResponse {
  secret: string
  qrCode: string
  manualEntryKey: string
  message: string
}
export default function TwoFactorAuthPage() {
  const { data: session, status } = useSession()
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null)
  const [setupData, setSetupData] = useState<SetupResponse | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [disablePassword, setDisablePassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showDisableForm, setShowDisableForm] = useState(false)
  useEffect(() => {
    if (session) {
      fetchTwoFactorStatus()
    }
  }, [session])
  const fetchTwoFactorStatus = async () => {
    try {
      const response = await fetch('/api/auth/2fa/setup')
      if (response.ok) {
        const data = await response.json()
        setTwoFactorStatus(data)
      }
    } catch {
      console.error('Error fetching 2FA status')
    }
  }
  const handleSetup2FA = async () => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST'
      })
      const data = await response.json()
      if (response.ok) {
        setSetupData(data)
        setMessage(data.message)
      } else {
        setError(data.error)
      }
    } catch {
          setError('Error al configurar 2FA')
        } finally {
      setLoading(false)
    }
  }
  const handleVerify2FA = async () => {
    if (!verificationCode) {
      setError('Ingresa el código de verificación')
      return
    }
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: verificationCode })
      })
      const data = await response.json()
      if (response.ok) {
        setMessage(data.message)
        setSetupData(null)
        setVerificationCode('')
        fetchTwoFactorStatus()
      } else {
        setError(data.error)
      }
    } catch {
      setError('Error al verificar el código')
    } finally {
      setLoading(false)
    }
  }
  const handleDisable2FA = async () => {
    if (!disableCode || !disablePassword) {
      setError('Ingresa el código 2FA y tu contraseña actual')
      return
    }
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          token: disableCode,
          password: disablePassword
        })
      })
      const data = await response.json()
      if (response.ok) {
        setMessage(data.message)
        setShowDisableForm(false)
        setDisableCode('')
        setDisablePassword('')
        fetchTwoFactorStatus()
      } else {
        setError(data.error)
      }
    } catch {
      setError('Error al deshabilitar 2FA')
    } finally {
      setLoading(false)
    }
  }
  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }
  if (twoFactorStatus?.isAdmin) {
    return (
      <div className="space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-blue-800">
                Administrador del Sistema
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                Los administradores no requieren autenticación de dos factores debido a sus privilegios elevados y acceso completo al sistema.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      {}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Autenticación de Dos Factores</h1>
        <p className="mt-1 text-sm text-gray-600">
          Agrega una capa adicional de seguridad a tu cuenta
        </p>
      </div>
      {}
      {message && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{message}</p>
            </div>
          </div>
        </div>
      )}
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
      {}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Estado Actual</h3>
            <p className="mt-1 text-sm text-gray-600">
              {twoFactorStatus?.enabled 
                ? 'La autenticación de dos factores está habilitada' 
                : 'La autenticación de dos factores está deshabilitada'
              }
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            twoFactorStatus?.enabled 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {twoFactorStatus?.enabled ? 'Habilitado' : 'Deshabilitado'}
          </div>
        </div>
      </div>
      {}
      {!twoFactorStatus?.enabled && !setupData && (
        <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Configurar Autenticación de Dos Factores</h3>
          <p className="text-sm text-gray-600 mb-6">
            La autenticación de dos factores agrega una capa adicional de seguridad a tu cuenta. 
            Necesitarás una aplicación de autenticación como Google Authenticator o Authy.
          </p>
          <button
            onClick={handleSetup2FA}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50"
          >
            {loading ? 'Configurando...' : 'Configurar 2FA'}
          </button>
        </div>
      )}
      {}
      {setupData && (
        <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Escanea el Código QR</h3>
          <div className="space-y-6">
            <div className="text-center">
              <Image 
                src={setupData.qrCode} 
                alt="Código QR para 2FA" 
                width={200}
                height={200}
                className="mx-auto border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Si no puedes escanear el código QR, ingresa manualmente esta clave:
              </p>
              <div className="bg-gray-50 p-3 rounded-lg border">
                <code className="text-sm font-mono break-all">{setupData.manualEntryKey}</code>
              </div>
            </div>
            <div>
              <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 mb-2">
                Código de Verificación
              </label>
              <input
                type="text"
                id="verification-code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Ingresa el código de 6 dígitos"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                maxLength={6}
              />
            </div>
            <button
              onClick={handleVerify2FA}
              disabled={loading || !verificationCode}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Verificar y Habilitar'}
            </button>
          </div>
        </div>
      )}
      {}
      {twoFactorStatus?.enabled && (
        <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Deshabilitar Autenticación de Dos Factores</h3>
          {!showDisableForm ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Si deseas deshabilitar la autenticación de dos factores, necesitarás proporcionar tu contraseña actual y un código de verificación.
              </p>
              <button
                onClick={() => setShowDisableForm(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Deshabilitar 2FA
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="disable-password" className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña Actual
                </label>
                <input
                  type="password"
                  id="disable-password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Ingresa tu contraseña actual"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="disable-code" className="block text-sm font-medium text-gray-700 mb-2">
                  Código de Verificación 2FA
                </label>
                <input
                  type="text"
                  id="disable-code"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                  placeholder="Ingresa el código de 6 dígitos"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  maxLength={6}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleDisable2FA}
                  disabled={loading || !disableCode || !disablePassword}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50"
                >
                  {loading ? 'Deshabilitando...' : 'Confirmar Deshabilitar'}
                </button>
                <button
                  onClick={() => {
                    setShowDisableForm(false)
                    setDisableCode('')
                    setDisablePassword('')
                    setError('')
                  }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
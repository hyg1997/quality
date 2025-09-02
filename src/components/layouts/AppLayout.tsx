import { Suspense } from 'react'
import ErrorBoundary from '../ErrorBoundary'
import { PageLoading } from '../ui'

interface AppLayoutProps {
  children: React.ReactNode
  loading?: boolean
  error?: Error | null
  fallback?: React.ReactNode
}

export function AppLayout({ 
  children, 
  loading = false, 
  error = null, 
  fallback 
}: AppLayoutProps) {
  if (loading) {
    return <PageLoading text="Cargando aplicación..." />
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error de Aplicación</h1>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Recargar
          </button>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary fallback={fallback}>
      <Suspense fallback={<PageLoading text="Cargando contenido..." />}>
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </Suspense>
    </ErrorBoundary>
  )
}

interface PageLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  actions?: React.ReactNode
  loading?: boolean
}

export function PageLayout({ 
  children, 
  title, 
  description, 
  actions, 
  loading = false 
}: PageLayoutProps) {
  if (loading) {
    return <PageLoading />
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      {(title || description || actions) && (
        <div className="flex items-center justify-between">
          <div>
            {title && (
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            )}
            {description && (
              <p className="mt-1 text-sm text-gray-600">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center space-x-3">
              {actions}
            </div>
          )}
        </div>
      )}
      
      <ErrorBoundary>
        <Suspense fallback={<PageLoading />}>
          {children}
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

interface SectionLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

export function SectionLayout({ 
  children, 
  title, 
  description, 
  className = '' 
}: SectionLayoutProps) {
  return (
    <section className={`space-y-4 ${className}`}>
      {(title || description) && (
        <div>
          {title && (
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  )
}

export default AppLayout
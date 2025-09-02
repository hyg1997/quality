import { useState, useEffect } from 'react'

interface ImagePreloadOptions {
  onLoad?: () => void
  onError?: (error: Event) => void
}

export function useImagePreload(src: string, options: ImagePreloadOptions = {}) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!src) {
      setLoading(false)
      return
    }

    const img = new Image()
    
    const handleLoad = () => {
      setLoaded(true)
      setLoading(false)
      setError(null)
      options.onLoad?.()
    }
    
    const handleError = (e: Event) => {
      setError(e)
      setLoading(false)
      setLoaded(false)
      options.onError?.(e)
    }
    
    img.addEventListener('load', handleLoad)
    img.addEventListener('error', handleError)
    
    img.src = src
    
    return () => {
      img.removeEventListener('load', handleLoad)
      img.removeEventListener('error', handleError)
    }
  }, [src, options])

  return { loaded, error, loading }
}

export function useImagePreloadBatch(sources: string[]) {
  const [loadedCount, setLoadedCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sources.length === 0) {
      setLoading(false)
      return
    }

    let completed = 0
    let errors = 0

    const checkComplete = () => {
      if (completed + errors === sources.length) {
        setLoading(false)
      }
    }

    sources.forEach((src) => {
      const img = new Image()
      
      img.onload = () => {
        completed++
        setLoadedCount(completed)
        checkComplete()
      }
      
      img.onerror = () => {
        errors++
        setErrorCount(errors)
        checkComplete()
      }
      
      img.src = src
    })
  }, [sources])

  return {
    loadedCount,
    errorCount,
    loading,
    progress: sources.length > 0 ? (loadedCount + errorCount) / sources.length : 1,
    allLoaded: loadedCount === sources.length,
    hasErrors: errorCount > 0
  }
}

export default useImagePreload
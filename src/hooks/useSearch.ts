import { useState, useEffect, useCallback } from 'react';

interface UseSearchOptions {
  debounceMs?: number;
  minLength?: number;
}

interface UseSearchReturn {
  searchTerm: string;
  debouncedSearchTerm: string;
  setSearchTerm: (term: string) => void;
  clearSearch: () => void;
  isSearching: boolean;
}

/**
 * Hook personalizado para manejar búsquedas con debouncing optimizado
 * Evita llamadas excesivas a la API y mejora la performance
 */
export function useSearch({
  debounceMs = 500,
  minLength = 2
}: UseSearchOptions = {}): UseSearchReturn {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Efecto para manejar el debouncing
  useEffect(() => {
    // Si el término es muy corto, limpiar inmediatamente
    if (searchTerm.length < minLength) {
      setDebouncedSearchTerm('');
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Configurar el timer de debounce
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, debounceMs);

    // Cleanup del timer
    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm, debounceMs, minLength]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setIsSearching(false);
  }, []);

  return {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
    clearSearch,
    isSearching
  };
}

export default useSearch;
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearch } from './useSearch';

interface UseDataTableSearchOptions<T> {
  fetchData: (searchTerm?: string) => Promise<T[]>;
  debounceMs?: number;
  minLength?: number;
  placeholder?: string;
}

interface UseDataTableSearchReturn<T> {
  data: T[];
  loading: boolean;
  searchProps: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onClear: () => void;
    isSearching: boolean;
  };
  refetch: () => Promise<void>;
}

/**
 * Hook personalizado para manejar búsquedas en DataTables
 * Integra el debouncing con la lógica de fetch de datos
 */
export function useDataTableSearch<T>({
  fetchData,
  debounceMs = 500,
  minLength = 2,
  placeholder = "Buscar..."
}: UseDataTableSearchOptions<T>): UseDataTableSearchReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  
  const {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
    clearSearch,
    isSearching
  } = useSearch({ debounceMs, minLength });

  // Usar ref para estabilizar fetchData
  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  // Función para cargar datos
  const loadData = useCallback(async (searchValue?: string) => {
    setLoading(true);
    try {
      const result = await fetchDataRef.current(searchValue);
      setData(result);
    } catch (error) {
      console.error('Error fetching data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cargar datos cuando cambie el término de búsqueda debounced
  useEffect(() => {
    if (debouncedSearchTerm) {
      loadData(debouncedSearchTerm);
    } else if (searchTerm === '') {
      // Si se limpia la búsqueda, cargar todos los datos
      loadData();
    }
  }, [debouncedSearchTerm, searchTerm, loadData]);

  const handleClear = useCallback(() => {
    clearSearch();
    loadData();
  }, [clearSearch, loadData]);

  const refetch = useCallback(async () => {
    await loadData(debouncedSearchTerm || undefined);
  }, [loadData, debouncedSearchTerm]);

  return {
    data,
    loading,
    searchProps: {
      value: searchTerm,
      onChange: setSearchTerm,
      placeholder,
      onClear: handleClear,
      isSearching
    },
    refetch
  };
}

export default useDataTableSearch;
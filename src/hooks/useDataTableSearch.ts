import { useState, useEffect, useCallback, useRef } from "react";
import { useSearch } from "./useSearch";

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

export function useDataTableSearch<T>({
  fetchData,
  debounceMs = 500,
  minLength = 2,
  placeholder = "Buscar...",
}: UseDataTableSearchOptions<T>): UseDataTableSearchReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm,
    clearSearch,
    isSearching,
  } = useSearch({ debounceMs, minLength });

  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  const loadData = useCallback(async (searchValue?: string) => {
    setLoading(true);
    try {
      const result = await fetchDataRef.current(searchValue);
      setData(result);
    } catch (error) {
      console.error("Error fetching data:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (debouncedSearchTerm) {
      loadData(debouncedSearchTerm);
    } else if (searchTerm === "") {
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
      isSearching,
    },
    refetch,
  };
}

export default useDataTableSearch;

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
export function useSearch({
  debounceMs = 500,
  minLength = 2
}: UseSearchOptions = {}): UseSearchReturn {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  useEffect(() => {
    if (searchTerm.length < minLength) {
      setDebouncedSearchTerm('');
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearching(false);
    }, debounceMs);
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
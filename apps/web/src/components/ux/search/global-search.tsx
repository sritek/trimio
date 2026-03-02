'use client';

/**
 * Global Search Component
 * Searches across customers, appointments, and invoices
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, User, Calendar, FileText, Clock, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDebounce } from '@/hooks/use-debounce';
import { useOpenPanel } from '@/components/ux/slide-over';
import { api } from '@/lib/api/client';

export interface SearchResult {
  id: string;
  type: 'customer' | 'appointment' | 'invoice';
  title: string;
  subtitle?: string;
  metadata?: string;
}

interface GlobalSearchProps {
  /** Custom handler for result selection (overrides default slide-over behavior) */
  onSelect?: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
}

const RECENT_SEARCHES_KEY = 'global-search-recent';
const MAX_RECENT_SEARCHES = 5;

// Get recent searches from localStorage
function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save recent search to localStorage
function saveRecentSearch(query: string) {
  if (typeof window === 'undefined' || !query.trim()) return;
  try {
    const recent = getRecentSearches();
    const filtered = recent.filter((s) => s !== query);
    const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

// Clear recent searches
function clearRecentSearches() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

export function GlobalSearch({
  onSelect,
  placeholder = 'Search...',
  className,
}: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const { openCustomerPeek, openAppointmentDetails } = useOpenPanel();

  const debouncedQuery = useDebounce(query, 300);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Search API query
  const { data: results, isLoading } = useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return null;
      const response = await api.get<{ data: SearchResult[] }>(
        `/search?q=${encodeURIComponent(debouncedQuery)}`
      );
      return response.data;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
  });

  // Group results by type
  const groupedResults = results?.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    },
    {} as Record<string, SearchResult[]>
  );

  // Default handler - open entity in slide-over
  const handleDefaultSelect = useCallback(
    (result: SearchResult) => {
      switch (result.type) {
        case 'customer':
          openCustomerPeek(result.id);
          break;
        case 'appointment':
          openAppointmentDetails(result.id);
          break;
        // TODO: Add invoice details panel when implemented
      }
    },
    [openCustomerPeek, openAppointmentDetails]
  );

  // Handle result selection
  const handleSelect = useCallback(
    (result: SearchResult) => {
      saveRecentSearch(query);
      setRecentSearches(getRecentSearches());
      setOpen(false);
      setQuery('');

      if (onSelect) {
        onSelect(result);
      } else {
        handleDefaultSelect(result);
      }
    },
    [query, onSelect, handleDefaultSelect]
  );

  // Handle recent search selection
  const handleRecentSelect = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
  }, []);

  // Handle clear recent searches
  const handleClearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!results?.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    },
    [results, selectedIndex, handleSelect]
  );

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'customer':
        return <User className="h-4 w-4" />;
      case 'appointment':
        return <Calendar className="h-4 w-4" />;
      case 'invoice':
        return <FileText className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getGroupLabel = (type: string) => {
    switch (type) {
      case 'customer':
        return 'Customers';
      case 'appointment':
        return 'Appointments';
      case 'invoice':
        return 'Invoices';
      default:
        return type;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn('relative', className)}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className="pl-9 pr-4"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
              onClick={() => setQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[400px] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          {/* Recent searches when no query */}
          {!query && recentSearches.length > 0 && (
            <CommandGroup
              heading={
                <div className="flex items-center justify-between">
                  <span>Recent Searches</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                    onClick={handleClearRecent}
                  >
                    Clear
                  </Button>
                </div>
              }
            >
              {recentSearches.map((search) => (
                <CommandItem key={search} onSelect={() => handleRecentSelect(search)}>
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  {search}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Loading state */}
          {isLoading && query.length >= 2 && (
            <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>
          )}

          {/* No results */}
          {!isLoading && query.length >= 2 && results && results.length === 0 && (
            <CommandEmpty>No results found for &quot;{query}&quot;</CommandEmpty>
          )}

          {/* Search results */}
          {!isLoading && groupedResults && (
            <CommandList>
              {Object.entries(groupedResults).map(([type, items]) => (
                <CommandGroup key={type} heading={getGroupLabel(type)}>
                  {items.map((result) => {
                    const flatIndex = results?.findIndex((r) => r.id === result.id) ?? -1;
                    return (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleSelect(result)}
                        className={cn(flatIndex === selectedIndex && 'bg-accent')}
                      >
                        <div className="mr-2 text-muted-foreground">{getIcon(type)}</div>
                        <div className="flex-1 overflow-hidden">
                          <div className="truncate font-medium">{result.title}</div>
                          {result.subtitle && (
                            <div className="truncate text-xs text-muted-foreground">
                              {result.subtitle}
                            </div>
                          )}
                        </div>
                        {result.metadata && (
                          <div className="text-xs text-muted-foreground">{result.metadata}</div>
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          )}

          {/* Hint when query is too short */}
          {query.length > 0 && query.length < 2 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

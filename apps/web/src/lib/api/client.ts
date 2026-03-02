/**
 * API Client
 * Based on: .cursor/rules/14-frontend-implementation.mdc lines 724-850
 */

import { useAuthStore } from '@/stores/auth-store';
import type { ApiResponse, PaginatedApiResponse, PaginatedResult } from '@/types/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | string[] | undefined>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();

  if (!refreshToken) {
    logout();
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      logout();
      return null;
    }

    const data = await response.json();
    setTokens(data.data.accessToken, data.data.refreshToken);
    return data.data.accessToken;
  } catch {
    logout();
    return null;
  }
}

/**
 * Base API client that returns the full response
 */
async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers: customHeaders, ...init } = options;
  const { accessToken } = useAuthStore.getState();

  // Build URL with query params
  let url = `${API_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          // Handle arrays - join with comma for API compatibility
          if (value.length > 0) {
            searchParams.append(key, value.join(','));
          }
        } else {
          searchParams.append(key, String(value));
        }
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Build headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  // Make request
  let response = await fetch(url, { ...init, headers });

  // Handle 401 - try refresh
  if (response.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, { ...init, headers });
    }
  }

  // Parse response
  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || 'An error occurred',
      data.error?.details
    );
  }

  return data as T;
}

// ============================================
// API Methods
// ============================================

export const api = {
  /**
   * GET request - extracts data from response
   */
  get: async <T>(endpoint: string, params?: Record<string, unknown>): Promise<T> => {
    const response = await apiRequest<ApiResponse<T>>(endpoint, {
      method: 'GET',
      params: params as Record<string, string | number | boolean | undefined>,
    });
    return response.data;
  },

  /**
   * GET request for paginated endpoints - returns data and meta
   */
  getPaginated: async <T>(
    endpoint: string,
    params?: Record<string, unknown>
  ): Promise<PaginatedResult<T>> => {
    const response = await apiRequest<PaginatedApiResponse<T>>(endpoint, {
      method: 'GET',
      params: params as Record<string, string | number | boolean | undefined>,
    });
    return {
      data: response.data,
      meta: response.meta,
    };
  },

  /**
   * POST request - extracts data from response
   */
  post: async <T>(endpoint: string, body?: unknown): Promise<T> => {
    const response = await apiRequest<ApiResponse<T>>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : JSON.stringify({}),
    });
    return response.data;
  },

  /**
   * PUT request - extracts data from response
   */
  put: async <T>(endpoint: string, body?: unknown): Promise<T> => {
    const response = await apiRequest<ApiResponse<T>>(endpoint, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : JSON.stringify({}),
    });
    return response.data;
  },

  /**
   * PATCH request - extracts data from response
   */
  patch: async <T>(endpoint: string, body?: unknown): Promise<T> => {
    const response = await apiRequest<ApiResponse<T>>(endpoint, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : JSON.stringify({}),
    });
    return response.data;
  },

  /**
   * DELETE request - extracts data from response
   */
  delete: async <T>(endpoint: string): Promise<T> => {
    const response = await apiRequest<ApiResponse<T>>(endpoint, {
      method: 'DELETE',
    });
    return response.data;
  },
};

// Legacy export for backwards compatibility
export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  return apiRequest<T>(endpoint, options);
}

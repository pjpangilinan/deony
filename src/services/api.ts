// src/services/api.ts

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  total?: number;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

export const api = {
  getToken: (): string | null => {
    return localStorage.getItem('accessToken');
  },
  
  setToken: (token: string) => {
    localStorage.setItem('accessToken', token);
  },

  clearToken: () => {
    localStorage.removeItem('accessToken');
  },

  async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const { params, headers: customHeaders, ...rest } = options;
    
    // Construct URL
    const url = new URL(endpoint.startsWith('http') ? endpoint : `/api${endpoint}`, window.location.origin);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const token = this.getToken();
    const headers = new Headers(customHeaders);
    
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    if (!headers.has('Content-Type') && !(rest.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url.toString(), {
      ...rest,
      headers,
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = null;
      }
      throw new ApiError(response.status, errorData?.message || response.statusText, errorData);
    }

    // Handle 204 No Content or empty responses
    if (response.status === 204) {
      return {} as T;
    }
    const text = await response.text();
    if (!text) {
      return {} as T;
    }
    
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      return text as unknown as T;
    }
  },

  async get<T>(endpoint: string, params?: FetchOptions['params'], options?: FetchOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET', params });
  },

  async post<T>(endpoint: string, body?: any, options?: FetchOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  async put<T>(endpoint: string, body?: any, options?: FetchOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  async patch<T>(endpoint: string, body?: any, options?: FetchOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  async delete<T>(endpoint: string, options?: FetchOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
};

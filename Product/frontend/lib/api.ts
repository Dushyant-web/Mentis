export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Standardizes authentication header injection for both raw fetch and api wrapper.
 */
export const getAuthHeaders = (tokenOverride?: string) => {
  const token = tokenOverride || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// 🔐 Atomic refresh state to prevent "Thundering Herd" (multiple simultaneous refresh calls)
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.map((callback) => callback(token));
  refreshSubscribers = [];
};

const addRefreshSubscriber = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

/**
 * High-performance API wrapper with centralized error handling and auth management.
 */
export const api = {
  request: async (path: string, method: string = "GET", body?: any, tokenOverride?: string): Promise<any> => {
    const url = `${API_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
    
    // Skip logging for the refresh endpoint to keep console clean during silent renew
    if (path !== 'auth/refresh') {
        console.log(`🚀 [API FETCH] ${method} ${url}`);
    }

    try {
      let res = await fetch(url, {
        method,
        headers: getAuthHeaders(tokenOverride),
        body: body ? JSON.stringify(body) : undefined,
      });

      // 🛡️ AUTH REFRESH LOGIC (401 Interceptor)
      if (res.status === 401 && path !== 'auth/login' && path !== 'auth/signup' && path !== 'auth/refresh') {
        console.warn("🔐 Received 401 Unauthorized. Attempting silent token refresh...");

        if (!isRefreshing) {
          isRefreshing = true;
          
          try {
            // Attempt to refresh the token using current (likely expired) token
            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: getAuthHeaders(),
            });

            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              const newToken = refreshData.access_token;
              
              if (newToken) {
                console.log("✅ Token successfully refreshed.");
                localStorage.setItem('token', newToken);
                isRefreshing = false;
                onTokenRefreshed(newToken);
                
                // Retry the original request
                return api.request(path, method, body, newToken);
              }
            }
          } catch (refreshErr) {
            console.error("❌ Refreshed failed due to network error:", refreshErr);
          }

          // If we reach here, refresh failed. Redirect to login.
          console.error("❌ Auth refresh failed. Redirecting to login...");
          isRefreshing = false;
          localStorage.removeItem('token');
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login?session=expired';
          }
          throw new Error("Session expired. Please log in again.");
        }

        // If a refresh is ALREADY in progress, wait for it and retry
        return new Promise((resolve) => {
          addRefreshSubscriber((token) => {
            resolve(api.request(path, method, body, token));
          });
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || `API Error: ${res.status}`);
      }
      
      return await res.json();
    } catch (error: any) {
      if (error.message !== "Session expired. Please log in again.") {
        console.error(`[API ERROR] ${method} ${path}:`, error.message);
      }
      throw error;
    }
  },

  get: async (path: string, tokenOverride?: string) => api.request(path, "GET", undefined, tokenOverride),
  post: async (path: string, body: any, tokenOverride?: string) => api.request(path, "POST", body, tokenOverride),
  put: async (path: string, body: any, tokenOverride?: string) => api.request(path, "PUT", body, tokenOverride),
  delete: async (path: string, tokenOverride?: string) => api.request(path, "DELETE", undefined, tokenOverride),
};
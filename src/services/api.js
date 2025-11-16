import axios from 'axios'

// Helper to unwrap API success envelope consistently
export const extractData = (input) => {
  if (input == null) return input

  if (input && typeof input === 'object' && 'data' in input) {
    const responseData = input.data
    if (responseData && typeof responseData === 'object' && 'data' in responseData) {
      return responseData.data
    }
    return responseData
  }

  return input
}

// Create axios instance with SESSION-based auth configuration
const configuredBaseUrl = typeof import.meta.env.VITE_API_URL === 'string'
  ? import.meta.env.VITE_API_URL.trim()
  : ''

const normalizedBaseUrl = configuredBaseUrl.replace(/\/$/, '')

const api = axios.create({
  baseURL: normalizedBaseUrl ? `${normalizedBaseUrl}/api` : '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Always send cookies (riom.sid)
  timeout: 10000,
})

// Response interceptor - Handle 401 errors globally and unwrap payloads
api.interceptors.response.use(
  (response) => extractData(response),
  (error) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }

    // Propagate error for component-level handling
    return Promise.reject(error)
  }
)

// Convenience re-exports so existing imports keep working
export const get = (url, config) => api.get(url, config)
export const post = (url, data, config) => api.post(url, data, config)
export const put = (url, data, config) => api.put(url, data, config)
export const del = (url, config) => api.delete(url, config)

export default api

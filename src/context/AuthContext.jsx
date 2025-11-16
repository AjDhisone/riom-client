import { createContext, useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    // Don't check auth if already on login page
    if (window.location.pathname === '/login') {
      setLoading(false)
      return
    }

    try {
      // Check if user is authenticated via session cookie
      const response = await api.get('/auth/me');
      const userObject = response?.user || response;
      setUser(userObject);
      setIsAuthenticated(Boolean(userObject));
    } catch (error) {
      // Not authenticated or session expired
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const userData = await api.get('/auth/me')
      setUser(userData)
      setIsAuthenticated(Boolean(userData))
      return userData
    } catch (error) {
      setUser(null)
      setIsAuthenticated(false)
      throw error
    }
  }

  const login = async (email, password) => {
    try {
      // Login and get session cookie
      await api.post('/auth/login', { email, password })
      
      // Fetch current user info
      const userData = await api.get('/auth/me')
      setUser(userData)
      setIsAuthenticated(Boolean(userData))
      navigate('/dashboard')
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Login failed' 
      }
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setIsAuthenticated(false)
      navigate('/login')
    }
  }

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    fetchCurrentUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

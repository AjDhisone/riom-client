import api from './api'

const authService = {
  login: (email, password) => {
    return api.post('/auth/login', { email, password })
  },

  register: (userData) => {
    return api.post('/auth/register', userData)
  },

  logout: () => {
    return api.post('/auth/logout')
  },

  getCurrentUser: () => {
    return api.get('/auth/me')
  },
}

export default authService

import api from './api'

const skuService = {
  getAll: () => api.get('/skus'),
  getById: (id) => api.get(`/skus/${id}`),
  create: (data) => api.post('/skus', data),
  update: (id, data) => api.put(`/skus/${id}`, data),
  delete: (id) => api.delete(`/skus/${id}`),
  getByProduct: (productId) => api.get(`/skus/product/${productId}`),
}

export default skuService

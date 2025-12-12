import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Plus, Search, X, Edit3, Archive, Package, ChevronLeft, ChevronRight, Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle } from 'lucide-react'

function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [categories, setCategories] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [currency, setCurrency] = useState('USD')
  const { user, loading: authLoading } = useAuth()
  const isAdmin = user?.role === 'admin'
  const canManageProducts = user?.role === 'admin' || user?.role === 'manager'

  // Bulk import state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [importError, setImportError] = useState('')
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    minStock: 10,
    basePrice: 0,
    currentStock: 0,
    initialStock: 0,
    attributes: {},
    createSku: false
  })

  const formatCurrency = (value) => {
    const amount = Number(value)
    if (!Number.isFinite(amount)) {
      return 'N/A'
    }
    try {
      return amount.toLocaleString(undefined, { style: 'currency', currency })
    } catch (error) {
      return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [page, searchQuery, categoryFilter])

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchCurrencySettings()
  }, [])

  const fetchCurrencySettings = async () => {
    try {
      const settingsPayload = await api.get('/settings')
      if (settingsPayload?.settings?.currency) {
        setCurrency(settingsPayload.settings.currency)
      }
    } catch (error) {
      console.error('Failed to fetch currency settings:', error)
    }
  }

  const syncProductStockToSkus = async (productId, desiredTotalStock) => {
    try {
      const skusPayload = await api.get(`/skus?productId=${productId}&limit=1000`)
      const skus = Array.isArray(skusPayload.data) ? skusPayload.data : []
      if (!skus.length) {
        return
      }

      const normalizedSkus = skus.map((sku) => ({
        ...sku,
        stock: Number(sku.stock) || 0,
        createdAt: sku.createdAt,
      }))

      const currentTotal = normalizedSkus.reduce((sum, sku) => sum + sku.stock, 0)
      const desiredTotal = Number(desiredTotalStock) || 0
      const delta = desiredTotal - currentTotal

      if (delta === 0) {
        return
      }

      const ascendingSkus = [...normalizedSkus].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return aTime - bTime
      })

      if (delta > 0) {
        const primarySku = ascendingSkus[0]
        const updatedStock = primarySku.stock + delta
        await api.put(`/skus/${primarySku._id}`, { stock: updatedStock })
        return
      }

      let remainingToRemove = Math.abs(delta)
      const descendingSkus = [...ascendingSkus].reverse()

      for (const sku of descendingSkus) {
        if (remainingToRemove <= 0) {
          break
        }

        const currentStock = sku.stock
        if (currentStock <= 0) {
          continue
        }

        const reduceBy = Math.min(currentStock, remainingToRemove)
        const newStock = currentStock - reduceBy
        await api.put(`/skus/${sku._id}`, { stock: newStock })
        remainingToRemove -= reduceBy
      }
    } catch (error) {
      console.error('Failed to sync product stock to SKUs:', error)
      throw error
    }
  }

  const syncProductPriceToSkus = async (productId, newPrice) => {
    try {
      const priceValue = Number(newPrice)
      if (!Number.isFinite(priceValue) || priceValue < 0) {
        return
      }

      const skusPayload = await api.get(`/skus?productId=${productId}&limit=1000`)
      const skus = Array.isArray(skusPayload.data) ? skusPayload.data : []
      if (!skus.length) {
        return
      }

      await Promise.all(
        skus.map((sku) =>
          api.put(`/skus/${sku._id}`, {
            price: priceValue,
          })
        )
      )
    } catch (error) {
      console.error('Failed to sync product price to SKUs:', error)
      throw error
    }
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setErrorMessage('')
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })
      if (searchQuery) {
        params.append('q', searchQuery)
      }
      if (categoryFilter) {
        params.append('category', categoryFilter)
      }

      const payload = (await api.get(`/products?${params}`)) || {}
      const items = Array.isArray(payload.products) ? payload.products : []
      setProducts(items)
      setTotalPages(payload.totalPages || 1)
      setTotalProducts(
        typeof payload.total === 'number'
          ? payload.total
          : typeof payload.totalProducts === 'number'
            ? payload.totalProducts
            : items.length
      )
    } catch (error) {
      console.error('Error fetching products:', error)
      setErrorMessage(error.response?.data?.message || 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      // Extract unique categories from products or fetch from API
      const payload = (await api.get('/products?limit=1000')) || {}
      const allProducts = Array.isArray(payload.products) ? payload.products : []
      const uniqueCategories = [...new Set(allProducts.map(p => p.category).filter(Boolean))]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const handleSearch = (e) => {
    setSearchQuery(e.target.value)
    setPage(1)
  }

  const handleCategoryFilter = (e) => {
    setCategoryFilter(e.target.value)
    setPage(1)
  }

  const openAddModal = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      category: '',
      description: '',
      minStock: 10,
      basePrice: 0,
      currentStock: 0,
      initialStock: 0,
      attributes: {},
      createSku: false
    })
    setShowModal(true)
  }

  const openEditModal = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      category: product.category,
      description: product.description || '',
      minStock: typeof product.minStock === 'number' ? product.minStock : 0,
      basePrice: typeof product.basePrice === 'number' ? product.basePrice : 0,
      currentStock: typeof product.totalStock === 'number' ? product.totalStock : 0,
      initialStock: 0,
      attributes: {},
      hasSkus: (product.skuCount || 0) > 0
    })
    setShowModal(true)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    const numericFields = ['minStock', 'basePrice', 'initialStock', 'currentStock']
    setFormData(prev => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const basePriceValue = Number(formData.basePrice)
      if (!Number.isFinite(basePriceValue) || basePriceValue < 0) {
        alert('Base price must be a non-negative number')
        return
      }

      const minStockValue = Number(formData.minStock)
      if (!Number.isFinite(minStockValue) || minStockValue < 0) {
        alert('Minimum stock must be a non-negative number')
        return
      }

      const payload = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        basePrice: basePriceValue,
        minStock: minStockValue
      }
      const shouldSyncPrice = editingProduct && Number(editingProduct.basePrice ?? 0) !== basePriceValue

      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, payload)

        if (shouldSyncPrice) {
          try {
            await syncProductPriceToSkus(editingProduct._id, basePriceValue)
          } catch (error) {
            // Error logged inside helper, continue so other edits persist
          }
        }

        if (formData.hasSkus && formData.currentStock != null) {
          try {
            await syncProductStockToSkus(editingProduct._id, Number(formData.currentStock))
          } catch (error) {
            // Error already logged in helper; continue so product fields still save
          }
        }
      } else {
        // Always create a default SKU with initialStock
        const initialStockValue = Number(formData.initialStock ?? 0)
        if (!Number.isFinite(initialStockValue) || initialStockValue < 0) {
          alert('Initial stock must be a non-negative number')
          return
        }

        payload.initialStock = initialStockValue

        // Include attributes if provided
        if (formData.attributes && typeof formData.attributes === 'object') {
          payload.attributes = formData.attributes
        }

        const result = await api.post('/products', payload)
        const createdProduct = result?.product
        if (createdProduct) {
          setProducts((prev) => [createdProduct, ...prev])
          setTotalProducts((prev) => prev + 1)
        }
        setSearchQuery('')
        setCategoryFilter('')
        setPage(1)
      }
      await fetchProducts()
      await fetchCategories() // Refresh categories after adding/editing
      setShowModal(false)
    } catch (error) {
      console.error('Error saving product:', error)
      alert(error.response?.data?.message || 'Failed to save product')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to archive this product?')) return

    try {
      // Soft delete - archive the product
      await api.delete(`/products/${id}`)
      fetchProducts()
      fetchCategories() // Refresh categories
    } catch (error) {
      console.error('Error archiving product:', error)
      alert(error.response?.data?.message || 'Failed to archive product')
    }
  }

  // Bulk Import Handlers
  const openImportModal = () => {
    setShowImportModal(true)
    setImportFile(null)
    setImportResult(null)
    setImportError('')
  }

  const closeImportModal = () => {
    setShowImportModal(false)
    setImportFile(null)
    setImportResult(null)
    setImportError('')
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setImportError('Please select a CSV file')
        return
      }
      setImportFile(file)
      setImportError('')
      setImportResult(null)
    }
  }

  const handleImportSubmit = async () => {
    if (!importFile) {
      setImportError('Please select a file first')
      return
    }

    setImportLoading(true)
    setImportError('')
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', importFile)

      const response = await api.post('/products/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setImportResult(response)
      await fetchProducts()
      await fetchCategories()
    } catch (error) {
      console.error('Import error:', error)
      const errorData = error.response?.data
      if (errorData?.error?.details && Array.isArray(errorData.error.details)) {
        setImportError(errorData.error.details.join('\n'))
      } else {
        setImportError(errorData?.message || 'Failed to import products')
      }
    } finally {
      setImportLoading(false)
    }
  }

  const downloadSampleCSV = () => {
    const sampleCSV = `name,category,basePrice,description,minStock,initialStock
Blue T-Shirt,Clothing,29.99,Cotton t-shirt in blue,10,100
Wireless Mouse,Electronics,49.99,Ergonomic wireless mouse,5,50
Leather Wallet,Accessories,39.99,Genuine leather wallet,15,75
Coffee Mug,Kitchen,12.99,Ceramic coffee mug,20,200
Running Shoes,Footwear,89.99,Lightweight running shoes,8,60`

    const blob = new Blob([sampleCSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'product_import_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Products</h1>
          <p className="text-slate-500 mt-1">Manage your product catalog</p>
        </div>
        {canManageProducts && (
          <div className="flex gap-3">
            <button onClick={openImportModal} className="btn-secondary flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Import CSV
            </button>
            <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Product
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <div className="mb-4 flex gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search products by name..."
            value={searchQuery}
            onChange={handleSearch}
            className="input-field flex-1 min-w-[200px]"
          />
          <select
            value={categoryFilter}
            onChange={handleCategoryFilter}
            className="input-field w-48"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {(searchQuery || categoryFilter) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setCategoryFilter('')
                setPage(1)
              }}
              className="btn-secondary"
            >
              Clear Filters
            </button>
          )}
        </div>

        {totalProducts > 0 && (
          <div className="mb-4 text-sm text-gray-600">
            Showing {products.length} of {totalProducts} products
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}


        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mb-4"></div>
            <p className="text-slate-600 font-medium">Loading products...</p>
            <p className="text-slate-400 text-sm mt-1">Organizing your catalog</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Base Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Available Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Min Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                        No products found. Click "Add Product" to get started.
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{product.category}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatCurrency(product.basePrice)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{product.totalStock ?? 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{product.minStock ?? 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.isActive === false
                            ? 'bg-gray-200 text-gray-700'
                            : 'bg-green-100 text-green-800'
                            }`}>
                            {product.isActive === false ? 'Archived' : 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {canManageProducts && product.isActive !== false ? (
                            <>
                              <button
                                onClick={() => openEditModal(product)}
                                className="text-primary-600 hover:text-primary-900 mr-4"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(product._id)}
                                className="text-red-600 hover:text-red-900"
                                title="Archive product"
                              >
                                Archive
                              </button>
                            </>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-md my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  {editingProduct ? (
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Stock
                      </label>
                      <input
                        type="number"
                        name="currentStock"
                        value={formData.currentStock ?? 0}
                        onChange={handleInputChange}
                        min="0"
                        className={`input-field ${!formData.hasSkus ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        disabled={!formData.hasSkus}
                      />
                      {formData.hasSkus ? (
                        <p className="text-xs text-gray-500 mt-1">
                          Updates the SKU stock for this product.
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 mt-1">
                          No SKUs exist for this product. Create a SKU from the SKUs page to manage stock.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Initial Stock *
                      </label>
                      <input
                        type="number"
                        name="initialStock"
                        value={formData.initialStock}
                        onChange={handleInputChange}
                        min="0"
                        required
                        className="input-field"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        A default SKU will be created with this stock quantity.
                      </p>
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Stock *
                  </label>
                  <input
                    type="number"
                    name="minStock"
                    value={formData.minStock}
                    onChange={handleInputChange}
                    required
                    min="0"
                    className="input-field"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Price
                </label>
                <input
                  type="number"
                  name="basePrice"
                  value={formData.basePrice}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="input-field"
                />
              </div>
              {!editingProduct && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Attributes (optional)
                  </label>
                  <textarea
                    name="attributes"
                    value={Object.entries(formData.attributes || {})
                      .map(([key, value]) => `${key}: ${value}`)
                      .join('\n')}
                    onChange={(e) => {
                      const text = e.target.value
                      const attrs = {}
                      text.split('\n').forEach(line => {
                        const [key, ...valueParts] = line.split(':')
                        const trimmedKey = key?.trim()
                        const trimmedValue = valueParts.join(':').trim()
                        if (trimmedKey && trimmedValue) {
                          attrs[trimmedKey] = trimmedValue
                        }
                      })
                      setFormData(prev => ({ ...prev, attributes: attrs }))
                    }}
                    rows="3"
                    placeholder="Size: Medium&#10;Color: Blue"
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter attributes as key: value pairs (one per line).
                  </p>
                </div>
              )}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingProduct ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                Import Products from CSV
              </h2>
              <button onClick={closeImportModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Instructions */}
            <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
              <h3 className="font-semibold text-indigo-900 mb-2">CSV Format Instructions</h3>
              <p className="text-sm text-indigo-800 mb-3">
                Your CSV file should have the following columns:
              </p>
              <div className="overflow-x-auto">
                <table className="text-sm w-full">
                  <thead>
                    <tr className="text-left border-b border-indigo-200">
                      <th className="py-1 pr-4 text-indigo-900">Column</th>
                      <th className="py-1 pr-4 text-indigo-900">Required</th>
                      <th className="py-1 text-indigo-900">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-indigo-800">
                    <tr><td className="py-1 pr-4 font-mono">name</td><td className="pr-4">✓ Yes</td><td>Product name</td></tr>
                    <tr><td className="py-1 pr-4 font-mono">category</td><td className="pr-4">✓ Yes</td><td>Product category</td></tr>
                    <tr><td className="py-1 pr-4 font-mono">basePrice</td><td className="pr-4">✓ Yes</td><td>Price (number only, no currency symbol)</td></tr>
                    <tr><td className="py-1 pr-4 font-mono">description</td><td className="pr-4">Optional</td><td>Product description</td></tr>
                    <tr><td className="py-1 pr-4 font-mono">minStock</td><td className="pr-4">Optional</td><td>Minimum stock threshold (default: 0)</td></tr>
                    <tr><td className="py-1 pr-4 font-mono">initialStock</td><td className="pr-4">Optional</td><td>Starting inventory (default: 0)</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Google Sheets / Excel Instructions */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  From Google Sheets
                </h4>
                <ol className="text-sm text-green-800 list-decimal list-inside space-y-1">
                  <li>Add headers in Row 1</li>
                  <li>Fill product data from Row 2</li>
                  <li>File → Download → CSV (.csv)</li>
                  <li>Upload the file below</li>
                </ol>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  From Excel
                </h4>
                <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
                  <li>Add headers in Row 1</li>
                  <li>Fill product data from Row 2</li>
                  <li>File → Save As → CSV</li>
                  <li>Upload the file below</li>
                </ol>
              </div>
            </div>

            {/* Download Template */}
            <div className="mb-6">
              <button
                onClick={downloadSampleCSV}
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <Download className="w-5 h-5" />
                Download Sample CSV Template
              </button>
            </div>

            {/* File Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select CSV File
              </label>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Choose File
                </button>
                {importFile && (
                  <span className="text-sm text-gray-600">
                    {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                  </span>
                )}
              </div>
            </div>

            {/* Error Message */}
            {importError && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-800">Import Error</h4>
                    <pre className="text-sm text-red-700 whitespace-pre-wrap mt-1">{importError}</pre>
                  </div>
                </div>
              </div>
            )}

            {/* Success Result */}
            {importResult && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-green-800">Import Successful!</h4>
                    <p className="text-sm text-green-700 mt-1">
                      {importResult.created} products imported successfully
                      {importResult.failed > 0 && `, ${importResult.failed} failed`}
                    </p>
                    {importResult.failedProducts?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-red-700">Failed items:</p>
                        <ul className="text-sm text-red-600 list-disc list-inside">
                          {importResult.failedProducts.map((item, idx) => (
                            <li key={idx}>Row {item.row}: {item.name} - {item.error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={closeImportModal}
                className="btn-secondary"
              >
                {importResult ? 'Close' : 'Cancel'}
              </button>
              {!importResult && (
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  disabled={!importFile || importLoading}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import Products
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Products

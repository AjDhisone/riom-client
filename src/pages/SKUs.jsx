import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const createInitialForm = () => ({
  productId: '',
  sku: '',
  price: 0,
  stock: 0,
  reorderThreshold: '',
  barcode: '',
  attributes: [{ key: '', value: '' }],
})

function SKUs() {
  const { user, loading: authLoading } = useAuth()
  const isAdmin = user?.role === 'admin'
  const canManageSKUs = user?.role === 'admin' || user?.role === 'manager'

  const [skus, setSkus] = useState([])
  const [products, setProducts] = useState([])
  const [formData, setFormData] = useState(createInitialForm)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalSkus, setTotalSkus] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingSku, setEditingSku] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [modalError, setModalError] = useState('')

  const currencyFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency })
    } catch (error) {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })
    }
  }, [currency])

  useEffect(() => {
    if (!authLoading) {
      fetchAuxiliaryData()
    }
  }, [authLoading, user?.role])

  useEffect(() => {
    if (!authLoading) {
      fetchSkus()
    }
  }, [authLoading, page, searchQuery, selectedProduct])

  const fetchAuxiliaryData = async () => {
    try {
      const productsPromise = api.get('/products?limit=1000')
      const settingsPromise = isAdmin ? api.get('/settings') : null

      const [productsPayload, settingsPayload] = await Promise.all([
        productsPromise,
        settingsPromise,
      ])

      const allProducts = Array.isArray(productsPayload?.products)
        ? productsPayload.products
        : []

      // Deduplicate products by name (case-insensitive)
      const uniqueProducts = []
      const seenNames = new Set()
      
      allProducts.forEach((product) => {
        if (!product?.name) {
          return
        }
        const normalizedName = product.name.toLowerCase().trim()
        if (!seenNames.has(normalizedName)) {
          seenNames.add(normalizedName)
          uniqueProducts.push({
            id: product._id,
            name: product.name,
            totalStock: Number.isFinite(product.totalStock) ? product.totalStock : Number(product.totalStock) || 0,
            minStock: Number.isFinite(product.minStock) ? product.minStock : Number(product.minStock) || 0,
          })
        }
      })

      setProducts(uniqueProducts)

      if (settingsPayload?.settings?.currency) {
        setCurrency(settingsPayload.settings.currency)
      }
    } catch (error) {
      console.error('Failed to load supporting data for SKUs:', error)
    }
  }

  const fetchSkus = async () => {
    try {
      setLoading(true)
      setErrorMessage('')

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      })

      if (searchQuery) {
        params.append('q', searchQuery)
      }
      if (selectedProduct) {
        params.append('productId', selectedProduct)
      }

      const payload = await api.get(`/skus?${params}`)
      const items = Array.isArray(payload?.data) ? payload.data : []

      setSkus(items)
      setTotalSkus(typeof payload?.total === 'number' ? payload.total : items.length)

      const resolvedLimit = Number(payload?.limit) || 10
      const computedPages = resolvedLimit > 0 ? Math.max(1, Math.ceil((payload?.total || items.length) / resolvedLimit)) : 1
      setTotalPages(computedPages)
    } catch (error) {
      console.error('Failed to load SKUs:', error)
      setErrorMessage(error.response?.data?.message || 'Unable to load SKUs')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    const amount = Number(value)
    if (!Number.isFinite(amount)) {
      return 'N/A'
    }
    return currencyFormatter.format(amount)
  }

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value)
    setPage(1)
  }

  const handleProductFilter = (event) => {
    setSelectedProduct(event.target.value)
    setPage(1)
  }

  const openModal = (sku = null) => {
    if (sku) {
      // Edit mode
      setEditingSku(sku)
      setFormData({
        productId: sku.productId || '',
        sku: sku.sku || '',
        price: sku.price || 0,
        stock: sku.stock || 0,
        reorderThreshold: sku.reorderThreshold || '',
        barcode: sku.barcode || '',
        attributes: sku.attributes && Object.keys(sku.attributes).length > 0
          ? Object.entries(sku.attributes).map(([key, value]) => ({ key, value }))
          : [{ key: '', value: '' }],
      })
    } else {
      // Add mode
      setEditingSku(null)
      setFormData(() => {
        const fallbackProductId = selectedProduct || products[0]?.id || ''
        const productMeta = products.find((product) => product.id === fallbackProductId)
        const defaultStock = productMeta ? Math.max(0, Number(productMeta.totalStock ?? 0) || 0) : 0
        const defaultReorder = productMeta && productMeta.minStock != null
          ? Math.max(0, Number(productMeta.minStock) || 0)
          : ''

        return {
          ...createInitialForm(),
          productId: fallbackProductId,
          stock: defaultStock,
          reorderThreshold: defaultReorder,
        }
      })
    }
    setSuccessMessage('')
    setErrorMessage('')
    setModalError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingSku(null)
    setFormData(createInitialForm())
    setModalError('')
  }

  const handleFormChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => {
      if (name === 'productId' && !editingSku) {
        const productMeta = products.find((product) => product.id === value)
        const defaultStock = productMeta ? Math.max(0, Number(productMeta.totalStock ?? 0) || 0) : 0
        const defaultReorder = productMeta && productMeta.minStock != null
          ? Math.max(0, Number(productMeta.minStock) || 0)
          : ''

        return {
          ...prev,
          productId: value,
          stock: defaultStock,
          reorderThreshold: defaultReorder,
        }
      }

      if (name === 'price' || name === 'stock' || name === 'reorderThreshold') {
        const numericValue = Number(value)
        return {
          ...prev,
          [name]: Number.isNaN(numericValue) ? '' : Math.max(0, numericValue),
        }
      }

      return {
        ...prev,
        [name]: value,
      }
    })
  }

  const handleAttributeChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = prev.attributes.map((entry, idx) => {
        if (idx !== index) {
          return entry
        }
        return {
          ...entry,
          [field]: value,
        }
      })
      return {
        ...prev,
        attributes: updated,
      }
    })
  }

  const addAttributeRow = () => {
    setFormData((prev) => ({
      ...prev,
      attributes: [...prev.attributes, { key: '', value: '' }],
    }))
  }

  const removeAttributeRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      attributes: prev.attributes.filter((_, idx) => idx !== index),
    }))
  }

  const handleDeleteSku = async (skuId) => {
    if (!canManageSKUs) {
      return
    }

    if (!confirm('Delete this SKU? This action cannot be undone.')) {
      return
    }

    try {
      setErrorMessage('')
      setSuccessMessage('')
      await api.delete(`/skus/${skuId}`)
      const normalizedId = skuId?.toString ? skuId.toString() : skuId
      setSkus((prev) =>
        prev.filter((item) => {
          const itemId = item._id || item.id || item.sku
          return (itemId?.toString ? itemId.toString() : itemId) !== normalizedId
        })
      )
      setTotalSkus((prev) => (prev > 0 ? prev - 1 : 0))
      setSuccessMessage('SKU deleted successfully')
      await fetchSkus()
    } catch (error) {
      console.error('Failed to delete SKU:', error)
      setErrorMessage(error.response?.data?.message || 'Failed to delete SKU')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canManageSKUs) {
      return
    }

    if (!editingSku && !formData.productId) {
      setErrorMessage('Please select a product for this SKU')
      return
    }

    try {
      setSaving(true)
      setErrorMessage('')
      setModalError('')

      const attributeMap = formData.attributes
        .filter((entry) => entry.key.trim() && entry.value.trim())
        .reduce((acc, entry) => {
          acc[entry.key.trim()] = entry.value.trim()
          return acc
        }, {})

      if (editingSku) {
        const payload = {
          sku: formData.sku,
          barcode: formData.barcode || undefined,
          attributes: attributeMap,
        }

        const response = await api.put(`/skus/${editingSku._id}`, payload)
        const updatedSku = response?.sku || { ...editingSku, ...payload }

        setSkus((prev) =>
          prev.map((item) => (item._id === editingSku._id ? { ...item, ...updatedSku } : item))
        )
        setSuccessMessage('SKU updated successfully')
      } else {
        const payload = await api.post('/skus', {
          productId: formData.productId,
          sku: formData.sku,
          price: Number(formData.price),
          stock: Number(formData.stock) || 0,
          reorderThreshold: formData.reorderThreshold === '' ? undefined : Number(formData.reorderThreshold),
          barcode: formData.barcode || undefined,
          attributes: attributeMap,
        })

        const createdSku = payload?.sku
        if (createdSku) {
          setSkus((prev) => [createdSku, ...prev])
          setTotalSkus((prev) => prev + 1)
        }
        setSuccessMessage('SKU created successfully')
      }

      closeModal()
      fetchSkus()
    } catch (error) {
      const action = editingSku ? 'update' : 'create'
      console.error(`Failed to ${action} SKU:`, error)
      const defaultMessage = editingSku ? 'Failed to update SKU' : 'Failed to create SKU'
      setModalError(error.response?.data?.message || defaultMessage)
    } finally {
      setSaving(false)
    }
  }

  const productNameById = (id) => products.find((product) => product.id === id)?.name || 'Unknown product'

  const renderAttributes = (attributes) => {
    if (!attributes || typeof attributes !== 'object') {
      return '—'
    }
    const entries = Object.entries(attributes)
    if (!entries.length) {
      return '—'
    }
    return entries.map(([key, value]) => `${key}: ${value}`).join(', ')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SKUs</h1>
          <p className="text-gray-600 mt-1">Manage product variants and SKUs</p>
        </div>
        {canManageSKUs && (
          <button onClick={() => openModal()} className="btn-primary">
            + Add SKU
          </button>
        )}
      </div>

      <div className="card">
        <div className="mb-4 flex gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search SKUs or barcodes..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="input-field flex-1 min-w-[200px]"
          />
          <select
            value={selectedProduct}
            onChange={handleProductFilter}
            className="input-field w-56"
          >
            <option value="">All Products</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          {(searchQuery || selectedProduct) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedProduct('')
                setPage(1)
              }}
              className="btn-secondary"
            >
              Clear Filters
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-md bg-green-50 p-4 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attributes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Barcode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    {canManageSKUs && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {skus.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                        No SKUs found. {canManageSKUs ? 'Click "Add SKU" to create one.' : 'Try adjusting your filters.'}
                      </td>
                    </tr>
                  ) : (
                    skus.map((sku, index) => (
                      <tr key={sku._id || sku.id || sku.sku || `sku-${index}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sku.sku}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {productNameById(sku.productId)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {renderAttributes(sku.attributes)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{sku.barcode}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sku.stock ?? 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(sku.price)}</td>
                        {canManageSKUs && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => openModal(sku)}
                                className="text-primary-600 hover:text-primary-900"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteSku(sku._id || sku.id || sku.sku)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalSkus > 0 && (
              <div className="mt-4 text-sm text-gray-600">
                Showing {skus.length} of {totalSkus} SKUs
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <button
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-4">{editingSku ? 'Edit SKU' : 'Add New SKU'}</h2>
            {modalError && (
              <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
                {modalError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product *
                </label>
                <select
                  name="productId"
                  value={formData.productId}
                  onChange={handleFormChange}
                  required
                  className="input-field"
                  disabled={saving || Boolean(editingSku)}
                >
                  <option value="" disabled>
                    Select a product
                  </option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                {editingSku && (
                  <p className="text-xs text-gray-500 mt-1">
                    Change product from the Products page.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleFormChange}
                    required
                    className="input-field"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleFormChange}
                    className="input-field"
                    placeholder="Leave empty to auto-generate"
                    disabled={saving}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attributes
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Optional descriptive fields such as size, color, or material. Leave blank rows empty or remove them.
                </p>
                <div className="space-y-3">
                  {formData.attributes.map((attribute, index) => (
                    <div key={`attr-${index}`} className="grid grid-cols-1 md:grid-cols-10 gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Attribute name (e.g., Size)"
                        value={attribute.key}
                        onChange={(event) => handleAttributeChange(index, 'key', event.target.value)}
                        className="input-field md:col-span-4"
                        disabled={saving}
                      />
                      <input
                        type="text"
                        placeholder="Attribute value (e.g., Large)"
                        value={attribute.value}
                        onChange={(event) => handleAttributeChange(index, 'value', event.target.value)}
                        className="input-field md:col-span-5"
                        disabled={saving}
                      />
                      <button
                        type="button"
                        onClick={() => removeAttributeRow(index)}
                        className="btn-secondary text-sm"
                        disabled={saving || formData.attributes.length === 1}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addAttributeRow}
                  className="btn-secondary mt-3"
                  disabled={saving}
                >
                  + Add attribute
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price *
                  </label>
                  <input
                    type="number"
                    name="price"
                    min="0"
                    value={formData.price}
                    onChange={handleFormChange}
                    required
                    className={`input-field ${editingSku ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    disabled={saving || Boolean(editingSku)}
                  />
                  {editingSku && (
                    <p className="text-xs text-gray-500 mt-1">
                      Update product price from the Products page.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock (auto-filled)
                  </label>
                  <input
                    type="number"
                    name="stock"
                    min="0"
                    value={formData.stock}
                    onChange={handleFormChange}
                    className={`input-field ${editingSku ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Managed via Products page; we auto-fill based on the product.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reorder Threshold
                  </label>
                  <input
                    type="number"
                    name="reorderThreshold"
                    min="0"
                    value={formData.reorderThreshold}
                    onChange={handleFormChange}
                    className="input-field bg-gray-100 cursor-not-allowed"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Follows the product’s minimum stock setting automatically.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={saving}
                >
                  {saving ? 'Creating...' : 'Create SKU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SKUs

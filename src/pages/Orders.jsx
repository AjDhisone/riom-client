import { useEffect, useMemo, useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

const defaultCustomer = () => ({
  name: '',
  email: '',
  phone: '',
})

const createInitialOrderForm = () => ({
  customer: defaultCustomer(),
  items: [{ skuId: '', quantity: 1 }],
  tax: '',
})

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

function Orders() {
  const { loading: authLoading } = useAuth()

  const [orders, setOrders] = useState([])
  const [skus, setSkus] = useState([])
  const [products, setProducts] = useState([])
  const [formData, setFormData] = useState(createInitialOrderForm)
  const [currency, setCurrency] = useState('INR')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [modalError, setModalError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)

  const currencyFormatter = useMemo(() => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
      })
    } catch (error) {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })
    }
  }, [currency])

  useEffect(() => {
    if (!authLoading) {
      fetchOrders()
    }
  }, [authLoading, page, statusFilter, fromDate, toDate])

  useEffect(() => {
    if (!authLoading) {
      fetchSupportingData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading])

  const fetchSupportingData = async () => {
    try {
      const [skuPayload, productPayload, settingsPayload] = await Promise.all([
        api.get('/skus?limit=1000'),
        api.get('/products?limit=1000'),
        api.get('/settings').catch(() => null),
      ])

      const skuList = Array.isArray(skuPayload?.data) ? skuPayload.data : []
      setSkus(skuList)

      const allProducts = Array.isArray(productPayload?.products) ? productPayload.products : []
      
      // Deduplicate products by name (case-insensitive)
      const uniqueProducts = []
      const seenNames = new Set()
      
      allProducts.forEach((product) => {
        const normalizedName = product.name.toLowerCase().trim()
        if (!seenNames.has(normalizedName)) {
          seenNames.add(normalizedName)
          uniqueProducts.push(product)
        }
      })
      
      setProducts(uniqueProducts)

      if (settingsPayload?.settings?.currency) {
        setCurrency(settingsPayload.settings.currency)
      }
    } catch (error) {
      console.error('Failed to load SKUs or settings for orders:', error)
    }
  }

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setErrorMessage('')

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      })

      if (statusFilter) {
        params.append('status', statusFilter)
      }
      if (fromDate) {
        params.append('from', fromDate)
      }
      if (toDate) {
        params.append('to', toDate)
      }

      const payload = await api.get(`/orders?${params}`)
      const items = Array.isArray(payload?.data) ? payload.data : []

      setOrders(items)
      setTotalOrders(typeof payload?.total === 'number' ? payload.total : items.length)

      const limit = Number(payload?.limit) || 10
      const computedPages = limit > 0 ? Math.max(1, Math.ceil((payload?.total || items.length) / limit)) : 1
      setTotalPages(computedPages)
    } catch (error) {
      console.error('Failed to load orders:', error)
      setErrorMessage(error.response?.data?.message || 'Unable to load orders')
      setOrders([])
      setTotalOrders(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  const openModal = () => {
    setFormData(createInitialOrderForm())
    setModalError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setFormData(createInitialOrderForm())
    setModalError('')
  }

  const skuLookup = useMemo(() => {
    const map = new Map()
    skus.forEach((sku) => {
      map.set(String(sku._id || sku.id), sku)
    })
    return map
  }, [skus])

  const productLookup = useMemo(() => {
    const map = new Map()
    products.forEach((product) => {
      map.set(String(product._id || product.id), product)
    })
    return map
  }, [products])

  const formatCurrency = (value) => {
    const amount = Number(value)
    if (!Number.isFinite(amount)) {
      return '—'
    }
    return currencyFormatter.format(amount)
  }

  const formatDate = (value) => {
    if (!value) return '—'
    try {
      const formatter = new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      return formatter.format(new Date(value))
    } catch (error) {
      return value
    }
  }

  const handleCustomerChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      customer: {
        ...prev.customer,
        [name]: value,
      },
    }))
  }

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = prev.items.map((item, idx) => {
        if (idx !== index) {
          return item
        }
        if (field === 'quantity') {
          const qty = Number(value)
          return {
            ...item,
            quantity: Number.isInteger(qty) && qty > 0 ? qty : 1,
          }
        }
        return {
          ...item,
          [field]: value,
        }
      })
      return {
        ...prev,
        items: updated,
      }
    })
  }

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { skuId: '', quantity: 1 }],
    }))
  }

  const removeItemRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validItems = formData.items.filter((item) => item.skuId)
    if (!validItems.length) {
      setModalError('Please select at least one SKU to create an order')
      return
    }

    try {
      setSaving(true)
      setModalError('')
      setSuccessMessage('')

      const payload = {
        customer: {
          name: formData.customer.name,
          email: formData.customer.email,
          phone: formData.customer.phone,
        },
        items: validItems.map((item) => ({
          skuId: item.skuId,
          quantity: Number(item.quantity) || 1,
        })),
        tax: formData.tax === '' ? undefined : Number(formData.tax),
      }

      const createdPayload = await api.post('/orders', payload)
      const createdOrder = createdPayload?.order || createdPayload
      setSuccessMessage('Order created successfully')
      closeModal()
      if (createdOrder) {
        setSelectedOrder(createdOrder)
        setShowDetailModal(true)
        setDetailError('')
        setDetailLoading(false)
      }
      setPage(1)
      fetchOrders()
    } catch (error) {
      console.error('Failed to create order:', error)
      setModalError(error.response?.data?.message || 'Failed to create order')
    } finally {
      setSaving(false)
    }
  }

  const closeDetailModal = () => {
    setShowDetailModal(false)
    setSelectedOrder(null)
    setDetailError('')
  }

  const openOrderDetails = async (orderId) => {
    setDetailError('')
    if (!orderId) {
      setDetailError('Order identifier is missing')
      setSelectedOrder(null)
      setShowDetailModal(true)
      return
    }
    setDetailLoading(true)
    setShowDetailModal(true)
    try {
      const payload = await api.get(`/orders/${orderId}`)
      const order = payload?.order || payload
      setSelectedOrder(order)
    } catch (error) {
      console.error('Failed to fetch order details:', error)
      setDetailError(error.response?.data?.message || 'Failed to load order details')
      setSelectedOrder(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const totalItemCount = (order) => {
    if (!order || !Array.isArray(order.items)) return 0
    return order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  }

  const resolveProductName = (productId) => {
    if (!productId) return 'Unknown product'
    const product = productLookup.get(String(productId))
    return product?.name || 'Unknown product'
  }

  const renderAttributes = (attributes) => {
    if (!attributes) return '—'
    let entries = []
    if (attributes instanceof Map) {
      entries = Array.from(attributes.entries())
    } else if (typeof attributes === 'object') {
      entries = Object.entries(attributes)
    }
    if (!entries.length) return '—'
    return entries.map(([key, value]) => `${key}: ${value}`).join(', ')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-600 mt-1">Track and manage orders</p>
        </div>
        <button onClick={openModal} className="btn-primary">
          + New Order
        </button>
      </div>

      <div className="card">
        <div className="mb-4 flex flex-wrap gap-4 items-end">
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value)
              setPage(1)
            }}
            className="input-field w-48"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value)
                setPage(1)
              }}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value)
                setPage(1)
              }}
              className="input-field"
            />
          </div>
          {(statusFilter || fromDate || toDate) && (
            <button
              onClick={() => {
                setStatusFilter('')
                setFromDate('')
                setToDate('')
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
                      Order #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        No orders found. Click "New Order" to create one.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order, index) => (
                      <tr key={order._id || order.id || order.orderNumber || `order-${index}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.orderNumber || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(order.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {order.customer?.name || 'Walk-in'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {Array.isArray(order.items) ? `${order.items.length} items` : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              order.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : order.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {order.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <button
                            type="button"
                            className="text-primary-600 hover:text-primary-800"
                            onClick={() => openOrderDetails(order._id || order.id)}
                          >
                            View details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalOrders > 0 && (
              <div className="mt-4 text-sm text-gray-600">
                Showing {orders.length} of {totalOrders} orders
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
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-2xl font-bold mb-4">Create New Order</h2>

            {modalError && (
              <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Customer Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.customer.name}
                      onChange={handleCustomerChange}
                      className="input-field"
                      placeholder="Walk-in customer"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.customer.email}
                      onChange={handleCustomerChange}
                      className="input-field"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.customer.phone}
                      onChange={handleCustomerChange}
                      className="input-field"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Order Items</h3>
                <div className="space-y-4">
                  {formData.items.map((item, index) => {
                    const sku = skuLookup.get(item.skuId)
                    return (
                      <div key={`order-item-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-7">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            SKU *
                          </label>
                          <select
                            value={item.skuId}
                            onChange={(event) => handleItemChange(index, 'skuId', event.target.value)}
                            className="input-field"
                            required
                            disabled={saving}
                          >
                            <option value="" disabled>
                              Select SKU
                            </option>
                            {skus.map((option) => (
                              <option key={option._id || option.id} value={option._id || option.id}>
                                {option.sku} — {productLookup.get(String(option.productId))?.name || option.productName || option.productId}
                              </option>
                            ))}
                          </select>
                          {sku && (
                            <p className="text-xs text-gray-500 mt-1">
                              Price: {formatCurrency(sku.price)} | Stock: {sku.stock ?? 0}
                            </p>
                          )}
                        </div>
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(event) => handleItemChange(index, 'quantity', event.target.value)}
                            className="input-field"
                            disabled={saving}
                            required
                          />
                        </div>
                        <div className="md:col-span-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            className="btn-secondary w-full"
                            disabled={saving || formData.items.length === 1}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="btn-secondary mt-3"
                  disabled={saving}
                >
                  + Add Item
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.tax}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, tax: event.target.value }))
                    }
                    className="input-field"
                    placeholder="Optional"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
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
                  disabled={saving || !skus.length}
                >
                  {saving ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">Order details</h2>
                {selectedOrder?.orderNumber && (
                  <p className="text-sm text-gray-600 mt-1">Order #{selectedOrder.orderNumber}</p>
                )}
              </div>
              <button
                type="button"
                onClick={closeDetailModal}
                className="btn-secondary"
              >
                Close
              </button>
            </div>

            {detailError && (
              <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
                {detailError}
              </div>
            )}

            {detailLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : selectedOrder ? (
              <div className="space-y-6">
                <section>
                  <h3 className="text-lg font-semibold mb-3">Order summary</h3>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                    <div>
                      <dt className="font-medium text-gray-900">Placed on</dt>
                      <dd>{formatDate(selectedOrder.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-900">Status</dt>
                      <dd className="capitalize">{selectedOrder.status || 'Unknown'}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-900">Total items</dt>
                      <dd>{totalItemCount(selectedOrder)}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-gray-900">Order total</dt>
                      <dd>{formatCurrency(selectedOrder.total)}</dd>
                    </div>
                  </dl>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-3">Customer</h3>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><span className="font-medium text-gray-900">Name:</span> {selectedOrder.customer?.name || 'Walk-in customer'}</p>
                    {selectedOrder.customer?.email && (
                      <p><span className="font-medium text-gray-900">Email:</span> {selectedOrder.customer.email}</p>
                    )}
                    {selectedOrder.customer?.phone && (
                      <p><span className="font-medium text-gray-900">Phone:</span> {selectedOrder.customer.phone}</p>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-3">Items</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attributes</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit price</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Line total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedOrder.items?.map((item, idx) => {
                          const productName = resolveProductName(item.productId) || item.productName || skuLookup.get(String(item.skuId))?.productName
                          return (
                            <tr key={item._id || item.skuId || `order-line-${idx}`}>
                              <td className="px-4 py-2 text-gray-900">{productName || 'Unknown product'}</td>
                              <td className="px-4 py-2 text-gray-700">{item.sku || skuLookup.get(String(item.skuId))?.sku || '—'}</td>
                              <td className="px-4 py-2 text-gray-600">{renderAttributes(item.attributes)}</td>
                              <td className="px-4 py-2 text-right text-gray-700">{item.quantity}</td>
                              <td className="px-4 py-2 text-right text-gray-700">{formatCurrency(item.unitPrice)}</td>
                              <td className="px-4 py-2 text-right text-gray-900 font-medium">{formatCurrency(item.lineTotal)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                  <div>
                    <dt className="font-medium text-gray-900">Subtotal</dt>
                    <dd>{formatCurrency(selectedOrder.subTotal)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-900">Tax</dt>
                    <dd>{formatCurrency(selectedOrder.tax)}</dd>
                  </div>
                </section>
              </div>
            ) : (
              <p className="text-sm text-gray-600">Select an order to view details.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Orders

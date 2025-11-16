import { useState, useEffect } from 'react'
import api from '../services/api'

function Reports() {
  const [loading, setLoading] = useState(true)
  const [salesSummary, setSalesSummary] = useState({
    totalOrders: 0,
    totalSales: 0,
    totalUnitsSold: 0,
    avgOrderValue: 0
  })
  const [topSelling, setTopSelling] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [currency, setCurrency] = useState('USD')
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchReports()
  }, [dateRange])

  const fetchReports = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to
      })

      const [summaryRes, topSellingRes, lowStockRes, settingsRes] = await Promise.all([
        api.get(`/analytics/sales-summary?${params}`),
        api.get(`/reports/top-selling?${params}&limit=10`),
        api.get('/alerts/low-stock'),
        api.get('/settings').catch(() => null)
      ])

      setSalesSummary(summaryRes?.summary || summaryRes || {})
      setTopSelling(Array.isArray(topSellingRes?.products) ? topSellingRes.products : [])
      setLowStock(Array.isArray(lowStockRes?.alerts) ? lowStockRes.alerts : [])
      
      if (settingsRes?.settings?.currency) {
        setCurrency(settingsRes.settings.currency)
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (e) => {
    const { name, value } = e.target
    setDateRange(prev => ({ ...prev, [name]: value }))
  }

  const formatCurrency = (value) => {
    try {
      return Number(value || 0).toLocaleString(undefined, { 
        style: 'currency', 
        currency
      })
    } catch (error) {
      return Number(value || 0).toLocaleString(undefined, { 
        style: 'currency', 
        currency: 'USD' 
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-1">View analytics and generate reports</p>
      </div>

      {/* Date Range Filter */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Date Range</h2>
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              name="from"
              value={dateRange.from}
              onChange={handleDateChange}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              name="to"
              value={dateRange.to}
              onChange={handleDateChange}
              className="input-field"
            />
          </div>
          <div className="pt-6">
            <button onClick={fetchReports} className="btn-primary">
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Sales Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Orders</p>
              <p className="text-3xl font-bold text-gray-900">{salesSummary.totalOrders || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-2xl">
              📝
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(salesSummary.totalSales)}</p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-2xl">
              💰
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Units Sold</p>
              <p className="text-3xl font-bold text-gray-900">{salesSummary.totalUnitsSold || 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-2xl">
              📦
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(salesSummary.avgOrderValue)}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center text-2xl">
              📊
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Top Selling Products</h2>
          {topSelling.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sales data for selected period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty Sold</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {topSelling.map((item, index) => (
                    <tr key={item.skuId || index}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {item.productName || item.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.sku}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item.totalQty || item.totalSales || 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item.totalSales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Low Stock Alerts</h2>
          {lowStock.length === 0 ? (
            <p className="text-gray-500 text-center py-8">All items sufficiently stocked</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {lowStock.map((item, index) => (
                <div
                  key={item.productId || item.skuId || index}
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.productName || item.name || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {item.sku ? `SKU: ${item.sku}` : 'All SKUs'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-yellow-700">
                      {Number(item.currentStock ?? item.stock ?? 0)}
                    </p>
                    <p className="text-xs text-gray-600">
                      Min: {Number(item.minStock ?? item.reorderThreshold ?? 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Reports

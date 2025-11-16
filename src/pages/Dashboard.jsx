import { useState, useEffect } from 'react'
import api from '../services/api'

function Dashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    todayOrders: 0,
    lowStock: 0,
    totalSKUs: 0
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [lowStockItems, setLowStockItems] = useState([])
  const [topSelling, setTopSelling] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch all data in parallel
      const [productsPayload, ordersPayload, alertsPayload, topSellingPayload, skuPayload] = await Promise.all([
        api.get('/products?page=1&limit=1'), // Get count
        api.get('/orders?page=1&limit=5'),
        api.get('/alerts/low-stock'),
        api.get('/reports/top-selling?limit=5'),
        api.get('/skus?page=1&limit=1') // Get SKU count
      ])

      const rawOrders = Array.isArray(ordersPayload?.orders)
        ? ordersPayload.orders
        : Array.isArray(ordersPayload?.data)
          ? ordersPayload.data
          : []

      const rawAlerts = Array.isArray(alertsPayload?.alerts)
        ? alertsPayload.alerts
        : Array.isArray(alertsPayload)
          ? alertsPayload
          : []

      setRecentOrders(rawOrders)
      setLowStockItems(
        rawAlerts.map((alert) => {
          const currentStock = Number(alert.currentStock ?? alert.stock ?? 0)
          const minStock = Number(alert.minStock ?? alert.reorderThreshold ?? 0)

          return {
            ...alert,
            currentStock: Number.isFinite(currentStock) ? currentStock : 0,
            minStock: Number.isFinite(minStock) ? minStock : 0,
          }
        })
      )
      
      // Map top-selling API response to expected format
      const topSellingProducts = Array.isArray(topSellingPayload.products) ? topSellingPayload.products : []
      setTopSelling(
        topSellingProducts.map(product => ({
          ...product,
          name: product.productName || product.name,
          category: product.productCategory || product.category,
          totalSales: product.totalQty || product.totalSales || 0
        }))
      )

      // Update stats
      setStats({
        totalProducts:
          typeof productsPayload.total === 'number'
            ? productsPayload.total
            : typeof productsPayload.totalProducts === 'number'
              ? productsPayload.totalProducts
              : Array.isArray(productsPayload.products)
                ? productsPayload.products.length
                : 0,
        todayOrders:
          typeof ordersPayload?.total === 'number'
            ? ordersPayload.total
            : rawOrders.length,
        lowStock:
          typeof alertsPayload?.count === 'number'
            ? alertsPayload.count
            : rawAlerts.length,
        totalSKUs:
          typeof skuPayload?.total === 'number'
            ? skuPayload.total
            : 0
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statsCards = [
    { label: 'Total Products', value: stats.totalProducts, icon: '📦', color: 'bg-blue-500' },
    { label: "Today's Orders", value: stats.todayOrders, icon: '📝', color: 'bg-green-500' },
    { label: 'Low Stock Items', value: stats.lowStock, icon: '⚠️', color: 'bg-yellow-500' },
    { label: 'Total SKUs', value: stats.totalSKUs, icon: '🏷️', color: 'bg-purple-500' },
  ]

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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your inventory</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-2xl`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
          {recentOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order, index) => (
                <div
                  key={order._id || order.orderNumber || `order-${index}`}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">#{order.orderNumber}</p>
                    <p className="text-sm text-gray-600">{order.customerName || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{order.items?.length || 0} items</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Low Stock Alerts</h2>
          {lowStockItems.length === 0 ? (
            <p className="text-gray-500 text-center py-8">All items in stock</p>
          ) : (
            <div className="space-y-3">
              {lowStockItems.map((item, index) => (
                <div
                  key={item.productId || item.skuId || item._id || item.sku || `low-${index}`}
                  className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{item.productName || item.name || 'Unknown product'}</p>
                    <p className="text-sm text-gray-600">
                      {item.sku ? `SKU: ${item.sku}` : 'All SKUs'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-yellow-700">{item.currentStock ?? 0}</p>
                    <p className="text-xs text-gray-600">Min: {item.minStock ?? 0}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Top Selling Products</h2>
        {topSelling.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No sales data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topSelling.map((product, index) => (
                  <tr key={product._id || product.sku || `top-${index}`}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{product.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{product.totalSales || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard

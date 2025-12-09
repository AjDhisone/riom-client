import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import {
  Package,
  ClipboardList,
  AlertTriangle,
  Tags,
  TrendingUp,
  ArrowUpRight,
  ShoppingCart,
  Sparkles,
  X
} from 'lucide-react'

function Dashboard() {
  const { user } = useAuth()
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

  // AI Summary state
  const [showAIModal, setShowAIModal] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [aiError, setAiError] = useState('')

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

  const generateAISummary = async () => {
    try {
      setShowAIModal(true)
      setAiLoading(true)
      setAiError('')
      setAiSummary('')

      const response = await api.post('/ai/summary')
      setAiSummary(response.summary || 'No summary generated.')
    } catch (error) {
      console.error('AI Summary error:', error)
      setAiError(error.message || 'Failed to generate AI summary. Please check your API key.')
    } finally {
      setAiLoading(false)
    }
  }

  const statsCards = [
    {
      label: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      iconClass: 'icon-box-primary',
      trend: '+12%',
      trendUp: true
    },
    {
      label: "Today's Orders",
      value: stats.todayOrders,
      icon: ClipboardList,
      iconClass: 'icon-box-success',
      trend: '+8%',
      trendUp: true
    },
    {
      label: 'Low Stock Items',
      value: stats.lowStock,
      icon: AlertTriangle,
      iconClass: 'icon-box-warning',
      trend: stats.lowStock > 0 ? 'Needs attention' : 'All good',
      trendUp: stats.lowStock === 0
    },
    {
      label: 'Total SKUs',
      value: stats.totalSKUs,
      icon: Tags,
      iconClass: 'icon-box-accent',
      trend: '+5%',
      trendUp: true
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">Overview of your inventory performance</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <button
            onClick={generateAISummary}
            className="btn-primary flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            AI Insights
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const IconComponent = stat.icon
          return (
            <div key={index} className="stat-card group">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                  <div className={`inline-flex items-center gap-1 text-xs font-semibold ${stat.trendUp ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {stat.trendUp && <TrendingUp className="w-3 h-3" />}
                    {stat.trend}
                  </div>
                </div>
                <div className={stat.iconClass}>
                  <IconComponent className="w-6 h-6" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Recent Orders</h2>
            <a href="/orders" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View all <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
          {recentOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order, index) => (
                <div
                  key={order._id || order.orderNumber || `order-${index}`}
                  className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl hover:bg-slate-100/50 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-slate-900">#{order.orderNumber}</p>
                    <p className="text-sm text-slate-500">{order.customerName || 'Walk-in customer'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-700">{order.items?.length || 0} items</p>
                    <span className={`badge ${order.status === 'delivered' || order.status === 'completed' ? 'badge-success' :
                      order.status === 'pending' ? 'badge-warning' :
                        'badge-primary'
                      }`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Low Stock Alerts</h2>
            <span className={`badge ${lowStockItems.length > 0 ? 'badge-warning' : 'badge-success'}`}>
              {lowStockItems.length} items
            </span>
          </div>
          {lowStockItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
              <p className="text-emerald-600 font-medium">All items sufficiently stocked!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockItems.map((item, index) => (
                <div
                  key={item.productId || item.skuId || item._id || item.sku || `low-${index}`}
                  className="flex items-center justify-between p-4 bg-amber-50/50 border border-amber-100 rounded-xl"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{item.productName || item.name || 'Unknown product'}</p>
                    <p className="text-sm text-slate-500">
                      {item.sku ? `SKU: ${item.sku}` : 'All SKUs'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-amber-600">{item.currentStock ?? 0}</p>
                    <p className="text-xs text-slate-500">Min: {item.minStock ?? 0}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Selling Products */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Top Selling Products</h2>
          <a href="/reports" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            View reports <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
        {topSelling.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No sales data yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="table-header rounded-tl-lg">Product</th>
                  <th className="table-header">Category</th>
                  <th className="table-header rounded-tr-lg text-right">Units Sold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topSelling.map((product, index) => (
                  <tr key={product._id || product.sku || `top-${index}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="table-cell font-medium text-slate-900">{product.name}</td>
                    <td className="table-cell text-slate-600">{product.category}</td>
                    <td className="table-cell text-right">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                        <TrendingUp className="w-4 h-4" />
                        {product.totalSales || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Summary Modal */}
      {showAIModal && (
        <div className="modal-overlay" onClick={() => !aiLoading && setShowAIModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-indigo-500 to-violet-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-white">AI Insights</h2>
              </div>
              <button
                onClick={() => setShowAIModal(false)}
                disabled={aiLoading}
                className="text-white/80 hover:text-white transition-colors disabled:opacity-50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {aiLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-600 font-medium">Generating insights...</p>
                  <p className="text-slate-400 text-sm mt-1">AI is analyzing your business data</p>
                </div>
              ) : aiError ? (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-700">
                  <p className="font-medium">Unable to generate summary</p>
                  <p className="text-sm mt-1">{aiError}</p>
                </div>
              ) : (
                <div className="prose prose-slate max-w-none">
                  <div
                    className="ai-summary-content"
                    dangerouslySetInnerHTML={{
                      __html: aiSummary
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-slate-800 mt-4 mb-2">$1</h3>')
                        .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-slate-900 mt-6 mb-3">$1</h2>')
                        .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-slate-900 mt-6 mb-4">$1</h1>')
                        .replace(/^- (.*$)/gim, '<li class="ml-4 text-slate-700">$1</li>')
                        .replace(/\n/g, '<br />')
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard

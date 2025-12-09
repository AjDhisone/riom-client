import { useState, useEffect } from 'react'
import api from '../services/api'
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Activity,
  Package,
  Calendar,
  RefreshCw,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  X
} from 'lucide-react'
import {
  LineChart, Line,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

// Premium color palette
const COLORS = {
  primary: '#6366f1',
  secondary: '#8b5cf6',
  accent: '#ec4899',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
}

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b',
  '#3b82f6', '#14b8a6', '#f97316', '#84cc16', '#a855f7'
]

const GRADIENT_COLORS = {
  line: { start: '#6366f1', end: '#8b5cf6' },
  area: { start: '#10b981', end: '#34d399' },
  bar: { start: '#f59e0b', end: '#fbbf24' }
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl p-3 shadow-xl">
      <p className="text-sm font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-600">{entry.name}:</span>
          <span className="font-semibold text-slate-800">
            {formatter ? formatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// Chart container with loading state
const ChartContainer = ({ title, icon: Icon, children, loading, className = '' }) => (
  <div className={`card overflow-hidden ${className}`}>
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
    </div>
    {loading ? (
      <div className="h-64 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading chart data...</p>
        </div>
      </div>
    ) : (
      children
    )}
  </div>
)

// Stat card with animation
const StatCard = ({ label, value, change, icon: Icon, color, prefix = '' }) => {
  const isPositive = change >= 0
  return (
    <div className="card group hover:shadow-xl transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-3xl font-bold text-slate-900">{prefix}{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {change !== undefined && (
            <div className={`inline-flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(change)}% vs last period
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg`} style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}

// Tab button component
const TabButton = ({ active, onClick, icon: Icon, children }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${active
      ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25'
      : 'text-slate-600 hover:bg-slate-100'
      }`}
  >
    <Icon className="w-4 h-4" />
    {children}
  </button>
)

function Reports() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [salesSummary, setSalesSummary] = useState({
    totalOrders: 0,
    totalSales: 0,
    totalUnitsSold: 0,
    avgOrderValue: 0
  })
  const [topSelling, setTopSelling] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [allSkus, setAllSkus] = useState([])
  const [dailyTrend, setDailyTrend] = useState([])
  const [categoryBreakdown, setCategoryBreakdown] = useState([])
  const [currency, setCurrency] = useState('USD')
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  })

  // AI Summary state
  const [showAIModal, setShowAIModal] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [aiError, setAiError] = useState('')

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

      const [summaryRes, topSellingRes, lowStockRes, dailyTrendRes, categoryRes, allSkusRes, settingsRes] = await Promise.all([
        api.get(`/analytics/sales-summary?${params}`),
        api.get(`/reports/top-selling?${params}&limit=10`),
        api.get('/alerts/low-stock'),
        api.get(`/analytics/daily-trend?${params}`),
        api.get(`/analytics/category-breakdown?${params}`),
        api.get('/skus?limit=100'),
        api.get('/settings').catch(() => null)
      ])

      setSalesSummary(summaryRes?.summary || summaryRes || {})
      setTopSelling(Array.isArray(topSellingRes?.products) ? topSellingRes.products : [])
      setLowStock(Array.isArray(lowStockRes?.alerts) ? lowStockRes.alerts : [])
      setAllSkus(Array.isArray(allSkusRes?.skus) ? allSkusRes.skus : (Array.isArray(allSkusRes?.data) ? allSkusRes.data : []))
      setDailyTrend(Array.isArray(dailyTrendRes?.data) ? dailyTrendRes.data : [])
      setCategoryBreakdown(Array.isArray(categoryRes?.data) ? categoryRes.data : [])

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

  // AI Summary generation with date filtering
  const generateAISummary = async () => {
    try {
      setShowAIModal(true)
      setAiLoading(true)
      setAiError('')
      setAiSummary('')

      // Pass the current date range to get filtered insights
      const response = await api.post('/ai/summary', {
        from: dateRange.from,
        to: dateRange.to
      })
      setAiSummary(response.summary || 'No summary generated.')
    } catch (error) {
      console.error('AI Summary error:', error)
      setAiError(error.message || 'Failed to generate AI summary. Please check your API key.')
    } finally {
      setAiLoading(false)
    }
  }

  const formatCurrency = (value) => {
    try {
      return Number(value || 0).toLocaleString(undefined, {
        style: 'currency',
        currency
      })
    } catch {
      return Number(value || 0).toLocaleString(undefined, {
        style: 'currency',
        currency: 'USD'
      })
    }
  }

  // Prepare data for scatter plot (Sales vs Stock)
  const scatterData = topSelling.map(item => ({
    name: item.productName || item.name || 'Unknown',
    sales: item.totalSales || 0,
    stock: item.stock || 0,
    qty: item.totalQty || 0
  }))

  // Prepare data for stock histogram - using ALL SKUs for complete picture
  const stockHistogram = (() => {
    const bins = [
      { range: '0-10', count: 0, label: 'Critical' },
      { range: '11-25', count: 0, label: 'Low' },
      { range: '26-50', count: 0, label: 'Moderate' },
      { range: '51-100', count: 0, label: 'Good' },
      { range: '100+', count: 0, label: 'Excellent' }
    ]
    allSkus.forEach(item => {
      const stock = Number(item.stock ?? 0)
      if (stock <= 10) bins[0].count++
      else if (stock <= 25) bins[1].count++
      else if (stock <= 50) bins[2].count++
      else if (stock <= 100) bins[3].count++
      else bins[4].count++
    })
    return bins
  })()

  // Prepare treemap data
  const treemapData = categoryBreakdown.map((cat, index) => ({
    name: cat.category,
    value: cat.totalSales,
    fill: CHART_COLORS[index % CHART_COLORS.length]
  }))

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Crunching the numbers...</p>
        <p className="text-slate-400 text-sm mt-1">Preparing your analytics dashboard</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Analytics & Reports</h1>
          <p className="text-slate-500 mt-1">Comprehensive insights into your inventory performance</p>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-white/80 backdrop-blur-xl p-3 rounded-2xl border border-slate-200 shadow-sm">
            <Calendar className="w-5 h-5 text-slate-400" />
            <input
              type="date"
              name="from"
              value={dateRange.from}
              onChange={handleDateChange}
              className="bg-transparent border-none text-sm font-medium text-slate-700 focus:outline-none"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              name="to"
              value={dateRange.to}
              onChange={handleDateChange}
              className="bg-transparent border-none text-sm font-medium text-slate-700 focus:outline-none"
            />
            <button
              onClick={fetchReports}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <button
            onClick={generateAISummary}
            className="btn-primary flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            AI Insights
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Orders"
          value={salesSummary.totalOrders || 0}
          icon={Package}
          color={COLORS.primary}
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(salesSummary.totalSales)}
          icon={TrendingUp}
          color={COLORS.success}
          prefix=""
        />
        <StatCard
          label="Units Sold"
          value={salesSummary.totalUnitsSold || 0}
          icon={BarChart3}
          color={COLORS.secondary}
        />
        <StatCard
          label="Avg Order Value"
          value={formatCurrency(salesSummary.avgOrderValue)}
          icon={Activity}
          color={COLORS.warning}
          prefix=""
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-100/50 rounded-2xl w-fit">
        <TabButton
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          icon={Layers}
        >
          Overview
        </TabButton>
        <TabButton
          active={activeTab === 'sales'}
          onClick={() => setActiveTab('sales')}
          icon={TrendingUp}
        >
          Sales Analysis
        </TabButton>
        <TabButton
          active={activeTab === 'inventory'}
          onClick={() => setActiveTab('inventory')}
          icon={Package}
        >
          Inventory Health
        </TabButton>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend Line Chart */}
          <ChartContainer title="Sales Trend" icon={TrendingUp} loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrend}>
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GRADIENT_COLORS.line.start} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={GRADIENT_COLORS.line.end} stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                <Line
                  type="monotone"
                  dataKey="totalSales"
                  name="Revenue"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Category Distribution Pie Chart */}
          <ChartContainer title="Category Distribution" icon={PieChartIcon} loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  dataKey="totalSales"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Top Products Bar Chart */}
          <ChartContainer title="Top Selling Products" icon={BarChart3} loading={loading} className="lg:col-span-2">
            {topSelling.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                  <BarChart3 className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium">No sales data available</p>
                <p className="text-slate-400 text-sm mt-1">Start making sales to see top products</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={topSelling.slice(0, 8).map(item => ({
                    ...item,
                    name: item.productName || item.name || 'Unknown Product',
                    qty: item.totalQty || 0
                  }))}
                  layout="vertical"
                  margin={{ left: 20, right: 30, top: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    width={130}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const data = payload[0].payload
                      return (
                        <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl p-3 shadow-xl">
                          <p className="font-semibold text-slate-800 mb-1">{data.name}</p>
                          <p className="text-sm text-slate-600">Units Sold: <span className="font-bold text-indigo-600">{data.qty}</span></p>
                          {data.totalSales && <p className="text-sm text-slate-600">Revenue: {formatCurrency(data.totalSales)}</p>}
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey="qty"
                    name="Units Sold"
                    radius={[0, 8, 8, 0]}
                    barSize={28}
                  >
                    {topSelling.slice(0, 8).map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>
        </div>
      )}

      {activeTab === 'sales' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Area Chart */}
          <ChartContainer title="Revenue Over Time" icon={TrendingUp} loading={loading} className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={COLORS.success} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `${currency} ${v}`} />
                <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                <Area
                  type="monotone"
                  dataKey="totalSales"
                  name="Revenue"
                  stroke={COLORS.success}
                  strokeWidth={3}
                  fill="url(#areaGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Category Treemap */}
          <ChartContainer title="Category Revenue Treemap" icon={Layers} loading={loading} className="lg:col-span-2">
            {categoryBreakdown.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                  <Layers className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium">No category data available</p>
                <p className="text-slate-400 text-sm mt-1">Start making sales to see category breakdown</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(300, categoryBreakdown.length * 60)}>
                <BarChart
                  data={categoryBreakdown}
                  layout="vertical"
                  margin={{ left: 20, right: 40, top: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(v) => `${currency} ${v.toLocaleString()}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }}
                    width={100}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const data = payload[0].payload
                      return (
                        <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl p-3 shadow-xl">
                          <p className="font-semibold text-slate-800 mb-1">{data.category}</p>
                          <p className="text-sm text-slate-600">Revenue: <span className="font-bold text-emerald-600">{formatCurrency(data.totalSales)}</span></p>
                          <p className="text-sm text-slate-600">Units Sold: <span className="font-bold text-indigo-600">{data.totalQty}</span></p>
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey="totalSales"
                    name="Revenue"
                    radius={[0, 8, 8, 0]}
                    barSize={35}
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cat-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stock Level Histogram */}
          <ChartContainer title="Stock Level Distribution" icon={BarChart3} loading={loading}>
            {stockHistogram.every(bin => bin.count === 0) ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-emerald-600 font-medium">No low stock items!</p>
                <p className="text-slate-400 text-sm mt-1">All products are well stocked</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stockHistogram} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="range" tick={{ fontSize: 12, fill: '#475569', fontWeight: 500 }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl p-3 shadow-xl">
                          <p className="font-semibold text-slate-800 mb-1">Stock Range: {label}</p>
                          <p className="text-sm text-slate-600">
                            Products: <span className="font-bold text-indigo-600">{payload[0].value}</span>
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Bar
                    dataKey="count"
                    name="Products"
                    radius={[8, 8, 0, 0]}
                    barSize={55}
                  >
                    {stockHistogram.map((entry, index) => {
                      // Color based on severity: red for critical, orange for warning, green for healthy
                      const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981']
                      return <Cell key={`cell-${index}`} fill={colors[index]} />
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartContainer>

          {/* Units Sold Trend */}
          <ChartContainer title="Units Sold Trend" icon={Package} loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="qtyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="totalQty"
                  name="Units"
                  stroke={COLORS.secondary}
                  strokeWidth={3}
                  fill="url(#qtyGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Low Stock Items Table */}
          <ChartContainer title="Low Stock Alerts" icon={Package} loading={loading} className="lg:col-span-2">
            {lowStock.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-emerald-600 font-semibold text-lg">All items sufficiently stocked!</p>
                <p className="text-slate-400 text-sm mt-1">Your inventory is in great shape</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="table-header">Product</th>
                      <th className="table-header">SKU</th>
                      <th className="table-header text-center">Current Stock</th>
                      <th className="table-header text-center">Min Stock</th>
                      <th className="table-header text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lowStock.slice(0, 10).map((item, index) => {
                      const current = Number(item.currentStock ?? item.stock ?? 0)
                      const min = Number(item.minStock ?? item.reorderThreshold ?? 0)
                      const ratio = min > 0 ? current / min : 1
                      const status = ratio <= 0.25 ? 'critical' : ratio <= 0.5 ? 'warning' : 'low'
                      return (
                        <tr key={item.productId || item.skuId || index} className="hover:bg-slate-50/50 transition-colors">
                          <td className="table-cell font-medium text-slate-900">
                            {item.productName || item.name || 'Unknown'}
                          </td>
                          <td className="table-cell text-slate-600">{item.sku || '-'}</td>
                          <td className="table-cell text-center">
                            <span className={`font-bold ${status === 'critical' ? 'text-rose-600' : status === 'warning' ? 'text-amber-600' : 'text-orange-500'}`}>
                              {current}
                            </span>
                          </td>
                          <td className="table-cell text-center text-slate-500">{min}</td>
                          <td className="table-cell text-center">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${status === 'critical' ? 'bg-rose-100 text-rose-700' :
                              status === 'warning' ? 'bg-amber-100 text-amber-700' :
                                'bg-orange-100 text-orange-700'
                              }`}>
                              {status === 'critical' ? '🔴 Critical' : status === 'warning' ? '🟠 Warning' : '🟡 Low'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </ChartContainer>
        </div>
      )}

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
                <div>
                  <h2 className="text-xl font-semibold text-white">AI Insights</h2>
                  <p className="text-white/80 text-sm">{dateRange.from} to {dateRange.to}</p>
                </div>
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
                  <p className="text-slate-400 text-sm mt-1">AI is analyzing your business data for {dateRange.from} to {dateRange.to}</p>
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

export default Reports

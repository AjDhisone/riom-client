import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  Package,
  Tags,
  ClipboardList,
  BarChart3,
  Users,
  Settings,
  Sparkles
} from 'lucide-react'

function Sidebar() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager'

  const navItems = [
    { path: '/dashboard', name: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
    { path: '/products', name: 'Products', icon: Package, adminOnly: false },
    { path: '/skus', name: 'SKUs', icon: Tags, adminOnly: false },
    { path: '/orders', name: 'Orders', icon: ClipboardList, adminOnly: false },
    { path: '/reports', name: 'Reports', icon: BarChart3, adminOnly: true, managerAllowed: true },
    { path: '/users', name: 'Users', icon: Users, adminOnly: true, managerAllowed: false },
    { path: '/settings', name: 'Settings', icon: Settings, adminOnly: true, managerAllowed: false },
  ]

  // Filter nav items based on user role
  const visibleNavItems = navItems.filter(item => {
    if (!item.adminOnly) return true
    if (isAdmin) return true
    if (item.managerAllowed && isManagerOrAdmin) return true
    return false
  })

  return (
    <aside className="w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200/50 flex flex-col shadow-lg">
      <div className="p-6 border-b border-slate-200/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              RIOM
            </h1>
            <p className="text-xs text-slate-500 font-medium">Inventory Management</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1.5">
        {visibleNavItems.map((item) => {
          const IconComponent = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
              }
            >
              <IconComponent className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-200/50">
        <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl">
          <p className="text-xs text-slate-600 text-center font-medium">
            © 2025 RIOM Systems
          </p>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar

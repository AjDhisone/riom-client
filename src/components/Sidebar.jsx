import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Sidebar() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager'

  const navItems = [
    { path: '/dashboard', name: 'Dashboard', icon: '📊', adminOnly: false },
    { path: '/products', name: 'Products', icon: '📦', adminOnly: false },
    { path: '/skus', name: 'SKUs', icon: '🏷️', adminOnly: false },
    { path: '/orders', name: 'Orders', icon: '📝', adminOnly: false },
    { path: '/reports', name: 'Reports', icon: '📈', adminOnly: true, managerAllowed: true },
    { path: '/users', name: 'Users', icon: '👥', adminOnly: true, managerAllowed: false },
    { path: '/settings', name: 'Settings', icon: '⚙️', adminOnly: true, managerAllowed: false },
  ]

  // Filter nav items based on user role
  const visibleNavItems = navItems.filter(item => {
    if (!item.adminOnly) return true
    if (isAdmin) return true
    if (item.managerAllowed && isManagerOrAdmin) return true
    return false
  })

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-primary-600">RIOM</h1>
        <p className="text-sm text-gray-500 mt-1">Inventory Management</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {visibleNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                isActive
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          © 2025 RIOM
        </p>
      </div>
    </aside>
  )
}

export default Sidebar

import { useState, useEffect } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { UserPlus, Search, Edit3, Key, Users as UsersIcon, Shield, User, Trash2 } from 'lucide-react'

function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [modalType, setModalType] = useState('add') // 'add', 'role', 'password'
  const { user: currentUser } = useAuth()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'staff'
  })
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, userId: null, userName: '' })

  useEffect(() => {
    fetchUsers()
  }, [page, searchQuery, roleFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })
      if (searchQuery) {
        params.append('q', searchQuery)
      }
      if (roleFilter) {
        params.append('role', roleFilter)
      }

      const payload = await api.get(`/users?${params}`)
      setUsers(Array.isArray(payload.users) ? payload.users : [])
      setTotalPages(payload.totalPages || 1)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    setSearchQuery(e.target.value)
    setPage(1)
  }

  const handleRoleFilter = (e) => {
    setRoleFilter(e.target.value)
    setPage(1)
  }

  const openAddModal = () => {
    setEditingUser(null)
    setModalType('add')
    setFormData({
      username: '',
      email: '',
      password: '',
      role: 'staff'
    })
    setShowModal(true)
  }

  const openEditModal = (user) => {
    setEditingUser(user)
    setModalType('role')
    setFormData({
      username: user.name,
      email: user.email,
      password: '',
      role: user.role
    })
    setShowModal(true)
  }

  const openPasswordModal = (user) => {
    setEditingUser(user)
    setModalType('password')
    setFormData({
      username: user.name,
      email: user.email,
      password: '',
      role: user.role
    })
    setShowModal(true)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (modalType === 'password') {
        // Update password
        if (!formData.password || formData.password.length < 6) {
          alert('Password must be at least 6 characters')
          return
        }
        await api.put(`/users/${editingUser._id}/password`, { password: formData.password })
        alert('Password updated successfully')
      } else if (modalType === 'role') {
        // Update user role
        await api.put(`/users/${editingUser._id}/role`, { role: formData.role })
        setUsers(prev => prev.map(u =>
          u._id === editingUser._id ? { ...u, role: formData.role } : u
        ))
      } else {
        // Create new user
        const result = await api.post('/users', formData)
        if (result?.user) {
          setUsers(prev => [result.user, ...prev])
        }
      }
      setShowModal(false)
      fetchUsers()
    } catch (error) {
      console.error('Error saving user:', error)
      alert(error.response?.data?.message || 'Failed to save user')
    }
  }

  const handleDeleteUser = (userId, userName) => {
    setDeleteConfirm({ show: true, userId, userName })
  }

  const confirmDeleteUser = async () => {
    const { userId } = deleteConfirm
    try {
      await api.delete(`/users/${userId}`)
      setUsers(prev => prev.filter(u => u._id !== userId))
      setDeleteConfirm({ show: false, userId: null, userName: '' })
      // Refresh to update pagination
      fetchUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
      alert(error.response?.data?.message || 'Failed to delete user')
      setDeleteConfirm({ show: false, userId: null, userName: '' })
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mb-4"></div>
        <p className="text-slate-600 font-medium">Loading team members...</p>
        <p className="text-slate-400 text-sm mt-1">Fetching user data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 mt-1">Manage user accounts and permissions</p>
        </div>
        {currentUser?.role === 'admin' && (
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add User
          </button>
        )}
      </div>

      <div className="card">
        <div className="mb-4 flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={handleSearch}
            className="input-field max-w-md"
          />
          <select
            value={roleFilter}
            onChange={handleRoleFilter}
            className="input-field w-48"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                {currentUser?.role === 'admin' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No users found. Click "Add User" to invite team members.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : user.role === 'manager'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                        }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(user.createdAt)}
                    </td>
                    {currentUser?.role === 'admin' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-primary-600 hover:text-primary-900 mr-3"
                          disabled={user._id === currentUser._id}
                        >
                          Edit Role
                        </button>
                        <button
                          onClick={() => openPasswordModal(user)}
                          className="text-orange-600 hover:text-orange-900 mr-3"
                        >
                          Reset Password
                        </button>
                        {user._id !== currentUser._id && (
                          <button
                            onClick={() => handleDeleteUser(user._id, user.name)}
                            className="text-rose-600 hover:text-rose-900"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
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
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {modalType === 'add' ? 'Add New User' : modalType === 'password' ? 'Reset Password' : 'Edit User Role'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {modalType === 'add' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      minLength="6"
                      className="input-field"
                    />
                  </div>
                </>
              )}
              {modalType === 'password' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    minLength="6"
                    placeholder="Enter new password (min 6 characters)"
                    className="input-field"
                  />
                </div>
              )}
              {modalType === 'role' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}
              {modalType === 'add' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
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
                  {modalType === 'add' ? 'Create' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Delete User</h2>
                <p className="text-slate-500 text-sm">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-slate-700 mb-6">
              Are you sure you want to delete user <strong>"{deleteConfirm.userName}"</strong>?
              All associated data will be permanently removed.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ show: false, userId: null, userName: '' })}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="px-5 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all duration-300 font-semibold shadow-md"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Users

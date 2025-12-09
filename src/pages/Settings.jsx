import { useEffect, useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Settings as SettingsIcon, Globe, Save, RotateCcw } from 'lucide-react'

const currencyOptions = [
  { value: 'INR', label: 'Indian Rupee (INR)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
]

function Settings() {
  const { user, loading: authLoading } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [formData, setFormData] = useState({ currency: 'INR' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const fetchSettings = async () => {
    try {
      setLoading(true)
      setErrorMessage('')
      const payload = await api.get('/settings')
      const settings = payload?.settings || {}
      setFormData({
        currency: settings.currency || 'INR',
      })
    } catch (error) {
      console.error('Failed to load settings:', error)
      setErrorMessage(error.response?.data?.message || 'Unable to load settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading) {
      void fetchSettings()
    }
  }, [authLoading])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleCancel = () => {
    void fetchSettings()
    setSuccessMessage('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!isAdmin) {
      return
    }

    try {
      setSaving(true)
      setErrorMessage('')
      setSuccessMessage('')

      const payload = await api.put('/settings', {
        currency: formData.currency,
      })

      const updated = payload?.settings || {}
      setFormData({
        currency: updated.currency || formData.currency,
      })
      setSuccessMessage('Settings updated successfully')
    } catch (error) {
      console.error('Failed to update settings:', error)
      setErrorMessage(error.response?.data?.message || 'Failed to update settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Configure your system preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card">
            <button className="w-full text-left px-4 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium flex items-center gap-3 shadow-md">
              <Globe className="w-5 h-5" />
              General
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-xl font-semibold mb-6">General Settings</h2>

            {!isAdmin && !authLoading && (
              <div className="mb-4 rounded-md bg-yellow-50 p-4 text-sm text-yellow-800">
                Only administrators can update settings. Contact an admin if you need access.
              </div>
            )}

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
              <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mb-4"></div>
                <p className="text-slate-600 font-medium">Loading your preferences...</p>
                <p className="text-slate-400 text-sm mt-1">Almost there!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Currency
                  </label>
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="input-field"
                    disabled={!isAdmin || saving}
                  >
                    {currencyOptions.map((currency) => (
                      <option key={currency.value} value={currency.value}>
                        {currency.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!isAdmin || saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings

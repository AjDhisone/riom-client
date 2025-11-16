import { useState } from 'react'

export const useForm = (initialValues) => {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setValues({
      ...values,
      [name]: value,
    })
  }

  const handleSubmit = (callback) => (e) => {
    e.preventDefault()
    callback(values)
  }

  const reset = () => {
    setValues(initialValues)
    setErrors({})
  }

  return {
    values,
    errors,
    handleChange,
    handleSubmit,
    setValues,
    setErrors,
    reset,
  }
}

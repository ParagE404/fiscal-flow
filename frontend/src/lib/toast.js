import { toast as sonnerToast } from 'sonner'

// Enhanced toast utility with consistent styling and behavior
export const toast = {
  success: (message, options = {}) => {
    return sonnerToast.success(message, {
      duration: 4000,
      ...options
    })
  },

  error: (message, options = {}) => {
    return sonnerToast.error(message, {
      duration: 6000,
      ...options
    })
  },

  warning: (message, options = {}) => {
    return sonnerToast.warning(message, {
      duration: 5000,
      ...options
    })
  },

  info: (message, options = {}) => {
    return sonnerToast.info(message, {
      duration: 4000,
      ...options
    })
  },

  loading: (message, options = {}) => {
    return sonnerToast.loading(message, {
      duration: Infinity,
      ...options
    })
  },

  promise: (promise, messages, options = {}) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading || 'Loading...',
      success: messages.success || 'Success!',
      error: messages.error || 'Something went wrong',
      duration: 4000,
      ...options
    })
  },

  dismiss: (toastId) => {
    return sonnerToast.dismiss(toastId)
  },

  // Specialized toasts for common operations
  crud: {
    created: (itemType = 'Item') => {
      return toast.success(`${itemType} created successfully`)
    },

    updated: (itemType = 'Item') => {
      return toast.success(`${itemType} updated successfully`)
    },

    deleted: (itemType = 'Item') => {
      return toast.success(`${itemType} deleted successfully`)
    },

    createError: (itemType = 'Item') => {
      return toast.error(`Failed to create ${itemType.toLowerCase()}. Please try again.`)
    },

    updateError: (itemType = 'Item') => {
      return toast.error(`Failed to update ${itemType.toLowerCase()}. Please try again.`)
    },

    deleteError: (itemType = 'Item') => {
      return toast.error(`Failed to delete ${itemType.toLowerCase()}. Please try again.`)
    },

    loadError: (itemType = 'data') => {
      return toast.error(`Failed to load ${itemType}. Please refresh the page.`)
    }
  },

  // Network and API related toasts
  network: {
    offline: () => {
      return toast.error('You are offline. Please check your internet connection.')
    },

    reconnected: () => {
      return toast.success('Connection restored')
    },

    timeout: () => {
      return toast.error('Request timed out. Please try again.')
    },

    serverError: () => {
      return toast.error('Server error. Please try again later.')
    }
  },

  // Form validation toasts
  validation: {
    required: (fieldName) => {
      return toast.error(`${fieldName} is required`)
    },

    invalid: (fieldName) => {
      return toast.error(`Please enter a valid ${fieldName.toLowerCase()}`)
    },

    mismatch: (field1, field2) => {
      return toast.error(`${field1} and ${field2} do not match`)
    }
  }
}

// Export the original sonner toast for advanced use cases
export { toast as sonnerToast } from 'sonner'
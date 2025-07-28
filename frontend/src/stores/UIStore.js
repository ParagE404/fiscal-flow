import { makeAutoObservable } from 'mobx'

class UIStore {
  // UI state
  sidebarCollapsed = false
  darkMode = false
  currentPage = 'dashboard'
  
  // Modal states
  modals = {
    addMutualFund: false,
    addSIP: false,
    addFixedDeposit: false,
    addEPFAccount: false,
    addStock: false,
  }
  
  // Toast notifications
  toasts = []

  constructor() {
    makeAutoObservable(this)
    
    // Load preferences from localStorage
    this.loadPreferences()
  }

  // Sidebar actions
  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed
  }

  setSidebarCollapsed(collapsed) {
    this.sidebarCollapsed = collapsed
  }

  // Dark mode actions
  toggleDarkMode() {
    this.darkMode = !this.darkMode
    this.savePreferences()
    this.applyTheme()
  }

  setDarkMode(enabled) {
    this.darkMode = enabled
    this.savePreferences()
    this.applyTheme()
  }

  applyTheme() {
    if (this.darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Page navigation
  setCurrentPage(page) {
    this.currentPage = page
  }

  // Modal actions
  openModal(modalName) {
    this.modals[modalName] = true
  }

  closeModal(modalName) {
    this.modals[modalName] = false
  }

  closeAllModals() {
    Object.keys(this.modals).forEach(key => {
      this.modals[key] = false
    })
  }

  // Toast notifications
  addToast(toast) {
    const id = Date.now() + Math.random()
    const newToast = {
      id,
      type: 'info', // info, success, warning, error
      title: '',
      message: '',
      duration: 5000,
      ...toast,
    }
    
    this.toasts.push(newToast)
    
    // Auto remove toast after duration
    setTimeout(() => {
      this.removeToast(id)
    }, newToast.duration)
    
    return id
  }

  removeToast(id) {
    this.toasts = this.toasts.filter(toast => toast.id !== id)
  }

  clearAllToasts() {
    this.toasts = []
  }

  // Convenience methods for different toast types
  showSuccess(message, title = 'Success') {
    return this.addToast({
      type: 'success',
      title,
      message,
    })
  }

  showError(message, title = 'Error') {
    return this.addToast({
      type: 'error',
      title,
      message,
      duration: 7000, // Longer duration for errors
    })
  }

  showWarning(message, title = 'Warning') {
    return this.addToast({
      type: 'warning',
      title,
      message,
    })
  }

  showInfo(message, title = 'Info') {
    return this.addToast({
      type: 'info',
      title,
      message,
    })
  }

  // Preferences management
  loadPreferences() {
    try {
      const saved = localStorage.getItem('fiscalflow-preferences')
      if (saved) {
        const preferences = JSON.parse(saved)
        this.darkMode = preferences.darkMode || false
        this.sidebarCollapsed = preferences.sidebarCollapsed || false
      }
    } catch (error) {
      console.warn('Failed to load preferences:', error)
    }
    
    // Apply theme on load
    this.applyTheme()
  }

  savePreferences() {
    try {
      const preferences = {
        darkMode: this.darkMode,
        sidebarCollapsed: this.sidebarCollapsed,
      }
      localStorage.setItem('fiscalflow-preferences', JSON.stringify(preferences))
    } catch (error) {
      console.warn('Failed to save preferences:', error)
    }
  }

  // Form states
  formStates = {
    mutualFund: {
      loading: false,
      errors: {},
    },
    sip: {
      loading: false,
      errors: {},
    },
    fixedDeposit: {
      loading: false,
      errors: {},
    },
    epfAccount: {
      loading: false,
      errors: {},
    },
    stock: {
      loading: false,
      errors: {},
    },
  }

  setFormLoading(formName, loading) {
    this.formStates[formName].loading = loading
  }

  setFormErrors(formName, errors) {
    this.formStates[formName].errors = errors
  }

  clearFormErrors(formName) {
    this.formStates[formName].errors = {}
  }

  clearAllFormStates() {
    Object.keys(this.formStates).forEach(key => {
      this.formStates[key].loading = false
      this.formStates[key].errors = {}
    })
  }
}

export const uiStore = new UIStore()
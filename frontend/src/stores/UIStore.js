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
  }

  // Sidebar actions
  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed
  }

  setSidebarCollapsed(collapsed) {
    this.sidebarCollapsed = collapsed
  }

  // Dark mode actions (deprecated - use PreferencesStore)
  toggleDarkMode() {
    console.warn('UIStore.toggleDarkMode is deprecated. Use PreferencesStore.setTheme instead.')
    this.darkMode = !this.darkMode
  }

  setDarkMode(enabled) {
    console.warn('UIStore.setDarkMode is deprecated. Use PreferencesStore.setTheme instead.')
    this.darkMode = enabled
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

  // Legacy preferences management (deprecated)
  // These methods are kept for backward compatibility but should not be used
  loadPreferences() {
    console.warn('UIStore.loadPreferences is deprecated. Use PreferencesStore instead.')
  }

  savePreferences() {
    console.warn('UIStore.savePreferences is deprecated. Use PreferencesStore instead.')
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
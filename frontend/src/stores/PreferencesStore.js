import { makeAutoObservable, runInAction } from "mobx";
import { apiClient } from "../lib/apiClient";

class PreferencesStore {
  // Preferences state
  preferences = {
    theme: "system",
    currency: {
      code: "INR",
      symbol: "₹",
      format: "indian",
    },
    numberFormat: {
      style: "indian",
      decimalPlaces: 2,
    },
    autoRefreshPrices: false,
    pushNotifications: {
      enabled: false,
      sipReminders: false,
      fdMaturityAlerts: false,
      portfolioUpdates: false,
    },
    dashboard: {
      defaultView: "overview",
      showWelcomeMessage: true,
      compactMode: false,
    },
    onboarding: {
      completed: false,
      skippedSteps: [],
      lastCompletedStep: null,
    },
  };

  // Loading states
  loading = false;
  error = null;
  initialized = false;

  constructor() {
    makeAutoObservable(this);
  }

  // Initialize preferences from server
  async initialize() {
    if (this.initialized) return;

    try {
      this.loading = true;
      this.error = null;

      const response = await apiClient.getUserPreferences();

      runInAction(() => {
        this.preferences = response.preferences;
        this.initialized = true;
        this.applyTheme();
      });
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
        console.error("Failed to load preferences:", error);
        // Fall back to localStorage if server fails
        this.loadFromLocalStorage();
      });
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  // Update preferences
  async updatePreferences(updates) {
    try {
      this.loading = true;
      this.error = null;

      const response = await apiClient.updateUserPreferences(updates);

      runInAction(() => {
        this.preferences = response.preferences;
        this.applyTheme();
        this.saveToLocalStorage(); // Backup to localStorage
      });

      return true;
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
      console.error("Failed to update preferences:", error);
      throw error;
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  // Reset preferences to defaults
  async resetPreferences() {
    try {
      this.loading = true;
      this.error = null;

      const response = await apiClient.resetUserPreferences();

      runInAction(() => {
        this.preferences = response.preferences;
        this.applyTheme();
        this.saveToLocalStorage();
      });

      return true;
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
      console.error("Failed to reset preferences:", error);
      throw error;
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  // Theme management
  get effectiveTheme() {
    if (this.preferences.theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return this.preferences.theme;
  }

  applyTheme() {
    const theme = this.effectiveTheme;
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  async setTheme(theme) {
    await this.updatePreferences({ theme });
  }

  // Currency formatting
  formatCurrency(amount) {
    const { currency, numberFormat } = this.preferences;

    if (numberFormat.style === "indian") {
      // Use the enhanced utility function for consistent formatting
      return this.formatIndianCurrency(
        amount,
        currency.symbol,
        numberFormat.decimalPlaces
      );
    } else {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.code,
        minimumFractionDigits: numberFormat.decimalPlaces,
        maximumFractionDigits: numberFormat.decimalPlaces,
      }).format(amount);
    }
  }

  formatIndianCurrency(amount, symbol = "₹", decimalPlaces = 0) {
    if (amount === null || amount === undefined || isNaN(amount))
      return symbol + "0";

    const formatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });

    return formatter.format(amount);
  }

  // Large number formatting with lakhs/crores
  formatLargeNumber(amount, showSymbol = true) {
    if (amount === null || amount === undefined || isNaN(amount))
      return showSymbol ? "₹0" : "0";

    const symbol = showSymbol ? "₹" : "";

    if (amount >= 10000000) {
      // 1 crore
      return `${symbol}${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      // 1 lakh
      return `${symbol}${(amount / 100000).toFixed(2)} L`;
    } else if (amount >= 1000) {
      // 1 thousand
      return `${symbol}${(amount / 1000).toFixed(1)} K`;
    } else {
      return this.formatIndianCurrency(amount, symbol);
    }
  }

  // Number formatting
  formatNumber(number) {
    const { numberFormat } = this.preferences;

    if (numberFormat.style === "indian") {
      if (number === null || number === undefined || isNaN(number)) return "0";
      return new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: numberFormat.decimalPlaces,
        maximumFractionDigits: numberFormat.decimalPlaces,
      }).format(number);
    } else {
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: numberFormat.decimalPlaces,
        maximumFractionDigits: numberFormat.decimalPlaces,
      }).format(number);
    }
  }

  // Percentage formatting
  formatPercentage(value, decimalPlaces = 2) {
    if (value === null || value === undefined || isNaN(value)) return "0.00%";
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(decimalPlaces)}%`;
  }

  // Date formatting in Indian format (DD/MM/YYYY)
  formatDate(date) {
    if (!date) return "";

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return "";

    const day = dateObj.getDate().toString().padStart(2, "0");
    const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const year = dateObj.getFullYear();

    return `${day}/${month}/${year}`;
  }

  // Display date formatting (e.g., "15 Jan 2024")
  formatDisplayDate(date) {
    if (!date) return "";

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return "";

    const options = {
      day: "numeric",
      month: "short",
      year: "numeric",
    };

    return dateObj.toLocaleDateString("en-IN", options);
  }

  // Dashboard preferences
  async updateDashboardPreferences(updates) {
    await this.updatePreferences({
      dashboard: {
        ...this.preferences.dashboard,
        ...updates,
      },
    });
  }

  // Notification preferences
  async updateNotificationPreferences(updates) {
    await this.updatePreferences({
      pushNotifications: {
        ...this.preferences.pushNotifications,
        ...updates,
      },
    });
  }

  // Onboarding preferences
  async updateOnboardingPreferences(updates) {
    await this.updatePreferences({
      onboarding: {
        ...this.preferences.onboarding,
        ...updates,
      },
    });
  }

  async markOnboardingComplete() {
    await this.updateOnboardingPreferences({ completed: true });
  }

  async skipOnboardingStep(step) {
    const skippedSteps = [...this.preferences.onboarding.skippedSteps];
    if (!skippedSteps.includes(step)) {
      skippedSteps.push(step);
      await this.updateOnboardingPreferences({ skippedSteps });
    }
  }

  // Local storage backup (for offline support)
  saveToLocalStorage() {
    try {
      localStorage.setItem(
        "fiscalflow-preferences-backup",
        JSON.stringify(this.preferences)
      );
    } catch (error) {
      console.warn("Failed to save preferences to localStorage:", error);
    }
  }

  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem("fiscalflow-preferences-backup");
      if (saved) {
        runInAction(() => {
          this.preferences = { ...this.preferences, ...JSON.parse(saved) };
          this.initialized = true;
          this.applyTheme();
        });
      }
    } catch (error) {
      console.warn("Failed to load preferences from localStorage:", error);
    }
  }

  // System theme change listener
  setupSystemThemeListener() {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", () => {
        if (this.preferences.theme === "system") {
          this.applyTheme();
        }
      });
    }
  }
}

export const preferencesStore = new PreferencesStore();

// Setup system theme listener
if (typeof window !== "undefined") {
  preferencesStore.setupSystemThemeListener();
}

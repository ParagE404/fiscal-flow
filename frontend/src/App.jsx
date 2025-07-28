import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { MutualFunds } from './pages/MutualFunds'
import { FixedDeposits } from './pages/FixedDeposits'
import { EPF } from './pages/EPF'
import { Stocks } from './pages/Stocks'
import { Settings } from './pages/Settings'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="mutual-funds" element={<MutualFunds />} />
          <Route path="fixed-deposits" element={<FixedDeposits />} />
          <Route path="epf" element={<EPF />} />
          <Route path="stocks" element={<Stocks />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      <Toaster position="top-right" />
    </Router>
  )
}

export default App

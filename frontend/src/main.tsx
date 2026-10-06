import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './app/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { LandingPage } from './features/landing/LandingPage';
import { LoginPage } from './features/login/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { AlertsPage } from './features/alerts/AlertsPage';
import { RingsListPage } from './features/rings/RingsListPage';
import { RingDetailPage } from './features/rings/RingDetailPage';
import { AccountDetailPage } from './features/accounts/AccountDetailPage';
import { GraphExplorerPage } from './features/graph/GraphExplorerPage';
import { RulesPage } from './features/rules/RulesPage';
import { DataManagementPage } from './features/data/DataManagementPage';
import { CasesListPage } from './pages/CasesListPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { queryClient } from './lib/queryClient';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Public Login Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Investigation Application */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/cases" element={<CasesListPage />} />
              <Route path="/cases/:id" element={<CaseDetailPage />} />
              <Route path="/rings" element={<RingsListPage />} />
              <Route path="/rings/:id" element={<RingDetailPage />} />
              <Route path="/accounts/:id" element={<AccountDetailPage />} />
              <Route path="/graph" element={<GraphExplorerPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/data" element={<DataManagementPage />} />
            </Route>

            {/* Fallback to Public Landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

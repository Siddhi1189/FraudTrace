import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './app/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { queryClient } from './lib/queryClient';
import './index.css';

// Route-level code splitting to optimize bundle chunks
const LandingPage = lazy(() => import('./features/landing/LandingPage'));
const LoginPage = lazy(() => import('./features/login/LoginPage'));
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage'));
const AlertsPage = lazy(() => import('./features/alerts/AlertsPage'));
const RingsListPage = lazy(() => import('./features/rings/RingsListPage'));
const RingDetailPage = lazy(() => import('./features/rings/RingDetailPage'));
const AccountDetailPage = lazy(() => import('./features/accounts/AccountDetailPage'));
const GraphExplorerPage = lazy(() => import('./features/graph/GraphExplorerPage'));
const RulesPage = lazy(() => import('./features/rules/RulesPage'));
const DataManagementPage = lazy(() => import('./features/data/DataManagementPage'));
const CasesListPage = lazy(() => import('./features/cases/CasesListPage'));
const CaseDetailPage = lazy(() => import('./features/cases/CaseDetailPage'));

import { PageSkeletonFallback } from './components/PageSkeletonFallback';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageSkeletonFallback />}>
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
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

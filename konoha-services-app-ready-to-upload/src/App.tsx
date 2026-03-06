/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import BookingForm from './components/BookingForm';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import TechnicianDashboard from './pages/TechnicianDashboard';
import FeedbackPage from './pages/FeedbackPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';

function ProtectedRoute({ children, role }: { children: React.ReactNode, role: 'admin' | 'technician' }) {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== role) {
    if (user?.role === 'admin') return <Navigate to="/admin" replace />;
    if (user?.role === 'technician') return <Navigate to="/technician" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function Footer() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  
  return (
    <footer className={`text-center py-6 text-gray-400 text-sm ${isHome ? 'pb-28 md:pb-6' : ''}`}>
      <p>© 2024 Konoha Services. <Link to="/login" className="hover:text-emerald-600">Staff Login</Link></p>
    </footer>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            <Routes>
              <Route path="/" element={<BookingForm />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/feedback/:id" element={<FeedbackPage />} />
              
              <Route path="/admin" element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/technician" element={
                <ProtectedRoute role="technician">
                  <TechnicianDashboard />
                </ProtectedRoute>
              } />
            </Routes>
            
            <Footer />
          </div>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

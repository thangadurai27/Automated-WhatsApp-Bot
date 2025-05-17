import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Auth components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import PrivateRoute from './components/auth/PrivateRoute';

// Dashboard components
import Dashboard from './components/dashboard/Dashboard';
import Topics from './components/dashboard/Topics';
import WhatsAppSetup from './components/dashboard/WhatsAppSetup';
import Schedules from './components/dashboard/Schedules';
import Settings from './components/dashboard/Settings';
import Subscription from './components/dashboard/Subscription';

// Layout components
import Layout from './components/layout/Layout';
import LandingPage from './components/landing/LandingPage';

function App() {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected routes */}
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/topics" element={
          <PrivateRoute>
            <Layout>
              <Topics />
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/whatsapp-setup" element={
          <PrivateRoute>
            <Layout>
              <WhatsAppSetup />
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/schedules" element={
          <PrivateRoute>
            <Layout>
              <Schedules />
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/settings" element={
          <PrivateRoute>
            <Layout>
              <Settings />
            </Layout>
          </PrivateRoute>
        } />
        
        <Route path="/subscription" element={
          <PrivateRoute>
            <Layout>
              <Subscription />
            </Layout>
          </PrivateRoute>
        } />
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

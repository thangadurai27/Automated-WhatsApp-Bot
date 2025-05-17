import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  // Check if user is logged in
  const isAuthenticated = localStorage.getItem('token') !== null;
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default PrivateRoute;

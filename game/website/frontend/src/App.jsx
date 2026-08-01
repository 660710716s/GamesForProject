import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminStats from './pages/AdminStats';
import GameSessionWrapper from './pages/GameSessionWrapper';
import OperatorLab from './components/OperatorLab';
import InactivityMonitor from './components/InactivityMonitor';
import './index.css';

const PrivateRoute = ({ children }) => {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
};

function AppRoutes() {
  const { currentUser } = useAuth();
  
  return (
    <InactivityMonitor>
      <div className="app-container">
        <Routes>
          <Route path="/login" element={currentUser ? <Navigate to="/dashboard" /> : <Login />} />
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/admin/stats" 
            element={
              <PrivateRoute>
                <AdminStats />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/play/:gameId" 
            element={
              <PrivateRoute>
                <GameSessionWrapper />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/operator-lab" 
            element={
              <PrivateRoute>
                <OperatorLab />
              </PrivateRoute>
            } 
          />
          <Route path="/" element={<Navigate to={currentUser ? "/dashboard" : "/login"} />} />
        </Routes>
      </div>
    </InactivityMonitor>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;

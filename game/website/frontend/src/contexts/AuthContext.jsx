import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load from local storage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('puzzleUser');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/login', { username, password });
      const user = response.data; // {user_id, username, level}
      setCurrentUser(user);
      localStorage.setItem('puzzleUser', JSON.stringify(user));
      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      return { success: false, error: 'Login failed' };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('puzzleUser');
  };

  const updateUserLevel = (newLevel) => {
    const updatedUser = { ...currentUser, level: newLevel };
    setCurrentUser(updatedUser);
    localStorage.setItem('puzzleUser', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, updateUserLevel, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

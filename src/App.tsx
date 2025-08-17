import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DeviceProvider } from './context/DeviceContext';
import { ToastProvider } from './hooks/useToast';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import NFCViewer from './components/NFCViewer';
import './App.css';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center">
        <div className="text-white text-xl font-medium">Loading ZButton...</div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/nfc/:type/:id" element={<NFCViewer />} />
        <Route path="/*" element={
          <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700">
            {user ? <Dashboard /> : <AuthScreen />}
          </div>
        } />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <DeviceProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </DeviceProvider>
    </AuthProvider>
  );
}

export default App;
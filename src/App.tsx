import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DeviceProvider } from './context/DeviceContext';
import { ToastProvider } from './hooks/useToast';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import NFCViewer from './components/NFCViewer';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

const pageVariants = {
  initial: { opacity: 0, x: '100vw' },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: '-100vw' }
};

function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center">
        <div className="text-white text-xl font-medium">Loading ZButton...</div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/nfc/:type/:id" element={
          <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5 }}
          >
            <NFCViewer />
          </motion.div>
        } />
        <Route path="/*" element={
          <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5 }}
            className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700"
          >
            {user ? <Dashboard /> : <AuthScreen />}
          </motion.div>
        } />
      </Routes>
    </AnimatePresence>
  );
}

const WrappedApp = () => {
  return (
    <AuthProvider>
      <DeviceProvider>
        <ToastProvider>
          <Router>
            <App /> {/* Changed from <AppContent /> to <App /> */}
          </Router>
        </ToastProvider>
      </DeviceProvider>
    </AuthProvider>
  );
}

export default WrappedApp;
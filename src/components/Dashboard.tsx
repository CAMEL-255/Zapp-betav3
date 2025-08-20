import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../context/DeviceContext';
import FileUpload from './FileUpload';
import DataManager from './DataManager';
import NFCManager from './NFCManager';
import { User, LogOut, Zap } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const { deviceId } = useDevice();
  const [activeTab, setActiveTab] = useState<'data' | 'upload' | 'nfc'>('data');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <div className="card p-4 mb-6 relative flex flex-wrap items-center justify-between gap-4"> {/* NEW: Add flex-wrap and gap */}
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 w-10 h-10 rounded-full flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">ZButton Beta</h1>
            <p className="text-sm text-gray-600">Welcome back!</p>
          </div>
        </div>

        {/* Right buttons: Hamburger + Sign Out */}
        <div className="flex items-center space-x-2 relative">
          {/* Hamburger Button */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="p-2 rounded hover:bg-gray-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Dropdown using portal */}
            {dropdownOpen &&
              ReactDOM.createPortal(
                <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 md:top-20 md:right-20 md:left-auto md:transform-none"> {/* NEW: Centered on mobile */}
                  <div className="p-3 space-y-3">
                    {/* Device ID */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-500">Device ID</p>
                        <p
                          className="font-sm text-gray-600 break-all cursor-pointer"
                          title={deviceId}
                        >
                          {deviceId.substring(0, 15)}...
                        </p>
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(deviceId)}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                        title="Copy Device ID"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M16 8h2a2 2 0 012 2v8a2 2 0 01-2 2h-8a2 2 0 01-2-2v-2"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Account */}
                    {user && (
                      <div className="flex items-center space-x-3 justify-between">
                        <div className="flex items-center space-x-2">
                          <User className="w-5 h-5 text-gray-600" />
                          <div>
                            <p className="text-xs text-gray-500">Account</p>
                            <p className="font-sm text-gray-600">{user.email}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>,
                document.body
              )}
          </div>

          {/* Sign Out / Exit Button */}
          <button
            onClick={signOut}
            className="btn-secondary text-gray-700 border-gray-300 hover:bg-gray-50 p-2"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="card p-1 mb-6 tab-navigation">
        <div className="grid grid-cols-3 rounded-lg overflow-hidden md:grid-cols-3"> {/* NEW: Add class for mobile */}
          <button
            onClick={() => setActiveTab('data')}
            className={`py-3 px-4 text-center font-medium transition-all duration-200 ${
              activeTab === 'data'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Data Manager
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`py-3 px-4 text-center font-medium transition-all duration-200 ${
              activeTab === 'upload'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            File Upload
          </button>
          <button
            onClick={() => setActiveTab('nfc')}
            className={`py-3 px-4 text-center font-medium transition-all duration-200 ${
              activeTab === 'nfc'
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            NFC Manager
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'data' && <DataManager />}
        {activeTab === 'upload' && <FileUpload />}
        {activeTab === 'nfc' && <NFCManager />}
      </div>
    </div>
  );
};

export default Dashboard;
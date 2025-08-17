import React, { createContext, useContext, useEffect, useState } from 'react';

interface DeviceContextType {
  deviceId: string;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const useDevice = () => {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
};

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceId, setDeviceId] = useState<string>('');

  useEffect(() => {
    let storedDeviceId = localStorage.getItem('zbutton_device_id');
    
    if (!storedDeviceId) {
      storedDeviceId = generateUUID();
      localStorage.setItem('zbutton_device_id', storedDeviceId);
    }
    
    setDeviceId(storedDeviceId);
  }, []);

  return (
    <DeviceContext.Provider value={{ deviceId }}>
      {children}
    </DeviceContext.Provider>
  );
};
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { DataItem } from '../types';
import { getDataTypeConfig } from '../config/dataTypes';
import { Wifi, WifiOff, AlertCircle, CheckCircle, Radio, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NFCStatus {
  supported: boolean;
  available: boolean;
  reading: boolean;
  writing: boolean;
  lastRead: string | null;
  lastWrite: string | null;
}

const NFCManager: React.FC = () => {
  const { user } = useAuth(); // useAuth is used here
  const [nfcStatus, setNfcStatus] = useState<NFCStatus>({
    supported: false,
    available: false,
    reading: false,
    writing: false,
    lastRead: null,
    lastWrite: null
  });
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'info' | 'success' | 'error'>('info');
  const [dataItems, setDataItems] = useState<DataItem[]>([]);
  const [selectedDataItem, setSelectedDataItem] = useState<string>('');

  useEffect(() => {
    checkNFCSupport();
    loadDataItems();
  }, []);

  const loadDataItems = async () => {
    if (!user) return;
    try {
      const items = await dataService.getDataItems(user.id);
      setDataItems(items);
    } catch (error) {
      console.error('Error loading data items:', error);
    }
  };

  const checkNFCSupport = async () => {
    try {
      if ('NDEFReader' in window) {
        setNfcStatus(prev => ({ ...prev, supported: true }));
        setMessage('NFC is supported on this device');
        setMessageType('success');

        // Check if NFC is available
        try {
          const ndef = new (window as any).NDEFReader();
          await ndef.scan();
          setNfcStatus(prev => ({ ...prev, available: true }));
          setMessage('NFC is ready to use');
        } catch (error: any) {
          if (error.name === 'NotAllowedError') {
            setMessage('NFC permission denied. Please enable NFC and grant permission.');
            setMessageType('error');
          } else {
            setMessage('NFC is not available. Please check your device settings.');
            setMessageType('error');
          }
        }
      } else {
        setMessage('NFC is not supported on this device or browser. Use Chrome on Android for NFC functionality.');
        setMessageType('error');
      }
    } catch (error) {
      console.error('NFC check failed:', error);
      setMessage('Error checking NFC support');
      setMessageType('error');
    }
  };

  const readNFC = async () => {
    if (!nfcStatus.supported) {
      setMessage('NFC is not supported on this device');
      setMessageType('error');
      return;
    }

    try {
      setNfcStatus(prev => ({ ...prev, reading: true }));
      setMessage('Hold your device close to an NFC tag to read...');
      setMessageType('info');

      const ndef = new (window as any).NDEFReader();
      
      await ndef.scan();
      
      ndef.addEventListener('reading', ({ message, serialNumber }: any) => {
        setNfcStatus(prev => ({ 
          ...prev, 
          reading: false, 
          lastRead: new Date().toLocaleTimeString() 
        }));
        
        let content = 'Unknown data';
        if (message.records.length > 0) {
          const textDecoder = new TextDecoder(message.records[0].encoding);
          content = textDecoder.decode(message.records[0].data);
        }
        
        setMessage(`✅ NFC Read Successful!\nSerial: ${serialNumber}\nContent: ${content}`);
        setMessageType('success');
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (nfcStatus.reading) {
          setNfcStatus(prev => ({ ...prev, reading: false }));
          setMessage('Read timeout. No NFC tag detected.');
          setMessageType('error');
        }
      }, 30000);

    } catch (error: any) {
      setNfcStatus(prev => ({ ...prev, reading: false }));
      setMessage(`❌ NFC Read Failed: ${error.message}`);
      setMessageType('error');
    }
  };

  const writeNFC = async () => {
    if (!selectedDataItem) {
      setMessage('Please select a data item to write to NFC');
      setMessageType('error');
      return;
    }

    if (!nfcStatus.supported) {
      setMessage('NFC is not supported on this device');
      setMessageType('error');
      return;
    }
    
    const dataItem = await dataService.getDataItem(selectedDataItem);
    if (!dataItem) {
      setMessage('Selected data item not found');
      setMessageType('error');
      return;
    }

    if (!dataItem.isPublic) {
      setMessage('❌ Cannot write a link that is turned off. Please enable the link in the Data Manager.');
      setMessageType('error');
      return;
    }

    try {
      setNfcStatus(prev => ({ ...prev, writing: true }));
      setMessage('Hold your device close to a writable NFC tag...');
      setMessageType('info');

      const ndef = new (window as any).NDEFReader();
      
      const message = {
        records: [
          {
            recordType: "text",
            data: `ZButton ${getDataTypeConfig(dataItem.type).name}: ${dataItem.name}`
          },
          {
            recordType: "url", 
            data: dataItem.nfcLink
          }
        ]
      };

      await ndef.write(message);
      
      setNfcStatus(prev => ({ 
        ...prev, 
        writing: false, 
        lastWrite: new Date().toLocaleTimeString() 
      }));
      setMessage(`✅ NFC Write Successful!\n${dataItem.name} written to NFC tag.\nLink: ${dataItem.nfcLink}`);
      setMessageType('success');

    } catch (error: any) {
      setNfcStatus(prev => ({ ...prev, writing: false }));
      
      if (error.name === 'AbortError') {
        setMessage('❌ Write operation was cancelled');
      } else if (error.name === 'NotSupportedError') {
        setMessage('❌ This NFC tag is not writable');
      } else {
        setMessage(`❌ NFC Write Failed: ${error.message}`);
      }
      setMessageType('error');
    }
  };

  const stopNFC = () => {
    setNfcStatus(prev => ({ ...prev, reading: false, writing: false }));
    setMessage('NFC operation stopped');
    setMessageType('info');
  };

  return (
    <div className="space-y-6">
      {/* NFC Status */}
      <div className="card p-6 bg-white/95 border border-white/20">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <Radio className="w-5 h-5 mr-2" />
          NFC Manager
        </h2>

        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex items-center space-x-3">
            {nfcStatus.supported ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm text-gray-700">
              NFC {nfcStatus.supported ? 'Supported' : 'Not Supported'}
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            {nfcStatus.available ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm text-gray-700">
              NFC {nfcStatus.available ? 'Available' : 'Unavailable'}
            </span>
          </div>
        </div>

        {/* Message Display */}
        <div className={`p-4 rounded-lg mb-6 ${
          messageType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          messageType === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
          'bg-blue-50 text-blue-800 border border-blue-200'
        }`}>
          <pre className="whitespace-pre-wrap text-sm font-mono">{message}</pre>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Data Item Selection for Writing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Data to Write to NFC:
            </label>
            <select
              value={selectedDataItem}
              onChange={(e) => setSelectedDataItem(e.target.value)}
              className="input-field w-full bg-white/90"
            >
              <option value="">Choose a data item...</option>
              {dataItems.map((item) => {
                const typeConfig = getDataTypeConfig(item.type);
                return (
                  <option key={item.id} value={item.id}>
                    {typeConfig.icon} {item.name} ({typeConfig.name})
                  </option>
                );
              })}
            </select>
            {dataItems.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">
                No data items available. Add some data in the Data Manager first.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={readNFC}
              disabled={!nfcStatus.supported || nfcStatus.reading || nfcStatus.writing}
              className={`btn-primary ${
                nfcStatus.reading ? 'nfc-animation opacity-75' : ''
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {nfcStatus.reading ? 'Reading NFC...' : 'Read NFC Tag'}
            </button>
            
            <button
              onClick={writeNFC}
              disabled={!nfcStatus.supported || nfcStatus.writing || nfcStatus.reading || !selectedDataItem}
              className={`btn-primary ${
                nfcStatus.writing ? 'nfc-animation opacity-75' : ''
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {nfcStatus.writing ? 'Writing NFC...' : 'Write to NFC'}
            </button>
          </div>

          {(nfcStatus.reading || nfcStatus.writing) && (
            <button
              onClick={stopNFC}
              className="btn-secondary w-full text-red-600 border border-red-300 hover:bg-red-50 bg-white/20"
            >
              Stop NFC Operation
            </button>
          )}
        </div>

        {/* Last Operations */}
        {(nfcStatus.lastRead || nfcStatus.lastWrite) && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-700 mb-3">Recent Activity</h4>
            <div className="space-y-2 text-sm">
              {nfcStatus.lastRead && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Read:</span>
                  <span className="font-mono">{nfcStatus.lastRead}</span>
                </div>
              )}
              {nfcStatus.lastWrite && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Write:</span>
                  <span className="font-mono">{nfcStatus.lastWrite}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="card p-6 bg-white/95 border border-white/20">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Smartphone className="w-5 h-5 mr-2" />
          How to Use NFC
        </h3>
        
        <div className="space-y-4 text-sm text-gray-600">
          <div className="flex items-start space-x-3">
            <div className="bg-purple-100 text-purple-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">1</div>
            <p>Add data items in the Data Manager tab first</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="bg-purple-100 text-purple-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">2</div>
            <p>Ensure NFC is enabled in your Android device settings</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="bg-purple-100 text-purple-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">3</div>
            <p>Use Chrome browser for full NFC Web API support</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="bg-purple-100 text-purple-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">4</div>
            <p>Select a data item and hold your device close (within 1-2 cm) of the NFC tag</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="bg-purple-100 text-purple-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0">5</div>
            <p>Grant NFC permissions when prompted by the browser</p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
          <p className="text-xs text-yellow-800">
            <strong>Beta Note:</strong> Each NFC tag will contain a unique link to access specific data. When someone taps the NFC tag, they'll be directed to view only that specific data item.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NFCManager;
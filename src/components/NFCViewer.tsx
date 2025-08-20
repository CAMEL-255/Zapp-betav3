import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { DataItem } from '../types';
import { getDataTypeConfig } from '../config/dataTypes';
import { Zap, Calendar, User, Download, ExternalLink } from 'lucide-react';

const NFCViewer: React.FC = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const [dataItem, setDataItem] = useState<DataItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDataItem();
  }, [id]);

  const loadDataItem = async () => {
    if (!id) {
      setError('Invalid NFC link');
      setLoading(false);
      return;
    }

    try {
      const item = await dataService.getDataItem(id);
      if (!item) {
        setError('Data not found or no longer available');
      } else {
        setDataItem(item);
      }
    } catch (error) {
      console.error('Error loading data item:', error);
      setError('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = () => {
    if (!dataItem?.fileData || !dataItem.fileName) return;

    const link = document.createElement('a');
    link.href = dataItem.fileData;
    link.download = dataItem.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
        <div className="text-white text-xl font-medium">Loading...</div>
      </div>
    );
  }

  if (error || !dataItem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
        <div className="card w-full max-w-md text-center p-6">
          <div className="text-red-500 mb-4">
            <ExternalLink className="w-12 h-12 mx-auto" />
          </div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">
            {error || 'Data Not Found'}
          </h1>
          <p className="text-gray-600 mb-4">
            This NFC link may be invalid or the data may no longer be available.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="btn-primary"
          >
            Go to ZButton
          </button>
        </div>
      </div>
    );
  }

  const typeConfig = getDataTypeConfig(dataItem.type);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-lg">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">ZButton</h1>
        <p className="text-white/80">NFC Data Access</p>
      </div>

      {/* Data Card */}
      <div className="card w-full mx-auto p-6 max-w-md md:max-w-lg lg:max-w-xl">
        <div className="text-center mb-6">
          <div className={`w-16 h-16 rounded-full ${typeConfig.color} flex items-center justify-center mx-auto mb-4 text-white text-2xl`}>
            {typeConfig.icon}
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-1">
            {dataItem.name}
          </h2>
          <p className="text-purple-600 font-medium">{typeConfig.name}</p>
        </div>

        {dataItem.description && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
            <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
              {dataItem.description}
            </p>
          </div>
        )}

        {/* File Preview */}
        {dataItem.fileData && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">File</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              {dataItem.fileType?.startsWith('image/') ? (
                <div className="text-center">
                  <img
                    src={dataItem.fileData}
                    alt={dataItem.fileName}
                    className="max-w-full h-auto rounded-lg mx-auto mb-3"
                    style={{ maxHeight: '300px' }}
                    onError={(e) => {
                      console.error('Image failed to load:', dataItem.fileData);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <p className="text-sm text-gray-600">{dataItem.fileName}</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">📄</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{dataItem.fileName}</p>
                  <p className="text-xs text-gray-500">
                    {dataItem.fileType} • {Math.round((dataItem.fileSize || 0) / 1024)} KB
                  </p>
                </div>
              )}
              
              <button
                onClick={downloadFile}
                className="btn-primary w-full mt-4 flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </button>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div className="flex items-center space-x-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Created</span>
            </div>
            <span className="text-gray-800">
              {new Date(dataItem.createdAt).toLocaleDateString()}
            </span>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-2 text-gray-600">
              <User className="w-4 h-4" />
              <span>Shared via</span>
            </div>
            <span className="text-purple-600 font-medium">ZButton NFC</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <button
            onClick={() => window.location.href = '/'}
            className="btn-secondary w-full md:w-auto text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            Get ZButton
          </button>
        </div>
      </div>

      {/* Security Notice */}
      <div className="mt-6 text-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-3 max-w-md mx-auto">
          <p className="text-white/80 text-xs">
            🔒 This data was securely shared via NFC technology
          </p>
        </div>
      </div>
    </div>
  );
};

export default NFCViewer;
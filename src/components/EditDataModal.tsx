import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Upload, Image, Save, X } from 'lucide-react';
import Modal from './ui/Modal';
import { DataItem, DataType } from '../types';
import { DATA_TYPES, getDataTypeConfig } from '../config/dataTypes';
import { useToast } from '../hooks/useToast';

interface EditDataFormData {
  name: string;
  description: string;
  type: DataType;
}

interface EditDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataItem: DataItem;
  onSave: (updatedItem: Partial<DataItem>, newFile?: File) => Promise<void>;
}

const EditDataModal: React.FC<EditDataModalProps> = ({
  isOpen,
  onClose,
  dataItem,
  onSave
}) => {
  const { showToast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    watch
  } = useForm<EditDataFormData>({
    defaultValues: {
      name: dataItem.name === 'Untitled' ? '' : dataItem.name,
      description: dataItem.description || '',
      type: dataItem.type
    }
  });

  const selectedType = watch('type');
  const typeConfig = getDataTypeConfig(selectedType);

  React.useEffect(() => {
    if (isOpen) {
      reset({
        name: dataItem.name === 'Untitled' ? '' : dataItem.name,
        description: dataItem.description || '',
        type: dataItem.type
      });
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  }, [isOpen, dataItem, reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'File Too Large', 'File size must be less than 10MB');
      return;
    }

    if (!typeConfig.acceptedFileTypes.includes(file.type)) {
      showToast('error', 'Invalid File Type', `Please select a file of type: ${typeConfig.acceptedFileTypes.join(', ')}`);
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const onSubmit = async (data: EditDataFormData) => {
    setLoading(true);
    try {
      const updatedData: Partial<DataItem> = {
        userId: dataItem.userId,
        name: data.name.trim() || undefined,
        description: data.description.trim() || undefined,
        type: data.type
      };
  
      await onSave(updatedData, selectedFile || undefined);
  
      showToast('success', 'Data Updated', 'Your data has been successfully updated');
      onClose();
    } catch (error) {
      console.error('Error updating data:', error);
      showToast('error', 'Update Failed', 'Failed to update data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  

  const hasChanges = isDirty || selectedFile !== null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Data"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Data Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Data Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {DATA_TYPES.map((type) => (
              <motion.label
                key={type.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedType === type.id
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  value={type.id}
                  {...register('type')}
                  className="sr-only"
                />
                <div className="text-lg mb-1">{type.icon}</div>
                <div className="text-sm font-medium">{type.name}</div>
              </motion.label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">{typeConfig.description}</p>
        </div>

        {/* Name Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Name 
          </label>
          <input
            type="text"
            {...register('name', { 
              required: 'Name is required',
              minLength: { value: 1, message: 'Name cannot be empty' }
            })}
            className={`input-field w-full bg-white/90 ${errors.name ? 'border-red-300' : ''}`} /* NEW: Tailwind class for input background */
            placeholder={`Enter ${typeConfig.name.toLowerCase()} name`}
          />
          {errors.name && (
            <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* Description Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            {...register('description')}
            className="input-field w-full h-20 resize-none bg-white/90" /* NEW: Tailwind class for input background */
            placeholder="Optional description"
          />
        </div>

        {/* Current File Display */}
        {dataItem.fileData && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current File
            </label>
            <div className="bg-gray-50 rounded-lg p-4">
              {dataItem.fileType?.startsWith('image/') ? (
                <div className="text-center">
                  <motion.img
                    whileHover={{ scale: 1.05 }}
                    src={dataItem.fileData}
                    alt={dataItem.fileName}
                    className="max-w-full h-auto rounded-lg mx-auto mb-2"
                    style={{ maxHeight: '200px' }}
                  />
                  <p className="text-sm text-gray-600">{dataItem.fileName}</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-2xl">📄</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{dataItem.fileName}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {dataItem.fileData ? 'Replace File (Optional)' : 'Add File (Optional)'}
          </label>
          
          <div className="space-y-3">
            <input
              type="file"
              onChange={handleFileChange}
              accept={typeConfig.acceptedFileTypes.join(',')}
              className="input-field w-full bg-white/90" /* NEW: Tailwind class for input background */
              id="file-upload"
            />
            
            {/* File Preview */}
            {selectedFile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 border border-green-200 rounded-lg p-4"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    {selectedFile.type.startsWith('image/') ? (
                      <Image className="w-5 h-5 text-green-600" />
                    ) : (
                      <Upload className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">
                      New file selected: {selectedFile.name}
                    </p>
                    <p className="text-xs text-green-600">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                
                {/* Image Preview */}
                {previewUrl && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3"
                  >
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-w-full h-auto rounded-lg"
                      style={{ maxHeight: '200px' }}
                    />
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
          
          <p className="text-xs text-gray-500 mt-1">
            Accepted: {typeConfig.acceptedFileTypes.join(', ')} (max 10MB)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onClose}
            className="btn-secondary flex-1 border-2 border-gray-300 hover:bg-gray-50 bg-white/20" /* NEW: Added border and background classes */
            disabled={loading}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </motion.button>
          
          <motion.button
            whileHover={{ scale: hasChanges ? 1.02 : 1 }}
            whileTap={{ scale: hasChanges ? 0.98 : 1 }}
            type="submit"
            className={`btn-primary flex-1 flex items-center justify-center space-x-2 ${
              !hasChanges ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={loading || !hasChanges}
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Save Changes'}</span>
          </motion.button>
        </div>
      </form>
    </Modal>
  );
};

export default EditDataModal;
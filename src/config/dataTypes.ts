import { DataTypeConfig } from '../types';

export const DATA_TYPES: DataTypeConfig[] = [
  {
    id: 'id_card',
    name: 'ID Card',
    icon: '🆔',
    description: 'Government ID, passport, or identification documents',
    color: 'bg-blue-500',
    acceptedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  },
  {
    id: 'license',
    name: 'License',
    icon: '📄',
    description: 'Driver\'s license, professional licenses, permits',
    color: 'bg-green-500',
    acceptedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  },
  {
    id: 'photo',
    name: 'Photo',
    icon: '📸',
    description: 'Personal photos, profile pictures, certificates',
    color: 'bg-purple-500',
    acceptedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  },
  {
    id: 'document',
    name: 'Document',
    icon: '📋',
    description: 'Contracts, forms, certificates, reports',
    color: 'bg-orange-500',
    acceptedFileTypes: ['application/pdf', 'image/jpeg', 'image/png']
  },
  {
    id: 'other',
    name: 'Other',
    icon: '📁',
    description: 'Other types of data and files',
    color: 'bg-gray-500',
    acceptedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  }
];

export const getDataTypeConfig = (type: string): DataTypeConfig => {
  return DATA_TYPES.find(dt => dt.id === type) || DATA_TYPES[DATA_TYPES.length - 1];
};
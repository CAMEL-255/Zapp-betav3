export interface User {
  id: string;
  email: string;
  token: string;
}

export interface DataItem {
  id: string;
  userId: string;
  deviceId: string;
  type: DataType;
  name: string;
  description?: string;
  fileData?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  nfcLink: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic?: boolean; // NEW: Added the missing property
}

export type DataType = 'id_card' | 'license' | 'photo' | 'document' | 'other';

export interface DataTypeConfig {
  id: DataType;
  name: string;
  icon: string;
  description: string;
  color: string;
  acceptedFileTypes: string[];
}

export interface NFCWriteData {
  dataItemId: string;
  type: DataType;
  name: string;
  link: string;
}
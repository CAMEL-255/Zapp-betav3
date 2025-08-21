import { DataItem, DataType } from '../types';
import { supabase } from '../lib/supabase';

// Helper: get or create deviceId
function getDeviceId(): string {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('device_id', id);
  }
  return id;
}

// Helper: upload file to Supabase Storage
async function uploadFileToStorage(file: File, userId: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const deviceId = getDeviceId();
  const filePath = `${deviceId}/${userId}/${fileName}`;

  const { error } = await supabase.storage.from('photos').upload(filePath, file, { cacheControl: '3600', upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('photos').getPublicUrl(filePath);
  return data.publicUrl;
}

class DataService {
  private generateNFCLink(dataItemId: string, type: DataType): string {
    return `${window.location.origin}/nfc/${type}/${dataItemId}`;
  }

  async addDataItem(data: Partial<DataItem>, newFile?: File): Promise<DataItem> {
    console.log('Data received:', data);
  
    if (!data.userId || !data.type || !data.name) {
      console.error('Missing required fields: userId, type, or name');
      throw new Error("Missing required fields: userId, type, or name");
    }
  
    let fileUrl = '';
    let fileName = '';
    let fileType = '';
    let fileSize = 0;
  
    if (newFile) {
      console.log('Uploading file:', newFile);
  
      try {
        fileUrl = await uploadFileToStorage(newFile, data.userId);
        console.log('File uploaded, URL:', fileUrl);
      } catch (err) {
        console.error('Error uploading file:', err);
        throw err;
      }
  
      fileName = newFile.name;
      fileType = newFile.type;
      fileSize = newFile.size;
    }
  
    let dbData;
    try {
      const result = await supabase
        .from('photo_metadata')
        .insert({
          file_name: fileName || data.name,
          file_path: `/${data.userId}/${Date.now()}-${fileName || data.name}`,
          file_url: fileUrl || '',
          file_size: fileSize || 0,
          mime_type: fileType || 'application/octet-stream',
          uploader_id: data.userId,
          description: data.description || '',
          tags: [data.type],
          is_public: true
        })
        .select()
        .single();
  
      dbData = result.data;
      if (result.error || !dbData) {
        console.error('Error inserting into database:', result.error);
        throw result.error || new Error("Failed to insert data item");
      }
  
      console.log('Database insert result:', dbData);
    } catch (err) {
      console.error('Database insert failed:', err);
      throw err;
    }
  
    const newItem: DataItem = {
      id: dbData.id.toString(),
      userId: data.userId,
      deviceId: getDeviceId(),
      type: data.type,
      name: data.name,
      description: data.description || '',
      fileData: fileUrl || '',
      fileName,
      fileType,
      fileSize,
      nfcLink: this.generateNFCLink(dbData.id.toString(), data.type),
      createdAt: new Date(dbData.uploaded_at),
      updatedAt: new Date(dbData.updated_at),
      isPublic: dbData.is_public
    };
  
    return newItem;
  }

  async getDataItems(userId: string): Promise<DataItem[]> {
    const { data, error } = await supabase.from('photo_metadata').select('*').eq('uploader_id', userId);
    if (error) throw error;
    return data.map((d: any) => ({
      id: d.id.toString(),
      userId: d.uploader_id,
      deviceId: getDeviceId(),
      type: d.tags?.[0] || 'unknown',
      name: d.file_name,
      description: d.description || '',
      fileData: d.file_url || '',
      fileName: d.file_name,
      fileType: d.mime_type,
      fileSize: d.file_size,
      nfcLink: this.generateNFCLink(d.id.toString(), d.tags?.[0] || 'unknown'),
      createdAt: new Date(d.uploaded_at),
      updatedAt: new Date(d.updated_at),
      isPublic: d.is_public
    }));
  }
  
  async getDataItem(id: string): Promise<DataItem | null> {
    const { data, error } = await supabase
      .from('photo_metadata')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching single data item:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id.toString(),
      userId: data.uploader_id,
      deviceId: getDeviceId(),
      type: data.tags?.[0] || 'unknown',
      name: data.file_name,
      description: data.description || '',
      fileData: data.file_url || '',
      fileName: data.file_name,
      fileType: data.mime_type,
      fileSize: data.file_size,
      nfcLink: this.generateNFCLink(data.id.toString(), data.tags?.[0] || 'unknown'),
      createdAt: new Date(data.uploaded_at),
      updatedAt: new Date(data.updated_at),
      isPublic: data.is_public
    };
  }

  async updateLinkStatus(id: string, newStatus: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('photo_metadata')
      .update({ is_public: newStatus })
      .eq('id', id);

    if (error) {
      console.error('Error updating link status:', error);
      throw error;
    }

    return true;
  }

  async deleteDataItem(id: string): Promise<boolean> {
    const { error } = await supabase.from('photo_metadata').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  async updateDataItemWithFile(
    id: string,
    updatedData: Partial<DataItem>,
    newFile?: File
  ): Promise<DataItem> {
    try {
      let fileUrl = updatedData.fileData;
      let fileName = updatedData.fileName;
      let fileType = updatedData.fileType;
      let fileSize = updatedData.fileSize;
  
      if (newFile) {
        fileUrl = await uploadFileToStorage(newFile, updatedData.userId!);
        fileName = newFile.name;
        fileType = newFile.type;
        fileSize = newFile.size;
      }
  
      const updatePayload: any = {
        file_name: fileName || updatedData.name,
        file_url: fileUrl || '',
        file_size: fileSize || 0,
        mime_type: fileType || 'application/octet-stream',
        description: updatedData.description || '',
        tags: [updatedData.type],
        updated_at: new Date().toISOString()
      };
  
      const { data: dbData, error } = await supabase
        .from('photo_metadata')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
  
      if (error || !dbData) throw error || new Error("Failed to update data item");
  
      const newItem: DataItem = {
        id: dbData.id.toString(),
        userId: updatedData.userId!,
        deviceId: updatedData.deviceId || getDeviceId(),
        type: updatedData.type!,
        name: updatedData.name!,
        description: updatedData.description || '',
        fileData: fileUrl || '',
        fileName,
        fileType,
        fileSize,
        nfcLink: `${window.location.origin}/nfc/${updatedData.type}/${dbData.id}`,
        createdAt: new Date(dbData.uploaded_at),
        updatedAt: new Date(dbData.updated_at),
        isPublic: dbData.is_public
      };
  
      return newItem;
    } catch (err) {
      console.error("updateDataItemWithFile error:", err);
      throw err;
    }
  }
} 
export const dataService = new DataService();
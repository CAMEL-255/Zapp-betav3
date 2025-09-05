import { DataItem, DataType } from '../types';
import { supabase } from '../lib/supabase';

// Helper: infer mime type from filename extension
function getMimeTypeFromExt(fileName?: string): string | null {
  if (!fileName) return null;
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'pdf': return 'application/pdf';
    default: return null;
  }
}

// Helper function to upload file to Supabase Storage
const uploadFileToStorage = async (file: File, userId: string, mimeType?: string): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: mimeType || file.type || undefined
    });

  if (uploadError) {
    console.error('Supabase Storage upload error:', uploadError);
    throw uploadError;
  }
  console.log(`File ${fileName} uploaded successfully to Supabase Storage.`);

  // Get the public URL
  const { data: publicUrlData } = supabase.storage
    .from('photos')
    .getPublicUrl(filePath);

  // Supabase getPublicUrl does not return an error object directly,
  // it returns data.publicUrl as null if the file doesn't exist or isn't public.
  // We should check publicUrlData.publicUrl for validity.
  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error('Failed to get public URL for the uploaded file.');
  }

  return publicUrlData.publicUrl;
};

// Helper function to convert base64 to File object
const base64ToFile = (base64: string, fileName: string, mimeType?: string): File => {
  const arr = base64.split(',');
  const inferred = arr[0].match(/:(.*?);/)?.[1];
  const mime = mimeType || inferred || 'application/octet-stream';
  const bstr = atob(arr[arr.length - 1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], fileName, { type: mime });
};

class DataService {
  private generateNFCLink(dataItemId: string, type: DataType): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/nfc/${type}/${dataItemId}`;
  }

  async createDataItem(
    userId: string,
    deviceId: string,
    type: DataType,
    name: string,
    description?: string,
    fileData?: string,
    fileName?: string,
    fileType?: string,
    fileSize?: number
  ): Promise<DataItem> {
    // Normalize if caller passed a payload object as first argument
    if (typeof userId === 'object' && userId !== null) {
      const p = userId as unknown as { userId: string; deviceId?: string; type?: DataType; name?: string; description?: string; fileData?: string; fileName?: string; fileType?: string; fileSize?: number };
      // assign extracted values back to parameters
      userId = p.userId;
      deviceId = p.deviceId ?? deviceId;
      type = p.type ?? type;
      name = p.name ?? name;
      description = p.description ?? description;
      fileData = p.fileData ?? fileData;
      fileName = p.fileName ?? fileName;
      fileType = p.fileType ?? fileType;
      fileSize = p.fileSize ?? fileSize;
    }

    // Quick sanity check
    if (!userId || typeof userId !== 'string') {
      console.error('createDataItem: invalid userId after normalization:', userId);
      throw new Error('Invalid userId');
    }

    try {
      // First ensure user exists in users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle to handle cases where no user is found without throwing an error

      if (userError) {
       console.error('Error checking user existence:', userError.message, userError.details);
       throw userError; // Re-throw to indicate a problem with the check itself
     }

      if (!userData) {
        // User doesn't exist, create them
        console.log(`User with ID ${userId} not found, creating new user.`);
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser.user) {
          const { error: insertUserError } = await supabase.from('users').insert({
            id: userId,
            email: authUser.user.email || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          if (insertUserError) {
            console.error('Error creating new user:', insertUserError);
            throw insertUserError;
          }
          console.log(`User with ID ${userId} created successfully.`);
        } else {
          console.error('No authenticated user found to create new user entry.');
          throw new Error('Authentication required to create user entry.');
        }
      } else {
        console.log(`User with ID ${userId} already exists.`);
      }

      let publicFileUrl: string | undefined = fileData;
      // Determine resolved file type (prefer provided fileType, else infer from filename or base64)
      let resolvedFileType = fileType || getMimeTypeFromExt(fileName) || undefined;

      // If we have file data, upload it to Supabase Storage for public access
      if (fileData && fileName) {
        try {
          const file = base64ToFile(fileData, fileName, resolvedFileType);
          publicFileUrl = await uploadFileToStorage(file, userId, resolvedFileType);
          // Ensure mime_type is set for DB insert
          if (!resolvedFileType) {
            resolvedFileType = file.type || getMimeTypeFromExt(fileName) || 'application/octet-stream';
          }
        } catch (storageError) {
          console.warn('Failed to upload to storage, using base64 fallback:', storageError);
          // If upload fails, publicFileUrl remains the original fileData (base64)
          // This means the file will be stored as base64 in the database, not as a public URL
        }
      }

      // Insert photo metadata
      const { data: insertData, error: insertError } = await supabase
        .from('photo_metadata')
        .insert({
          file_name: fileName || name,
          file_path: publicFileUrl ? `/${userId}/${Date.now()}-${fileName || name}` : undefined, // Only set if publicFileUrl exists
          file_url: publicFileUrl || '',
          file_size: fileSize || 0,
          mime_type: resolvedFileType || 'application/octet-stream',
          uploader_id: userId,
          description: description,
          tags: [type],
          is_public: !!publicFileUrl // Mark as public only if a public URL was successfully generated
        })
        .select()
        .single(); // Keep single here, as we expect a single item to be inserted

      if (insertError) {
        console.error('Database insert error:', insertError.message, insertError.details);
        throw insertError;
      }

      const dataItem: DataItem = {
        id: insertData.id.toString(),
        userId,
        deviceId,
        type,
        name,
        description,
        fileData: publicFileUrl, // This will be the public URL if uploaded, or base64 if fallback
        fileName,
        fileType: resolvedFileType, // Use the resolved file type
        fileSize,
        nfcLink: this.generateNFCLink(insertData.id.toString(), type),
        createdAt: new Date(insertData.uploaded_at),
        updatedAt: new Date(insertData.uploaded_at)
      };

      return dataItem;
    } catch (error) {
      console.error('Error creating data item:', error);
      // Log specific details of the error if available
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      throw error;
    }
  }

  async getDataItems(userId: string): Promise<DataItem[]> {
    try {
      const { data, error } = await supabase
        .from('photo_metadata')
        .select('*')
        .eq('uploader_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Database fetch error:', error.message, error.details);
        throw error;
      }

      return (data || []).map(item => ({
        id: item.id.toString(),
        userId: item.uploader_id,
        deviceId: 'web', // Default for web uploads
        type: (item.tags?.[0] || 'other') as DataType,
        name: item.file_name,
        description: item.description,
        fileData: item.file_url, // This will be the public URL
        fileName: item.file_name,
        fileType: item.mime_type,
        fileSize: item.file_size,
        nfcLink: this.generateNFCLink(item.id.toString(), (item.tags?.[0] || 'other') as DataType),
        createdAt: new Date(item.uploaded_at),
        updatedAt: new Date(item.uploaded_at)
      }));
    } catch (error) {
      console.error('Error fetching data items:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      throw error;
    }
  }

  async getDataItemsByType(userId: string, type: DataType): Promise<DataItem[]> {
    try {
      const { data, error } = await supabase
        .from('photo_metadata')
        .select('*')
        .eq('uploader_id', userId)
        .contains('tags', [type])
        .order('uploaded_at', { ascending: false });

      if (error) {
        console.error('Database fetch by type error:', error.message, error.details);
        throw error;
      }

      return (data || []).map(item => ({
        id: item.id.toString(),
        userId: item.uploader_id,
        deviceId: 'web',
        type: (item.tags?.[0] || 'other') as DataType,
        name: item.file_name,
        description: item.description,
        fileData: item.file_url,
        fileName: item.file_name,
        fileType: item.mime_type,
        fileSize: item.file_size,
        nfcLink: this.generateNFCLink(item.id.toString(), (item.tags?.[0] || 'other') as DataType),
        createdAt: new Date(item.uploaded_at),
        updatedAt: new Date(item.uploaded_at)
      }));
    } catch (error) {
      console.error('Error fetching data items by type:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      throw error;
    }
  }

  async getDataItem(id: string): Promise<DataItem | null> {
    try {
      const numericId = parseInt(id);
      if (isNaN(numericId)) {
        console.error('Invalid ID format:', id);
        return null;
      }

      const { data, error } = await supabase
        .from('photo_metadata')
        .select('*')
        .eq('id', numericId)
        .single();

      if (error || !data) {
        console.error('Error fetching data item:', error?.message, error?.details);
        return null;
      }

      return {
        id: data.id.toString(),
        userId: data.uploader_id,
        deviceId: 'web',
        type: (data.tags?.[0] || 'other') as DataType,
        name: data.file_name,
        description: data.description,
        fileData: data.file_url,
        fileName: data.file_name,
        fileType: data.mime_type,
        fileSize: data.file_size,
        nfcLink: this.generateNFCLink(data.id.toString(), (data.tags?.[0] || 'other') as DataType),
        createdAt: new Date(data.uploaded_at),
        updatedAt: new Date(data.uploaded_at)
      };
    } catch (error) {
      console.error('Error fetching data item:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      return null;
    }
  }

  async updateDataItem(id: string, updates: Partial<DataItem>): Promise<DataItem | null> {
    try {
      const numericId = parseInt(id);
      if (isNaN(numericId)) {
        console.error('Invalid ID format:', id);
        return null;
      }

      const updateData: any = {};
      if (updates.name) updateData.file_name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.type) updateData.tags = [updates.type];
      if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic; // Add this line

      const { data, error } = await supabase
        .from('photo_metadata')
        .update(updateData)
        .eq('id', numericId)
        .select()
        .single();

      if (error || !data) {
        console.error('Error updating data item:', error?.message, error?.details);
        return null;
      }

      return this.getDataItem(id);
    } catch (error) {
      console.error('Error updating data item:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      return null;
    }
  }

  async updateDataItemWithFile(id: string, updates: Partial<DataItem>, newFile?: File): Promise<DataItem | null> {
    try {
      const numericId = parseInt(id);
      if (isNaN(numericId)) {
        console.error('Invalid ID format:', id);
        return null;
      }

      let publicFileUrl: string | undefined = updates.fileData;
      let resolvedFileType = updates.fileType || getMimeTypeFromExt(updates.fileName) || undefined;

      if (newFile && updates.userId) {
        try {
          publicFileUrl = await uploadFileToStorage(newFile, updates.userId, resolvedFileType);
          if (!resolvedFileType) {
            resolvedFileType = newFile.type || getMimeTypeFromExt(newFile.name) || 'application/octet-stream';
          }
          updates.fileData = publicFileUrl;
          updates.fileName = newFile.name;
          updates.fileSize = newFile.size;
          updates.fileType = resolvedFileType;
          updates.isPublic = true; // Mark as public if a new file is uploaded
        } catch (storageError) {
          console.warn('Failed to upload new file to storage during update, keeping existing file data:', storageError);
          // If new file upload fails, revert to existing file data or keep original updates
        }
      }

      const updateData: any = {};
      if (updates.name) updateData.file_name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.type) updateData.tags = [updates.type];
      if (updates.fileData !== undefined) updateData.file_url = updates.fileData;
      if (updates.fileName !== undefined) updateData.file_name = updates.fileName;
      if (updates.fileSize !== undefined) updateData.file_size = updates.fileSize;
      if (updates.fileType !== undefined) updateData.mime_type = updates.fileType;
      if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic;
      updateData.updated_at = new Date().toISOString(); // Always update timestamp

      const { data, error } = await supabase
        .from('photo_metadata')
        .update(updateData)
        .eq('id', numericId)
        .select()
        .single();

      if (error || !data) {
        console.error('Error updating data item with file:', error?.message, error?.details);
        return null;
      }

      return this.getDataItem(id);
    } catch (error) {
      console.error('Error updating data item with file:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      return null;
    }
  }

  async updateLinkStatus(id: string, newStatus: boolean): Promise<void> {
    try {
      const numericId = parseInt(id);
      if (isNaN(numericId)) {
        console.error('Invalid ID format for link status update:', id);
        throw new Error('Invalid ID format');
      }

      const { error } = await supabase
        .from('photo_metadata')
        .update({ is_public: newStatus, updated_at: new Date().toISOString() })
        .eq('id', numericId);

      if (error) {
        console.error('Error updating link status:', error.message, error.details);
        throw error;
      }
      console.log(`Link status for item ${id} updated to ${newStatus}`);
    } catch (error) {
      console.error('Error in updateLinkStatus:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      throw error;
    }
  }

  async deleteDataItem(id: string): Promise<boolean> {
    try {
      const numericId = parseInt(id);
      if (isNaN(numericId)) {
        console.error('Invalid ID format:', id);
        return false;
      }

      const { error } = await supabase
        .from('photo_metadata')
        .delete()
        .eq('id', numericId);

      if (error) {
        console.error('Error deleting data item:', error?.message, error?.details);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting data item:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
      return false;
    }
  }

  async getDataItemByNFCLink(link: string): Promise<DataItem | null> {
    // Extract ID from NFC link
    const matches = link.match(/\/nfc\/[^\/]+\/(.+)$/);
    if (!matches) return null;
    
    const id = matches[1];
    return this.getDataItem(id);
  }

  // Add this wrapper so callers using addDataItem keep working
  public addDataItem(
    userIdOrPayload: string | { userId: string; deviceId?: string; type: DataType; name: string; description?: string; fileData?: string; fileName?: string; fileType?: string; fileSize?: number },
    deviceId?: string,
    type?: DataType,
    name?: string,
    description?: string,
    fileData?: string,
    fileName?: string,
    fileType?: string,
    fileSize?: number
  ): Promise<DataItem> {
    if (typeof userIdOrPayload === 'object' && userIdOrPayload !== null) {
      const p = userIdOrPayload;
      return this.createDataItem(
        p.userId,
        p.deviceId || 'web',
        p.type,
        p.name,
        p.description,
        p.fileData,
        p.fileName,
        p.fileType,
        p.fileSize
      );
    }
    return this.createDataItem(userIdOrPayload as string, deviceId!, type!, name!, description, fileData, fileName, fileType, fileSize); // Non-null assertion for simplicity, consider adding validation
  }
}

export const dataService = new DataService();
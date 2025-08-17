/*
  # Update photo metadata policies

  1. Security Updates
    - Add policy for users to read their own photos
    - Add policy for users to update their own photos  
    - Add policy for users to delete their own photos
    - Update existing policies for better security

  2. Changes
    - Ensure proper RLS policies for authenticated users
    - Allow users full CRUD access to their own data
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view all public photos" ON photo_metadata;
DROP POLICY IF EXISTS "Users can insert their own photo metadata" ON photo_metadata;

-- Create comprehensive policies for authenticated users
CREATE POLICY "Users can read own photos"
  ON photo_metadata
  FOR SELECT
  TO authenticated
  USING (uploader_id = auth.uid());

CREATE POLICY "Users can insert own photos"
  ON photo_metadata
  FOR INSERT
  TO authenticated
  WITH CHECK (uploader_id = auth.uid());

CREATE POLICY "Users can update own photos"
  ON photo_metadata
  FOR UPDATE
  TO authenticated
  USING (uploader_id = auth.uid())
  WITH CHECK (uploader_id = auth.uid());

CREATE POLICY "Users can delete own photos"
  ON photo_metadata
  FOR DELETE
  TO authenticated
  USING (uploader_id = auth.uid());

-- Allow public read access to public photos
CREATE POLICY "Public can view public photos"
  ON photo_metadata
  FOR SELECT
  TO public
  USING (is_public = true);
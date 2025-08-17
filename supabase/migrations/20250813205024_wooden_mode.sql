/*
  # Fix foreign key constraints and RLS policies

  1. Data Cleanup
    - Remove orphaned records from photos table
    - Ensure data integrity before adding constraints
  
  2. Foreign Key Updates
    - Drop existing foreign key constraint safely
    - Add proper foreign key constraint with CASCADE delete
  
  3. Security Updates
    - Update RLS policies to use proper auth functions
    - Ensure consistent policy naming and structure
*/

-- First, clean up any orphaned records in photos table
DELETE FROM photos 
WHERE user_id NOT IN (
  SELECT id FROM auth.users
);

-- Also clean up any orphaned records in photo_metadata table
DELETE FROM photo_metadata 
WHERE uploader_id NOT IN (
  SELECT id FROM auth.users
);

-- Update the foreign key constraint to reference the users table properly
DO $$
BEGIN
  -- Drop existing foreign key constraints if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'photos_user_id_fkey' 
    AND table_name = 'photos'
  ) THEN
    ALTER TABLE photos DROP CONSTRAINT photos_user_id_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_photos_user_id' 
    AND table_name = 'photos'
  ) THEN
    ALTER TABLE photos DROP CONSTRAINT fk_photos_user_id;
  END IF;

  -- Add proper foreign key constraint
  ALTER TABLE photos ADD CONSTRAINT photos_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
END $$;

-- Update RLS policies to use proper auth functions
DROP POLICY IF EXISTS "Users can view own photos" ON photos;
DROP POLICY IF EXISTS "Users can insert own photos" ON photos;
DROP POLICY IF EXISTS "Users can update own photos" ON photos;
DROP POLICY IF EXISTS "Users can delete own photos" ON photos;
DROP POLICY IF EXISTS "Users can view only their own or public photos" ON photos;
DROP POLICY IF EXISTS "Users can insert their own photos" ON photos;
DROP POLICY IF EXISTS "Users can update only their own photos" ON photos;
DROP POLICY IF EXISTS "Users can delete only their own photos" ON photos;

CREATE POLICY "Users can view own photos"
  ON photos
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own photos"
  ON photos
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own photos"
  ON photos
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own photos"
  ON photos
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
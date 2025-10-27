-- QUICK FIX: Run this in Supabase SQL Editor
-- This will check and create missing tables

-- Check if club_books exists, if not create it
CREATE TABLE IF NOT EXISTS club_books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES book_clubs(id) ON DELETE CASCADE NOT NULL,
  book_id uuid REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  start_date date,
  end_date date,
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'current', 'completed')),
  added_at timestamptz DEFAULT now(),
  UNIQUE(club_id, book_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_club_books_club_id ON club_books(club_id);

-- Enable RLS
ALTER TABLE club_books ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Club members can view club books" ON club_books;
DROP POLICY IF EXISTS "Club moderators can manage club books" ON club_books;
DROP POLICY IF EXISTS "Club moderators can update club books" ON club_books;
DROP POLICY IF EXISTS "Club moderators can delete club books" ON club_books;

-- Recreate policies
CREATE POLICY "Club members can view club books"
  ON club_books FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members 
      WHERE club_members.club_id = club_books.club_id 
      AND club_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Club moderators can manage club books"
  ON club_books FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members 
      WHERE club_members.club_id = club_books.club_id 
      AND club_members.user_id = auth.uid()
      AND club_members.role IN ('owner', 'moderator')
    )
  );

CREATE POLICY "Club moderators can update club books"
  ON club_books FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members 
      WHERE club_members.club_id = club_books.club_id 
      AND club_members.user_id = auth.uid()
      AND club_members.role IN ('owner', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members 
      WHERE club_members.club_id = club_books.club_id 
      AND club_members.user_id = auth.uid()
      AND club_members.role IN ('owner', 'moderator')
    )
  );

CREATE POLICY "Club moderators can delete club books"
  ON club_books FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members 
      WHERE club_members.club_id = club_books.club_id 
      AND club_members.user_id = auth.uid()
      AND club_members.role IN ('owner', 'moderator')
    )
  );

-- Create chat_messages table for real-time chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES book_clubs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_club_id ON chat_messages(club_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Enable Realtime for chat_messages table (CRITICAL for real-time updates)
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Club members can view messages" ON chat_messages;
DROP POLICY IF EXISTS "Club members can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete their messages" ON chat_messages;

-- Chat messages policies
CREATE POLICY "Club members can view messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = chat_messages.club_id
      AND club_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Club members can send messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = chat_messages.club_id
      AND club_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their messages"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create storage buckets for book covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-covers', 'book-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for book covers
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Public can view book covers" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload book covers" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their book covers" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their book covers" ON storage.objects;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create storage policies
CREATE POLICY "Public can view book covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-covers');

CREATE POLICY "Authenticated users can upload book covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'book-covers');

CREATE POLICY "Users can update their book covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'book-covers');

CREATE POLICY "Users can delete their book covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'book-covers');

-- Verify the tables were created
SELECT 'All tables and chat functionality created successfully!' as status;

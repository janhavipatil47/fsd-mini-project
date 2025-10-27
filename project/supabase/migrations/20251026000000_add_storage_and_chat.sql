-- Create storage buckets for book covers and PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('book-covers', 'book-covers', true),
  ('book-pdfs', 'book-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for book covers (public read, authenticated write)
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

-- Storage policies for book PDFs (club members can access)
CREATE POLICY "Club members can view book PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'book-pdfs' AND
    auth.uid() IN (
      SELECT cm.user_id 
      FROM club_members cm
      JOIN club_books cb ON cb.club_id = cm.club_id
      JOIN books b ON b.id = cb.book_id
      WHERE b.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Authenticated users can upload book PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'book-pdfs');

CREATE POLICY "Users can update their book PDFs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'book-pdfs');

CREATE POLICY "Users can delete their book PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'book-pdfs');

-- Add pdf_url column to books table
ALTER TABLE books ADD COLUMN IF NOT EXISTS pdf_url text;

-- Create chat_messages table
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

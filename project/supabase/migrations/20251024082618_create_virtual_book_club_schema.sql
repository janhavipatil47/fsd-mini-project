/*
  # Virtual Book Club Database Schema

  ## Overview
  This migration creates the complete database schema for a virtual book club application
  with user management, book clubs, reading tracking, notes, and real-time discussions.

  ## New Tables
  
  ### 1. profiles
  Extended user profile information linked to auth.users
  - `id` (uuid, primary key) - Links to auth.users
  - `username` (text, unique) - Display name
  - `full_name` (text) - User's full name
  - `avatar_url` (text) - Profile picture URL
  - `role` (text) - User role: admin, member, guest
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. book_clubs
  Book clubs that users can create and join
  - `id` (uuid, primary key)
  - `name` (text) - Club name
  - `description` (text) - Club description
  - `created_by` (uuid) - Creator user ID
  - `is_private` (boolean) - Privacy setting
  - `cover_image_url` (text) - Club cover image
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. club_members
  Tracks membership in book clubs
  - `id` (uuid, primary key)
  - `club_id` (uuid) - Reference to book_clubs
  - `user_id` (uuid) - Reference to profiles
  - `role` (text) - Member role: owner, moderator, member
  - `joined_at` (timestamptz)

  ### 4. books
  Books available in the system
  - `id` (uuid, primary key)
  - `title` (text) - Book title
  - `author` (text) - Book author
  - `description` (text) - Book description
  - `cover_url` (text) - Book cover image
  - `isbn` (text) - ISBN number
  - `total_pages` (integer) - Total page count
  - `genre` (text) - Book genre
  - `published_year` (integer) - Publication year
  - `added_by` (uuid) - User who added the book
  - `created_at` (timestamptz)

  ### 5. club_books
  Books assigned to book clubs
  - `id` (uuid, primary key)
  - `club_id` (uuid) - Reference to book_clubs
  - `book_id` (uuid) - Reference to books
  - `start_date` (date) - Reading start date
  - `end_date` (date) - Reading end date
  - `status` (text) - Status: upcoming, current, completed
  - `added_at` (timestamptz)

  ### 6. reading_progress
  Tracks individual reading progress
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Reference to profiles
  - `club_book_id` (uuid) - Reference to club_books
  - `current_page` (integer) - Current page number
  - `status` (text) - Status: not_started, reading, completed
  - `started_at` (timestamptz)
  - `completed_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. notes
  User notes on books
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Reference to profiles
  - `club_book_id` (uuid) - Reference to club_books
  - `page_number` (integer) - Page reference
  - `content` (text) - Note content
  - `is_private` (boolean) - Privacy setting
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 8. discussions
  Discussion threads for books
  - `id` (uuid, primary key)
  - `club_book_id` (uuid) - Reference to club_books
  - `created_by` (uuid) - Reference to profiles
  - `title` (text) - Discussion title
  - `content` (text) - Discussion content
  - `is_ai_generated` (boolean) - Flag for AI-generated discussions
  - `pinned` (boolean) - Pin to top
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 9. discussion_replies
  Replies to discussion threads
  - `id` (uuid, primary key)
  - `discussion_id` (uuid) - Reference to discussions
  - `user_id` (uuid) - Reference to profiles
  - `content` (text) - Reply content
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Policies for authenticated users to manage their own data
  - Policies for club members to access club-specific data
  - Admin policies for user management
  - Public read access for non-private content

  ## Notes
  - All timestamps use timestamptz for timezone awareness
  - Foreign keys enforce referential integrity
  - Indexes on frequently queried columns for performance
  - Secure defaults with RLS enabled from the start
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'guest')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create book_clubs table
CREATE TABLE IF NOT EXISTS book_clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_private boolean DEFAULT false,
  cover_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create club_members table
CREATE TABLE IF NOT EXISTS club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid REFERENCES book_clubs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- Create books table
CREATE TABLE IF NOT EXISTS books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text NOT NULL,
  description text,
  cover_url text,
  isbn text,
  total_pages integer DEFAULT 0,
  genre text,
  published_year integer,
  added_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create club_books table
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

-- Create reading_progress table
CREATE TABLE IF NOT EXISTS reading_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  club_book_id uuid REFERENCES club_books(id) ON DELETE CASCADE NOT NULL,
  current_page integer DEFAULT 0,
  status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'reading', 'completed')),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, club_book_id)
);

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  club_book_id uuid REFERENCES club_books(id) ON DELETE CASCADE NOT NULL,
  page_number integer,
  content text NOT NULL,
  is_private boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create discussions table
CREATE TABLE IF NOT EXISTS discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_book_id uuid REFERENCES club_books(id) ON DELETE CASCADE NOT NULL,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  content text NOT NULL,
  is_ai_generated boolean DEFAULT false,
  pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create discussion_replies table
CREATE TABLE IF NOT EXISTS discussion_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id uuid REFERENCES discussions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_club_books_club_id ON club_books(club_id);
CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id ON reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_discussions_club_book_id ON discussions(club_book_id);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_discussion_id ON discussion_replies(discussion_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_replies ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Drop existing policy (if present) and create simpler SELECT policy
DROP POLICY IF EXISTS "Users can view public book clubs" ON public.book_clubs;

CREATE POLICY "Users can view public book clubs"
  ON public.book_clubs FOR SELECT
  TO authenticated
  USING (
    -- permit public clubs or the club creator (owner).
    -- NOTE: this avoids checking membership to prevent RLS recursion.
    NOT is_private OR auth.uid() = created_by
  );

-- SECURITY DEFINER helper to create a club and its owner member atomically.
-- This avoids client-side multi-step inserts that can trigger RLS recursion
-- when policies reference each other. Run this as a DB owner when deploying.
-- PostgREST / Supabase passes RPC parameters as JSON; when resolving
-- the function signature it matches by the order of keys. The client side
-- can serialize object keys in alphabetical order, so to ensure the
-- RPC is found reliably we create the function with parameters ordered
-- alphabetically by name. This matches the ordering emitted by the client
-- and avoids "function not found" errors.
DROP FUNCTION IF EXISTS public.create_club_with_owner(text, uuid, text, boolean, text);
CREATE OR REPLACE FUNCTION public.create_club_with_owner(
  p_cover_image_url text,
  p_created_by uuid,
  p_description text,
  p_is_private boolean,
  p_name text
) RETURNS public.book_clubs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  created public.book_clubs%ROWTYPE;
BEGIN
  INSERT INTO public.book_clubs (name, description, is_private, cover_image_url, created_by)
  VALUES (p_name, p_description, p_is_private, p_cover_image_url, p_created_by)
  RETURNING * INTO created;

  INSERT INTO public.club_members (club_id, user_id, role)
  VALUES (created.id, p_created_by, 'owner');

  RETURN created;
END;
$$;

-- Allow authenticated role to execute the RPC (note the parameter types/order)
GRANT EXECUTE ON FUNCTION public.create_club_with_owner(text, uuid, text, boolean, text) TO authenticated;
CREATE POLICY "Users can create book clubs"
  ON book_clubs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Club owners can update their clubs"
  ON book_clubs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members 
      WHERE club_members.club_id = book_clubs.id 
      AND club_members.user_id = auth.uid()
      AND club_members.role IN ('owner', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members 
      WHERE club_members.club_id = book_clubs.id 
      AND club_members.user_id = auth.uid()
      AND club_members.role IN ('owner', 'moderator')
    )
  );

CREATE POLICY "Club owners can delete their clubs"
  ON book_clubs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members 
      WHERE club_members.club_id = book_clubs.id 
      AND club_members.user_id = auth.uid()
      AND club_members.role = 'owner'
    )
  );

-- Club members policies
CREATE POLICY "Users can view club members"
  ON club_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM book_clubs 
      WHERE book_clubs.id = club_members.club_id 
      AND (
        NOT book_clubs.is_private OR 
        EXISTS (
          SELECT 1 FROM club_members cm 
          WHERE cm.club_id = book_clubs.id 
          AND cm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can join clubs"
  ON club_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave clubs"
  ON club_members FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Club owners can manage members"
  ON club_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_members cm 
      WHERE cm.club_id = club_members.club_id 
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM club_members cm 
      WHERE cm.club_id = club_members.club_id 
      AND cm.user_id = auth.uid()
      AND cm.role IN ('owner', 'moderator')
    )
  );

-- Books policies
CREATE POLICY "Users can view all books"
  ON books FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add books"
  ON books FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = added_by);

-- Club books policies
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

-- Reading progress policies
CREATE POLICY "Users can view own reading progress"
  ON reading_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Club members can view club reading progress"
  ON reading_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_books cb
      JOIN club_members cm ON cm.club_id = cb.club_id
      WHERE cb.id = reading_progress.club_book_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own reading progress"
  ON reading_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reading progress"
  ON reading_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reading progress"
  ON reading_progress FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Notes policies
CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Club members can view public notes"
  ON notes FOR SELECT
  TO authenticated
  USING (
    NOT is_private AND
    EXISTS (
      SELECT 1 FROM club_books cb
      JOIN club_members cm ON cm.club_id = cb.club_id
      WHERE cb.id = notes.club_book_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Discussions policies
CREATE POLICY "Club members can view discussions"
  ON discussions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM club_books cb
      JOIN club_members cm ON cm.club_id = cb.club_id
      WHERE cb.id = discussions.club_book_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Club members can create discussions"
  ON discussions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM club_books cb
      JOIN club_members cm ON cm.club_id = cb.club_id
      WHERE cb.id = club_book_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Discussion creators can update discussions"
  ON discussions FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Discussion creators can delete discussions"
  ON discussions FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Discussion replies policies
CREATE POLICY "Club members can view replies"
  ON discussion_replies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM discussions d
      JOIN club_books cb ON cb.id = d.club_book_id
      JOIN club_members cm ON cm.club_id = cb.club_id
      WHERE d.id = discussion_replies.discussion_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Club members can create replies"
  ON discussion_replies FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM discussions d
      JOIN club_books cb ON cb.id = d.club_book_id
      JOIN club_members cm ON cm.club_id = cb.club_id
      WHERE d.id = discussion_id
      AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Reply authors can update replies"
  ON discussion_replies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Reply authors can delete replies"
  ON discussion_replies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

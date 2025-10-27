# Setup Instructions

## 🚀 Quick Start

### 1. Run Database Migration

Go to your Supabase Dashboard (https://supabase.com/dashboard) and:

1. Select your project
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/20251026000000_add_storage_and_chat.sql`
5. Click **Run** or press **Ctrl+Enter**

### 2. Verify Storage Buckets

In Supabase Dashboard:

1. Go to **Storage** section
2. You should see two buckets:
   - `book-covers` (public)
   - `book-pdfs` (private)

If they don't exist, the migration will create them automatically.

### 3. Start Development Server

```powershell
npm run dev
```

### 4. Test the Features

1. **Login** to your account
2. **Create a club** or join one
3. **Add a book** with image upload or URL
4. **View the club** to see books, members, and chat
5. **Send a message** in the chat
6. **Check Books page** to see highlighted reading progress

## ✅ Verification Checklist

- [ ] Can create a club
- [ ] Can add a book with image upload
- [ ] Can add a book with PDF upload
- [ ] Books appear in Clubs section with cover thumbnails
- [ ] Can click "View" to open club detail page
- [ ] Can see all three tabs (Books, Members, Chat)
- [ ] Chat messages send and receive in real-time
- [ ] Books appear in Books section
- [ ] Half-read books show yellow highlight
- [ ] Can download PDFs from club page

## 🔧 If Something Doesn't Work

### Storage Issues
If file uploads don't work:

1. Check Supabase Dashboard > Storage
2. Verify buckets exist
3. Check bucket policies (should be created by migration)
4. Try creating buckets manually if needed

### Chat Issues
If chat doesn't work:

1. Check Supabase Dashboard > Table Editor
2. Verify `chat_messages` table exists
3. Check RLS policies
4. Open browser console for errors

### Book Adding Issues
If books don't save:

1. Open browser console (F12)
2. Try adding a book
3. Look for error messages
4. Check if `pdf_url` column exists in `books` table

## 📊 Database Schema Changes

The migration adds:

```sql
-- New column
books.pdf_url (text, nullable)

-- New table
chat_messages (
  id, club_id, user_id, message, created_at
)

-- New storage buckets
- book-covers (public)
- book-pdfs (private)
```

## 🎉 You're All Set!

Once the migration is complete, all features should work automatically!

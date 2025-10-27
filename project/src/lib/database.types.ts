export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          avatar_url: string | null
          role: 'admin' | 'member' | 'guest'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'member' | 'guest'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'admin' | 'member' | 'guest'
          created_at?: string
          updated_at?: string
        }
      }
      book_clubs: {
        Row: {
          id: string
          name: string
          description: string | null
          created_by: string | null
          is_private: boolean
          cover_image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_by?: string | null
          is_private?: boolean
          cover_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_by?: string | null
          is_private?: boolean
          cover_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      club_members: {
        Row: {
          id: string
          club_id: string
          user_id: string
          role: 'owner' | 'moderator' | 'member'
          joined_at: string
        }
        Insert: {
          id?: string
          club_id: string
          user_id: string
          role?: 'owner' | 'moderator' | 'member'
          joined_at?: string
        }
        Update: {
          id?: string
          club_id?: string
          user_id?: string
          role?: 'owner' | 'moderator' | 'member'
          joined_at?: string
        }
      }
      books: {
        Row: {
          id: string
          title: string
          author: string
          description: string | null
          cover_url: string | null
          pdf_url: string | null
          isbn: string | null
          total_pages: number
          genre: string | null
          published_year: number | null
          added_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          author: string
          description?: string | null
          cover_url?: string | null
          pdf_url?: string | null
          isbn?: string | null
          total_pages?: number
          genre?: string | null
          published_year?: number | null
          added_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          author?: string
          description?: string | null
          cover_url?: string | null
          pdf_url?: string | null
          isbn?: string | null
          total_pages?: number
          genre?: string | null
          published_year?: number | null
          added_by?: string | null
          created_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          club_id: string
          user_id: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          club_id: string
          user_id: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          club_id?: string
          user_id?: string
          message?: string
          created_at?: string
        }
      }
      club_books: {
        Row: {
          id: string
          club_id: string
          book_id: string
          start_date: string | null
          end_date: string | null
          status: 'upcoming' | 'current' | 'completed'
          added_at: string
        }
        Insert: {
          id?: string
          club_id: string
          book_id: string
          start_date?: string | null
          end_date?: string | null
          status?: 'upcoming' | 'current' | 'completed'
          added_at?: string
        }
        Update: {
          id?: string
          club_id?: string
          book_id?: string
          start_date?: string | null
          end_date?: string | null
          status?: 'upcoming' | 'current' | 'completed'
          added_at?: string
        }
      }
      reading_progress: {
        Row: {
          id: string
          user_id: string
          club_book_id: string
          current_page: number
          status: 'not_started' | 'reading' | 'completed'
          started_at: string | null
          completed_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          club_book_id: string
          current_page?: number
          status?: 'not_started' | 'reading' | 'completed'
          started_at?: string | null
          completed_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          club_book_id?: string
          current_page?: number
          status?: 'not_started' | 'reading' | 'completed'
          started_at?: string | null
          completed_at?: string | null
          updated_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          user_id: string
          club_book_id: string
          page_number: number | null
          content: string
          is_private: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          club_book_id: string
          page_number?: number | null
          content: string
          is_private?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          club_book_id?: string
          page_number?: number | null
          content?: string
          is_private?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      discussions: {
        Row: {
          id: string
          club_book_id: string
          created_by: string | null
          title: string
          content: string
          is_ai_generated: boolean
          pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          club_book_id: string
          created_by?: string | null
          title: string
          content: string
          is_ai_generated?: boolean
          pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          club_book_id?: string
          created_by?: string | null
          title?: string
          content?: string
          is_ai_generated?: boolean
          pinned?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      discussion_replies: {
        Row: {
          id: string
          discussion_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          discussion_id: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          discussion_id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

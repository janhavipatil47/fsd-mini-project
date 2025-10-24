import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Clock, CheckCircle } from 'lucide-react';
import { Database } from '../lib/database.types';

type ReadingProgressWithDetails = Database['public']['Tables']['reading_progress']['Row'] & {
  club_books: Database['public']['Tables']['club_books']['Row'] & {
    books: Database['public']['Tables']['books']['Row'];
    book_clubs: Database['public']['Tables']['book_clubs']['Row'];
  };
};

export const Books = () => {
  const { profile } = useAuth();
  const [readingList, setReadingList] = useState<ReadingProgressWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'not_started' | 'reading' | 'completed'>('all');

  useEffect(() => {
    fetchReadingProgress();
  }, [profile]);

  const fetchReadingProgress = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('reading_progress')
        .select(`
          *,
          club_books (
            *,
            books (*),
            book_clubs (*)
          )
        `)
        .eq('user_id', profile.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setReadingList(data as ReadingProgressWithDetails[] || []);
    } catch (error) {
      console.error('Error fetching reading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (progressId: string, currentPage: number, totalPages: number) => {
    try {
      const newStatus = currentPage >= totalPages ? 'completed' : currentPage > 0 ? 'reading' : 'not_started';
      const updates: any = {
        current_page: currentPage,
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'reading' && !readingList.find(r => r.id === progressId)?.started_at) {
        updates.started_at = new Date().toISOString();
      }

      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('reading_progress')
        .update(updates)
        .eq('id', progressId);

      if (error) throw error;
      fetchReadingProgress();
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const filteredBooks = readingList.filter(item =>
    filter === 'all' || item.status === filter
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'reading':
        return <BookOpen className="w-5 h-5 text-blue-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'reading':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          My Reading List
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track your progress and manage your reading journey
        </p>
      </div>

      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        {[
          { value: 'all', label: 'All Books' },
          { value: 'not_started', label: 'Not Started' },
          { value: 'reading', label: 'Reading' },
          { value: 'completed', label: 'Completed' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value as any)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              filter === tab.value
                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredBooks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
          <BookOpen className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No books in this category
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Join a book club to start adding books to your reading list
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBooks.map((item) => {
            const book = item.club_books.books;
            const club = item.club_books.book_clubs;
            const progress = book.total_pages > 0 ? (item.current_page / book.total_pages) * 100 : 0;

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-32 h-48 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                          {book.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                          by {book.author}
                        </p>
                        <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                          {club.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(item.status)}
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {book.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                        {book.description}
                      </p>
                    )}

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Progress: {item.current_page} / {book.total_pages} pages
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          max={book.total_pages}
                          value={item.current_page}
                          onChange={(e) => updateProgress(item.id, parseInt(e.target.value) || 0, book.total_pages)}
                          className="w-24 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white text-sm"
                        />
                        <button
                          onClick={() => updateProgress(item.id, item.current_page + 10, book.total_pages)}
                          className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
                        >
                          +10 pages
                        </button>
                        {item.status !== 'completed' && (
                          <button
                            onClick={() => updateProgress(item.id, book.total_pages, book.total_pages)}
                            className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm font-medium"
                          >
                            Mark Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

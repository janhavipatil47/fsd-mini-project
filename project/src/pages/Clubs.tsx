import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Users, X, Loader2, BookOpen, Upload, Image as ImageIcon } from 'lucide-react';
import { Database } from '../lib/database.types';

type Club = Database['public']['Tables']['book_clubs']['Row'];
type ClubMember = Database['public']['Tables']['club_members']['Row'];
type Book = Database['public']['Tables']['books']['Row'];
type ClubBook = Database['public']['Tables']['club_books']['Row'] & {
  books: Book;
};

interface ClubsProps {
  onNavigateToClub?: (clubId: string) => void;
}

export const Clubs = ({ onNavigateToClub }: ClubsProps) => {
  const { profile } = useAuth();
  const [clubs, setClubs] = useState<(Club & { memberCount: number; myRole: string; clubBooks?: ClubBook[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [selectedClub, setSelectedClub] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPrivate: false,
  });
  const [bookFormData, setBookFormData] = useState({
    title: '',
    author: '',
    description: '',
    coverUrl: '',
    coverFile: null as File | null,
    pdfFile: null as File | null,
    totalPages: 0,
    genre: '',
    publishedYear: new Date().getFullYear(),
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [addingBook, setAddingBook] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'manual' | 'pdf'>('manual');

  useEffect(() => {
    fetchClubs();
  }, [profile]);

  // Realtime: refresh clubs when membership changes for this user
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('public:club_members')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'club_members' }, (payload) => {
        const inserted = payload.new as ClubMember;
        if (inserted.user_id === profile.id) fetchClubs();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'club_members' }, (payload) => {
        const deleted = payload.old as ClubMember;
        if (deleted.user_id === profile.id) fetchClubs();
      })
      .subscribe();

    return () => {
      // removeChannel returns a Promise; ensure cleanup returns void to satisfy React's EffectCallback
      void supabase.removeChannel(channel);
    };
  }, [profile]);

  // Also refresh club member counts when any membership changes for clubs we own or display
  useEffect(() => {
    if (!profile) return;

    const channel2 = supabase
      .channel('public:club_members_all')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'club_members' }, (payload) => {
        const inserted = payload.new as any;
        // if this club is in our current list, refresh counts
        setClubs(prev => {
          if (prev.find(c => c.id === inserted.club_id)) {
            fetchClubs();
          }
          return prev;
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'club_members' }, (payload) => {
        const deleted = payload.old as any;
        setClubs(prev => {
          if (prev.find(c => c.id === deleted.club_id)) {
            fetchClubs();
          }
          return prev;
        });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel2);
    };
  }, [profile, clubs]);

  const fetchClubs = async () => {
    if (!profile) return;

    try {
      const { data: memberData } = await supabase
        .from('club_members')
        .select('club_id, role')
        .eq('user_id', profile.id);

      const clubIds = memberData?.map(m => m.club_id) || [];

      if (clubIds.length > 0) {
        const { data: clubsData } = await supabase
          .from('book_clubs')
          .select('*')
          .in('id', clubIds);

        const clubsWithDetails = await Promise.all(
          (clubsData || []).map(async (club) => {
            const { count } = await supabase
              .from('club_members')
              .select('*', { count: 'exact', head: true })
              .eq('club_id', club.id);

            const { data: booksData } = await supabase
              .from('club_books')
              .select(`
                *,
                books (*)
              `)
              .eq('club_id', club.id)
              .order('added_at', { ascending: false });

            const memberRole = memberData?.find(m => m.club_id === club.id)?.role || 'member';

            return {
              ...club,
              memberCount: count || 0,
              myRole: memberRole,
              clubBooks: booksData as ClubBook[] || [],
            };
          })
        );

        setClubs(clubsWithDetails);
      }
    } catch (error) {
      console.error('Error fetching clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setCreating(true);
    setCreateError(null);

    try {
      console.log('Creating club with direct insert...');
      
      // Direct insert - no RPC
      const { data: createdClub, error: clubError } = await supabase
        .from('book_clubs')
        .insert({
          name: formData.name,
          description: formData.description,
          is_private: formData.isPrivate,
          created_by: profile.id,
        })
        .select()
        .single() as { data: any; error: any };

      if (clubError) {
        console.error('Club insert error:', clubError);
        setCreateError(clubError.message || String(clubError));
        throw clubError;
      }

      console.log('Club created, adding member...');

      const { error: memberError } = await supabase
        .from('club_members')
        .insert({
          club_id: createdClub.id,
          user_id: profile.id,
          role: 'owner',
        }) as { error: any };

      if (memberError) {
        console.error('club_members insert error:', memberError);
        setCreateError(memberError.message || String(memberError));
        throw memberError;
      }

      console.log('Club created successfully:', createdClub);

      // Optimistically add the new club to UI so creator sees it immediately
      setClubs(prev => [{ ...createdClub, memberCount: 1, myRole: 'owner', clubBooks: [] }, ...prev]);
      setFormData({ name: '', description: '', isPrivate: false });
      setShowCreateModal(false);
      // Ensure full details are loaded (counts, etc.)
      fetchClubs();
    } catch (error) {
      console.error('Error creating club:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedClub) return;

    setAddingBook(true);

    try {
      let coverUrl = bookFormData.coverUrl;

      // Only try file upload if file is provided and storage exists
      if (bookFormData.coverFile) {
        try {
          const fileExt = bookFormData.coverFile.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('book-covers')
            .upload(fileName, bookFormData.coverFile);

          if (!uploadError && uploadData) {
            const { data: { publicUrl } } = supabase.storage
              .from('book-covers')
              .getPublicUrl(uploadData.path);
            coverUrl = publicUrl;
          }
        } catch (storageError) {
          console.log('Storage not set up yet, using URL only');
        }
      }

      // Create the book - without pdf_url if column doesn't exist yet
      const bookData: any = {
        title: bookFormData.title,
        author: bookFormData.author,
        description: bookFormData.description,
        cover_url: coverUrl,
        total_pages: bookFormData.totalPages,
        genre: bookFormData.genre,
        published_year: bookFormData.publishedYear,
        added_by: profile.id,
      };

      const { data: book, error: bookError } = await supabase
        .from('books')
        .insert(bookData)
        .select()
        .single();

      if (bookError) {
        console.error('Book error:', bookError);
        throw bookError;
      }

      // Add it to the club
      const { data: clubBookData, error: clubBookError } = await supabase
        .from('club_books')
        .insert({
          club_id: selectedClub,
          book_id: book.id,
          status: 'current',
        })
        .select()
        .single();

      if (clubBookError) {
        console.error('Club book error:', clubBookError);
        throw clubBookError;
      }

      // Add reading progress for all club members
      const { data: members } = await supabase
        .from('club_members')
        .select('user_id')
        .eq('club_id', selectedClub);

      if (members && clubBookData) {
        await Promise.all(
          members.map(member =>
            supabase.from('reading_progress').insert({
              user_id: member.user_id,
              club_book_id: clubBookData.id,
              current_page: 0,
              status: 'not_started',
            })
          )
        );
      }

      // Reset form
      setBookFormData({
        title: '',
        author: '',
        description: '',
        coverUrl: '',
        coverFile: null,
        pdfFile: null,
        totalPages: 0,
        genre: '',
        publishedYear: new Date().getFullYear(),
      });
      setShowAddBookModal(false);
      setSelectedClub(null);
      
      // Refresh clubs
      await fetchClubs();
      
      alert('Book added successfully!');
    } catch (error: any) {
      console.error('Error adding book:', error);
      alert(`Error adding book: ${error.message || 'Please try again'}`);
    } finally {
      setAddingBook(false);
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            My Book Clubs
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage and explore your reading communities
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Create Club</span>
        </button>
      </div>

      {clubs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
          <Users className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No book clubs yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first book club to start connecting with other readers
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Create Your First Club
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clubs.map((club) => (
            <div
              key={club.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="h-40 bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 relative">
                {club.cover_image_url && (
                  <img
                    src={club.cover_image_url}
                    alt={club.name}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-sm dark:bg-gray-800/90 rounded-full text-xs font-semibold text-gray-900 dark:text-white shadow-lg">
                    {club.myRole}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {club.name}
                  </h3>
                  {club.is_private && (
                    <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
                      Private
                    </span>
                  )}
                </div>

                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                  {club.description || 'No description available'}
                </p>

                {/* Books Display Section */}
                {club.clubBooks && club.clubBooks.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                      <BookOpen className="w-4 h-4 mr-1" />
                      Club Books ({club.clubBooks.length})
                    </h4>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                      {club.clubBooks.slice(0, 4).map((clubBook) => (
                        <div
                          key={clubBook.id}
                          className="flex-shrink-0 w-16 group relative"
                          title={clubBook.books.title}
                        >
                          <div className="w-16 h-24 rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-shadow bg-gradient-to-br from-blue-400 to-blue-600">
                            {clubBook.books.cover_url ? (
                              <img
                                src={clubBook.books.cover_url}
                                alt={clubBook.books.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                        </div>
                      ))}
                      {club.clubBooks.length > 4 && (
                        <div className="flex-shrink-0 w-16 h-24 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-400">
                          +{club.clubBooks.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Users className="w-4 h-4 mr-1" />
                      <span>{club.memberCount}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {(club.myRole === 'owner' || club.myRole === 'moderator') && (
                      <button
                        onClick={() => {
                          setSelectedClub(club.id);
                          setShowAddBookModal(true);
                        }}
                        className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-xs font-medium flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Book
                      </button>
                    )}
                    <button 
                      onClick={() => onNavigateToClub?.(club.id)}
                      className="px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-xs font-medium"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create Book Club
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreateClub} className="space-y-4">
              {createError && (
                <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm mb-2">
                  Error creating club: {createError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Club Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                  placeholder="The Mystery Readers"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                  placeholder="A club for mystery novel enthusiasts..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPrivate"
                  checked={formData.isPrivate}
                  onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="isPrivate" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Make this club private
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Club'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Book Modal */}
      {showAddBookModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-7 h-7" />
                Add Book to Club
              </h2>
              <button
                onClick={() => {
                  setShowAddBookModal(false);
                  setSelectedClub(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleAddBook} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Book Title *
                  </label>
                  <input
                    type="text"
                    value={bookFormData.title}
                    onChange={(e) => setBookFormData({ ...bookFormData, title: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                    placeholder="The Great Gatsby"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Author *
                  </label>
                  <input
                    type="text"
                    value={bookFormData.author}
                    onChange={(e) => setBookFormData({ ...bookFormData, author: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                    placeholder="F. Scott Fitzgerald"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={bookFormData.description}
                  onChange={(e) => setBookFormData({ ...bookFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                  placeholder="A story about..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Cover Image
                </label>
                
                {/* URL Input */}
                <div className="mb-3">
                  <input
                    type="url"
                    value={bookFormData.coverUrl}
                    onChange={(e) => setBookFormData({ ...bookFormData, coverUrl: e.target.value, coverFile: null })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                    placeholder="https://example.com/book-cover.jpg"
                    disabled={!!bookFormData.coverFile}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Paste a direct URL to the book cover image
                  </p>
                </div>

                {/* OR Separator */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">OR</span>
                  <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
                </div>

                {/* File Upload */}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setBookFormData({ ...bookFormData, coverFile: file, coverUrl: '' });
                    }}
                    className="hidden"
                    id="cover-file-input"
                    disabled={!!bookFormData.coverUrl}
                  />
                  <label
                    htmlFor="cover-file-input"
                    className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                      bookFormData.coverUrl
                        ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-50'
                        : 'border-blue-300 dark:border-blue-600 hover:border-blue-500 dark:hover:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    }`}
                  >
                    <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {bookFormData.coverFile ? bookFormData.coverFile.name : 'Upload Image File'}
                    </span>
                  </label>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Upload an image file (JPG, PNG, WEBP)
                  </p>
                </div>

                {/* Preview */}
                {(bookFormData.coverUrl || bookFormData.coverFile) && (
                  <div className="mt-4 flex justify-center">
                    <div className="w-32 h-48 rounded-lg overflow-hidden shadow-lg border-2 border-gray-200 dark:border-gray-600">
                      <img
                        src={bookFormData.coverFile ? URL.createObjectURL(bookFormData.coverFile) : bookFormData.coverUrl}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total Pages
                  </label>
                  <input
                    type="number"
                    value={bookFormData.totalPages || ''}
                    onChange={(e) => setBookFormData({ ...bookFormData, totalPages: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                    placeholder="200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Genre
                  </label>
                  <input
                    type="text"
                    value={bookFormData.genre}
                    onChange={(e) => setBookFormData({ ...bookFormData, genre: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                    placeholder="Fiction"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Published Year
                  </label>
                  <input
                    type="number"
                    value={bookFormData.publishedYear || ''}
                    onChange={(e) => setBookFormData({ ...bookFormData, publishedYear: parseInt(e.target.value) || new Date().getFullYear() })}
                    min="1000"
                    max={new Date().getFullYear()}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                    placeholder="2023"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBookModal(false);
                    setSelectedClub(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingBook}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {addingBook ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Adding Book...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Add Book
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

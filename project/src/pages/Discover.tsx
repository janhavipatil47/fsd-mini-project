import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Users, BookOpen, Lock, Globe } from 'lucide-react';
import { Database } from '../lib/database.types';

type ClubWithDetails = Database['public']['Tables']['book_clubs']['Row'] & {
  memberCount: number;
  bookCount: number;
  isMember: boolean;
};

export const Discover = () => {
  const { profile } = useAuth();
  const [clubs, setClubs] = useState<ClubWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    fetchPublicClubs();
  }, [profile]);

  // Realtime: update public clubs list when clubs are inserted/updated/deleted
  useEffect(() => {
    if (!profile) return;

    const channel = supabase
      .channel('public:book_clubs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'book_clubs' }, (payload) => {
        const newClub = payload.new as Database['public']['Tables']['book_clubs']['Row'];
        // Only add public clubs (respect privacy)
        if (!newClub.is_private) {
          // Quick optimistic add and refetch details in background
          setClubs(prev => [{ ...newClub, memberCount: 0, bookCount: 0, isMember: false }, ...prev]);
          // refresh full details to get accurate counts and membership
          fetchPublicClubs();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'book_clubs' }, () => {
        fetchPublicClubs();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'book_clubs' }, () => {
        fetchPublicClubs();
      })
      // Update member counts when club_members change
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'club_members' }, (payload) => {
        const inserted = payload.new as any;
        // if this club is currently in our list, refresh details
        setClubs(prev => {
          if (prev.find(c => c.id === inserted.club_id)) {
            fetchPublicClubs();
          }
          return prev;
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'club_members' }, (payload) => {
        const deleted = payload.old as any;
        setClubs(prev => {
          if (prev.find(c => c.id === deleted.club_id)) {
            fetchPublicClubs();
          }
          return prev;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const fetchPublicClubs = async () => {
    if (!profile) return;

    try {
      const { data: myClubs } = await supabase
        .from('club_members')
        .select('club_id')
        .eq('user_id', profile.id);

      const myClubIds = myClubs?.map(m => m.club_id) || [];

      const { data: allClubs } = await supabase
        .from('book_clubs')
        .select('*')
        .eq('is_private', false)
        .order('created_at', { ascending: false });

      const clubsWithDetails = await Promise.all(
        (allClubs || []).map(async (club) => {
          const { count: memberCount } = await supabase
            .from('club_members')
            .select('*', { count: 'exact', head: true })
            .eq('club_id', club.id);

          const { count: bookCount } = await supabase
            .from('club_books')
            .select('*', { count: 'exact', head: true })
            .eq('club_id', club.id);

          return {
            ...club,
            memberCount: memberCount || 0,
            bookCount: bookCount || 0,
            isMember: myClubIds.includes(club.id),
          };
        })
      );

      setClubs(clubsWithDetails);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClub = async (clubId: string) => {
    if (!profile) return;

    setJoining(clubId);

    try {
      const { error } = await supabase
        .from('club_members')
        .insert({
          club_id: clubId,
          user_id: profile.id,
          role: 'member',
        });

      if (error) throw error;

      const { data: clubBooks } = await supabase
        .from('club_books')
        .select('id, books(total_pages)')
        .eq('club_id', clubId);

      if (clubBooks && clubBooks.length > 0) {
        const progressInserts = clubBooks.map(cb => ({
          user_id: profile.id,
          club_book_id: cb.id,
          current_page: 0,
          status: 'not_started' as const,
        }));

        await supabase.from('reading_progress').insert(progressInserts);
      }

      fetchPublicClubs();
    } catch (error) {
      console.error('Error joining club:', error);
    } finally {
      setJoining(null);
    }
  };

  const filteredClubs = clubs.filter(club =>
    club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    club.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          Discover Book Clubs
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Find and join communities of readers with similar interests
        </p>
      </div>

      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search book clubs..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {filteredClubs.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
          <Users className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No clubs found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search or create a new club
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClubs.map((club) => (
            <div
              key={club.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all"
            >
              <div className="h-40 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 relative">
                {club.cover_image_url && (
                  <img
                    src={club.cover_image_url}
                    alt={club.name}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute top-4 right-4">
                  {club.is_private ? (
                    <Lock className="w-5 h-5 text-white" />
                  ) : (
                    <Globe className="w-5 h-5 text-white" />
                  )}
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {club.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                  {club.description || 'No description available'}
                </p>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Users className="w-4 h-4 mr-1" />
                      <span>{club.memberCount}</span>
                    </div>
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <BookOpen className="w-4 h-4 mr-1" />
                      <span>{club.bookCount}</span>
                    </div>
                  </div>
                </div>

                {club.isMember ? (
                  <div className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-center text-sm font-medium">
                    Already a member
                  </div>
                ) : (
                  <button
                    onClick={() => handleJoinClub(club.id)}
                    disabled={joining === club.id}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {joining === club.id ? 'Joining...' : 'Join Club'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

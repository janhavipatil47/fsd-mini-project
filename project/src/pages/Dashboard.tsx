import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Users, TrendingUp } from 'lucide-react';
import { Database } from '../lib/database.types';

type ClubWithDetails = Database['public']['Tables']['book_clubs']['Row'] & {
  club_members: { count: number }[];
  club_books: (Database['public']['Tables']['club_books']['Row'] & {
    books: Database['public']['Tables']['books']['Row'];
  })[];
};

export const Dashboard = () => {
  const { profile } = useAuth();
  const [clubs, setClubs] = useState<ClubWithDetails[]>([]);
  const [stats, setStats] = useState({
    totalClubs: 0,
    booksReading: 0,
    totalMembers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [profile]);

  const fetchDashboardData = async () => {
    if (!profile) return;

    try {
      const { data: memberClubs } = await supabase
        .from('club_members')
        .select('club_id')
        .eq('user_id', profile.id);

      const clubIds = memberClubs?.map(m => m.club_id) || [];

      if (clubIds.length > 0) {
        const { data: clubsData } = await supabase
          .from('book_clubs')
          .select(`
            *,
            club_members (count),
            club_books (
              *,
              books (*)
            )
          `)
          .in('id', clubIds)
          .order('created_at', { ascending: false });

        setClubs(clubsData as ClubWithDetails[] || []);

        const { data: readingProgress } = await supabase
          .from('reading_progress')
          .select('status')
          .eq('user_id', profile.id)
          .eq('status', 'reading');

        setStats({
          totalClubs: clubsData?.length || 0,
          booksReading: readingProgress?.length || 0,
          totalMembers: clubsData?.reduce((acc, club) => acc + (club.club_members[0]?.count || 0), 0) || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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
          Welcome back, {profile?.username}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here's what's happening with your book clubs today
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-100 mb-1">My Book Clubs</p>
              <p className="text-4xl font-bold">{stats.totalClubs}</p>
            </div>
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-100 mb-1">Currently Reading</p>
              <p className="text-4xl font-bold">{stats.booksReading}</p>
            </div>
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-100 mb-1">Total Members</p>
              <p className="text-4xl font-bold">{stats.totalMembers}</p>
            </div>
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Your Book Clubs</h2>

        {clubs.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center border border-gray-200 dark:border-gray-700">
            <BookOpen className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No book clubs yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Join or create a book club to start your reading journey
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs.map((club) => (
              <div
                key={club.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="h-32 bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 relative">
                  {club.cover_image_url && (
                    <img
                      src={club.cover_image_url}
                      alt={club.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {club.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                    {club.description || 'No description available'}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <Users className="w-4 h-4 mr-1" />
                        <span>{club.club_members[0]?.count || 0}</span>
                      </div>
                      <div className="flex items-center text-gray-600 dark:text-gray-400">
                        <BookOpen className="w-4 h-4 mr-1" />
                        <span>{club.club_books?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

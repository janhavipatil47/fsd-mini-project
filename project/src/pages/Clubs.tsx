import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Users, X, Loader2 } from 'lucide-react';
import { Database } from '../lib/database.types';

type Club = Database['public']['Tables']['book_clubs']['Row'];
type ClubMember = Database['public']['Tables']['club_members']['Row'];

export const Clubs = () => {
  const { profile } = useAuth();
  const [clubs, setClubs] = useState<(Club & { memberCount: number; myRole: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPrivate: false,
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  // selectedClub was unused; remove to satisfy linter

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

            const memberRole = memberData?.find(m => m.club_id === club.id)?.role || 'member';

            return {
              ...club,
              memberCount: count || 0,
              myRole: memberRole,
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
      setClubs(prev => [{ ...createdClub, memberCount: 1, myRole: 'owner' }, ...prev]);
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
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all group"
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
                  <span className="px-3 py-1 bg-white/90 dark:bg-gray-800/90 rounded-full text-xs font-medium text-gray-900 dark:text-white">
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

                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Users className="w-4 h-4 mr-1" />
                      <span>{club.memberCount}</span>
                    </div>
                  </div>

                  <button
                    className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
                  >
                    View Details
                  </button>
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
    </div>
  );
};

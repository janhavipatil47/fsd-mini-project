import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Users, BookOpen, MessageCircle, Send, Download, Loader2 } from 'lucide-react';
import { Database } from '../lib/database.types';

type Club = Database['public']['Tables']['book_clubs']['Row'];
type ClubBook = Database['public']['Tables']['club_books']['Row'] & {
  books: Database['public']['Tables']['books']['Row'];
};
type Member = Database['public']['Tables']['club_members']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
};
type ChatMessage = Database['public']['Tables']['chat_messages']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
};

interface ClubDetailProps {
  clubId: string;
  onBack: () => void;
}

export const ClubDetail = ({ clubId, onBack }: ClubDetailProps) => {
  const { profile } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [books, setBooks] = useState<ClubBook[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'books' | 'members' | 'chat'>('books');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchClubData();
    
    // Set up real-time subscription for chat
    const channel = supabase
      .channel(`club-${clubId}-chat`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `club_id=eq.${clubId}`,
        },
        async (payload) => {
          console.log('New message received:', payload);
          
          // Fetch the complete message with profile data
          const { data } = await supabase
            .from('chat_messages')
            .select(`
              *,
              profiles (*)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data as ChatMessage]);
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId]);

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchClubData = async () => {
    setLoading(true);
    try {
      // Fetch club details
      const { data: clubData } = await supabase
        .from('book_clubs')
        .select('*')
        .eq('id', clubId)
        .single();

      setClub(clubData);

      // Fetch books
      const { data: booksData } = await supabase
        .from('club_books')
        .select(`
          *,
          books (*)
        `)
        .eq('club_id', clubId)
        .order('added_at', { ascending: false });

      setBooks(booksData as ClubBook[] || []);

      // Fetch members
      const { data: membersData } = await supabase
        .from('club_members')
        .select(`
          *,
          profiles (*)
        `)
        .eq('club_id', clubId)
        .order('joined_at', { ascending: false });

      setMembers(membersData as Member[] || []);

      // Fetch messages
      await fetchMessages();
    } catch (error) {
      console.error('Error fetching club data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data } = await supabase
        .from('chat_messages')
        .select(`
          *,
          profiles (*)
        `)
        .eq('club_id', clubId)
        .order('created_at', { ascending: true })
        .limit(100);

      setMessages(data as ChatMessage[] || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          club_id: clubId,
          user_id: profile.id,
          message: newMessage.trim(),
        });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const downloadPdf = (pdfUrl: string, title: string) => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${title}.pdf`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Club not found</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <button
        onClick={onBack}
        className="mb-6 flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Clubs
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-6">
        <div className="h-48 bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 relative">
          {club.cover_image_url && (
            <img
              src={club.cover_image_url}
              alt={club.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {club.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {club.description || 'No description available'}
          </p>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4 mr-1" />
              <span>{members.length} members</span>
            </div>
            <div className="flex items-center text-gray-600 dark:text-gray-400">
              <BookOpen className="w-4 h-4 mr-1" />
              <span>{books.length} books</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            <button
              onClick={() => setActiveTab('books')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'books'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-5 h-5 inline mr-2" />
              Books ({books.length})
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'members'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-5 h-5 inline mr-2" />
              Members ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <MessageCircle className="w-5 h-5 inline mr-2" />
              Chat
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Books Tab */}
          {activeTab === 'books' && (
            <div className="space-y-4">
              {books.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No books in this club yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {books.map((clubBook) => (
                    <div
                      key={clubBook.id}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 flex gap-4 hover:shadow-md transition-shadow"
                    >
                      <div className="w-24 h-36 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg overflow-hidden flex-shrink-0 shadow-md">
                        {clubBook.books.cover_url ? (
                          <img
                            src={clubBook.books.cover_url}
                            alt={clubBook.books.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-8 h-8 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                          {clubBook.books.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          by {clubBook.books.author}
                        </p>
                        {clubBook.books.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-2 mb-2">
                            {clubBook.books.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            clubBook.status === 'current'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : clubBook.status === 'upcoming'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                          }`}>
                            {clubBook.status}
                          </span>
                          {clubBook.books.pdf_url && (
                            <button
                              onClick={() => downloadPdf(clubBook.books.pdf_url!, clubBook.books.title)}
                              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <Download className="w-3 h-3" />
                              PDF
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              {members.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No members in this club</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 flex items-center gap-3"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {member.profiles.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {member.profiles.username}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                          {member.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[500px]">
              <div className="flex-1 overflow-y-auto mb-4 space-y-3 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.user_id === profile?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          msg.user_id === profile?.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}
                      >
                        {msg.user_id !== profile?.id && (
                          <p className="text-xs font-semibold mb-1 opacity-75">
                            {msg.profiles.username}
                          </p>
                        )}
                        <p className="text-sm">{msg.message}</p>
                        <p className={`text-xs mt-1 ${
                          msg.user_id === profile?.id ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

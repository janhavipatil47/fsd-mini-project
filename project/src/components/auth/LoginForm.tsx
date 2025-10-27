import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Loader2 } from 'lucide-react';
import { loginUser } from '../../lib/api';

interface LoginFormProps {
  onToggleMode: () => void;
}

export const LoginForm = ({ onToggleMode }: LoginFormProps) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Step 1: Verify credentials with MongoDB
      await loginUser({ email, password });

      // Step 2: Login to Supabase (for app session)
      const { error: supabaseError } = await signIn(email, password);
      
      if (supabaseError) {
        setError(supabaseError.message);
        setLoading(false);
        return;
      }

      // Success - Supabase will handle redirect
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
      <div className="flex items-center justify-center mb-8">
        <BookOpen className="w-12 h-12 text-blue-600 dark:text-blue-400" />
      </div>

      <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">
        Welcome Back
      </h2>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
        Sign in to continue your reading journey
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white transition-all"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white transition-all"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
        Don't have an account?{' '}
        <button
          onClick={onToggleMode}
          className="text-blue-600 dark:text-blue-400 font-medium hover:underline"
        >
          Sign up
        </button>
      </p>
    </div>
  );
};

import { useState } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';

export const AuthPage = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      {mode === 'login' ? (
        <LoginForm onToggleMode={() => setMode('signup')} />
      ) : (
        <SignupForm onToggleMode={() => setMode('login')} />
      )}
    </div>
  );
};

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      // Redirect will be handled by the auth state change listener
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) throw error;
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold text-[#b4f]">Sign in to your account</h2>
        <p className="mt-2 text-sm text-[#e2b3ff]">
          Or{' '}
          <Link href="/auth/register" className="font-medium text-[#b4f] hover:text-[#b4f]/80 transition-colors">
            create a new account
          </Link>
        </p>
      </div>
      
      {error && (
        <div className="p-4 text-sm text-red-400 bg-red-900/50 rounded-md border border-red-500/50">
          {error}
        </div>
      )}
      
      <form className="space-y-6" onSubmit={handleLogin}>
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#e2b3ff]">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full bg-black/50 border border-[#b4f]/20 text-[#e2b3ff] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#b4f]/50 focus:border-[#b4f]/50 transition-colors placeholder-[#b4f]/50"
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#e2b3ff]">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full bg-black/50 border border-[#b4f]/20 text-[#e2b3ff] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#b4f]/50 focus:border-[#b4f]/50 transition-colors placeholder-[#b4f]/50"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 bg-black border-[#b4f]/20 rounded focus:ring-[#b4f]/50 text-[#b4f]"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-[#e2b3ff]">
              Remember me
            </label>
          </div>

          <div className="text-sm">
            <Link href="/auth/forgot-password" className="font-medium text-[#b4f] hover:text-[#b4f]/80 transition-colors">
              Forgot your password?
            </Link>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-lg text-sm font-medium text-black bg-[#b4f] hover:bg-[#b4f]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#b4f]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#b4f]/20" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 text-[#e2b3ff] bg-black">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-gray-800 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0ff]/50 disabled:opacity-50 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              d="M12.545 10.239v3.821h5.445c-0.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866 0.549 3.921 1.453l2.814-2.814c-1.798-1.677-4.198-2.701-6.735-2.701-5.539 0-10.032 4.493-10.032 10.032s4.493 10.032 10.032 10.032c8.445 0 10.452-7.888 9.698-11.729l-9.698-0.002z"
              fill="currentColor"
            />
          </svg>
          Google
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
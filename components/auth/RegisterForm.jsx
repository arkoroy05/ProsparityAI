import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

const RegisterForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      // Register with Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });
      
      if (authError) throw authError;
      
      // Create profile entry
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email,
            first_name: firstName,
            last_name: lastName,
          });
        
        if (profileError) throw profileError;
      }
      
      setSuccess(true);
      // User will be redirected to company registration
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
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

  if (success) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <svg
            className="w-12 h-12 mx-auto text-[#b4f]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <h2 className="mt-2 text-3xl font-extrabold text-[#b4f]">Registration successful!</h2>
          <p className="mt-2 text-sm text-[#e2b3ff]">
            Please check your email to confirm your account.
          </p>
        </div>
        <div>
          <Link
            href="/auth/login"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-lg text-sm font-medium text-black bg-[#b4f] hover:bg-[#b4f]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#b4f]/50 transition-colors"
          >
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold text-[#b4f]">Create a new account</h2>
        <p className="mt-2 text-sm text-[#e2b3ff]">
          Or{' '}
          <Link href="/auth/login" className="font-medium text-[#b4f] hover:text-[#b4f]/80 transition-colors">
            sign in to your existing account
          </Link>
        </p>
      </div>
      
      {error && (
        <div className="p-4 text-sm text-red-400 bg-red-900/50 rounded-md border border-red-500/50">
          {error}
        </div>
      )}
      
      <form className="space-y-6" onSubmit={handleRegister}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="first-name" className="block text-sm font-medium text-[#e2b3ff]">
                First name
              </label>
              <input
                id="first-name"
                name="first-name"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 block w-full bg-black/50 border border-[#b4f]/20 text-[#e2b3ff] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#b4f]/50 focus:border-[#b4f]/50 transition-colors"
              />
            </div>
            
            <div>
              <label htmlFor="last-name" className="block text-sm font-medium text-[#e2b3ff]">
                Last name
              </label>
              <input
                id="last-name"
                name="last-name"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 block w-full bg-black/50 border border-[#b4f]/20 text-[#e2b3ff] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#b4f]/50 focus:border-[#b4f]/50 transition-colors"
              />
            </div>
          </div>
          
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
              className="mt-1 block w-full bg-black/50 border border-[#b4f]/20 text-[#e2b3ff] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#b4f]/50 focus:border-[#b4f]/50 transition-colors"
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
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full bg-black/50 border border-[#b4f]/20 text-[#e2b3ff] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#b4f]/50 focus:border-[#b4f]/50 transition-colors"
            />
            <p className="mt-1 text-xs text-[#e2b3ff]/70">
              Password must be at least 8 characters long
            </p>
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
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#b4f]/20" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 text-[#e2b3ff] bg-black">Or continue with</span>
          </div>
        </div>

        <div>
          <button
            onClick={handleGoogleRegister}
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-[#b4f]/20 rounded-md shadow-sm text-sm font-medium text-[#e2b3ff] bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#b4f]/50 disabled:opacity-50 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                d="M12.545 10.239v3.821h5.445c-0.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866 0.549 3.921 1.453l2.814-2.814c-1.798-1.677-4.198-2.701-6.735-2.701-5.539 0-10.032 4.493-10.032 10.032s4.493 10.032 10.032 10.032c8.445 0 10.452-7.888 9.698-11.729l-9.698-0.002z"
                fill="currentColor"
              />
            </svg>
            Google
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegisterForm;
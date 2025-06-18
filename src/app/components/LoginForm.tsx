// components/LoginForm.tsx (or app/components/LoginForm.tsx)
'use client'; // This is crucial

import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react'; // All client hooks are here

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const initialErrorFromQuery = searchParams.get('error');
  const [error, setError] = useState<string | null>(
    typeof initialErrorFromQuery === 'string' ? initialErrorFromQuery : null
  );
  
  const [isLoading, setIsLoading] = useState(false);

  // Client-side effect to potentially clear the error from the URL,
  // though this is more complex in App Router without full page reloads.
  // For now, it just sets the initial error state.
  useEffect(() => {
    if (initialErrorFromQuery && typeof initialErrorFromQuery === 'string') {
        // If the error exists and it's different from the current error state, update it.
        // This is mainly to set it initially from the URL.
        // To remove from URL without reload: window.history.replaceState(null, '', window.location.pathname);
        // But this should be used carefully.
    }
  }, [initialErrorFromQuery]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const callbackUrl = searchParams.get('callbackUrl') || '/admin-dashboard';

    const result = await signIn('credentials', {
      redirect: false,
      username,
      password,
    });

    setIsLoading(false);

    if (result?.error) {
      if (result.error === "CredentialsSignin") {
        setError("Invalid username or password. Please try again.");
      } else {
        setError(result.error);
      }
    } else if (result?.ok) {
      router.push(callbackUrl);
    } else {
      setError("An unexpected error occurred. Please try again.");
    }
  };

  return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        background: '#f0f2f5',
        padding: '20px'
      }}>
        <div style={{
          padding: '40px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <h1 style={{ marginBottom: '24px', color: '#333', fontSize: '24px' }}>
            Pass Management System Login
          </h1>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <p style={{ 
                color: 'white', 
                background: '#ff4d4f',
                padding: '10px',
                borderRadius: '4px',
                textAlign: 'center',
                fontSize: '14px'
              }}>
                {error}
              </p>
            )}
            <div>
              <label 
                htmlFor="username" 
                style={{ display: 'block', marginBottom: '5px', textAlign: 'left', color: '#555', fontWeight: '500' }}
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  boxSizing: 'border-box', 
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
              />
            </div>
            <div>
              <label 
                htmlFor="password" 
                style={{ display: 'block', marginBottom: '5px', textAlign: 'left', color: '#555', fontWeight: '500' }}
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  boxSizing: 'border-box', 
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoading} 
              style={{ 
                padding: '12px', 
                cursor: isLoading ? 'not-allowed' : 'pointer',
                backgroundColor: isLoading ? '#b0bec5' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'background-color 0.3s ease'
              }}
              onMouseOver={(e) => { if (!isLoading) (e.currentTarget.style.backgroundColor = '#0056b3'); }}
              onMouseOut={(e) => { if (!isLoading) (e.currentTarget.style.backgroundColor = '#007bff'); }}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
        <p style={{marginTop: '30px', color: '#777', fontSize: '12px'}}>
            © {new Date().getFullYear()} Pass Management System. All rights reserved.
        </p>
      </div>
  );
}
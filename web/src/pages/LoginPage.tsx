import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../api/client';
import '../styles/LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if OAuth callback
    const code = searchParams.get('code');
    if (code) {
      exchangeCode(code);
    }
  }, [searchParams]);

  async function exchangeCode(code: string) {
    try {
      setLoading(true);
      const response = await apiClient.post('/auth/oauth/callback', { code });

      const { token, user } = response.data;

      // Store token and user info
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));

      // Redirect to dashboard
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  function handleLogin() {
    const clientId = 'YOUR_CLIENT_ID'; // Will be set via environment
    const redirectUri = `${window.location.origin}/login`;
    const oauthUrl = `https://login.live.com/oauth20_authorize.srf?client_id=${clientId}&response_type=code&scope=XboxLive.signin%20offline_access&redirect_uri=${encodeURIComponent(redirectUri)}`;

    window.location.href = oauthUrl;
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>🎮 Minecraft Save Tracker</h1>
          <p>Track and manage your Minecraft saves</p>
        </div>

        {loading && <div className="loading-message">Authenticating...</div>}

        {error && <div className="error-message">{error}</div>}

        {!loading && (
          <>
            <button className="login-button" onClick={handleLogin}>
              Sign in with Microsoft
            </button>

            <div className="login-info">
              <p>
                This web dashboard syncs with your desktop application to show all your
                Minecraft saves in one place.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

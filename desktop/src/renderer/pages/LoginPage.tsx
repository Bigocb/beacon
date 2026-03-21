import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { storeToken } from '../auth/tokenStorage';
import '../styles/LoginPage.css';

declare global {
  interface Window {
    api: any;
  }
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { setCurrentUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingCallback, setAwaitingCallback] = useState(false);
  const [showLocalSetup, setShowLocalSetup] = useState(false);
  const [localUsername, setLocalUsername] = useState('');

  useEffect(() => {
    // Listen for OAuth callback from main process
    window.api.auth.onOAuthCallback(async (data: any) => {
      if (data.code) {
        await handleAuthCallback(data.code);
      }
    });
  }, []);

  async function handleMinecraftLogin() {
    try {
      setLoading(true);
      setError(null);
      setAwaitingCallback(true);

      console.log('🎮 [LoginPage] Initiating Minecraft login');

      // Initiate Minecraft OAuth login
      const result = await window.api.auth.initiateLogin();

      if (!result.success) {
        setError(result.error || 'Failed to initiate Minecraft login');
        setAwaitingCallback(false);
      }
      // Browser window will open, user logs in, and we'll get the callback code
    } catch (err: any) {
      setError(err.message || 'Error initiating Minecraft login');
      setAwaitingCallback(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleAuthCallback(code: string) {
    try {
      setLoading(true);
      setError(null);

      console.log('🎮 [LoginPage] Processing Minecraft auth callback');
      const result = await window.api.auth.handleCallback(code);

      if (result.success) {
        console.log('✅ [LoginPage] Minecraft auth successful, user:', result.user.username);
        // Store user in context
        setCurrentUser({
          minecraft_uuid: result.user.uuid,
          username: result.user.username,
          email: result.user.email,
        });
        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        setError(result.error || 'Failed to authenticate with Minecraft');
        setAwaitingCallback(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error handling Minecraft authentication');
      setAwaitingCallback(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateLocalUser() {
    try {
      if (!localUsername.trim()) {
        setError('Please enter a username');
        return;
      }

      setLoading(true);
      setError(null);

      console.log('👤 [LoginPage] Creating local user:', localUsername);
      const result = await window.api.auth.createLocalUser(localUsername.trim());

      if (result.success) {
        console.log('✅ [LoginPage] Local user created:', result.user.username);
        // Store JWT token
        storeToken(result.token);
        // Store user in context
        setCurrentUser({
          minecraft_uuid: result.user.uuid,
          username: result.user.username,
        });
        // Navigate to dashboard
        navigate('/dashboard');
      } else {
        setError(result.error || 'Failed to create local user');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating local user');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>⛏️ Beacon</h1>
          <p>Track and manage your Minecraft saves</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {!showLocalSetup ? (
          <>
            <div className="login-options">
              <div className="option-group">
                <h3>Sign In with Minecraft (Recommended)</h3>
                <button
                  className="login-button minecraft-button"
                  onClick={handleMinecraftLogin}
                  disabled={loading || awaitingCallback}
                >
                  {loading ? 'Opening login...' : awaitingCallback ? 'Waiting for login...' : '🎮 Sign in with Minecraft'}
                </button>
                <p className="option-description">
                  Use your Microsoft/Minecraft account to sign in securely.
                </p>
              </div>

              <div className="divider">
                <span>or</span>
              </div>

              <div className="option-group">
                <h3>Quick Start (Optional)</h3>
                <button
                  className="login-button local-button"
                  onClick={() => setShowLocalSetup(true)}
                  disabled={loading}
                >
                  🏠 Single-User Mode
                </button>
                <p className="option-description">
                  Create a local account. All saves stay on your computer.
                </p>
              </div>
            </div>

            <div className="login-info">
              <p>
                ✓ All Minecraft save data stays on your computer<br />
                ✓ Fast local scanning<br />
                ✓ Secure authentication with Minecraft account
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="local-setup">
              <h2>Create Local Account</h2>
              <p>Choose a username for your save tracker:</p>
              <input
                type="text"
                value={localUsername}
                onChange={(e) => setLocalUsername(e.target.value)}
                placeholder="Your username (e.g., 'MinecraftPlayer')"
                disabled={loading}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateLocalUser()}
                autoFocus
                className="username-input"
              />
              <div className="local-setup-buttons">
                <button
                  className="login-button local-button"
                  onClick={handleCreateLocalUser}
                  disabled={loading || !localUsername.trim()}
                >
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
                <button
                  className="login-button secondary"
                  onClick={() => {
                    setShowLocalSetup(false);
                    setLocalUsername('');
                    setError(null);
                  }}
                  disabled={loading}
                >
                  Back
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

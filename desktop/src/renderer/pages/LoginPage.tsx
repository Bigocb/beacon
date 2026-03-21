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
  const { setCurrentUser, currentUser } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingCallback, setAwaitingCallback] = useState(false);
  const [showLocalSetup, setShowLocalSetup] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [localUsername, setLocalUsername] = useState('');
  const [lastLocalUsername, setLastLocalUsername] = useState<string | null>(null);
  const [existingAccounts, setExistingAccounts] = useState<string[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  useEffect(() => {
    // Load last used local account username from localStorage
    const saved = localStorage.getItem('beacon_last_local_username');
    if (saved) {
      setLastLocalUsername(saved);
    }

    // Load existing local accounts
    loadExistingAccounts();

    // Listen for OAuth callback from main process
    window.api.auth.onOAuthCallback(async (data: any) => {
      if (data.code) {
        await handleAuthCallback(data.code);
      }
    });
  }, []);

  // Navigate to dashboard when user is set in context
  useEffect(() => {
    if (currentUser?.minecraft_uuid) {
      console.log('✅ [LoginPage] User set in context, navigating to dashboard');
      console.log('  User UUID:', currentUser.minecraft_uuid);
      console.log('  Username:', currentUser.username);
      navigate('/dashboard');
    }
  }, [currentUser?.minecraft_uuid, navigate]);

  async function loadExistingAccounts() {
    try {
      const result = await window.api.auth.getLocalAccounts();
      if (result.success) {
        setExistingAccounts(result.accounts || []);
        console.log('📋 [LoginPage] Loaded', result.accounts?.length || 0, 'existing accounts');
      }
    } catch (err) {
      console.error('❌ [LoginPage] Error loading accounts:', err);
    }
  }

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
        console.log('  UUID:', result.user.uuid);
        console.log('  Email:', result.user.email);
        // Store JWT token ✅ FIX: This was missing!
        storeToken(result.token);
        // Store user in context
        const userData = {
          minecraft_uuid: result.user.uuid,
          username: result.user.username,
          email: result.user.email,
        };
        console.log('📝 [LoginPage] Setting currentUser:', userData);
        setCurrentUser(userData);
        // Navigation will happen in useEffect when currentUser is set
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

  async function handleCreateLocalUser(username?: string) {
    try {
      const usernameToUse = username || localUsername.trim();

      if (!usernameToUse) {
        setError('Please enter a username');
        return;
      }

      setLoading(true);
      setError(null);

      console.log('👤 [LoginPage] Logging in with local user:', usernameToUse);
      const result = await window.api.auth.createLocalUser(usernameToUse);

      if (result.success) {
        console.log('✅ [LoginPage] Local user authenticated:', result.user.username);
        console.log('  UUID:', result.user.uuid);
        // Store JWT token
        storeToken(result.token);
        // ✅ Save username for quick re-login after logout
        localStorage.setItem('beacon_last_local_username', result.user.username);
        // Store user in context
        const userData = {
          minecraft_uuid: result.user.uuid,
          username: result.user.username,
        };
        console.log('📝 [LoginPage] Setting currentUser:', userData);
        setCurrentUser(userData);
        // Navigation will happen in useEffect when currentUser is set
      } else {
        setError(result.error || 'Failed to authenticate');
      }
    } catch (err: any) {
      setError(err.message || 'Error authenticating user');
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

              {/* Show Welcome Back card if recent account, otherwise show Local Mode */}
              {lastLocalUsername ? (
                <div className="welcome-back-card-inline">
                  <h3>👋 Welcome back, {lastLocalUsername}!</h3>
                  <button
                    className="login-button local-button welcome-button"
                    onClick={() => {
                      handleCreateLocalUser(lastLocalUsername);
                    }}
                    disabled={loading || awaitingCallback}
                  >
                    {loading ? 'Logging in...' : '🔐 Log Back In'}
                  </button>
                  <button
                    className="login-button secondary"
                    onClick={() => {
                      setLastLocalUsername(null);
                      localStorage.removeItem('beacon_last_local_username');
                    }}
                    disabled={loading}
                  >
                    Use a different account
                  </button>
                </div>
              ) : (
                <>
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
                      🏠 Local Mode
                    </button>
                    <p className="option-description">
                      Create and manage local accounts. All saves stay on your computer.
                    </p>
                  </div>
                </>
              )}
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
            {!showCreateNew ? (
              // Dropdown to select existing account or create new
              <div className="local-setup">
                <h2>Select Account</h2>
                {existingAccounts.length > 0 ? (
                  <>
                    <p>Choose an account to continue:</p>
                    <select
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      disabled={loading}
                      className="account-select"
                      autoFocus
                    >
                      <option value="">-- Select account --</option>
                      {existingAccounts.map((account) => (
                        <option key={account} value={account}>
                          {account}
                        </option>
                      ))}
                    </select>
                    <div className="local-setup-buttons">
                      <button
                        className="login-button local-button"
                        onClick={() => {
                          if (selectedAccount) {
                            handleCreateLocalUser(selectedAccount);
                          }
                        }}
                        disabled={loading || !selectedAccount}
                      >
                        {loading ? 'Logging in...' : '🔓 Log In'}
                      </button>
                      <button
                        className="login-button secondary"
                        onClick={() => setShowCreateNew(true)}
                        disabled={loading}
                      >
                        ➕ Create New Account
                      </button>
                      <button
                        className="login-button secondary"
                        onClick={() => {
                          setShowLocalSetup(false);
                          setSelectedAccount('');
                          setError(null);
                        }}
                        disabled={loading}
                      >
                        Back
                      </button>
                    </div>
                  </>
                ) : (
                  // No existing accounts, go straight to create
                  <>
                    <p>Create your first local account:</p>
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
                        onClick={() => handleCreateLocalUser()}
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
                  </>
                )}
              </div>
            ) : (
              // Create new account form
              <div className="local-setup">
                <h2>Create New Account</h2>
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
                    onClick={() => handleCreateLocalUser()}
                    disabled={loading || !localUsername.trim()}
                  >
                    {loading ? 'Creating...' : 'Create Account'}
                  </button>
                  <button
                    className="login-button secondary"
                    onClick={() => {
                      setShowCreateNew(false);
                      setLocalUsername('');
                      setError(null);
                    }}
                    disabled={loading}
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

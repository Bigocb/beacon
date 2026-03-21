import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import * as userService from '../services/userService';
import '../styles/ProfilePage.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { currentUser, logout, updateUserProfile } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [profileName, setProfileName] = useState(currentUser?.profile_name || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || '');
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatar_url || '');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    // Reset form when user changes
    if (currentUser) {
      setProfileName(currentUser.profile_name || '');
      setAvatarUrl(currentUser.avatar_url || '');
      setAvatarPreview(currentUser.avatar_url || '');
    }
  }, [currentUser]);

  const handleProfileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileName(e.target.value);
    setIsDirty(true);
  };

  const handleAvatarUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setAvatarUrl(url);
    setAvatarPreview(url); // Try to preview immediately
    setIsDirty(true);
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      console.log('👤 [ProfilePage] Saving profile changes');

      const updated = await userService.updateProfile({
        profile_name: profileName || undefined,
        avatar_url: avatarUrl || undefined,
      });

      console.log('✅ [ProfilePage] Profile saved successfully');
      updateUserProfile(updated);
      setSuccess('Profile updated successfully!');
      setIsDirty(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('❌ [ProfilePage] Error saving profile:', err);
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setProfileName(currentUser?.profile_name || '');
    setAvatarUrl(currentUser?.avatar_url || '');
    setAvatarPreview(currentUser?.avatar_url || '');
    setIsDirty(false);
    setError(null);
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      navigate('/login');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    const doubleConfirmed = window.confirm(
      'This will permanently delete all your data. Type your username to confirm: ' + currentUser?.username
    );

    if (!doubleConfirmed) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🗑️ [ProfilePage] Deleting user account');
      await userService.deleteAccount();

      console.log('✅ [ProfilePage] Account deleted successfully');
      logout();
      navigate('/login');
    } catch (err: any) {
      console.error('❌ [ProfilePage] Error deleting account:', err);
      setError(err.message || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  const getAvatarInitials = () => {
    const name = currentUser.username || 'U';
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <div className="header-top">
            <button
              className="btn btn-secondary"
              onClick={handleBackToDashboard}
              title="Back to Dashboard"
            >
              ← Back
            </button>
          </div>
          <h1>👤 User Profile</h1>
          <p>Manage your account information</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Profile Information Section */}
        <div className="profile-card">
          <div className="card-header">
            <h2>Profile Information</h2>
          </div>

          <div className="card-content">
            {/* Avatar Section */}
            <div className="avatar-section">
              <div className="avatar-preview">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" onError={() => setAvatarPreview('')} />
                ) : (
                  <div className="avatar-initials">{getAvatarInitials()}</div>
                )}
              </div>
              <div className="avatar-info">
                <p className="label">Avatar URL (optional)</p>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={handleAvatarUrlChange}
                  placeholder="https://example.com/avatar.png"
                  className="form-input"
                  disabled={loading}
                />
                <p className="hint">Enter a direct image URL for your avatar</p>
              </div>
            </div>

            {/* User Info Display */}
            <div className="info-row">
              <label>Username</label>
              <p className="info-value">{currentUser.username}</p>
            </div>

            <div className="info-row">
              <label>Minecraft UUID</label>
              <p className="info-value">{currentUser.minecraft_uuid}</p>
            </div>

            {currentUser.email && (
              <div className="info-row">
                <label>Email</label>
                <p className="info-value">{currentUser.email}</p>
              </div>
            )}

            {currentUser.created_at && (
              <div className="info-row">
                <label>Member Since</label>
                <p className="info-value">
                  {new Date(currentUser.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}

            {currentUser.last_login && (
              <div className="info-row">
                <label>Last Login</label>
                <p className="info-value">
                  {new Date(currentUser.last_login).toLocaleString()}
                </p>
              </div>
            )}

            {/* Profile Name Edit */}
            <div className="form-group">
              <label htmlFor="profileName">Custom Display Name (optional)</label>
              <input
                id="profileName"
                type="text"
                value={profileName}
                onChange={handleProfileNameChange}
                placeholder="Your display name"
                className="form-input"
                disabled={loading}
              />
            </div>

            {/* Save/Cancel Buttons */}
            <div className="button-group">
              <button
                className="btn btn-primary"
                onClick={handleSaveProfile}
                disabled={loading || !isDirty}
              >
                {loading ? 'Saving...' : '💾 Save Changes'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={loading || !isDirty}
              >
                ↩️ Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Account Actions Section */}
        <div className="profile-card account-actions">
          <div className="card-header">
            <h2>Account Actions</h2>
          </div>

          <div className="card-content">
            <button
              className="btn btn-logout"
              onClick={handleLogout}
              disabled={loading}
            >
              🚪 Logout
            </button>

            <button
              className="btn btn-danger"
              onClick={handleDeleteAccount}
              disabled={loading}
            >
              🗑️ Delete Account
            </button>

            <p className="hint danger">
              ⚠️ Deleting your account will permanently remove all your data. This action cannot be undone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

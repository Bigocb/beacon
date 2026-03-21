import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import '../styles/UserMenu.css';

export default function UserMenu() {
  const navigate = useNavigate();
  const { currentUser, logout } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  if (!currentUser) {
    return null;
  }

  const getAvatarInitials = () => {
    const name = currentUser.username || 'U';
    return name.substring(0, 2).toUpperCase();
  };

  const handleProfileClick = () => {
    navigate('/profile');
    setIsOpen(false);
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      navigate('/login');
    }
    setIsOpen(false);
  };

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="user-menu-button"
        onClick={() => setIsOpen(!isOpen)}
        title={`Logged in as ${currentUser.username}`}
      >
        <div className="user-avatar">
          {currentUser.avatar_url ? (
            <img src={currentUser.avatar_url} alt={currentUser.username} onError={() => {}} />
          ) : (
            <span className="avatar-initials">{getAvatarInitials()}</span>
          )}
        </div>
        <span className="user-name">{currentUser.username}</span>
        <span className={`menu-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="menu-user-info">
            <div className="menu-avatar">
              {currentUser.avatar_url ? (
                <img src={currentUser.avatar_url} alt={currentUser.username} onError={() => {}} />
              ) : (
                <span className="avatar-initials">{getAvatarInitials()}</span>
              )}
            </div>
            <div className="menu-user-details">
              <div className="menu-username">{currentUser.username}</div>
              {currentUser.email && <div className="menu-email">{currentUser.email}</div>}
            </div>
          </div>

          <div className="menu-divider"></div>

          <button className="menu-item" onClick={handleProfileClick}>
            👤 Profile
          </button>

          <div className="menu-divider"></div>

          <button className="menu-item menu-logout" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      )}
    </div>
  );
}

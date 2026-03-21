import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  minecraft_uuid: string;
  username: string;
  email?: string;
  profile_name?: string;
  avatar_url?: string;
  theme_preference?: string;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
}

interface UserContextType {
  currentUser: User | null;
  loading: boolean;
  error: string | null;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;
  updateUserProfile: (user: User) => void;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize from localStorage
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const token = localStorage.getItem('minecraft_tracker_auth_token');
        console.log('👤 [UserContext] Initializing - Token found:', !!token);
        if (!token) {
          console.log('⚠️ [UserContext] No token found, skipping backend fetch');
          setLoading(false);
          return;
        }

        // Try to fetch current user from backend
        console.log('📤 [UserContext] Fetching user from backend...');
        const response = await fetch('http://localhost:3000/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        console.log('📥 [UserContext] Backend response status:', response.status);
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
          console.log('✅ [UserContext] User initialized from backend:', { uuid: userData.minecraft_uuid, username: userData.username });
        } else if (response.status === 401) {
          // Token invalid, clear it
          localStorage.removeItem('minecraft_tracker_auth_token');
          setCurrentUser(null);
          console.log('⚠️ [UserContext] Auth token invalid (401), cleared');
        } else {
          console.warn('⚠️ [UserContext] Backend fetch failed with status:', response.status);
          // For local accounts, the backend might not have the user
          // The user should have been set directly by LoginPage via setCurrentUser()
          console.log('ℹ️ [UserContext] Keeping currentUser as-is (may have been set by LoginPage)');
        }
      } catch (err) {
        console.error('❌ [UserContext] Error initializing user:', err);
        setError('Failed to load user');
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, []);

  const logout = () => {
    console.log('👤 [UserContext] Logging out user');
    setCurrentUser(null);
    localStorage.removeItem('minecraft_tracker_auth_token');
    setError(null);
  };

  const updateUserProfile = (user: User) => {
    console.log('👤 [UserContext] Updating user profile:', user.username);
    setCurrentUser(user);
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('minecraft_tracker_auth_token');
      if (!token) {
        setCurrentUser(null);
        return;
      }

      const response = await fetch('http://localhost:3000/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setCurrentUser(userData);
        console.log('✅ [UserContext] User refreshed:', userData.username);
      } else {
        logout();
      }
    } catch (err) {
      console.error('❌ [UserContext] Error refreshing user:', err);
    }
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        loading,
        error,
        setCurrentUser,
        logout,
        updateUserProfile,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

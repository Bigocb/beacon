import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

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

        // Try to fetch current user from backend via GraphQL
        console.log('📤 [UserContext] Fetching user from backend...');
        const query = `
          query {
            currentUser {
              minecraft_uuid
              username
              email
              profile_name
              avatar_url
              theme_preference
              created_at
            }
          }
        `;

        const response = await axios.post(`http://localhost:3000/graphql`, { query }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('📥 [UserContext] Backend response received');
        if (response.data.errors) {
          if (response.data.errors[0]?.message?.includes('401') || response.data.errors[0]?.message?.includes('Unauthorized')) {
            // Token invalid, clear it
            localStorage.removeItem('minecraft_tracker_auth_token');
            setCurrentUser(null);
            console.log('⚠️ [UserContext] Auth token invalid, cleared');
          } else {
            console.warn('⚠️ [UserContext] GraphQL error:', response.data.errors[0]?.message);
          }
        } else if (response.data.data?.currentUser) {
          const userData = response.data.data.currentUser;
          setCurrentUser(userData);
          console.log('✅ [UserContext] User initialized from backend:', { uuid: userData.minecraft_uuid, username: userData.username });
        } else {
          console.log('ℹ️ [UserContext] No user data returned (may have been set by LoginPage)');
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

      const query = `
        query {
          currentUser {
            minecraft_uuid
            username
            email
            profile_name
            avatar_url
            theme_preference
            created_at
          }
        }
      `;

      const response = await axios.post(`http://localhost:3000/graphql`, { query }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.errors) {
        logout();
      } else if (response.data.data?.currentUser) {
        const userData = response.data.data.currentUser;
        setCurrentUser(userData);
        console.log('✅ [UserContext] User refreshed:', userData.username);
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

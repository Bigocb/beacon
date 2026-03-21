import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useSaves, useUser } from '../hooks/useQuery';
import SavesList from '../components/SavesList';
import SaveDetailsModal from '../components/SaveDetailsModal';
import '../styles/DashboardPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: savesData, isLoading: savesLoading } = useSaves();
  const { data: userData } = useUser();
  const [selectedSave, setSelectedSave] = useState<any>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    const socket = io(API_URL, {
      auth: {
        token: localStorage.getItem('authToken'),
      },
    });

    socket.on('save_updated', () => {
      // Invalidate and refetch saves
      queryClient.invalidateQueries({ queryKey: ['saves'] });
      setLastSyncTime(new Date());
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    navigate('/login');
  }

  const saves = savesData?.saves || [];

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>My Minecraft Saves</h1>
          <p>Logged in as: {userData?.username}</p>
        </div>

        <div className="header-right">
          {lastSyncTime && (
            <div className="last-sync">
              Last sync: {lastSyncTime.toLocaleTimeString()}
            </div>
          )}

          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <SavesList
          saves={saves}
          onSelectSave={setSelectedSave}
          loading={savesLoading}
        />
      </div>

      {selectedSave && (
        <SaveDetailsModal
          save={selectedSave}
          onClose={() => setSelectedSave(null)}
        />
      )}
    </div>
  );
}

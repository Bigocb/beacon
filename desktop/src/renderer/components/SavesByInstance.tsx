import React, { useState } from 'react';
import '../styles/SavesByInstance.css';
import { SavePassportCard } from './SavePassportCard';
import { ConfirmDialog } from './ConfirmDialog';

interface Save {
  id: string;
  world_name: string;
  version: string;
  game_mode: string;
  difficulty?: number;
  seed?: number;
  last_played?: string;
  status: string;
  folder_name?: string;
  folder_path?: string;
  playtime?: number;
  explored?: number;
  advancements_completed?: number;
  advancements_total?: number;
  mobs_killed?: number;
  deaths?: number;
  blocks_mined?: number;
  spawn_x?: number;
  spawn_y?: number;
  spawn_z?: number;
  created_at?: string;
}

interface InstanceMetadata {
  folder_id: string;
  instance_name?: string;
  display_name?: string;
  mod_loader?: string;
  loader_version?: string;
  instance_type?: string;
  launcher?: string;
  folder_path?: string;
  mod_count?: number;
}

interface SavesByInstanceProps {
  saves: Save[];
  onSelectSave?: (save: Save) => void;
  onNavigateToAnalytics?: (save: Save) => void;
  instance?: InstanceMetadata;
  loading: boolean;
}

export default function SavesByInstance({ saves, onSelectSave, onNavigateToAnalytics, instance, loading }: SavesByInstanceProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    saveId: string;
    saveName: string;
  }>({ isOpen: false, saveId: '', saveName: '' });

  if (loading) {
    return <div className="saves-loading">Loading saves...</div>;
  }

  if (saves.length === 0) {
    return (
      <div className="saves-empty">
        <p>No saves found. Click "Scan Saves" to find your Minecraft worlds.</p>
      </div>
    );
  }

  const handleConfirmDelete = async () => {
    try {
      const result = await window.electron.ipc.invoke('save:bulkDelete', {
        saveIds: [confirmDialog.saveId],
        instanceId: 'current', // Will be updated based on context
      });

      if (result.success) {
        // Trigger a refresh or remove from UI
        console.log(`Successfully deleted save: ${confirmDialog.saveId}`);
      } else {
        console.error('Failed to delete save:', result.error);
      }
    } catch (error) {
      console.error('Error deleting save:', error);
    }

    setConfirmDialog({ isOpen: false, saveId: '', saveName: '' });
  };

  const handleCancelDelete = () => {
    setConfirmDialog({ isOpen: false, saveId: '', saveName: '' });
  };

  return (
    <>
      <div className="saves-grid">
        {saves.map((save) => (
          <SavePassportCard
            key={save.id}
            save={save}
            instance={instance}
            onClick={() => {
              console.log('💾 SavesByInstance: Save card clicked:', save.world_name, 'hasOnNavigateToAnalytics:', !!onNavigateToAnalytics);
              onNavigateToAnalytics?.(save) || onSelectSave?.(save);
            }}
            onDelete={() =>
              setConfirmDialog({
                isOpen: true,
                saveId: save.id,
                saveName: save.world_name,
              })
            }
          />
        ))}
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Delete Save?"
        message={`Are you sure you want to delete "${confirmDialog.saveName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        dangerous={true}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </>
  );
}

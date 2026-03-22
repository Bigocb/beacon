import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './FolderManager.module.css';

interface SaveFolder {
  id: string;
  user_uuid: string;
  folder_path: string;
  display_name: string;
  created_at: string;
}

interface FolderManagerProps {
  userUuid: string;
  onClose: () => void;
  onFoldersChanged?: () => void;
}

export const FolderManager: React.FC<FolderManagerProps> = ({
  userUuid,
  onClose,
  onFoldersChanged,
}) => {
  const [folders, setFolders] = useState<SaveFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [discoveredInstances, setDiscoveredInstances] = useState<any[]>([]);
  const [selectedParentFolder, setSelectedParentFolder] = useState<string | null>(null);

  useEffect(() => {
    loadFolders();
  }, [userUuid]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const loadFolders = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('minecraft_tracker_auth_token');

      const query = `
        query {
          folders {
            id
            user_uuid
            folder_path
            display_name
            created_at
          }
        }
      `;

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(`http://localhost:3000/graphql`, { query }, { headers });

      if (response.data.errors) {
        setError(response.data.errors[0]?.message || 'Failed to load folders');
      } else {
        setFolders(response.data.data?.folders || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFolder = async () => {
    try {
      const folderPath = await window.api.fs?.selectFolder?.();
      if (!folderPath) return;

      setLoading(true);
      setError(null);

      const token = localStorage.getItem('minecraft_tracker_auth_token');
      const displayName = folderPath.split('\\').pop() || folderPath;

      const mutation = `
        mutation createNewFolder($path: String!, $name: String!) {
          createFolder(folder_path: $path, display_name: $name) {
            id
            user_uuid
            folder_path
            display_name
            created_at
          }
        }
      `;

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(`http://localhost:3000/graphql`, {
        query: mutation,
        variables: { path: folderPath, name: displayName }
      }, { headers });

      if (response.data.errors) {
        setError(response.data.errors[0]?.message || 'Failed to add folder');
      } else {
        const newFolder = response.data.data?.createFolder;
        setFolders([...folders, newFolder]);
        onFoldersChanged?.();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to remove this folder?')) return;

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('minecraft_tracker_auth_token');

      const mutation = `
        mutation deleteFolder($id: String!) {
          deleteFolder(id: $id)
        }
      `;

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post(`http://localhost:3000/graphql`, {
        query: mutation,
        variables: { id: folderId }
      }, { headers });

      if (response.data.errors) {
        setError(response.data.errors[0]?.message || 'Failed to remove folder');
      } else {
        setFolders(folders.filter((f) => f.id !== folderId));
        onFoldersChanged?.();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScanAll = async () => {
    setIsScanning(true);
    setError(null);
    try {
      const token = localStorage.getItem('minecraft_tracker_auth_token');
      const result = await window.api.scanner.scanAllFolders(userUuid, token);
      if (result.success) {
        alert(`Found ${result.saves.length} save(s)`);
        onFoldersChanged?.();
      } else {
        setError(result.error || 'Failed to scan folders');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleBatchScan = async () => {
    try {
      const folderPath = await window.api.fs?.selectFolder?.();
      if (!folderPath) return;

      setLoading(true);
      setError(null);
      setSelectedParentFolder(folderPath);

      // Discover instances in the parent folder
      const result = await window.api.scanner.discoverInstances(folderPath);
      if (result.success) {
        setDiscoveredInstances(result.instances);
        if (result.instances.length === 0) {
          setError('No Minecraft instances found in this folder');
        }
      } else {
        setError(result.error || 'Failed to discover instances');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchAddAndScan = async () => {
    if (!selectedParentFolder) return;

    setIsScanning(true);
    setError(null);
    try {
      const token = localStorage.getItem('minecraft_tracker_auth_token');
      const result = await window.api.scanner.batchAddAndScan(userUuid, selectedParentFolder, token);
      if (result.success) {
        alert(
          `✅ Batch scan complete!\n\nAdded: ${result.instancesAdded} instance(s)\nFound: ${result.savesFound} save(s)`
        );
        setBatchMode(false);
        setDiscoveredInstances([]);
        setSelectedParentFolder(null);
        onFoldersChanged?.();
      } else {
        setError(result.error || 'Failed to batch scan');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.container} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
        <h2>Manage Save Folders</h2>
        <button onClick={onClose} className={styles.closeBtn}>
          ✕
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.content}>
        {!batchMode ? (
          <>
            <div className={styles.section}>
              <h3>Configured Folders</h3>
          {loading ? (
            <p>Loading...</p>
          ) : folders.length === 0 ? (
            <p className={styles.emptyState}>
              No custom folders configured. Click "Add Folder" to add one.
            </p>
          ) : (
            <ul className={styles.folderList}>
              {folders.map((folder) => (
                <li key={folder.id} className={styles.folderItem}>
                  <div className={styles.folderInfo}>
                    <div className={styles.folderName}>{folder.display_name}</div>
                    <div className={styles.folderPath}>{folder.folder_path}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveFolder(folder.id)}
                    className={styles.removeBtn}
                    disabled={loading}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
            </div>

            <div className={styles.actions}>
              <button
                onClick={handleAddFolder}
                className={styles.addBtn}
                disabled={loading}
              >
                + Add Folder
              </button>
              <button
                onClick={handleScanAll}
                className={styles.scanBtn}
                disabled={loading || isScanning}
              >
                {isScanning ? 'Scanning...' : 'Scan All Folders'}
              </button>
              <button
                onClick={() => setBatchMode(true)}
                className={styles.batchBtn}
                disabled={loading}
              >
                📦 Batch Scan Parent
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.section}>
              <h3>🔍 Batch Scan Mode</h3>
              <p className={styles.batchInfo}>
                Select a parent folder (like "Instances") to automatically discover and scan all Minecraft instances.
              </p>

              {selectedParentFolder && (
                <>
                  <div className={styles.selectedPath}>
                    <strong>Selected:</strong> {selectedParentFolder}
                  </div>

                  {discoveredInstances.length > 0 && (
                    <div className={styles.discoveredSection}>
                      <h4>Discovered Instances ({discoveredInstances.length})</h4>
                      <ul className={styles.instanceList}>
                        {discoveredInstances.map((instance, idx) => (
                          <li key={idx} className={styles.instanceItem}>
                            <span className={styles.instanceName}>{instance.name}</span>
                            <span className={styles.instancePath}>{instance.path}</span>
                          </li>
                        ))}
                      </ul>

                      <div className={styles.batchActions}>
                        <button
                          onClick={handleBatchAddAndScan}
                          className={styles.confirmBtn}
                          disabled={isScanning}
                        >
                          {isScanning ? 'Processing...' : '✅ Add All & Scan'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!selectedParentFolder && (
                <div className={styles.selectPrompt}>
                  <p>Click "Browse Parent Folder" to get started</p>
                </div>
              )}
            </div>

            <div className={styles.actions}>
              <button
                onClick={handleBatchScan}
                className={styles.addBtn}
                disabled={loading || isScanning}
              >
                📂 Browse Parent Folder
              </button>
              <button
                onClick={() => {
                  setBatchMode(false);
                  setDiscoveredInstances([]);
                  setSelectedParentFolder(null);
                }}
                className={styles.cancelBtn}
                disabled={isScanning}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
};

import { useQuery as useTanstackQuery } from '@tanstack/react-query';
import apiClient from '../api/client';

export function useSaves(enabled = true) {
  return useTanstackQuery({
    queryKey: ['saves'],
    queryFn: async () => {
      const response = await apiClient.get('/saves');
      return response.data;
    },
    enabled,
    refetchInterval: 60000,
  });
}

export function useUser() {
  return useTanstackQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await apiClient.get('/users/me');
      return response.data;
    },
    retry: 1,
  });
}

export function useBackups(saveId: string, enabled = true) {
  return useTanstackQuery({
    queryKey: ['backups', saveId],
    queryFn: async () => {
      const response = await apiClient.get(`/saves/${saveId}/backups`);
      return response.data;
    },
    enabled: enabled && !!saveId,
  });
}

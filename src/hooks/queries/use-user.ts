/**
 * User Query Hooks
 * 
 * TanStack Query hooks for user profiles.
 */

import {
    getUserById,
    getUserByUsername,
    searchUsers,
    updateUser,
    UpdateUserInput,
} from '@/services/users';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-client';

// ============================================================================
// USER QUERIES
// ============================================================================

/**
 * Hook to get user by ID
 */
export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.users.detail(userId || ''),
    queryFn: () => getUserById(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes - user profiles don't change often
  });
}

/**
 * Hook to get user by username
 */
export function useUserByUsername(username: string | undefined) {
  return useQuery({
    queryKey: queryKeys.users.byUsername(username || ''),
    queryFn: () => getUserByUsername(username!),
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to search users
 */
export function useSearchUsers(searchTerm: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.users.search(searchTerm),
    queryFn: () => searchUsers(searchTerm),
    enabled: enabled && searchTerm.length >= 2, // Only search with 2+ characters
    staleTime: 30 * 1000, // 30 seconds for search results
  });
}

// ============================================================================
// USER MUTATIONS
// ============================================================================

/**
 * Hook for updating user profile
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, input }: { userId: string; input: UpdateUserInput }) => {
      return updateUser(userId, input);
    },
    onSuccess: (_, { userId }) => {
      // Invalidate user queries
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      
      // If username changed, also invalidate username query
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

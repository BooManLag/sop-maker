'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './browser';

export const queryKeys = {
  workspace: ['workspace'] as const,
  process: (id: string) => ['process', id] as const,
  capture: (id: string) => ['capture', id] as const,
  scan: (id: string) => ['scan', id] as const,
  finding: (id: string) => ['finding', id] as const,
  trial: (id: string) => ['trial', id] as const,
  changeRequest: (id: string) => ['change-request', id] as const,
};

export const useWorkspace = () =>
  useQuery({ queryKey: queryKeys.workspace, queryFn: api.workspace });
export const useProcess = (id: string) =>
  useQuery({ queryKey: queryKeys.process(id), queryFn: () => api.process(id) });
export const useCapture = (id: string) =>
  useQuery({ queryKey: queryKeys.capture(id), queryFn: () => api.capture(id) });
export const useScan = (id: string) =>
  useQuery({ queryKey: queryKeys.scan(id), queryFn: () => api.scan(id) });
export const useFinding = (id: string) =>
  useQuery({ queryKey: queryKeys.finding(id), queryFn: () => api.finding(id) });
export const useTrial = (id: string) =>
  useQuery({ queryKey: queryKeys.trial(id), queryFn: () => api.trial(id) });
export const useChangeRequest = (id: string) =>
  useQuery({ queryKey: queryKeys.changeRequest(id), queryFn: () => api.changeRequest(id) });

/** A write that refreshes every cached read once it succeeds; the workspace is small. */
export function useWorkspaceMutation<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

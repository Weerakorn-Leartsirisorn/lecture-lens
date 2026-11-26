import { useQuery } from '@tanstack/react-query'
import { api } from './client'

// Lecture content never changes for a given id (it is the PDF's hash), so cached data never goes stale.
export const lectureKey = (id: string) => ['lecture', id] as const

export function useLecture(id: string) {
  return useQuery({ queryKey: lectureKey(id), queryFn: () => api.lecture(id), staleTime: Infinity, retry: false })
}

export function useSummary(id: string) {
  return useQuery({ queryKey: ['summary', id], queryFn: () => api.summary(id), staleTime: Infinity, retry: false })
}

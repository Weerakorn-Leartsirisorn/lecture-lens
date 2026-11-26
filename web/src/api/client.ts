import type { components } from './schema'

// Every type here is generated from the FastAPI schema (npm run gen:api). Don't hand-write API shapes.
type Schemas = components['schemas']
export type LectureInfo = Schemas['LectureInfo']
export type Summary = Schemas['Summary']
export type QuizRequest = Schemas['QuizRequest']
export type QuizResponse = Schemas['QuizResponse']
export type FlashcardRequest = Schemas['FlashcardRequest']
export type FlashcardsResponse = Schemas['FlashcardsResponse']

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) {
    let detail: unknown
    try {
      detail = (await res.json()).detail
    } catch {
      // body was not JSON; fall back to the status text
    }
    const message = typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : res.statusText
    throw new ApiError(res.status, message)
  }
  return res.json() as Promise<T>
}

const postJson = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const api = {
  upload(file: File) {
    const form = new FormData()
    form.append('file', file)
    return request<LectureInfo>('/api/lectures', { method: 'POST', body: form })
  },
  lecture: (id: string) => request<LectureInfo>(`/api/lectures/${id}`),
  summary: (id: string) => request<Summary>(`/api/lectures/${id}/summary`),
  quiz: (id: string, body: QuizRequest) => request<QuizResponse>(`/api/lectures/${id}/quiz`, postJson(body)),
  flashcards: (id: string, body: FlashcardRequest) =>
    request<FlashcardsResponse>(`/api/lectures/${id}/flashcards`, postJson(body)),
}

export const pdfUrl = (id: string, page?: number) => `/api/lectures/${id}/pdf${page ? `#page=${page}` : ''}`

// The last opened lecture, so the upload page can offer "Continue". Replaced by the library in step 7.
const KEY = 'll_last'
type Last = { id: string; filename: string }

export const lastLecture = {
  get(): Last | null {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
      return v && typeof v.id === 'string' && typeof v.filename === 'string' ? v : null
    } catch {
      return null
    }
  },
  set(v: Last) {
    localStorage.setItem(KEY, JSON.stringify(v))
  },
  clear() {
    localStorage.removeItem(KEY)
  },
}

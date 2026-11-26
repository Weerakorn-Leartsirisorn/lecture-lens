import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'th' | 'en'

// Strings carried over from static/index.html. "\n" is a line break; U+2060 (word joiner)
// keeps "แฟลชการ์ด" on one line in the narrow-screen headline.
const T = {
  th: {
    overview: 'ภาพรวม', terms: 'คำสำคัญ', makeQuiz: 'สร้างควิซ', numQ: 'จำนวนข้อ', diffQ: 'ความยาก',
    diff_easy: 'ง่าย', diff_medium: 'กลาง', diff_hard: 'ยาก', newQuiz: 'สร้างชุดใหม่', makeCards: 'สร้างแฟลชการ์ด',
    loadingSum: 'กำลังสรุปเนื้อหา…', loadingQuiz: 'กำลังออกข้อสอบ…', loadingCards: 'กำลังทำแฟลชการ์ด…',
    verified: '✓ ตรวจกับสไลด์แล้ว', unverified: 'ยังไม่ยืนยัน', score: 'คะแนน', retry: 'ฝึกเฉพาะเรื่องที่ตอบผิด',
    flipHint: 'คลิกการ์ดเพื่อพลิก', evidence: 'จากสไลด์', why: 'เหตุผล', hideViewer: 'ซ่อน', showViewer: 'แสดง',
    uploadTitle: 'เปลี่ยนสไลด์เลกเชอร์\nเป็นสรุป ควิซ และแฟลช⁠การ์ด',
    uploadSub: 'สรุปได้ทั้งภาษาไทยและอังกฤษ ทุกคำถามและแฟลชการ์ดอ้างเลขหน้าในสไลด์\nกดเลขหน้าเพื่อเปิดสไลด์หน้านั้น',
    pickFile: 'อัปโหลดสไลด์ (PDF)', dragHint: 'หรือลากไฟล์มาวางตรงนี้ · รองรับสไลด์ไทย อังกฤษ และไทยปนอังกฤษ',
    newUpload: 'อัปโหลดใหม่', tabSummary: 'สรุป', tabQuiz: 'ควิซ', tabCards: 'แฟลชการ์ด',
    viewerHint: 'สไลด์ · คลิกเลขหน้า (p.) เพื่อเปิดหน้านั้น',
    reading: 'กำลังอ่านสไลด์ทุกหน้า… (ประมาณ 30–90 วินาที)', uploadFail: 'อัปโหลดไม่สำเร็จ',
    continueLast: 'เปิดต่อ', notFound: 'ไม่พบเลกเชอร์นี้ กรุณาอัปโหลดใหม่', prev: '← ก่อนหน้า', next: 'ถัดไป →',
  },
  en: {
    overview: 'Overview', terms: 'Key terms', makeQuiz: 'Generate quiz', numQ: 'Questions', diffQ: 'Difficulty',
    diff_easy: 'Easy', diff_medium: 'Medium', diff_hard: 'Hard', newQuiz: 'New set', makeCards: 'Generate flashcards',
    loadingSum: 'Summarizing…', loadingQuiz: 'Writing questions…', loadingCards: 'Making flashcards…',
    verified: '✓ checked against slides', unverified: 'unverified', score: 'Score', retry: 'Practice my mistakes',
    flipHint: 'Click a card to flip', evidence: 'From the slides', why: 'Why', hideViewer: 'Hide', showViewer: 'Show',
    uploadTitle: 'Turn lecture slides into\na summary, quiz and flashcards',
    uploadSub: 'Summaries in Thai and English. Every question and flashcard cites a slide page.\nClick the page number to open that slide.',
    pickFile: 'Upload slides (PDF)', dragHint: 'or drop a PDF here · Thai, English and mixed-language slides work',
    newUpload: 'New upload', tabSummary: 'Summary', tabQuiz: 'Quiz', tabCards: 'Flashcards',
    viewerHint: 'Slides · click a page number (p.) to open it',
    reading: 'Reading every slide… (about 30–90 seconds)', uploadFail: 'Upload failed',
    continueLast: 'Continue', notFound: 'Lecture not found. Please upload it again.', prev: '← Previous', next: 'Next →',
  },
} satisfies Record<Lang, Record<string, string>>

export type TextKey = keyof typeof T.th

type LangState = { lang: Lang; setLang: (l: Lang) => void; t: (k: TextKey) => string }
const LangContext = createContext<LangState | null>(null)
const STORAGE_KEY = 'll_lang'

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'th'))
  useEffect(() => {
    document.documentElement.lang = lang
    localStorage.setItem(STORAGE_KEY, lang)
  }, [lang])
  return <LangContext value={{ lang, setLang, t: (k) => T[lang][k] }}>{children}</LangContext>
}

export function useLang(): LangState {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used inside <LangProvider>')
  return ctx
}

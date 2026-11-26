import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { LangProvider } from './i18n'
import { LecturePage } from './routes/LecturePage'
import { UploadPage } from './routes/UploadPage'
import './index.css'

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <LangProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/lecture/:id" element={<LecturePage />} />
            <Route path="*" element={<UploadPage />} />
          </Routes>
        </BrowserRouter>
      </LangProvider>
    </QueryClientProvider>
  </StrictMode>,
)

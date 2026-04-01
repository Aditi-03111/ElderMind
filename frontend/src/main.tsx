import { createRoot } from 'react-dom/client'
import './index.css'
import { initBarba } from './transitions/barba'
import { renderPage } from './renderPage'

const container = document.querySelector('[data-barba="container"]') as HTMLElement | null
const rootEl = document.getElementById('root')

if (!rootEl) throw new Error('Missing #root element')

// Initial mount
let currentRoot = createRoot(rootEl)
renderPage({
  root: currentRoot,
  page: document.body.dataset.page || container?.dataset.barbaNamespace || 'home',
})

// App-like transitions (no hard reload feeling)
initBarba({
  onNavigate: (next) => {
    const nextRootEl = next.container.querySelector('#root') as HTMLElement | null
    if (!nextRootEl) return

    currentRoot.unmount()
    currentRoot = createRoot(nextRootEl)
    renderPage({ root: currentRoot, page: next.namespace })
  },
})

// PWA: register a tiny service worker for offline feel
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

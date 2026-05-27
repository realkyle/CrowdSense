import { useState } from 'react'
import UploadPanel from './UploadPanel'
import HeatmapView from './HeatmapView'

const DENSITY_STYLES = {
  green:  { badge: 'bg-green-500/20 text-green-400 border border-green-500/30',  dot: 'bg-green-400'  },
  yellow: { badge: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30', dot: 'bg-yellow-400' },
  orange: { badge: 'bg-orange-500/20 text-orange-400 border border-orange-500/30', dot: 'bg-orange-400' },
  red:    { badge: 'bg-red-500/20 text-red-400 border border-red-500/30',         dot: 'bg-red-400'    },
}

export default function Dashboard() {
  const [result, setResult]       = useState(null)
  const [originalFile, setOriginalFile] = useState(null)
  const [loading, setLoading]     = useState(false)

  async function handleResult(data, file) {
    setLoading(false)
    setResult(data)
    setOriginalFile(file)
  }

  // Wrap the upload call so we can show loading state
  async function handleUpload(data, file) {
    setLoading(true)
    setResult(null)
    await handleResult(data, file)
  }

  const style = result ? DENSITY_STYLES[result.density_color] ?? DENSITY_STYLES.green : null

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold text-sm">
          CS
        </div>
        <span className="text-lg font-semibold tracking-tight">CrowdSense</span>
        <span className="ml-auto text-xs text-slate-500">Phase 1 — Static Image</span>
      </header>

      <main className="flex flex-col lg:flex-row gap-6 p-6 flex-1">
        {/* Left column — upload + stats */}
        <div className="flex flex-col gap-6 lg:w-80 shrink-0">
          <UploadPanel onResult={handleUpload} loading={loading} />

          {loading && (
            <div className="flex items-center gap-3 text-slate-400 text-sm">
              <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              Running detection…
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-slate-200">Results</h2>

              {/* Person count */}
              <div className="bg-slate-800 rounded-xl p-4 flex items-center justify-between">
                <span className="text-slate-400 text-sm">People detected</span>
                <span className="text-3xl font-bold text-white">{result.person_count}</span>
              </div>

              {/* Density label */}
              <div className="bg-slate-800 rounded-xl p-4 flex items-center justify-between">
                <span className="text-slate-400 text-sm">Crowd density</span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${style.badge}`}>
                  <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                  {result.density_label}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right column — image viewer */}
        <div className="flex-1 min-w-0">
          {result ? (
            <HeatmapView
              annotatedImage={result.annotated_image}
              heatmapImage={result.heatmap_image}
              originalFile={originalFile}
            />
          ) : (
            <div className="h-full min-h-64 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-600 text-sm">
              Upload an image to see results
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'
import UploadPanel from './UploadPanel'
import HeatmapView from './HeatmapView'
import VideoUploadPanel from './VideoUploadPanel'
import CrowdGraph from './CrowdGraph'

const DENSITY_STYLES = {
  green:  { badge: 'bg-green-500/20 text-green-400 border border-green-500/30',  dot: 'bg-green-400'  },
  yellow: { badge: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30', dot: 'bg-yellow-400' },
  orange: { badge: 'bg-orange-500/20 text-orange-400 border border-orange-500/30', dot: 'bg-orange-400' },
  red:    { badge: 'bg-red-500/20 text-red-400 border border-red-500/30',         dot: 'bg-red-400'    },
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className="text-2xl font-bold text-white">{value}</span>
      {sub && <span className="text-slate-500 text-xs">{sub}</span>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Image mode
// ---------------------------------------------------------------------------
function ImageMode() {
  const [result, setResult] = useState(null)
  const [originalFile, setOriginalFile] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleUpload(data, file) {
    setLoading(true)
    setResult(null)
    setResult(data)
    setOriginalFile(file)
    setLoading(false)
  }

  const style = result ? DENSITY_STYLES[result.density_color] ?? DENSITY_STYLES.green : null

  return (
    <div className="flex flex-col lg:flex-row gap-6 flex-1">
      {/* Left column */}
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
            <div className="bg-slate-800 rounded-xl p-4 flex items-center justify-between">
              <span className="text-slate-400 text-sm">People detected</span>
              <span className="text-3xl font-bold text-white">{result.person_count}</span>
            </div>
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

      {/* Right column */}
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
    </div>
  )
}

// ---------------------------------------------------------------------------
// Video mode
// ---------------------------------------------------------------------------
function VideoMode() {
  const [jobId, setJobId] = useState(null)
  const [jobState, setJobState] = useState(null) // {status, progress, result}
  const [filename, setFilename] = useState('')
  const pollRef = useRef(null)

  // Start polling when a job is created, stop when done/error
  useEffect(() => {
    if (!jobId) return
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/jobs/${jobId}`)
        const data = await res.json()
        setJobState(data)
        if (data.status === 'done' || data.status === 'error') {
          clearInterval(pollRef.current)
        }
      } catch {
        clearInterval(pollRef.current)
      }
    }, 1000)
    return () => clearInterval(pollRef.current)
  }, [jobId])

  function handleJobStart(id, name) {
    setJobId(id)
    setJobState({ status: 'queued', progress: 0 })
    setFilename(name)
  }

  function handleReset() {
    clearInterval(pollRef.current)
    setJobId(null)
    setJobState(null)
    setFilename('')
  }

  const processing = jobState && jobState.status !== 'done' && jobState.status !== 'error'
  const result = jobState?.result

  return (
    <div className="flex flex-col lg:flex-row gap-6 flex-1">
      {/* Left column */}
      <div className="flex flex-col gap-6 lg:w-80 shrink-0">
        <VideoUploadPanel onJobStart={handleJobStart} disabled={!!processing} />

        {/* Progress bar */}
        {processing && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Processing {filename}</span>
              <span>{Math.round((jobState.progress ?? 0) * 100)}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.round((jobState.progress ?? 0) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {jobState?.status === 'error' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
            {jobState.error ?? 'Processing failed.'}
            <button onClick={handleReset} className="block mt-2 underline text-xs">Try again</button>
          </div>
        )}

        {/* Summary stats */}
        {result && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-200">Summary</h2>
              <button onClick={handleReset} className="text-xs text-slate-500 hover:text-slate-300 underline">
                New video
              </button>
            </div>
            <StatCard label="Peak count" value={result.peak_count} sub={`avg ${result.avg_count} people`} />
            <StatCard label="Duration" value={`${result.duration}s`} sub={`${result.sampled_frames} frames sampled`} />
            <div className="bg-slate-800 rounded-xl p-4 flex items-center justify-between">
              <span className="text-slate-400 text-sm">Peak density</span>
              {(() => {
                const s = DENSITY_STYLES[result.peak_color] ?? DENSITY_STYLES.green
                const label = result.timeline.find(f => f.count === result.peak_count)?.density ?? ''
                return (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${s.badge}`}>
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    {label}
                  </span>
                )
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Right column — graph */}
      <div className="flex-1 min-w-0">
        {result ? (
          <CrowdGraph timeline={result.timeline} peakCount={result.peak_count} />
        ) : (
          <div className="h-full min-h-64 rounded-xl border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-600 text-sm">
            {processing ? 'Graph will appear when processing completes…' : 'Upload a video to see the crowd count graph'}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard shell
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const [tab, setTab] = useState('image') // 'image' | 'video'

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold text-sm">
          CS
        </div>
        <span className="text-lg font-semibold tracking-tight">CrowdSense</span>

        {/* Mode tabs */}
        <div className="ml-6 flex gap-1 bg-slate-800 rounded-lg p-1">
          {[{ key: 'image', label: 'Image' }, { key: 'video', label: 'Video' }].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors
                ${tab === key ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-slate-500">Phase 2 — Image + Video</span>
      </header>

      <main className="flex flex-col p-6 flex-1">
        {tab === 'image' ? <ImageMode /> : <VideoMode />}
      </main>
    </div>
  )
}

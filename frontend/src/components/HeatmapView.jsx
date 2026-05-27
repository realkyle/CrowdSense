import { useState } from 'react'

export default function HeatmapView({ annotatedImage, heatmapImage, originalFile }) {
  const [mode, setMode] = useState('annotated') // 'original' | 'annotated' | 'heatmap'

  const originalUrl = originalFile ? URL.createObjectURL(originalFile) : null

  const src =
    mode === 'heatmap'
      ? `data:image/jpeg;base64,${heatmapImage}`
      : mode === 'annotated'
      ? `data:image/jpeg;base64,${annotatedImage}`
      : originalUrl

  return (
    <div className="flex flex-col gap-3">
      {/* Toggle buttons */}
      <div className="flex gap-2">
        {[
          { key: 'annotated', label: 'Detections' },
          { key: 'heatmap',   label: 'Heatmap' },
          { key: 'original',  label: 'Original' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${mode === key
                ? 'bg-violet-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Image display */}
      <div className="rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center">
        <img
          src={src}
          alt={mode}
          className="max-w-full max-h-[500px] object-contain"
        />
      </div>
    </div>
  )
}

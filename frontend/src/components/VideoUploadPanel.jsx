import { useRef, useState } from 'react'

const ACCEPTED = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']

export default function VideoUploadPanel({ onJobStart, disabled }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  async function submitFile(file) {
    if (!file) return
    if (!ACCEPTED.includes(file.type)) {
      alert('Please upload an MP4, MOV, AVI, or WebM video.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('http://localhost:8000/detect-video', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Upload failed')
      }
      const data = await res.json()
      onJobStart(data.job_id, file.name)
    } catch (e) {
      alert(`Error: ${e.message}`)
    }
  }

  function handleFileChange(e) { submitFile(e.target.files[0]) }
  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    submitFile(e.dataTransfer.files[0])
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-slate-200">Upload Video</h2>

      <div
        onClick={() => !disabled && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed
          cursor-pointer select-none transition-colors p-10
          ${dragOver ? 'border-violet-400 bg-violet-500/10' : 'border-slate-600 hover:border-slate-400 bg-slate-800/50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
        </svg>
        <p className="text-slate-400 text-sm text-center">
          {disabled ? 'Processing…' : 'Drop a video here, or click to browse'}
        </p>
        <p className="text-slate-600 text-xs">MP4 · MOV · AVI · WebM</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

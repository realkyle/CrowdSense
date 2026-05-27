import { useRef, useState } from 'react'

export default function UploadPanel({ onResult, loading }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  async function submitFile(file) {
    if (!file) return
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      alert('Please upload a JPEG or PNG image.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('http://localhost:8000/detect', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Detection failed')
      }
      const data = await res.json()
      onResult(data, file)
    } catch (e) {
      alert(`Error: ${e.message}`)
    }
  }

  function handleFileChange(e) {
    submitFile(e.target.files[0])
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    submitFile(e.dataTransfer.files[0])
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-slate-200">Upload Image</h2>

      {/* Drop zone */}
      <div
        onClick={() => !loading && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed
          cursor-pointer select-none transition-colors p-10
          ${dragOver
            ? 'border-violet-400 bg-violet-500/10'
            : 'border-slate-600 hover:border-slate-400 bg-slate-800/50'}
          ${loading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-slate-400 text-sm text-center">
          {loading ? 'Analyzing…' : 'Drop an image here, or click to browse'}
        </p>
        <p className="text-slate-600 text-xs">JPEG or PNG</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

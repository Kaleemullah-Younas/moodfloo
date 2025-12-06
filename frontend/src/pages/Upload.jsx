import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../services/api'
import toast from 'react-hot-toast'
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline'

export default function Upload({ onUploadComplete }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const navigate = useNavigate()

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      const allowedTypes = ['.mp4', '.mp3', '.wav', '.avi', '.mov', '.mkv']
      const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase()
      
      if (!allowedTypes.includes(fileExt)) {
        toast.error(`File type ${fileExt} not supported`)
        return
      }
      
      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const result = await apiService.uploadFile(file, (progress) => {
        setUploadProgress(progress)
      })

      toast.success('File uploaded successfully!')
      onUploadComplete?.(result.session_id)
      
      // Automatically navigate to Live Dashboard
      navigate(`/live/${result.session_id}`)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1f2e] flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-[42px] font-bold text-white mb-3">
            Meeting Emotion Analysis
          </h1>
          <p className="text-[16px] text-[#8b92a7] max-w-xl mx-auto">
            Upload your meeting recording to get real-time emotional insights and comprehensive analysis
          </p>
        </div>

        {/* Upload Card */}
        <div className="bg-[#252b3b] rounded-2xl border border-[#2d3548] p-8 shadow-2xl mb-8">
          <div className="space-y-6">
            {/* Drag & Drop Area */}
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
                file
                  ? 'border-[#60a5fa] bg-[#60a5fa]/10'
                  : 'border-[#2d3548] hover:border-[#3d4558] hover:bg-[#2d3548]/30'
              }`}
            >
              <ArrowUpTrayIcon className="w-16 h-16 mx-auto mb-4 text-[#6b7280]" />
              
              <input
                type="file"
                id="file-upload"
                accept=".mp4,.mp3,.wav,.avi,.mov,.mkv"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
              
              <label
                htmlFor="file-upload"
                className="cursor-pointer"
              >
                {file ? (
                  <div>
                    <p className="text-lg font-semibold text-white mb-2">
                      {file.name}
                    </p>
                    <p className="text-sm text-[#8b92a7]">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        setFile(null)
                      }}
                      className="mt-3 text-sm text-[#8b92a7] hover:text-white"
                    >
                      Choose different file
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-semibold text-white mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-[#8b92a7]">
                      MP4, MP3, WAV, AVI, MOV, MKV (Max 500MB)
                    </p>
                  </div>
                )}
              </label>
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-[#8b92a7]">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-[#2d3548] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#60a5fa] to-[#4ade80] h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`w-full py-3 px-8 rounded-lg text-[15px] font-semibold transition-all duration-300 ${
                (!file || uploading)
                  ? 'bg-[#2d3548] text-[#6b7280] cursor-not-allowed'
                  : 'bg-[#2d5f5d] text-white hover:bg-[#3d7f7d]'
              }`}
            >
              {uploading ? 'Uploading...' : 'Upload & Start Live Analysis'}
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-[#252b3b]/50 rounded-xl p-5 border border-[#2d3548]/50">
            <img src="/live-dashboard.svg" alt="Live Dashboard" className="w-8 h-8 mb-2" />
            <h3 className="text-[15px] font-semibold text-white mb-1">Live Dashboard</h3>
            <p className="text-[13px] text-[#8b92a7]">
              Real-time emotion tracking as you watch the meeting unfold
            </p>
          </div>

          <div className="bg-[#252b3b]/50 rounded-xl p-5 border border-[#2d3548]/50">
            <img src="/overall-analysis.svg" alt="Overall Analysis" className="w-8 h-8 mb-2" />
            <h3 className="text-[15px] font-semibold text-white mb-1">Overall Analysis</h3>
            <p className="text-[13px] text-[#8b92a7]">
              Available after meeting completion with full insights
            </p>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-8 text-center text-[13px] text-[#6b7280]">
          <p>🔒 Privacy Protected: Only voice tone analyzed. No content recorded or stored.</p>
        </div>
      </div>
    </div>
  )
}

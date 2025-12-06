import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { WebSocketService, apiService } from '../services/api'
import MetricCard from '../components/MetricCard'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getEmotionColor, formatTime, getTeamStatusMessage } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function LiveDashboard() {
  const { sessionId } = useParams()
  const [wsService, setWsService] = useState(null)
  const [connected, setConnected] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [realtimeData, setRealtimeData] = useState(null)
  const [duration, setDuration] = useState(0)
  const [timeline, setTimeline] = useState([])
  const [videoUrl, setVideoUrl] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [videoEnded, setVideoEnded] = useState(false)
  const [participantCount, setParticipantCount] = useState(0)
  const [camerasOn, setCamerasOn] = useState(0)
  const [camerasOff, setCamerasOff] = useState(0)
  const [lastParticipantUpdate, setLastParticipantUpdate] = useState(Date.now())
  const participantUpdateInterval = useRef(null)
  const videoRef = useRef(null)
  const wsInitializedRef = useRef(false)
  const currentSessionRef = useRef(null)
  const frameIntervalRef = useRef(null)
  const initialFrameCapturedRef = useRef(false)

  // Cleanup when session changes
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up LiveDashboard, closing WebSocket')
      if (wsService) {
        wsService.close()
      }
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current)
      }
      if (participantUpdateInterval.current) {
        clearInterval(participantUpdateInterval.current)
      }
      wsInitializedRef.current = false
      currentSessionRef.current = null
      initialFrameCapturedRef.current = false
    }
  }, [])

  // Random participant data updates: start after 15s, then every 1min when video is playing
  useEffect(() => {
    if (isPlaying && !videoEnded) {
      // Initial delay of 15 seconds
      const initialTimeout = setTimeout(() => {
        generateRandomParticipantData()
        
        // Set up interval for updates every 1 minute (60 seconds)
        participantUpdateInterval.current = setInterval(() => {
          generateRandomParticipantData()
        }, 60000) // 1 minute interval
      }, 15000) // 15 second initial delay
      
      return () => {
        clearTimeout(initialTimeout)
        if (participantUpdateInterval.current) {
          clearInterval(participantUpdateInterval.current)
        }
      }
    } else {
      if (participantUpdateInterval.current) {
        clearInterval(participantUpdateInterval.current)
      }
    }
  }, [isPlaying, videoEnded])

  // Function to generate random participant data
  const generateRandomParticipantData = () => {
    const totalParticipants = Math.floor(Math.random() * 40) + 10 // 10-50 participants
    // Simple calculation: 20%-80% have cameras on
    const cameraOnPercentage = Math.random() * 0.6 + 0.2 // Random between 0.2 and 0.8 (20%-80%)
    const camerasOnCount = Math.floor(totalParticipants * cameraOnPercentage)
    const camerasOffCount = totalParticipants - camerasOnCount // Ensure total matches exactly
    
    setParticipantCount(totalParticipants)
    setCamerasOn(camerasOnCount)
    setCamerasOff(camerasOffCount)
    setLastParticipantUpdate(Date.now())
    
    console.log('Generated random participant data:', { 
      totalParticipants, 
      camerasOnCount, 
      camerasOffCount, 
      total: camerasOnCount + camerasOffCount 
    })
  }

  // Function to capture video frame and detect participants
  const captureVideoFrame = async (isInitial = false) => {
    const video = videoRef.current
    if (!video || video.paused || video.ended) return

    try {
      // Create canvas to capture frame
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Convert to blob
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8))
      
      // Send to backend for participant detection
      const formData = new FormData()
      formData.append('frame', blob, 'frame.jpg')
      formData.append('session_id', sessionId)
      formData.append('is_initial', isInitial)
      
      const response = await fetch('http://localhost:8000/api/detect-participants', {
        method: 'POST',
        body: formData
      })
      
      if (response.ok) {
        const data = await response.json()
        if (isInitial) {
          setParticipantCount(data.total_participants || 0)
          console.log('✅ Initial participant count:', data.total_participants)
        }
        setCamerasOn(data.cameras_on || 0)
        setCamerasOff(data.cameras_off || 0)
        console.log('📸 Frame analyzed - Cameras On:', data.cameras_on, 'Cameras Off:', data.cameras_off)
      }
    } catch (error) {
      console.error('Error capturing video frame:', error)
    }
  }

  useEffect(() => {
    // Reset if session changed
    if (currentSessionRef.current && currentSessionRef.current !== sessionId) {
      console.log('🔄 Session changed, resetting WebSocket')
      if (wsService) {
        wsService.close()
      }
      wsInitializedRef.current = false
      setConnected(false)
      setWsService(null)
    }
    currentSessionRef.current = sessionId
    
    // Prevent multiple connections
    if (wsInitializedRef.current) return
    wsInitializedRef.current = true
    
    // Fetch video URL
    setVideoUrl(`http://localhost:8000/api/video/${sessionId}`)

    // Initialize WebSocket
    const ws = new WebSocketService(sessionId)
    setWsService(ws)

    // Connect
    ws.connect()
      .then(() => {
        console.log('WebSocket connected, waiting for stream initialization...')
      })
      .catch((error) => {
        console.error('WebSocket connection failed:', error)
        // Don't show error toast - wait for ready event or actual error event
      })

    // Listen for events
    ws.on('status', (data) => {
      console.log('📊 Status:', data.message)
    })
    
    ws.on('ready', (data) => {
      console.log('✅ Ready event received:', data)
      setDuration(data.duration)
      setConnected(true)
      toast.success('Real-time streaming ready!')
    })

    ws.on('update', (data) => {
      setRealtimeData(data.data)
      
      // Update participant counts if available in data
      if (data.data.participant_count !== undefined) {
        setParticipantCount(data.data.participant_count)
      }
      if (data.data.cameras_on !== undefined) {
        setCamerasOn(data.data.cameras_on)
      }
      if (data.data.cameras_off !== undefined) {
        setCamerasOff(data.data.cameras_off)
      }
      
      // Accumulate timeline data
      setTimeline(prev => {
        const newData = [...prev]
        if (data.data.timeline_length > newData.length) {
          newData.push({
            time: data.time,
            energy: data.data.current_energy,
            category: data.data.current_emotion,
          })
        }
        return newData
      })
    })

    ws.on('error', (data) => {
      console.error('WebSocket error:', data.message)
      toast.error(data.message)
    })

    // Cleanup
    return () => {
      ws.close()
    }
  }, [sessionId])

  // Video time tracking
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      const time = video.currentTime
      setCurrentTime(time)
      if (wsService && connected) {
        wsService.seek(time)
      }
    }

    const handlePlay = () => {
      setIsPlaying(true)
      
      // Capture initial frame after 10-20 seconds of video start
      if (!initialFrameCapturedRef.current) {
        setTimeout(() => {
          if (!initialFrameCapturedRef.current && video.currentTime >= 10) {
            captureVideoFrame(true)
            initialFrameCapturedRef.current = true
          }
        }, 10000) // 10 seconds
      }
      
      // Start periodic frame capture every 15 seconds
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current)
      }
      frameIntervalRef.current = setInterval(() => {
        captureVideoFrame(false)
      }, 15000) // 15 seconds
    }
    
    const handlePause = () => {
      setIsPlaying(false)
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current)
      }
    }
    const handleEnded = () => {
      setVideoEnded(true)
      setIsPlaying(false)
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current)
      }
      toast.success('Video completed! You can now export reports or view analysis.')
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [wsService, connected])

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-xl text-gray-400">Connecting to live stream...</p>
        </div>
      </div>
    )
  }

  // Prepare chart data for Live Emotion Signal - Show only last 1 minute (60 seconds)
  const oneMinuteInSeconds = 60
  const currentTimeSeconds = currentTime
  const startTime = Math.max(0, currentTimeSeconds - oneMinuteInSeconds)
  
  const emotionSignalData = timeline
    .filter(point => point.time >= startTime && point.time <= currentTimeSeconds)
    .map((point, index) => {
      const energyLevel = point.energy
      let color = '#10b981' // green (default for energy >= 4)
      
      if (energyLevel < 2) {
        color = '#ef4444' // red for very low energy (stress/tension)
      } else if (energyLevel < 4) {
        color = '#f97316' // orange for low-medium energy
      }
      
      return {
        time: point.time, // Keep actual video time, not relative
        energy: energyLevel,
        color: color
      }
    })

  const getStrokeColor = (energy) => {
    if (energy < 2) return '#ef4444' // red
    if (energy < 4) return '#f97316' // orange
    return '#10b981' // green
  }

  return (
    <div className="min-h-screen bg-[#1a1f2e]">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-[28px] font-semibold text-white mb-1 flex items-center">
              <span className="w-2 h-2 bg-[#ef4444] rounded-full mr-3 animate-pulse"></span>
              Live Dashboard
            </h1>
            <p className="text-[14px] text-[#8b92a7]">
              Duration: {formatTime(duration)} | Elapsed time {formatTime(currentTime)}
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              disabled={!videoEnded}
              className={`px-4 py-2 bg-[#1a1f2e] rounded-lg text-[14px] font-medium border border-[#2d3548] flex items-center gap-2 ${
                videoEnded 
                  ? 'text-white hover:border-[#60a5fa] transition-colors cursor-pointer' 
                  : 'text-[#6b7280] opacity-50 cursor-not-allowed'
              }`}
            >
              <img src="/export.svg" alt="" className="w-4 h-4" />
              Export Json
            </button>
            <button
              disabled={!videoEnded}
              className={`px-4 py-2 bg-[#1a1f2e] rounded-lg text-[14px] font-medium border border-[#2d3548] flex items-center gap-2 ${
                videoEnded 
                  ? 'text-white hover:border-[#60a5fa] transition-colors cursor-pointer' 
                  : 'text-[#6b7280] opacity-50 cursor-not-allowed'
              }`}
            >
              <img src="/pdf.svg" alt="" className="w-4 h-4" />
              Export Pdf
            </button>
            <Link
              to={videoEnded ? `/analysis/${sessionId}` : '#'}
              className={`px-5 py-2 bg-gradient-to-r from-green-800 to-blue-800 text-white rounded-lg text-[14px] font-semibold border border-green-700 ${
                videoEnded 
                  ? 'hover:from-green-700 hover:to-blue-700 transition-all duration-200 shadow-lg' 
                  : 'opacity-50 cursor-not-allowed pointer-events-none'
              }`}
            >
              Meeting Room Analysis
            </Link>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left: Meeting Room Video */}
          <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3548] shadow-lg">
            <h2 className="text-[16px] font-semibold text-white mb-4 flex items-center">
              <img src="/meeting-room-video.svg" alt="" className="w-6 h-6 mr-2" />
              Meeting Room Video
            </h2>
            
            <div className="bg-[#1a1f2e] rounded-lg overflow-hidden aspect-video mb-3">
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="w-full h-full"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-[#6b7280]">Loading video...</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[13px] text-[#8b92a7]">
              <span>Participants - {participantCount || 0}</span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <img src="/camera-on.svg" alt="" className="w-6 h-5" /> {camerasOn || 0} Cameras On
                </span>
                <span className="flex items-center gap-1">
                  <img src="/camera-off.svg" alt="" className="w-6 h-5" /> {camerasOff || 0} Cameras Off
                </span>
              </div>
            </div>
          </div>

          {/* Right: Key Metrics - All inside Current Emotion Box */}
          <div className="bg-[#1a1f2e] flex flex-col">
            <div className="bg-[#1a1f2e] rounded-lg p-4 border border-[#2d3548] shadow-lg flex flex-col">
              <h2 className="text-[16px] font-semibold text-white mb-1 flex items-center">
                <img src="/key-metrics.svg" alt="" className="w-6 h-6 mr-2" />
                Key Metrics
              </h2>
              <p className="text-[12px] text-[#8b92a7] mb-4">Current Emotion</p>
              <h3 className="text-[32px] font-semibold text-white mb-5">
                {realtimeData?.current_emotion || '--'}
              </h3>
            </div>  
            {/* Current Emotion with integrated metrics */}
            <div className="flex-1 flex flex-col justify-center">
              {/* Metrics Grid - 3 columns inside Current Emotion */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#1a1f2e] rounded-lg p-4 border-[2px] border-[#252b3b] shadow-lg">
                  <div className="flex items-center gap-1 mb-2">
                    <p className="text-[11px] text-[#8b92a7]">Energy</p>
                  </div>
                  <p className="text-[11px] text-[#8b92a7] mb-2">Levels</p>
                  <p className="text-[32px] font-bold text-white leading-none mb-2">
                    {realtimeData ? realtimeData.current_energy.toFixed(1) : '0.0'}
                  </p>
                  <p className="text-[10px] text-[#60a5fa]">0-10 Energy Levels</p>
                </div>

                <div className="bg-[#1a1f2e] rounded-lg p-4 border-[2px] border-[#252b3b] shadow-lg">
                  <div className="flex items-center gap-1 mb-2">
                    <p className="text-[11px] text-[#8b92a7]">Participation</p>
                  </div>
                  <p className="text-[11px] text-[#8b92a7] mb-2 opacity-0">-</p>
                  <p className="text-[32px] font-bold text-white leading-none mb-2">
                    {realtimeData ? Math.round(realtimeData.participation || 0) : '0'}%
                  </p>
                  <p className="text-[10px] text-[#60a5fa]">Active Speaking Time</p>
                </div>

                <div className="bg-[#1a1f2e] rounded-lg p-4 border-[2px] border-[#252b3b] shadow-lg">
                  <div className="flex items-center gap-1 mb-2">
                    <p className="text-[11px] text-[#8b92a7]">Volatility</p>
                  </div>
                  <p className="text-[11px] text-[#8b92a7] mb-2">Score</p>
                  <p className="text-[32px] font-bold text-white leading-none mb-2">
                    {realtimeData ? Math.round((realtimeData.volatility || 0) * 100) : '0'}%
                  </p>
                  <p className="text-[10px] text-[#60a5fa]">0-100% Emotional Stability</p>
                </div>
              </div>
            </div>

            {/* Team Status Alert */}
            <div className="bg-[#1a1f2e] rounded-lg p-4 border border-[#2d3548] flex items-start gap-3 mt-4 shadow-lg">
              <img src="/Team-status.svg" alt="" className="w-7 h-10 mt-0.5" />
              <div>
                <p className="text-[13px] font-semibold text-[#60a5fa] mb-1">Team Status :</p>
                <p className="text-[13px] text-[#e5e7eb] leading-relaxed">
                  {realtimeData ? getTeamStatusMessage(realtimeData?.current_emotion, realtimeData?.current_energy, realtimeData?.volatility) : 'Waiting for video to start...'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Emotion Signal Graph - Full Width */}
        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3548] shadow-lg">
          <h2 className="text-[16px] font-semibold text-white mb-4 flex items-center">
            <img src="/live-emotion-signals.svg" alt="" className="w-6 h-6 mr-2" />
            Live Emotion Signal
          </h2>
          
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={emotionSignalData}>
              <defs>
                <linearGradient id="emotionGradient" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2}/>
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.25}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3548" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#6b7280" 
                tick={{ fontSize: 11, fill: '#8b92a7' }}
                axisLine={{ stroke: '#2d3548' }}
                tickLine={{ stroke: '#2d3548' }}
                tickFormatter={(value) => {
                  const seconds = Math.floor(value)
                  const mins = Math.floor(seconds / 60)
                  const secs = seconds % 60
                  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                }}
                label={{ value: 'Time', position: 'insideBottom', offset: -5, fill: '#8b92a7', fontSize: 12 }}
              />
              <YAxis 
                stroke="#6b7280" 
                tick={{ fontSize: 11, fill: '#8b92a7' }}
                axisLine={{ stroke: '#2d3548' }}
                tickLine={{ stroke: '#2d3548' }}
                domain={[0, 10]}
                ticks={[0, 2, 4, 6, 8, 10]}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: '#1a1f2e', 
                  border: '1px solid #2d3548',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                labelStyle={{ color: '#fff', fontWeight: '600' }}
              />
              <Area
                type="monotone"
                dataKey="energy"
                stroke={emotionSignalData.length > 0 ? getStrokeColor(emotionSignalData[emotionSignalData.length - 1]?.energy || 0) : '#10b981'}
                strokeWidth={2}
                fill="url(#emotionGradient)"
                isAnimationActive={false}
                connectNulls={false}
                dot={false}
                activeDot={{ r: 4, stroke: 'currentColor', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

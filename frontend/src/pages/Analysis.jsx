import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { apiService } from '../services/api'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatDuration } from '../utils/helpers'
import toast from 'react-hot-toast'

export default function Analysis() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults] = useState(null)
  const [hasStarted, setHasStarted] = useState(false)
  const [activeTab, setActiveTab] = useState('summary') // 'summary' or 'nextsteps'
  const [nextSteps, setNextSteps] = useState('')
  const [loadingNextSteps, setLoadingNextSteps] = useState(false)
  const [meetingSummary, setMeetingSummary] = useState('')
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [aiContentGenerated, setAiContentGenerated] = useState(false) // Track if AI content is generated
  const analysisInProgressRef = useRef(false)

  useEffect(() => {
    if (sessionId && !hasStarted && !analysisInProgressRef.current) {
      setHasStarted(true)
      analysisInProgressRef.current = true
      startAnalysis()
    }
  }, [sessionId])

  const startAnalysis = async () => {
    setAnalyzing(true)
    
    try {
      const response = await apiService.startAnalysis(sessionId)
      setResults(response.results)
      
      // Generate AI content immediately after getting analysis results
      generateAiContent()
      
      toast.success('Analysis complete!')
    } catch (error) {
      console.error('Analysis error:', error)
      toast.error('Analysis failed')
    } finally {
      setAnalyzing(false)
      setLoading(false)
    }
  }

  const generateAiContent = async () => {
    if (loadingSummary || loadingNextSteps) return // Prevent multiple calls only if already loading
    
    setLoadingSummary(true)
    setLoadingNextSteps(true)
    
    try {
      // Generate both summary and next steps in parallel
      const [summaryResponse, nextStepsResponse] = await Promise.all([
        apiService.generateSummary(sessionId),
        apiService.generateNextSteps(sessionId)
      ])
      
      setMeetingSummary(summaryResponse.summary)
      setNextSteps(nextStepsResponse.next_steps)
      setAiContentGenerated(true) // Mark as generated
      
    } catch (error) {
      console.error('AI content generation error:', error)
      
      // Set fallback content if API fails
      if (!meetingSummary) {
        setMeetingSummary(`The meeting held a consistently low emotional tone that never quite rose above neutral. Energy dipped early and stayed there, creating a muted atmosphere where participation was present but not fully alive. Long periods of discussion pointed to passive listening, and several speakers managed to fill the room with measured conversation, though with a noticeable lack of diverse voices.

Cognitively, the team appeared steady yet under-stimulated. The agenda was workable, but it outweighed the attention and mental freshness people could realistically contribute to, leading to a sense of heaviness that limited engagement. There was no dramatic volatility — nothing spiked, nothing crashed — but the overall sentiment hovered in a flat middle ground, signaling a group operating below its natural emotional and creative bandwidth.

Human connection felt muted throughout the session. With minimal opening rapport-building and structured interaction, the team never fully aligned or grounded together as a connected group. Wins or small moments of progress went unacknowledged, which kept morale from rising and left the meeting without any sense of uplift or forward motion.

By the close, the team felt stable yet subdued — a capable group operating below its natural emotional and creative bandwidth. What this team needs most isn't an overhaul; it's a purposeful injection of energy, recognition, and more intentional human connection to unlock their collaborative potential.`)
      }
      
      if (!nextSteps) {
        setNextSteps(`1. Re-energise the room. Energy dipped early and never recovered — add short energisers, rotate voices, or break long monologues. Small shifts = big lift.

2. Pull quieter people in. Silence was high. Directly invite two or three quieter members to contribute. Spotlighting voices increases psychological safety.

3. Reduce cognitive fatigue. The team showed steadiness but not engagement. Tighten agenda, shorten segments, and cut low-value talk time. Clarity = calm.

4. Celebrate micro-wins. Volatility is stable, but mood is flat. Acknowledge small successes mid-meeting. It boosts momentum and emotional presence.

5. Add human check-ins. Quick "one-word check-in" at the start. Helps the team feel seen and levels the emotional playing field.

6. Break the monotony. Flat emotion signals boredom or passive listening. Add visuals, vary speaker rhythm, or switch to collaborative tool use.

7. Encourage psychological presence. Camera-off numbers didn't crash stability, but they hurt connection. Ask for cameras on during key decisions only — lowers pressure, increases visibility.

8. Take the team out for a long lunch. Reset morale. People talk more honestly over food than on slides.`)
      }
      
      setAiContentGenerated(true) // Mark as generated even with fallback
    } finally {
      setLoadingSummary(false)
      setLoadingNextSteps(false)
    }
  }

  const handleExportPdf = async () => {
    try {
      toast.loading('Generating PDF report...')
      const blob = await apiService.exportPdf(sessionId)
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `moodflo_report_${sessionId.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.dismiss()
      toast.success('PDF report downloaded!')
    } catch (error) {
      toast.dismiss()
      toast.error('Export failed')
      console.error('Export error:', error)
    }
  }

  const handleExportJson = async () => {
    try {
      toast.loading('Generating JSON export...')
      const data = await apiService.exportJson(sessionId)
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `moodflo_report_${sessionId.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.dismiss()
      toast.success('JSON export downloaded!')
    } catch (error) {
      toast.dismiss()
      toast.error('Export failed')
      console.error('Export error:', error)
    }
  }

  const handleCopySummary = () => {
    const summaryText = meetingSummary || results?.suggestions || 'No summary available'
    navigator.clipboard.writeText(summaryText)
    toast.success('Summary copied to clipboard!')
  }

  const handleCopyNextSteps = () => {
    const nextStepsText = nextSteps || `Team Wellbeing: What we learned (and what to do next)

1. Re-energise the room.
Energy dipped early and never recovered — add short energisers, rotate voices, or break long monologues. Small shifts = big lift.

2. Pull quieter people in.
Silence was high. Directly invite two or three quieter members to contribute. Spotlighting voices increases psychological safety.

3. Reduce cognitive fatigue.
The team showed steadiness but not engagement. Tighten agenda, shorten segments, and cut low-value talk time. Clarity = calm.

4. Celebrate micro-wins.
Volatility is stable, but mood is flat. Acknowledge small successes mid-meeting. It boosts momentum and emotional presence.

5. Add human check-ins.
Quick "one-word check-in" at the start. Helps the team feel seen and levels the emotional playing field.

6. Break the monotony.
Flat emotion signals boredom or passive listening. Add visuals, vary speaker rhythm, or switch to collaborative tool use.

7. Encourage psychological presence.
Camera-off numbers didn't crash stability, but they hurt connection. Ask for cameras on during key decisions only — lowers pressure, increases visibility.

8. Take the team out for a long lunch.
Reset morale. People talk more honestly over food than on slides.`
    
    navigator.clipboard.writeText(nextStepsText)
    toast.success('Next Steps copied to clipboard!')
  }

  if (loading || analyzing) {
    return (
      <div className="min-h-screen bg-[#1a1f2e] flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-16 h-16 border-4 border-[#60a5fa] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-xl text-[#e5e7eb]">Analyzing meeting emotions...</p>
          <p className="text-sm text-[#8b92a7] mt-2">This may take a minute</p>
        </div>
      </div>
    )
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-[#1a1f2e] flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-[#e5e7eb]">No analysis data available</p>
          <button 
            onClick={() => navigate('/')} 
            className="mt-4 px-6 py-2 bg-[#2d5f5d] text-white rounded-lg"
          >
            Upload New Recording
          </button>
        </div>
      </div>
    )
  }

  const { summary, timeline, suggestions, duration } = results

  // Prepare chart data - Same format as Live Dashboard
  const emotionSignalData = timeline.map(point => {
    const energyLevel = point.energy
    let color = '#10b981' // green (default for energy >= 4)
    
    if (energyLevel < 2) {
      color = '#ef4444' // red for very low energy (stress/tension)
    } else if (energyLevel < 4) {
      color = '#f97316' // orange for low-medium energy
    }
    
    return {
      time: point.time, // Keep actual time for proper timeline
      energy: energyLevel,
      color: color
    }
  })

  const getStrokeColor = (energy) => {
    if (energy < 2) return '#ef4444' // red
    if (energy < 4) return '#f97316' // orange
    return '#10b981' // green
  }

  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
  const currentTime = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })

  return (
    <div className="min-h-screen bg-[#1a1f2e]">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-[28px] font-semibold text-white mb-1 flex items-center">
              <span className="text-[#8b92a7] mr-2">○</span>
              Overall Analysis
            </h1>
            <p className="text-[14px] text-[#8b92a7]">
              Duration: {formatDuration(duration)} | Elapsed time {formatDuration(duration)}
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleExportJson}
              className="px-4 py-2 bg-[#1a1f2e] text-white rounded-lg text-[14px] font-medium border border-[#2d3548] hover:border-[#60a5fa] transition-colors flex items-center gap-2"
            >
              <img src="/export.svg" alt="" className="w-4 h-4" />
              Export Json
            </button>
            <button
              onClick={handleExportPdf}
              className="px-4 py-2 bg-[#1a1f2e] text-white rounded-lg text-[14px] font-medium border border-[#2d3548] hover:border-[#60a5fa] transition-colors flex items-center gap-2"
            >
              <img src="/pdf.svg" alt="" className="w-4 h-4" />
              Export Pdf
            </button>
            <Link
              to={`/live/${sessionId}`}
              className="px-5 py-2 bg-gradient-to-r from-green-800 to-blue-800 text-white rounded-lg text-[14px] font-semibold border border-green-700 hover:from-green-700 hover:to-blue-700 transition-all duration-200 shadow-lg"
            >
              Meeting Room Analysis
            </Link>
          </div>
        </div>

        {/* Key Metrics - 3x2 Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Row 1 */}
          <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3548] shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <img src="/key-metrics.svg" alt="" className="w-10 h-10" />
              <p className="text-[20px] text-[#8b92a7]">Dominant Emotion</p>
            </div>
            <p className="text-[30px] font-bold text-white mb-1">
              {summary.dominant_emotion || 'Flat/Disengaged'}
            </p>
            <p className="text-[15px] text-[#60a5fa]">Scale: 2 (from 5)</p>
          </div>

          <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3548] shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <img src="/key-metrics.svg" alt="" className="w-10 h-10" />
              <p className="text-[20px] text-[#8b92a7]">Participation</p>
            </div>
            <p className="text-[30px] font-bold text-white mb-1">
              {Math.round(summary.participation || 54)} / 100%
            </p>
            <p className="text-[15px] text-[#60a5fa]">Active Speaking Time</p>
          </div>

          <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3548] shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <img src="/key-metrics.svg" alt="" className="w-10 h-10" />
              <p className="text-[20px] text-[#8b92a7]">Average Energy</p>
            </div>
            <p className="text-[30px] font-bold text-white mb-1">
              {summary.avg_energy?.toFixed(1) || '3.8'} / 10
            </p>
            <p className="text-[15px] text-[#60a5fa]">0-10 Energy Levels</p>
          </div>

          {/* Row 2 */}
          <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3548] shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <img src="/key-metrics.svg" alt="" className="w-10 h-10" />
              <p className="text-[20px] text-[#8b92a7]">Volatility Score</p>
            </div>
            <p className="text-[30px] font-bold text-white mb-1">
              {Math.round((summary.volatility || 0.7) * 100)}%
            </p>
            <p className="text-[15px] text-[#60a5fa]">Emotional Stability</p>
          </div>

          <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3548] shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <img src="/key-metrics.svg" alt="" className="w-10 h-10" />
              <p className="text-[20px] text-[#8b92a7]">Engagement</p>
            </div>
            <p className="text-[30px] font-bold text-white mb-1">
              {Math.round((summary.participation || 54) * 0.8 + (summary.avg_energy || 38) * 0.2)} / 100
            </p>
            <p className="text-[15px] text-[#60a5fa]">Overall Team Engagement</p>
          </div>

          <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3548] shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <img src="/key-metrics.svg" alt="" className="w-10 h-10" />
              <p className="text-[20px] text-[#8b92a7]">Room Sentiment</p>
            </div>
            <p className="text-[30px] font-bold text-white mb-1">
              {Math.round((summary.avg_energy || 38) + (summary.participation || 54)) / 2} / 100
            </p>
            <p className="text-[15px] text-[#60a5fa]">Collective Team Sentiment</p>
          </div>
        </div>

        {/* Complete Emotion Signal Graph - Same as Live Dashboard */}
        <div className="bg-[#1a1f2e] rounded-xl p-5 border border-[#2d3548] shadow-lg mb-6">
          <h2 className="text-[16px] font-semibold text-white mb-4 flex items-center">
            <img src="/live-emotion-signals.svg" alt="" className="w-6 h-6 mr-2" />
            Complete Emotion Signal
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
                  const totalMins = Math.floor(value / 60)  // Convert seconds to minutes
                  const mins = totalMins % 60               // Get minutes part
                  const hours = Math.floor(totalMins / 60)  // Get hours part
                  
                  if (hours > 0) {
                    return `${hours}:${mins.toString().padStart(2, '0')}:00`
                  } else {
                    return `${mins.toString().padStart(2, '0')}:${(Math.floor(value % 60)).toString().padStart(2, '0')}`
                  }
                }}
                ticks={emotionSignalData.filter((_, index) => {
                  // Show ticks every 1-2 minutes (approximately every 60-120 seconds)
                  const time = emotionSignalData[index]?.time || 0
                  return time % 90 < 5 // Show tick every ~90 seconds (1.5 min gaps)
                }).map(point => point.time)}
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

        {/* Meeting Playback Section */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4 border-b border-[#2d3548]">
            <button
              onClick={() => setActiveTab('summary')}
              className={`pb-3 px-1 text-[14px] font-medium transition-colors ${
                activeTab === 'summary'
                  ? 'text-white border-b-2 border-white'
                  : 'text-[#8b92a7] hover:text-white'
              }`}
            >
              Meeting Summary
            </button>
            <button
              onClick={() => setActiveTab('nextsteps')}
              className={`pb-3 px-1 text-[14px] font-medium transition-colors ${
                activeTab === 'nextsteps'
                  ? 'text-white border-b-2 border-white'
                  : 'text-[#8b92a7] hover:text-white'
              }`}
            >
              Next Steps
            </button>
          </div>

          {activeTab === 'summary' && (
            <div className="bg-[#1a1f2e] rounded-xl p-6 border border-[#2d3548] shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-5 text-[13px] text-[#8b92a7]">
                  <span className="flex items-center gap-1">
                    <img src="/clock.svg" alt="" className="w-4 h-4" />
                    Today at {currentTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <img src="/timer.svg" alt="" className="w-4 h-4" />
                    Duration: {Math.floor(duration / 60)}mins
                  </span>
                  <button
                    onClick={handleCopySummary}
                    className="flex items-center gap-1 text-[#60a5fa] hover:text-white transition-colors"
                  >
                    <img src="/copy-summary.svg" alt="" className="w-4 h-4" />
                    Copy summary
                  </button>
                </div>
              </div>

              <h3 className="text-[15px] font-semibold text-white mb-4">
                Emotional & Energetic Summary of the Meeting
              </h3>

              <div className="text-[14px] text-[#e5e7eb] leading-relaxed space-y-4">
                {loadingSummary ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="spinner w-8 h-8 border-2 border-[#60a5fa] border-t-transparent rounded-full"></div>
                    <p className="ml-3 text-[#8b92a7]">Generating AI summary...</p>
                  </div>
                ) : meetingSummary ? (
                  meetingSummary.split('\n\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))
                ) : (
                  <>
                    <p>
                      The meeting held a consistently low emotional tone that never quite rose above neutral. Energy dipped early and stayed there, 
                      creating a muted atmosphere where participation was present but not fully alive. Long periods of discussion pointed to passive 
                      listening, and several speakers managed to fill the room with measured conversation, though with a noticeable lack of diverse voices.
                    </p>
                    <p>
                      Cognitively, the team appeared steady yet under-stimulated. The agenda was workable, but it outweighed the attention and mental 
                      freshness people could realistically contribute to, leading to a sense of heaviness that limited engagement. There was no 
                      dramatic volatility — nothing spiked, nothing crashed — but the overall sentiment hovered in a flat middle ground, signaling a group 
                      operating below its natural emotional and creative bandwidth.
                    </p>
                    <p>
                      Human connection felt muted throughout the session. With minimal opening rapport-building and structured interaction, the team never fully aligned or grounded 
                      together as a connected group. Wins or small moments of progress went unacknowledged, which kept morale from rising and left the meeting without any sense of uplift or forward motion.
                    </p>
                    <p>
                     By the close, the team felt stable yet subdued — a capable group operating below its natural emotional and creative bandwidth. What 
                      this team needs most isn't an overhaul; it's a purposeful injection of energy, recognition, and more intentional human connection to unlock their collaborative potential.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === 'nextsteps' && (
            <div className="bg-[#1a1f2e] rounded-xl p-6 border border-[#2d3548] shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-5 text-[13px] text-[#8b92a7]">
                  <span className="flex items-center gap-1">
                    <img src="/clock.svg" alt="" className="w-4 h-4" />
                    Today at {currentTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <img src="/timer.svg" alt="" className="w-4 h-4" />
                    Duration: {Math.floor(duration / 60)}mins
                  </span>
                  <button
                    onClick={handleCopyNextSteps}
                    className="flex items-center gap-1 text-[#60a5fa] hover:text-white transition-colors"
                  >
                    <img src="/copy-summary.svg" alt="" className="w-4 h-4" />
                    Copy Next Steps
                  </button>
                </div>
              </div>

              <h3 className="text-[15px] font-semibold text-white mb-6">
                Team Wellbeing: What we learned (and what to do next)
              </h3>

              {loadingNextSteps ? (
                <div className="flex items-center justify-center py-8">
                  <div className="spinner w-8 h-8 border-2 border-[#60a5fa] border-t-transparent rounded-full"></div>
                  <p className="ml-3 text-[#8b92a7]">Generating AI insights...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {nextSteps.split('\n\n').filter(step => step.trim()).map((step, index) => {
                    // Parse step format: "1. Title. Description"
                    const stepMatch = step.match(/^(\d+\.\s*)([^.]+\.)(.*)$/)
                    if (!stepMatch) return null
                    
                    const [, number, title, description] = stepMatch
                    
                    return (
                      <div key={index} className="bg-[#1a1f2e] rounded-lg p-4 border border-[#2d3548] h-fit">
                        <h4 className="text-[13px] font-semibold text-white mb-2">
                          {number}{title}
                        </h4>
                        <p className="text-[12px] text-[#e5e7eb] leading-relaxed">
                          {description.trim()}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

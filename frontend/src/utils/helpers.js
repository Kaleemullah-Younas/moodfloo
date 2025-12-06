export const emotionConfig = {
  '⚡ Energised': {
    color: '#00d4aa',
    emoji: '⚡',
    description: 'High energy, positive tone',
  },
  '🔥 Stressed/Tense': {
    color: '#ff4444',
    emoji: '🔥',
    description: 'High stress, tension detected',
  },
  '🌫 Flat/Disengaged': {
    color: '#888888',
    emoji: '🌫',
    description: 'Low energy, disengagement',
  },
  '💬 Thoughtful/Constructive': {
    color: '#667eea',
    emoji: '💬',
    description: 'Calm, focused discussion',
  },
  '🌪 Volatile/Unstable': {
    color: '#ffa500',
    emoji: '🌪',
    description: 'Unpredictable emotional patterns',
  },
}

export const getEmotionColor = (emotion) => {
  for (const [key, config] of Object.entries(emotionConfig)) {
    if (emotion?.includes(key.split(' ')[1])) {
      return config.color
    }
  }
  return '#667eea'
}

export const getRiskColor = (risk) => {
  const colors = {
    Low: '#00d4aa',
    Medium: '#ffa500',
    High: '#ff4444',
  }
  return colors[risk] || '#667eea'
}

export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}m ${secs}s`
}

export const getTeamStatusMessage = (emotion, energy, volatility) => {
  // Priority 1: Critical stress conditions
  if (emotion && emotion.includes('Stressed') && volatility > 7) {
    return 'High tension with emotional instability — take a break, address concerns directly, consider ending early if needed.'
  }
  
  if (emotion && emotion.includes('Stressed') && energy > 70) {
    return 'High stress and high energy detected — slow down, acknowledge pressure, allow time for processing.'
  }
  
  // Priority 2: Energy issues
  if (energy < 30 && emotion && emotion.includes('Flat')) {
    return 'Very low energy and disengagement — take a break, switch to interactive format, or reschedule if possible.'
  }
  
  if (energy < 40) {
    if (emotion && emotion.includes('Thoughtful')) {
      return 'Focused but energy dipping — keep discussion deep but add energy breaks, rotate speakers.'
    }
    return 'Energy drifting down — keep answers short, add movement breaks, rotate voices.'
  }
  
  if (energy > 80) {
    return 'Very high energy — harness momentum but watch for burnout, schedule breaks proactively.'
  }
  
  // Priority 3: High volatility situations
  if (volatility > 8) {
    return 'Extreme emotional shifts — pause for team check-in, acknowledge tension, slow the pace significantly.'
  }
  
  if (volatility > 6.5) {
    if (emotion && emotion.includes('Volatile')) {
      return 'Unstable emotional patterns — create structure, clarify objectives, allow processing time.'
    }
    return 'High emotional variability detected — pause for alignment, check if everyone is on the same page.'
  }
  
  // Priority 4: Specific emotion states
  if (emotion && emotion.includes('Stressed')) {
    if (energy < 50) {
      return 'Tension with low energy — address concerns gently, provide reassurance, consider lighter topics.'
    }
    return 'Tension rising — acknowledge concerns explicitly, create space for questions and feedback.'
  }
  
  if (emotion && emotion.includes('Flat')) {
    if (volatility > 5) {
      return 'Disengaged with some fluctuation — re-engage with direct questions, change activity type.'
    }
    return 'Low engagement detected — change format, invite participation, add visual/interactive elements.'
  }
  
  if (emotion && emotion.includes('Volatile')) {
    if (energy > 60) {
      return 'High energy but unstable — create clear structure, set boundaries, focus on concrete next steps.'
    }
    return 'Emotional instability detected — ground the discussion with facts, clarify expectations, check understanding.'
  }
  
  if (emotion && emotion.includes('Thoughtful') || emotion && emotion.includes('Constructive')) {
    if (energy > 60 && volatility < 5) {
      return 'Excellent! Team is engaged, focused and stable — maintain current approach, this is productive time.'
    }
    if (volatility > 5) {
      return 'Thoughtful but some tension — allow space for diverse views, summarize key points for alignment.'
    }
    return 'Constructive discussion underway — maintain focused pace, encourage deep thinking, watch time.'
  }
  
  if (emotion && emotion.includes('Energised')) {
    if (volatility < 4) {
      return 'Great energy and stability — excellent conditions! Keep the momentum, maximize productivity.'
    }
    if (volatility < 6) {
      return 'High positive energy — good engagement! Channel into concrete outcomes, track action items.'
    }
    return 'High energy with some volatility — maintain enthusiasm but add structure to keep focused.'
  }
  
  // Priority 5: Balanced states
  if (energy >= 45 && energy <= 70 && volatility < 5.5) {
    return 'Team is engaged and balanced — maintain current energy and pace, this is productive.'
  }
  
  if (energy >= 40 && energy < 60 && volatility < 6) {
    return 'Stable moderate engagement — good for detailed work, consider energizing break if meeting is long.'
  }
  
  // Default fallback for unclassified states
  if (volatility > 5.5) {
    return 'Mixed signals detected — check in with team, ensure clarity on objectives and next steps.'
  }
  
  return 'Monitoring team mood — stable conditions, continue as planned with awareness of energy levels.'
}

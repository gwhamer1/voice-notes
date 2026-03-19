'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const DEFAULT_PROJECTS = [
  'SPS (Sustainable Paving Stones)',
  'Pickleball Body',
  'Roof Leads',
  'AIL (Adventuring Into Life)',
  'GP Scoop',
  'General',
];

const STATUS = {
  IDLE: 'idle',
  RECORDING: 'recording',
  PROCESSING: 'processing',
  DONE: 'done',
  ERROR: 'error',
};

export default function VoiceRecorder() {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [notes, setNotes] = useState(null);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [pushed, setPushed] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [projects, setProjects] = useState(DEFAULT_PROJECTS);
  const [newProject, setNewProject] = useState('');

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const finalTranscriptRef = useRef('');

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const startTimer = () => {
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  };

  const stopTimer = () => {
    clearInterval(timerRef.current);
  };

  const startRecording = useCallback(() => {
    setError('');
    setNotes(null);
    setTranscript('');
    setInterimText('');
    setPushed(false);
    finalTranscriptRef.current = '';

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser. Use Safari on iPhone.');
      setStatus(STATUS.ERROR);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscriptRef.current += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(finalTranscriptRef.current);
      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        setError(`Mic error: ${event.error}`);
        setStatus(STATUS.ERROR);
        stopTimer();
      }
    };

    recognition.onend = () => {
      // Only auto-restart if still recording (not manually stopped)
      if (recognitionRef.current && recognitionRef.current._shouldRestart) {
        recognition.start();
      }
    };

    recognition._shouldRestart = true;
    recognitionRef.current = recognition;
    recognition.start();
    setStatus(STATUS.RECORDING);
    startTimer();
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recognitionRef.current) return;
    recognitionRef.current._shouldRestart = false;
    recognitionRef.current.stop();
    recognitionRef.current = null;
    stopTimer();

    const fullTranscript = finalTranscriptRef.current.trim();
    if (!fullTranscript) {
      setError('No speech detected. Try again.');
      setStatus(STATUS.IDLE);
      return;
    }

    setStatus(STATUS.PROCESSING);

    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: fullTranscript, projects }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Processing failed');

      setNotes(data.notes);
      setTranscript(data.transcript);
      setStatus(STATUS.DONE);
    } catch (err) {
      setError(err.message);
      setStatus(STATUS.ERROR);
    }
  }, [projects]);

  const pushToSheets = async () => {
    if (!notes) return;
    setPushed('pushing');
    try {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPushed('done');
    } catch (err) {
      setError(err.message);
      setPushed(false);
    }
  };

  const reset = () => {
    setStatus(STATUS.IDLE);
    setNotes(null);
    setTranscript('');
    setInterimText('');
    setError('');
    setPushed(false);
    setElapsed(0);
  };

  const addProject = () => {
    if (newProject.trim()) {
      setProjects(p => [...p, newProject.trim()]);
      setNewProject('');
    }
  };

  const removeProject = (i) => {
    setProjects(p => p.filter((_, idx) => idx !== i));
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>◉</span>
          <span style={styles.logoText}>VOICE NOTES</span>
        </div>
        <button style={styles.settingsBtn} onClick={() => setShowProjects(p => !p)}>
          {showProjects ? '✕ close' : '⚙ projects'}
        </button>
      </div>

      {/* Projects panel */}
      {showProjects && (
        <div style={styles.projectsPanel}>
          <div style={styles.panelTitle}>PROJECT ROUTING</div>
          <div style={styles.panelSub}>Say these names at the start of a note to auto-route.</div>
          {projects.map((p, i) => (
            <div key={i} style={styles.projectRow}>
              <span style={styles.projectName}>{p}</span>
              <button style={styles.removeBtn} onClick={() => removeProject(i)}>✕</button>
            </div>
          ))}
          <div style={styles.addRow}>
            <input
              style={styles.addInput}
              value={newProject}
              onChange={e => setNewProject(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addProject()}
              placeholder="Add project..."
            />
            <button style={styles.addBtn} onClick={addProject}>+</button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={styles.main}>
        {/* Record button area */}
        <div style={styles.recordArea}>
          {status === STATUS.IDLE && (
            <>
              <button style={styles.recordBtn} onClick={startRecording}>
                <span style={styles.recordDot} />
              </button>
              <div style={styles.hint}>tap to record</div>
            </>
          )}

          {status === STATUS.RECORDING && (
            <>
              <button style={{ ...styles.recordBtn, ...styles.recordBtnActive }} onClick={stopRecording}>
                <span style={styles.stopSquare} />
              </button>
              <div style={styles.timer}>{formatTime(elapsed)}</div>
              <div style={styles.hint}>tap to stop</div>
            </>
          )}

          {status === STATUS.PROCESSING && (
            <>
              <div style={styles.processingOrb} />
              <div style={styles.processingText}>processing...</div>
            </>
          )}
        </div>

        {/* Live transcript during recording */}
        {status === STATUS.RECORDING && (transcript || interimText) && (
          <div style={styles.liveBox}>
            <div style={styles.liveLabel}>LIVE</div>
            <div style={styles.liveText}>
              <span style={{ color: 'var(--text)' }}>{transcript}</span>
              <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>{interimText}</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {status === STATUS.ERROR && (
          <div style={styles.errorBox}>
            <div style={styles.errorText}>{error}</div>
            <button style={styles.retryBtn} onClick={reset}>try again</button>
          </div>
        )}

        {/* Results */}
        {status === STATUS.DONE && notes && (
          <div style={styles.results}>
            {/* Project badge */}
            <div style={styles.projectBadge}>
              <span style={styles.projectBadgeLabel}>PROJECT</span>
              <span style={styles.projectBadgeValue}>{notes.project}</span>
            </div>

            {/* Title */}
            <div style={styles.noteTitle}>{notes.title}</div>

            {/* Summary */}
            <div style={styles.section}>
              <div style={styles.sectionLabel}>SUMMARY</div>
              {notes.summary.map((b, i) => (
                <div key={i} style={styles.bullet}>
                  <span style={styles.bulletDot}>—</span>
                  <span>{b}</span>
                </div>
              ))}
            </div>

            {/* Action items */}
            {notes.action_items && notes.action_items.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>ACTION ITEMS</div>
                {notes.action_items.map((a, i) => (
                  <div key={i} style={styles.actionItem}>
                    <span style={styles.checkbox}>□</span>
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Raw transcript */}
            <details style={styles.details}>
              <summary style={styles.detailsSummary}>raw transcript</summary>
              <div style={styles.rawText}>{transcript}</div>
            </details>

            {/* Buttons */}
            <div style={styles.btnRow}>
              {pushed === 'done' ? (
                <div style={styles.pushedBadge}>✓ saved to sheets</div>
              ) : (
                <button
                  style={{ ...styles.pushBtn, ...(pushed === 'pushing' ? styles.pushBtnDisabled : {}) }}
                  onClick={pushToSheets}
                  disabled={pushed === 'pushing'}
                >
                  {pushed === 'pushing' ? 'saving...' : '↗ push to sheets'}
                </button>
              )}
              <button style={styles.newNoteBtn} onClick={reset}>new note</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#e8e8e8',
    fontFamily: "'IBM Plex Sans', sans-serif",
    maxWidth: '480px',
    margin: '0 auto',
    padding: '0 0 80px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid #1a1a1a',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logo: {
    fontSize: '18px',
    color: '#e8ff5a',
  },
  logoText: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '13px',
    fontWeight: '500',
    letterSpacing: '0.15em',
    color: '#e8e8e8',
  },
  settingsBtn: {
    background: 'none',
    border: '1px solid #2a2a2a',
    color: '#888888',
    fontSize: '12px',
    fontFamily: "'IBM Plex Mono', monospace",
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  projectsPanel: {
    background: '#111111',
    borderBottom: '1px solid #2a2a2a',
    padding: '20px 24px',
  },
  panelTitle: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '11px',
    letterSpacing: '0.15em',
    color: '#e8ff5a',
    marginBottom: '6px',
  },
  panelSub: {
    fontSize: '13px',
    color: '#555555',
    marginBottom: '16px',
  },
  projectRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #1a1a1a',
  },
  projectName: {
    fontSize: '14px',
    color: '#e8e8e8',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: '#444444',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '4px 8px',
  },
  addRow: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  },
  addInput: {
    flex: 1,
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    color: '#e8e8e8',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: "'IBM Plex Sans', sans-serif",
    outline: 'none',
  },
  addBtn: {
    background: '#e8ff5a',
    border: 'none',
    color: '#0a0a0a',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '500',
    lineHeight: 1,
  },
  main: {
    padding: '40px 24px 24px',
  },
  recordArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '32px',
  },
  recordBtn: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    border: '2px solid #2a2a2a',
    background: '#111111',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
    WebkitTapHighlightColor: 'transparent',
  },
  recordBtnActive: {
    border: '2px solid #ff4444',
    background: '#1a0000',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  recordDot: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#e8ff5a',
    display: 'block',
  },
  stopSquare: {
    width: '32px',
    height: '32px',
    borderRadius: '4px',
    background: '#ff4444',
    display: 'block',
  },
  timer: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '28px',
    fontWeight: '500',
    color: '#ff4444',
    letterSpacing: '0.05em',
  },
  hint: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '12px',
    color: '#444444',
    letterSpacing: '0.1em',
  },
  processingOrb: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    border: '2px solid #e8ff5a',
    borderTopColor: 'transparent',
    animation: 'spin 1s linear infinite',
  },
  processingText: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '13px',
    color: '#e8ff5a',
    letterSpacing: '0.1em',
  },
  liveBox: {
    background: '#111111',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
  },
  liveLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '10px',
    letterSpacing: '0.2em',
    color: '#ff4444',
    marginBottom: '8px',
  },
  liveText: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#888888',
  },
  errorBox: {
    background: '#1a0000',
    border: '1px solid #3a0000',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
  },
  errorText: {
    color: '#ff4444',
    fontSize: '14px',
    marginBottom: '16px',
  },
  retryBtn: {
    background: 'none',
    border: '1px solid #ff4444',
    color: '#ff4444',
    padding: '8px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '12px',
  },
  results: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  projectBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    background: '#1a1a00',
    border: '1px solid #3a3a00',
    padding: '8px 14px',
    borderRadius: '4px',
    alignSelf: 'flex-start',
  },
  projectBadgeLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '10px',
    letterSpacing: '0.15em',
    color: '#666600',
  },
  projectBadgeValue: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#e8ff5a',
  },
  noteTitle: {
    fontSize: '22px',
    fontWeight: '500',
    color: '#e8e8e8',
    lineHeight: '1.3',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '10px',
    letterSpacing: '0.15em',
    color: '#555555',
    marginBottom: '4px',
  },
  bullet: {
    display: 'flex',
    gap: '12px',
    fontSize: '15px',
    lineHeight: '1.5',
    color: '#cccccc',
  },
  bulletDot: {
    color: '#444444',
    flexShrink: 0,
    marginTop: '1px',
  },
  actionItem: {
    display: 'flex',
    gap: '12px',
    fontSize: '15px',
    lineHeight: '1.5',
    color: '#e8ff5a',
    alignItems: 'flex-start',
  },
  checkbox: {
    color: '#666600',
    flexShrink: 0,
  },
  details: {
    borderTop: '1px solid #1a1a1a',
    paddingTop: '16px',
  },
  detailsSummary: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '12px',
    color: '#444444',
    cursor: 'pointer',
    letterSpacing: '0.05em',
    marginBottom: '10px',
  },
  rawText: {
    fontSize: '13px',
    color: '#555555',
    lineHeight: '1.7',
    fontStyle: 'italic',
    marginTop: '10px',
  },
  btnRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    paddingTop: '8px',
  },
  pushBtn: {
    background: '#e8ff5a',
    border: 'none',
    color: '#0a0a0a',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '13px',
    fontWeight: '500',
    flex: 1,
  },
  pushBtnDisabled: {
    opacity: 0.5,
  },
  pushedBadge: {
    display: 'flex',
    alignItems: 'center',
    color: '#44ff88',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '13px',
    flex: 1,
    padding: '12px 0',
  },
  newNoteBtn: {
    background: 'none',
    border: '1px solid #2a2a2a',
    color: '#888888',
    padding: '12px 24px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '13px',
  },
};

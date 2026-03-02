import { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Play, Pause, RotateCcw, Plus, Trash2, BookOpen, Clock, CheckCircle, PlusCircle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
    getStudySubjects, addStudySubject, deleteStudySubject,
    getStudySessionsForDate, addStudySession, deleteStudySession
} from '../lib/store';

const PRESETS = [
    { label: '25m', mins: 25 },
    { label: '30m', mins: 30 },
    { label: '45m', mins: 45 },
    { label: '60m', mins: 60 },
    { label: '90m', mins: 90 },
];

export default function StudyTimer() {
    const today = format(new Date(), 'yyyy-MM-dd');
    const [subjects, setSubjects] = useState(getStudySubjects());
    const [sessions, setSessions] = useState(getStudySessionsForDate(today));
    const [selectedSubject, setSelectedSubject] = useState('');
    const [newSubject, setNewSubject] = useState('');
    const [showAddSubject, setShowAddSubject] = useState(false);

    // Manual add state
    const [showManualAdd, setShowManualAdd] = useState(false);
    const [manualSubject, setManualSubject] = useState('');
    const [manualMins, setManualMins] = useState('');
    const [manualNote, setManualNote] = useState('');

    // Timer state
    const [durationMins, setDurationMins] = useState(45);
    const [customMins, setCustomMins] = useState('');
    const [timeLeft, setTimeLeft] = useState(45 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const intervalRef = useRef(null);
    const startTimeRef = useRef(null);

    const totalSeconds = durationMins * 60;
    const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;

    // Auto-select first subject
    useEffect(() => {
        if (subjects.length > 0 && !selectedSubject) {
            setSelectedSubject(subjects[0].id);
        }
    }, [subjects]);

    // Timer tick
    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(intervalRef.current);
                        setIsRunning(false);
                        handleTimerComplete();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(intervalRef.current);
    }, [isRunning]);

    const handleTimerComplete = useCallback(() => {
        if (!selectedSubject) return;
        const session = addStudySession({
            subject_id: selectedSubject,
            duration_mins: durationMins,
            date: today,
        });
        setSessions(getStudySessionsForDate(today));
        const subjectName = subjects.find(s => s.id === selectedSubject)?.name || 'Unknown';
        toast.success(`${durationMins} min session logged for ${subjectName}!`);

        // Play a notification sound
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 830;
            osc.type = 'sine';
            gain.gain.value = 0.3;
            osc.start();
            setTimeout(() => { osc.stop(); ctx.close(); }, 300);
        } catch (e) { /* ignore */ }
    }, [selectedSubject, durationMins, today, subjects]);

    function handleStart() {
        if (!selectedSubject) {
            toast.error('Select a subject first');
            return;
        }
        setIsRunning(true);
        setHasStarted(true);
        if (!startTimeRef.current) startTimeRef.current = Date.now();
    }

    function handlePause() {
        setIsRunning(false);
        clearInterval(intervalRef.current);
    }

    function handleReset() {
        setIsRunning(false);
        setHasStarted(false);
        clearInterval(intervalRef.current);
        setTimeLeft(durationMins * 60);
        startTimeRef.current = null;
    }

    function handleStop() {
        // Save partial session
        if (!selectedSubject || !hasStarted) return;
        const elapsedMins = Math.round((totalSeconds - timeLeft) / 60);
        if (elapsedMins >= 1) {
            addStudySession({
                subject_id: selectedSubject,
                duration_mins: elapsedMins,
                date: today,
            });
            setSessions(getStudySessionsForDate(today));
            const subjectName = subjects.find(s => s.id === selectedSubject)?.name || 'Unknown';
            toast.success(`${elapsedMins} min session logged for ${subjectName}!`);
        }
        handleReset();
    }

    function setPresetDuration(mins) {
        if (isRunning) return;
        setDurationMins(mins);
        setTimeLeft(mins * 60);
        setHasStarted(false);
        setCustomMins('');
        startTimeRef.current = null;
    }

    function handleCustomDuration() {
        const mins = parseInt(customMins);
        if (mins > 0 && mins <= 300) {
            setPresetDuration(mins);
        }
    }

    function handleAddSubject() {
        const name = newSubject.trim();
        if (!name) return;
        if (subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) {
            toast.error('Subject already exists');
            return;
        }
        const sub = addStudySubject(name);
        setSubjects(getStudySubjects());
        setSelectedSubject(sub.id);
        setNewSubject('');
        setShowAddSubject(false);
        toast.success(`Added "${name}"`);
    }

    function handleDeleteSubject(id) {
        deleteStudySubject(id);
        setSubjects(getStudySubjects());
        setSessions(getStudySessionsForDate(today));
        if (selectedSubject === id) setSelectedSubject('');
        toast.success('Subject removed');
    }

    function handleDeleteSession(id) {
        deleteStudySession(id);
        setSessions(getStudySessionsForDate(today));
        toast.success('Session deleted');
    }

    function handleManualAdd() {
        const subId = manualSubject || selectedSubject;
        const mins = parseInt(manualMins);
        if (!subId) { toast.error('Select a subject'); return; }
        if (!mins || mins < 1 || mins > 600) { toast.error('Enter valid minutes (1–600)'); return; }
        addStudySession({
            subject_id: subId,
            duration_mins: mins,
            date: today,
            note: manualNote.trim(),
        });
        setSessions(getStudySessionsForDate(today));
        const subjectName = subjects.find(s => s.id === subId)?.name || 'Unknown';
        toast.success(`${mins} min manually added for ${subjectName}`);
        setManualMins('');
        setManualNote('');
        setShowManualAdd(false);
    }

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const todayTotal = sessions.reduce((sum, s) => sum + s.duration_mins, 0);
    const todayHours = Math.floor(todayTotal / 60);
    const todayMins = todayTotal % 60;

    // SVG ring
    const radius = 110;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    const selectedSubjectData = subjects.find(s => s.id === selectedSubject);
    const ringColor = selectedSubjectData?.color || '#7c5cfc';

    return (
        <div>
            <div className="page-header">
                <h2>Study Timer</h2>
                <p>Focus on one subject at a time. Track every minute.</p>
            </div>

            <div className="study-timer-layout">
                {/* Left: Timer */}
                <div className="study-timer-main">
                    <div className="card study-timer-card">
                        {/* Subject Selector */}
                        <div className="study-subject-selector">
                            <div className="study-subject-row">
                                <select
                                    id="study-subject-select"
                                    value={selectedSubject}
                                    onChange={e => setSelectedSubject(e.target.value)}
                                    className="study-select"
                                    disabled={isRunning}
                                >
                                    <option value="">Select subject…</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                <button
                                    id="add-subject-btn"
                                    className="btn-icon-sm"
                                    onClick={() => setShowAddSubject(!showAddSubject)}
                                    title="Add subject"
                                    disabled={isRunning}
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            {showAddSubject && (
                                <div className="study-add-subject">
                                    <input
                                        id="new-subject-input"
                                        type="text"
                                        value={newSubject}
                                        onChange={e => setNewSubject(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
                                        placeholder="Subject name…"
                                        className="study-input"
                                        autoFocus
                                    />
                                    <button id="save-subject-btn" className="btn-sm btn-primary" onClick={handleAddSubject}>Add</button>
                                </div>
                            )}
                        </div>

                        {/* Timer Ring */}
                        <div className="study-timer-ring-container">
                            <svg className="study-timer-ring" viewBox="0 0 260 260">
                                <circle cx="130" cy="130" r={radius}
                                    fill="none" stroke="var(--border-primary)" strokeWidth="6"
                                />
                                <circle cx="130" cy="130" r={radius}
                                    fill="none"
                                    stroke={ringColor}
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    style={{ transition: 'stroke-dashoffset 0.5s ease', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                                />
                            </svg>
                            <div className="study-timer-display">
                                <div className="study-timer-time">{timeDisplay}</div>
                                <div className="study-timer-label">
                                    {isRunning ? 'Focusing…' : hasStarted ? 'Paused' : 'Ready'}
                                </div>
                            </div>
                        </div>

                        {/* Duration Presets */}
                        <div className="study-presets">
                            {PRESETS.map(p => (
                                <button
                                    key={p.mins}
                                    className={`study-preset ${durationMins === p.mins && !isRunning && !hasStarted ? 'active' : ''}`}
                                    onClick={() => setPresetDuration(p.mins)}
                                    disabled={isRunning}
                                >
                                    {p.label}
                                </button>
                            ))}
                            <div className="study-custom-input">
                                <input
                                    id="custom-duration-input"
                                    type="number"
                                    min="1"
                                    max="300"
                                    value={customMins}
                                    onChange={e => setCustomMins(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCustomDuration()}
                                    placeholder="Min"
                                    className="study-input study-input-sm"
                                    disabled={isRunning}
                                />
                                <button className="btn-sm" onClick={handleCustomDuration} disabled={isRunning}>Set</button>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="study-controls">
                            {!isRunning ? (
                                <button id="start-timer-btn" className="study-btn study-btn-start" onClick={handleStart}>
                                    <Play size={20} /> {hasStarted ? 'Resume' : 'Start'}
                                </button>
                            ) : (
                                <button id="pause-timer-btn" className="study-btn study-btn-pause" onClick={handlePause}>
                                    <Pause size={20} /> Pause
                                </button>
                            )}
                            {hasStarted && (
                                <>
                                    <button id="stop-save-btn" className="study-btn study-btn-stop" onClick={handleStop} title="Stop and save elapsed time">
                                        <CheckCircle size={18} /> Save & Stop
                                    </button>
                                    <button id="reset-timer-btn" className="study-btn study-btn-reset" onClick={handleReset} title="Reset without saving">
                                        <RotateCcw size={18} /> Reset
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Sidebar */}
                <div className="study-timer-sidebar">
                    {/* Today's Sessions */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title"><Clock size={18} /> Today's Sessions</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="study-today-total">
                                    {todayHours > 0 && `${todayHours}h `}{todayMins}m total
                                </div>
                                <button
                                    className="btn-icon-sm"
                                    onClick={() => setShowManualAdd(!showManualAdd)}
                                    title="Manually add time"
                                    style={{ width: '30px', height: '30px' }}
                                >
                                    <PlusCircle size={15} />
                                </button>
                            </div>
                        </div>

                        {/* Manual Add Form */}
                        {showManualAdd && (
                            <div className="study-manual-add">
                                <select
                                    value={manualSubject || selectedSubject}
                                    onChange={e => setManualSubject(e.target.value)}
                                    className="study-select"
                                    style={{ fontSize: '0.8rem', padding: '7px 10px' }}
                                >
                                    <option value="">Select subject…</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input
                                        type="number"
                                        min="1"
                                        max="600"
                                        value={manualMins}
                                        onChange={e => setManualMins(e.target.value)}
                                        placeholder="Minutes"
                                        className="study-input"
                                        style={{ width: '90px', flex: 'none' }}
                                    />
                                    <input
                                        type="text"
                                        value={manualNote}
                                        onChange={e => setManualNote(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleManualAdd()}
                                        placeholder="Reason / note (optional)"
                                        className="study-input"
                                    />
                                </div>
                                <button className="btn-sm btn-primary" onClick={handleManualAdd} style={{ alignSelf: 'flex-end' }}>Add Session</button>
                            </div>
                        )}

                        {sessions.length === 0 ? (
                            <div className="empty-state">
                                <p>No sessions yet today. Start your first timer!</p>
                            </div>
                        ) : (
                            <div className="study-session-list">
                                {sessions.slice().reverse().map(s => {
                                    const sub = subjects.find(x => x.id === s.subject_id);
                                    return (
                                        <div key={s.id} className="study-session-item">
                                            <div className="study-session-dot" style={{ background: sub?.color || '#666' }} />
                                            <div className="study-session-info">
                                                <div>
                                                    <span className="study-session-name">{sub?.name || 'Unknown'}</span>
                                                    {s.note && <span className="study-session-note">{s.note}</span>}
                                                </div>
                                                <span className="study-session-time">{s.duration_mins} min</span>
                                            </div>
                                            <button
                                                className="btn-icon-ghost"
                                                onClick={() => handleDeleteSession(s.id)}
                                                title="Delete session"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* All Subjects */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title"><BookOpen size={18} /> Subjects</div>
                        </div>
                        {subjects.length === 0 ? (
                            <div className="empty-state">
                                <p>Add a subject to get started</p>
                            </div>
                        ) : (
                            <div className="study-subject-list">
                                {subjects.map(s => (
                                    <div key={s.id} className="study-subject-item">
                                        <div className="study-session-dot" style={{ background: s.color }} />
                                        <span className="study-subject-name">{s.name}</span>
                                        <button
                                            className="btn-icon-ghost"
                                            onClick={() => handleDeleteSubject(s.id)}
                                            title="Remove subject"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

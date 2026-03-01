import { useState, useEffect } from 'react';
import { format, subDays, isToday } from 'date-fns';
import { BookOpen, ChevronLeft, ChevronRight, Save, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getJournalForDate, upsertJournal, getAllJournalEntries } from '../lib/store';
import toast from 'react-hot-toast';

const MOODS = [
    { key: 'happy', label: 'Happy', color: 'var(--mood-happy)' },
    { key: 'productive', label: 'Productive', color: 'var(--mood-productive)' },
    { key: 'energized', label: 'Energized', color: 'var(--mood-energized)' },
    { key: 'grateful', label: 'Grateful', color: 'var(--mood-grateful)' },
    { key: 'tired', label: 'Tired', color: 'var(--mood-tired)' },
    { key: 'sad', label: 'Sad', color: 'var(--mood-sad)' },
    { key: 'frustrated', label: 'Frustrated', color: 'var(--mood-frustrated)' },
    { key: 'anxious', label: 'Anxious', color: 'var(--mood-anxious)' },
];

const MOOD_VALUES = {
    happy: 5, productive: 5, energized: 4, grateful: 4,
    tired: 2, sad: 1, frustrated: 1, anxious: 2, '': 3,
};

export default function Journal() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const [content, setContent] = useState('');
    const [mood, setMood] = useState('');
    const [allEntries, setAllEntries] = useState([]);

    useEffect(() => {
        const entry = getJournalForDate(dateStr);
        if (entry) {
            setContent(entry.content);
            setMood(entry.mood);
        } else {
            setContent('');
            setMood('');
        }
        setAllEntries(getAllJournalEntries());
    }, [dateStr]);

    function handleSave() {
        upsertJournal(dateStr, content, mood);
        setAllEntries(getAllJournalEntries());
        toast.success('Journal saved');
    }

    // Mood trend data (last 30 days)
    const moodTrend = [];
    for (let i = 29; i >= 0; i--) {
        const day = subDays(new Date(), i);
        const ds = format(day, 'yyyy-MM-dd');
        const entry = allEntries.find(e => e.date === ds);
        moodTrend.push({
            day: format(day, 'MMM d'),
            value: entry ? (MOOD_VALUES[entry.mood] || 3) : null,
            mood: entry?.mood || '',
        });
    }

    const tooltipStyle = {
        backgroundColor: '#1e1e2a',
        border: '1px solid #22222e',
        borderRadius: '8px',
        color: '#e8e8f0',
        fontSize: '0.78rem',
    };

    return (
        <div>
            <div className="page-header">
                <h2>Journal & Reflection</h2>
                <p>Write about your day and track your mood</p>
            </div>

            {/* Date Nav */}
            <div className="date-nav">
                <button className="date-nav-btn" onClick={() => setCurrentDate(subDays(currentDate, 1))}>
                    <ChevronLeft size={18} />
                </button>
                <h2 style={{ fontSize: '1.15rem' }}>{format(currentDate, 'EEEE, MMMM d, yyyy')}</h2>
                <button className="date-nav-btn" onClick={() => setCurrentDate(new Date(currentDate.getTime() + 86400000))}>
                    <ChevronRight size={18} />
                </button>
                {!isToday(currentDate) && (
                    <button className="date-today-btn" onClick={() => setCurrentDate(new Date())}>Today</button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
                {/* Write Entry */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title"><BookOpen /> Today's Reflection</div>
                        <button className="btn btn-primary btn-sm" onClick={handleSave}>
                            <Save size={14} /> Save
                        </button>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label className="input-label">How are you feeling?</label>
                        <div className="mood-tags">
                            {MOODS.map(m => (
                                <button
                                    key={m.key}
                                    className={`mood-tag ${m.key} ${mood === m.key ? 'selected' : ''}`}
                                    onClick={() => setMood(mood === m.key ? '' : m.key)}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <textarea
                        className="textarea"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Write about your day... What went well? What could be better? What are you grateful for?"
                        style={{ minHeight: '200px' }}
                    />
                </div>

                {/* Right side: Mood chart + history */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Mood Trend */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title"><TrendingUp /> Mood Trend (30 days)</div>
                        </div>
                        <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={moodTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#22222e" />
                                <XAxis
                                    dataKey="day"
                                    tick={{ fill: '#5a5a70', fontSize: 9 }}
                                    axisLine={false}
                                    interval={4}
                                />
                                <YAxis
                                    domain={[0, 5]}
                                    tick={{ fill: '#5a5a70', fontSize: 10 }}
                                    axisLine={false}
                                    ticks={[1, 2, 3, 4, 5]}
                                    tickFormatter={v => {
                                        const labels = { 1: '😢', 2: '😐', 3: '🙂', 4: '😊', 5: '🤩' };
                                        return labels[v] || '';
                                    }}
                                />
                                <Tooltip
                                    contentStyle={tooltipStyle}
                                    formatter={(value, name, props) => [props.payload.mood || 'No entry', 'Mood']}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#7c5cfc"
                                    strokeWidth={2}
                                    dot={{ fill: '#7c5cfc', r: 3 }}
                                    connectNulls
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Journal History */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Recent Entries</div>
                        </div>
                        <div className="journal-history" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {allEntries.length === 0 ? (
                                <div className="empty-state"><p>No entries yet. Start writing!</p></div>
                            ) : (
                                allEntries.slice(0, 15).map(entry => {
                                    const moodObj = MOODS.find(m => m.key === entry.mood);
                                    return (
                                        <div
                                            key={entry.id}
                                            className="journal-entry-card"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => setCurrentDate(new Date(entry.date + 'T00:00:00'))}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span className="journal-entry-date">
                                                    {format(new Date(entry.date + 'T00:00:00'), 'EEE, MMM d, yyyy')}
                                                </span>
                                                {moodObj && (
                                                    <span className={`mood-tag ${moodObj.key} selected`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                                                        {moodObj.label}
                                                    </span>
                                                )}
                                            </div>
                                            {entry.content && <p className="journal-entry-content">{entry.content}</p>}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

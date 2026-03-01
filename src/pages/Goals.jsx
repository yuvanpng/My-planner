import { useState, useEffect } from 'react';
import { Target, Calendar, Plus, Edit2, Trash2, CalendarDays } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, addMonths } from 'date-fns';
import {
    getWeeklyMonthlyGoals, addWeeklyMonthlyGoal, updateWeeklyMonthlyGoal, deleteWeeklyMonthlyGoal,
    getEvents, addEvent, deleteEvent, getUpcomingEvents,
} from '../lib/store';
import toast from 'react-hot-toast';

export default function Goals() {
    const [weeklyGoals, setWeeklyGoals] = useState([]);
    const [monthlyGoals, setMonthlyGoals] = useState([]);
    const [events, setEvents] = useState([]);
    const [upcomingEvents, setUpcomingEvents] = useState([]);

    const [showAddWeekly, setShowAddWeekly] = useState(false);
    const [showAddMonthly, setShowAddMonthly] = useState(false);
    const [showAddEvent, setShowAddEvent] = useState(false);

    const [goalTitle, setGoalTitle] = useState('');
    const [eventTitle, setEventTitle] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventTime, setEventTime] = useState('');
    const [eventDesc, setEventDesc] = useState('');

    useEffect(() => { load(); }, []);

    function load() {
        setWeeklyGoals(getWeeklyMonthlyGoals('weekly'));
        setMonthlyGoals(getWeeklyMonthlyGoals('monthly'));
        setEvents(getEvents());
        setUpcomingEvents(getUpcomingEvents(7));
    }

    function handleAddGoal(type) {
        if (!goalTitle.trim()) return;
        const today = new Date();
        let startDate, endDate;
        if (type === 'weekly') {
            startDate = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            endDate = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        } else {
            startDate = format(startOfMonth(today), 'yyyy-MM-dd');
            endDate = format(endOfMonth(today), 'yyyy-MM-dd');
        }
        addWeeklyMonthlyGoal({
            title: goalTitle.trim(),
            type,
            start_date: startDate,
            end_date: endDate,
        });
        setGoalTitle('');
        type === 'weekly' ? setShowAddWeekly(false) : setShowAddMonthly(false);
        load();
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} goal added`);
    }

    function handleProgressChange(id, progress) {
        updateWeeklyMonthlyGoal(id, {
            progress: parseInt(progress),
            completed: parseInt(progress) >= 100,
        });
        load();
    }

    function handleDeleteGoal(id) {
        deleteWeeklyMonthlyGoal(id);
        load();
    }

    function handleAddEvent() {
        if (!eventTitle.trim() || !eventDate) return;
        addEvent({
            title: eventTitle.trim(),
            event_date: eventDate,
            event_time: eventTime,
            description: eventDesc,
        });
        setEventTitle('');
        setEventDate('');
        setEventTime('');
        setEventDesc('');
        setShowAddEvent(false);
        load();
        toast.success('Event added');
    }

    function handleDeleteEvent(id) {
        deleteEvent(id);
        load();
    }

    function renderGoalList(goals, type) {
        return goals.length === 0 ? (
            <div className="empty-state"><p>No {type} goals set</p></div>
        ) : (
            goals.map(g => (
                <div key={g.id} className="goal-progress-item">
                    <div className="goal-progress-header">
                        <span className="goal-progress-title">{g.title}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="goal-progress-pct">{g.progress}%</span>
                            <button className="btn-icon" onClick={() => handleDeleteGoal(g.id)} style={{ color: 'var(--accent-danger)' }}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="goal-progress-bar">
                        <div className="goal-progress-fill" style={{ width: `${g.progress}%` }} />
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={g.progress}
                        onChange={e => handleProgressChange(g.id, e.target.value)}
                        className="goal-progress-slider"
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
                        <span>{format(new Date(g.start_date + 'T00:00:00'), 'MMM d')}</span>
                        <span>{format(new Date(g.end_date + 'T00:00:00'), 'MMM d')}</span>
                    </div>
                </div>
            ))
        );
    }

    return (
        <div>
            <div className="page-header">
                <h2>Goals & Events</h2>
                <p>Set weekly and monthly goals, schedule upcoming events</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
                {/* Goals Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Weekly Goals */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title"><Target /> Weekly Goals</div>
                            <button className="btn btn-primary btn-sm" onClick={() => { setShowAddWeekly(!showAddWeekly); setGoalTitle(''); }}>
                                <Plus size={14} /> Add
                            </button>
                        </div>
                        {showAddWeekly && (
                            <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
                                <input className="input" value={goalTitle} onChange={e => setGoalTitle(e.target.value)} placeholder="Weekly goal..." onKeyDown={e => e.key === 'Enter' && handleAddGoal('weekly')} autoFocus />
                                <button className="btn btn-primary btn-sm" onClick={() => handleAddGoal('weekly')}>Add</button>
                            </div>
                        )}
                        {renderGoalList(weeklyGoals, 'weekly')}
                    </div>

                    {/* Monthly Goals */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title"><CalendarDays /> Monthly Goals</div>
                            <button className="btn btn-primary btn-sm" onClick={() => { setShowAddMonthly(!showAddMonthly); setGoalTitle(''); }}>
                                <Plus size={14} /> Add
                            </button>
                        </div>
                        {showAddMonthly && (
                            <div style={{ marginBottom: '12px', display: 'flex', gap: '8px' }}>
                                <input className="input" value={goalTitle} onChange={e => setGoalTitle(e.target.value)} placeholder="Monthly goal..." onKeyDown={e => e.key === 'Enter' && handleAddGoal('monthly')} autoFocus />
                                <button className="btn btn-primary btn-sm" onClick={() => handleAddGoal('monthly')}>Add</button>
                            </div>
                        )}
                        {renderGoalList(monthlyGoals, 'monthly')}
                    </div>
                </div>

                {/* Events Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Upcoming Events */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title"><Calendar /> Upcoming This Week</div>
                        </div>
                        {upcomingEvents.length === 0 ? (
                            <div className="empty-state"><p>No upcoming events this week</p></div>
                        ) : (
                            upcomingEvents.map(e => (
                                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 4px', borderBottom: '1px solid var(--border-primary)' }}>
                                    <div style={{ width: '40px', textAlign: 'center', flexShrink: 0 }}>
                                        <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                                            {format(new Date(e.event_date + 'T00:00:00'), 'EEE')}
                                        </div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                            {format(new Date(e.event_date + 'T00:00:00'), 'd')}
                                        </div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{e.title}</div>
                                        {e.event_time && <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{e.event_time}</div>}
                                        {e.description && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{e.description}</div>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* All Events */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title"><Calendar /> All Events</div>
                            <button className="btn btn-primary btn-sm" onClick={() => setShowAddEvent(!showAddEvent)}>
                                <Plus size={14} /> Add
                            </button>
                        </div>

                        {showAddEvent && (
                            <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                                <div className="form-group">
                                    <label className="input-label">Event Title</label>
                                    <input className="input" value={eventTitle} onChange={e => setEventTitle(e.target.value)} placeholder="e.g. Team Meeting" />
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="input-label">Date</label>
                                        <input className="input" type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label className="input-label">Time (optional)</label>
                                        <input className="input" value={eventTime} onChange={e => setEventTime(e.target.value)} placeholder="e.g. 2:00 PM" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="input-label">Description (optional)</label>
                                    <input className="input" value={eventDesc} onChange={e => setEventDesc(e.target.value)} placeholder="Brief description..." />
                                </div>
                                <button className="btn btn-primary" onClick={handleAddEvent}>Add Event</button>
                            </div>
                        )}

                        {events.length === 0 ? (
                            <div className="empty-state"><p>No events scheduled</p></div>
                        ) : (
                            events.map(e => (
                                <div key={e.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '8px 4px', borderBottom: '1px solid var(--border-primary)',
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{e.title}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                                            {format(new Date(e.event_date + 'T00:00:00'), 'EEE, MMM d, yyyy')}
                                            {e.event_time && ` · ${e.event_time}`}
                                        </div>
                                    </div>
                                    <button className="btn-icon" onClick={() => handleDeleteEvent(e.id)} style={{ color: 'var(--accent-danger)' }}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

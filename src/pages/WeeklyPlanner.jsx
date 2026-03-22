import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, subDays, isSunday, getHours, parseISO } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Plus, X, Check, BookOpen, GraduationCap, Trash2 } from 'lucide-react';
import { 
    getWeeklyPlanForWeek, upsertWeeklyPlanEntry, deleteWeeklyPlanEntry, toggleWeeklyPlanComplete,
    getStudySubjects, getTopicsBySubject, upsertTopic, deleteTopic, getAllTopics
} from '../lib/store';
import toast from 'react-hot-toast';

export default function WeeklyPlanner() {
    const [view, setView] = useState('planner'); // 'planner' or 'topics'
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const now = new Date();
        const day = now.getDay(); // 0 is Sunday
        const hours = now.getHours();
        let start = startOfWeek(now, { weekStartsOn: 1 });
        // If it's Sunday evening (>= 18:00), show next week by default
        if (day === 0 && hours >= 18) {
            start = addDays(start, 7);
        }
        return start;
    });

    const [weeklyPlan, setWeeklyPlan] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [newTopic, setNewTopic] = useState('');
    const [showAddSubject, setShowAddSubject] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [activeDay, setActiveDay] = useState(null);
    const [modalSubjectId, setModalSubjectId] = useState('');
    const [modalTopicId, setModalTopicId] = useState('');
    const [modalNewTopic, setModalNewTopic] = useState('');
    const [modalTopics, setModalTopics] = useState([]);

    useEffect(() => {
        loadData();
    }, [currentWeekStart, view]);

    function loadData() {
        const weekStr = format(currentWeekStart, 'yyyy-MM-dd');
        setWeeklyPlan(getWeeklyPlanForWeek(weekStr));
        const subs = getStudySubjects();
        setSubjects(subs);
        if (subs.length > 0 && !modalSubjectId) {
            setModalSubjectId(subs[0].id);
        }
    }

    useEffect(() => {
        if (modalSubjectId) {
            setModalTopics(getTopicsBySubject(modalSubjectId));
        } else {
            setModalTopics([]);
        }
    }, [modalSubjectId]);

    const weekDays = [...Array(7)].map((_, i) => addDays(currentWeekStart, i));

    function handleAddEntry(dayDate) {
        setActiveDay(dayDate);
        setShowAddModal(true);
        if (subjects.length > 0 && !modalSubjectId) {
            setModalSubjectId(subjects[0].id);
        }
    }

    function confirmAddEntry() {
        if (!modalSubjectId) {
            toast.error('Please select a subject');
            return;
        }

        let activity = '';
        if (modalTopicId && modalTopicId !== 'new') {
            const topic = modalTopics.find(t => t.id === modalTopicId);
            activity = topic.name;
        } else if (modalNewTopic.trim()) {
            activity = modalNewTopic.trim();
            // Also add to topic tracker
            upsertTopic({
                subject_id: modalSubjectId,
                name: activity,
                status: 'not_started'
            });
        } else {
            toast.error('Please select or enter a topic');
            return;
        }

        const dateStr = format(activeDay, 'yyyy-MM-dd');
        const weekStr = format(currentWeekStart, 'yyyy-MM-dd');

        upsertWeeklyPlanEntry({
            date: dateStr,
            week_start: weekStr,
            activity: activity,
            subject_id: modalSubjectId,
        });

        setShowAddModal(false);
        setModalTopicId('');
        setModalNewTopic('');
        loadData();
        toast.success('Task added to plan');
    }

    function handleDeleteEntry(id) {
        if (confirm('Delete this plan entry?')) {
            deleteWeeklyPlanEntry(id);
            loadData();
        }
    }

    function handleToggleEntry(id) {
        toggleWeeklyPlanComplete(id);
        loadData();
    }

    // Topic Tracker Logic
    const [activeSubject, setActiveSubject] = useState(null);
    const [topics, setTopics] = useState([]);

    useEffect(() => {
        if (activeSubject) {
            setTopics(getTopicsBySubject(activeSubject.id));
        } else {
            setTopics([]);
        }
    }, [activeSubject]);

    function handleAddTopic() {
        if (!newTopic.trim() || !activeSubject) return;
        upsertTopic({
            subject_id: activeSubject.id,
            name: newTopic.trim(),
            status: 'not_started'
        });
        setNewTopic('');
        setTopics(getTopicsBySubject(activeSubject.id));
        toast.success('Topic added');
    }

    function handleToggleTopicStatus(topic) {
        const statuses = ['not_started', 'in_progress', 'completed'];
        const currentIdx = statuses.indexOf(topic.status);
        const nextStatus = statuses[(currentIdx + 1) % statuses.length];
        upsertTopic({ ...topic, status: nextStatus });
        setTopics(getTopicsBySubject(activeSubject.id));
    }

    function handleDeleteTopic(id) {
        deleteTopic(id);
        setTopics(getTopicsBySubject(activeSubject.id));
    }

    return (
        <div className="planner-page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Calendar size={28} className="text-accent" />
                    <div>
                        <h2>Weekly Planner</h2>
                        <p>Plan your studies for the week ahead</p>
                    </div>
                </div>
                <div className="tab-group">
                    <button 
                        className={`tab-btn ${view === 'planner' ? 'active' : ''}`}
                        onClick={() => setView('planner')}
                    >
                        <Calendar size={16} /> Weekly Plan
                    </button>
                    <button 
                        className={`tab-btn ${view === 'topics' ? 'active' : ''}`}
                        onClick={() => setView('topics')}
                    >
                        <BookOpen size={16} /> Topic Tracker
                    </button>
                </div>
            </div>

            {view === 'planner' ? (
                <>
                    <div className="week-nav">
                        <button className="btn-icon" onClick={() => setCurrentWeekStart(subDays(currentWeekStart, 7))}>
                            <ChevronLeft size={20} />
                        </button>
                        <span className="week-label">
                            Week of {format(currentWeekStart, 'MMMM d')} - {format(addDays(currentWeekStart, 6), 'MMMM d, yyyy')}
                        </span>
                        <button className="btn-icon" onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}>
                            <ChevronRight size={20} />
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
                            This Week
                        </button>
                    </div>

                    <div className="weekly-grid">
                        {weekDays.map((day, idx) => {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const dayEntries = weeklyPlan.filter(e => e.date === dateStr);
                            const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

                            return (
                                <div key={dateStr} className={`day-card ${isToday ? 'is-today' : ''}`}>
                                    <div className="day-card-header">
                                        <div className="day-info">
                                            <span className="day-name">{format(day, 'EEEE')}</span>
                                            <span className="day-date">{format(day, 'MMM d')}</span>
                                        </div>
                                        <button className="add-entry-btn" onClick={() => handleAddEntry(day)}>
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <div className="day-content">
                                        {dayEntries.length === 0 ? (
                                            <div className="empty-day">No plans</div>
                                        ) : (
                                            dayEntries.map(entry => (
                                                <div key={entry.id} className="weekly-entry">
                                                    <button 
                                                        className={`entry-checkbox ${entry.completed ? 'checked' : ''}`}
                                                        onClick={() => handleToggleEntry(entry.id)}
                                                    >
                                                        {entry.completed && <Check size={10} />}
                                                    </button>
                                                    <span className={`entry-text ${entry.completed ? 'completed' : ''}`}>
                                                        {entry.activity}
                                                    </span>
                                                    <button className="entry-delete" onClick={() => handleDeleteEntry(entry.id)}>
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            ) : (
                <div className="topic-tracker-layout">
                    <div className="subject-sidebar">
                        <h3>Subjects</h3>
                        <div className="subject-list">
                            {subjects.map(s => (
                                <button 
                                    key={s.id} 
                                    className={`subject-item ${activeSubject?.id === s.id ? 'active' : ''}`}
                                    onClick={() => setActiveSubject(s)}
                                    style={{ '--subject-color': s.color }}
                                >
                                    <div className="subject-dot" style={{ background: s.color }} />
                                    {s.name}
                                </button>
                            ))}
                            {subjects.length === 0 && (
                                <p className="text-tertiary" style={{ fontSize: '0.9rem', padding: '12px' }}>
                                    Add subjects in the Academic page first.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="topic-content">
                        {activeSubject ? (
                            <>
                                <div className="topic-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="subject-dot" style={{ background: activeSubject.color, width: '12px', height: '12px' }} />
                                        <h3>{activeSubject.name} Topics</h3>
                                    </div>
                                    <div className="topic-progress-mini">
                                        {topics.filter(t => t.status === 'completed').length} / {topics.length} completed
                                    </div>
                                </div>

                                <div className="add-topic-box">
                                    <input 
                                        className="input" 
                                        placeholder="Add a topic to cover..." 
                                        value={newTopic}
                                        onChange={e => setNewTopic(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddTopic()}
                                    />
                                    <button className="btn btn-primary" onClick={handleAddTopic}>
                                        <Plus size={16} /> Add Topic
                                    </button>
                                </div>

                                <div className="topic-list">
                                    {topics.map(topic => (
                                        <div key={topic.id} className="topic-row">
                                            <button 
                                                className={`topic-status-badge ${topic.status}`}
                                                onClick={() => handleToggleTopicStatus(topic)}
                                            >
                                                {topic.status.replace('_', ' ')}
                                            </button>
                                            <span className={`topic-name ${topic.status === 'completed' ? 'completed' : ''}`}>
                                                {topic.name}
                                            </span>
                                            <button className="btn-icon text-danger" onClick={() => handleDeleteTopic(topic.id)}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {topics.length === 0 && (
                                        <div className="empty-state">
                                            <p>No topics added yet for this subject.</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="empty-state" style={{ height: '300px' }}>
                                <GraduationCap size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
                                <p>Select a subject to track your progress</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h3>Add Plan for {activeDay && format(activeDay, 'EEEE, MMM d')}</h3>
                            <button className="btn-icon" onClick={() => setShowAddModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="input-label">Subject</label>
                                <select 
                                    className="select" 
                                    value={modalSubjectId} 
                                    onChange={e => setModalSubjectId(e.target.value)}
                                >
                                    <option value="" disabled>Select Subject</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="input-label">Topic</label>
                                <select 
                                    className="select" 
                                    value={modalTopicId} 
                                    onChange={e => setModalTopicId(e.target.value)}
                                    style={{ marginBottom: modalTopicId === 'new' ? '12px' : '0' }}
                                >
                                    <option value="">-- Select Existing Topic --</option>
                                    {modalTopics.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                    <option value="new">+ Add New Topic</option>
                                </select>
                                
                                {(modalTopicId === 'new' || modalTopics.length === 0) && (
                                    <input 
                                        className="input" 
                                        placeholder="Type topic name..." 
                                        value={modalNewTopic}
                                        onChange={e => setModalNewTopic(e.target.value)}
                                        autoFocus
                                    />
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={confirmAddEntry}>
                                Add to Weekly Plan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

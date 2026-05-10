import { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, subDays } from 'date-fns';
import { Target, ChevronLeft, ChevronRight, Plus, X, Check, Trash2, Zap, Layers } from 'lucide-react';
import { 
    getFocusAreas, addFocusArea, deleteFocusArea,
    getFocusSubtopics, addFocusSubtopic, updateFocusSubtopic, deleteFocusSubtopic,
    getFocusWeeklyPlan, upsertFocusWeeklyPlan, deleteFocusWeeklyPlan, toggleFocusWeeklyPlanComplete
} from '../lib/store';
import toast from 'react-hot-toast';

export default function SkillPlanner() {
    const [view, setView] = useState('dashboard'); // 'dashboard' or 'week'
    const [focusAreas, setFocusAreas] = useState([]);
    const [activeArea, setActiveArea] = useState(null);
    const [subtopics, setSubtopics] = useState([]);
    const [newAreaName, setNewAreaName] = useState('');
    const [newSubtopic, setNewSubtopic] = useState('');

    // Weekly Plan State
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const now = new Date();
        const day = now.getDay(); // 0 is Sunday
        const hours = now.getHours();
        let start = startOfWeek(now, { weekStartsOn: 1 });
        if (day === 0 && hours >= 18) {
            start = addDays(start, 7);
        }
        return start;
    });
    const [weeklyPlan, setWeeklyPlan] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeDay, setActiveDay] = useState(null);
    const [modalAreaId, setModalAreaId] = useState('');
    const [modalSubtopicId, setModalSubtopicId] = useState('');
    const [modalSubtopics, setModalSubtopics] = useState([]);

    useEffect(() => {
        loadData();
    }, [currentWeekStart, view]);

    function loadData() {
        const areas = getFocusAreas();
        setFocusAreas(areas);
        if (areas.length > 0 && !activeArea) {
            setActiveArea(areas[0]);
        }
        if (activeArea) {
            setSubtopics(getFocusSubtopics(activeArea.id));
        }
        
        const weekStr = format(currentWeekStart, 'yyyy-MM-dd');
        setWeeklyPlan(getFocusWeeklyPlan(weekStr));
    }

    useEffect(() => {
        if (activeArea) {
            setSubtopics(getFocusSubtopics(activeArea.id));
        } else {
            setSubtopics([]);
        }
    }, [activeArea]);

    useEffect(() => {
        if (modalAreaId) {
            setModalSubtopics(getFocusSubtopics(modalAreaId));
        } else {
            setModalSubtopics([]);
        }
    }, [modalAreaId]);

    // Dashboard Actions
    function handleAddFocusArea() {
        if (!newAreaName.trim()) return;
        const area = addFocusArea({ name: newAreaName.trim() });
        setNewAreaName('');
        setActiveArea(area);
        loadData();
        toast.success('Focus Area added');
    }

    function handleDeleteFocusArea(id) {
        if (confirm('Delete this Focus Area and all its subtopics?')) {
            deleteFocusArea(id);
            setActiveArea(null);
            loadData();
        }
    }

    function handleAddSubtopic() {
        if (!newSubtopic.trim() || !activeArea) return;
        addFocusSubtopic({
            focus_area_id: activeArea.id,
            title: newSubtopic.trim(),
            status: 'not_started'
        });
        setNewSubtopic('');
        loadData();
    }

    function handleToggleSubtopic(subtopic) {
        const statuses = ['not_started', 'in_progress', 'completed'];
        const currentIdx = statuses.indexOf(subtopic.status);
        const nextStatus = statuses[(currentIdx + 1) % statuses.length];
        updateFocusSubtopic(subtopic.id, { status: nextStatus });
        loadData();
    }

    function handleDeleteSubtopic(id) {
        deleteFocusSubtopic(id);
        loadData();
    }

    // Weekly Plan Actions
    const weekDays = [...Array(7)].map((_, i) => addDays(currentWeekStart, i));

    function handleAddPlanEntry(dayDate) {
        setActiveDay(dayDate);
        setShowAddModal(true);
        if (focusAreas.length > 0 && !modalAreaId) {
            setModalAreaId(focusAreas[0].id);
        }
    }

    function confirmAddEntry() {
        if (!modalAreaId || !modalSubtopicId) {
            toast.error('Please select an Area and Subtopic');
            return;
        }

        const dateStr = format(activeDay, 'yyyy-MM-dd');
        const weekStr = format(currentWeekStart, 'yyyy-MM-dd');

        upsertFocusWeeklyPlan({
            focus_area_id: modalAreaId,
            subtopic_id: modalSubtopicId,
            date: dateStr,
            week_start: weekStr,
        });

        setShowAddModal(false);
        setModalSubtopicId('');
        loadData();
        toast.success('Task added to schedule');
    }

    function handleDeletePlanEntry(id) {
        deleteFocusWeeklyPlan(id);
        loadData();
    }

    function handleTogglePlanEntry(id) {
        toggleFocusWeeklyPlanComplete(id);
        loadData();
    }

    // Calculations
    const completedCount = subtopics.filter(s => s.status === 'completed').length;
    const totalCount = subtopics.length;
    const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    return (
        <div className="planner-page skill-planner-page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Layers size={28} className="text-accent" />
                    <div>
                        <h2>Skill Planner</h2>
                        <p>Focus areas, projects, and weekly execution</p>
                    </div>
                </div>
                <div className="tab-group">
                    <button 
                        className={`tab-btn ${view === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setView('dashboard')}
                    >
                        <Target size={16} /> Focus Dashboard
                    </button>
                    <button 
                        className={`tab-btn ${view === 'week' ? 'active' : ''}`}
                        onClick={() => setView('week')}
                    >
                        <Zap size={16} /> Execution
                    </button>
                </div>
            </div>

            {view === 'dashboard' ? (
                <div className="skill-dashboard-layout">
                    <div className="skill-sidebar">
                        <h3>Focus Areas</h3>
                        <div className="skill-add-box">
                            <input 
                                className="input" 
                                placeholder="E.g., React, AI, Design..." 
                                value={newAreaName}
                                onChange={e => setNewAreaName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddFocusArea()}
                            />
                            <button className="btn-icon text-accent" onClick={handleAddFocusArea}>
                                <Plus size={20} />
                            </button>
                        </div>
                        <div className="skill-list">
                            {focusAreas.map(area => {
                                const areaSubtopics = getFocusSubtopics(area.id);
                                const done = areaSubtopics.filter(s => s.status === 'completed').length;
                                const tot = areaSubtopics.length;
                                const pct = tot === 0 ? 0 : Math.round((done / tot) * 100);

                                return (
                                    <button 
                                        key={area.id} 
                                        className={`skill-item ${activeArea?.id === area.id ? 'active' : ''}`}
                                        onClick={() => setActiveArea(area)}
                                    >
                                        <div className="skill-item-header">
                                            <span className="skill-name">{area.name}</span>
                                            <span className="skill-pct">{pct}%</span>
                                        </div>
                                        <div className="skill-item-bar">
                                            <div className="skill-item-fill" style={{ width: `${pct}%`, backgroundColor: area.color }} />
                                        </div>
                                    </button>
                                );
                            })}
                            {focusAreas.length === 0 && (
                                <p className="text-tertiary" style={{ fontSize: '0.9rem', padding: '12px' }}>
                                    Add a focus area to get started.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="skill-content">
                        {activeArea ? (
                            <div className="skill-detail-card">
                                <div className="skill-detail-header">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <h2>{activeArea.name}</h2>
                                        <button className="btn-icon text-danger" onClick={() => handleDeleteFocusArea(activeArea.id)}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    
                                    <div className="skill-progress-container">
                                        <div className="skill-progress-text">
                                            <span>Progress</span>
                                            <span>{completedCount} / {totalCount} completed</span>
                                        </div>
                                        <div className="skill-progress-bar-large">
                                            <div 
                                                className="skill-progress-fill-large" 
                                                style={{ width: `${progressPercent}%`, backgroundColor: activeArea.color }} 
                                            />
                                            <div 
                                                className="skill-progress-glow" 
                                                style={{ width: `${progressPercent}%`, backgroundColor: activeArea.color }} 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="add-topic-box mt-4">
                                    <input 
                                        className="input" 
                                        placeholder="Add a subtopic to master..." 
                                        value={newSubtopic}
                                        onChange={e => setNewSubtopic(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddSubtopic()}
                                    />
                                    <button className="btn btn-primary" onClick={handleAddSubtopic} style={{ backgroundColor: activeArea.color, borderColor: activeArea.color }}>
                                        <Plus size={16} /> Add Subtopic
                                    </button>
                                </div>

                                <div className="topic-list mt-4">
                                    {subtopics.map(sub => (
                                        <div key={sub.id} className="topic-row glass-row">
                                            <button 
                                                className={`topic-status-badge ${sub.status}`}
                                                onClick={() => handleToggleSubtopic(sub)}
                                            >
                                                {sub.status.replace('_', ' ')}
                                            </button>
                                            <span className={`topic-name ${sub.status === 'completed' ? 'completed' : ''}`}>
                                                {sub.title}
                                            </span>
                                            <button className="btn-icon text-danger opacity-on-hover" onClick={() => handleDeleteSubtopic(sub.id)}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {subtopics.length === 0 && (
                                        <div className="empty-state">
                                            <p>No subtopics added yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="empty-state" style={{ height: '300px' }}>
                                <Target size={48} style={{ opacity: 0.2, marginBottom: '12px' }} />
                                <p>Select or create a focus area</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
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
                        {weekDays.map((day) => {
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
                                        <button className="add-entry-btn" onClick={() => handleAddPlanEntry(day)}>
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <div className="day-content">
                                        {dayEntries.length === 0 ? (
                                            <div className="empty-day">No plans</div>
                                        ) : (
                                            dayEntries.map(entry => {
                                                const area = focusAreas.find(a => a.id === entry.focus_area_id);
                                                // need to fetch subtopic title directly or from all subtopics if we loaded them,
                                                // but since we only load subtopics for activeArea, we should find it from DB.
                                                // To keep it simple, we fetch on the fly:
                                                const subs = getFocusSubtopics(entry.focus_area_id);
                                                const sub = subs.find(s => s.id === entry.subtopic_id);
                                                const title = sub ? sub.title : 'Unknown Subtopic';
                                                
                                                return (
                                                    <div key={entry.id} className="weekly-entry" style={{ borderLeft: `3px solid ${area?.color || '#ccc'}` }}>
                                                        <button 
                                                            className={`entry-checkbox ${entry.completed ? 'checked' : ''}`}
                                                            onClick={() => handleTogglePlanEntry(entry.id)}
                                                        >
                                                            {entry.completed && <Check size={10} />}
                                                        </button>
                                                        <div className="entry-details" style={{ flex: 1 }}>
                                                            <span className={`entry-text ${entry.completed ? 'completed' : ''}`} style={{ display: 'block', fontSize: '0.85rem' }}>
                                                                {title}
                                                            </span>
                                                            <span className="text-tertiary" style={{ fontSize: '0.7rem' }}>{area?.name}</span>
                                                        </div>
                                                        <button className="entry-delete" onClick={() => handleDeletePlanEntry(entry.id)}>
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h3>Schedule Execution</h3>
                            <button className="btn-icon" onClick={() => setShowAddModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="input-label">Focus Area</label>
                                <select 
                                    className="select" 
                                    value={modalAreaId} 
                                    onChange={e => setModalAreaId(e.target.value)}
                                >
                                    <option value="" disabled>Select Area</option>
                                    {focusAreas.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="input-label">Subtopic</label>
                                <select 
                                    className="select" 
                                    value={modalSubtopicId} 
                                    onChange={e => setModalSubtopicId(e.target.value)}
                                >
                                    <option value="" disabled>Select Subtopic</option>
                                    {modalSubtopics.filter(s => s.status !== 'completed').map(s => (
                                        <option key={s.id} value={s.id}>{s.title}</option>
                                    ))}
                                    {modalSubtopics.filter(s => s.status !== 'completed').length === 0 && (
                                        <option value="" disabled>No pending subtopics</option>
                                    )}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={confirmAddEntry}>
                                Add to Schedule
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

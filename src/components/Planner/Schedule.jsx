import { useState, useEffect, useRef } from 'react';
import { Clock, X, Check, GripVertical } from 'lucide-react';
import {
    getScheduleForDate, upsertScheduleEntry, deleteScheduleEntry,
    getScheduleHints, deleteScheduleHint, isScheduleSlotDone, toggleScheduleSlotDone, getTodosForDate,
} from '../../lib/store';

const TIME_SLOTS = [];
for (let h = 6; h <= 24; h++) {
    TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:00`);
}

export default function Schedule({ date }) {
    const [entries, setEntries] = useState({});
    const [slotsDone, setSlotsDone] = useState({});
    const [editingSlot, setEditingSlot] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [hints, setHints] = useState([]);
    const [showHints, setShowHints] = useState(false);
    const [filteredHints, setFilteredHints] = useState([]);
    const [draggedTodo, setDraggedTodo] = useState(null);
    const inputRef = useRef(null);
    const hintRef = useRef(null);

    useEffect(() => {
        loadEntries();
        setHints(getScheduleHints());
    }, [date]);

    useEffect(() => {
        if (editingSlot && inputRef.current) {
            inputRef.current.focus();
        }
    }, [editingSlot]);

    // Close hints on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (hintRef.current && !hintRef.current.contains(e.target)) {
                setShowHints(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function loadEntries() {
        const data = getScheduleForDate(date);
        const map = {};
        data.forEach(e => { map[e.time_slot] = e.activity; });
        setEntries(map);

        const doneMap = {};
        TIME_SLOTS.forEach(slot => {
            doneMap[slot] = isScheduleSlotDone(date, slot);
        });
        setSlotsDone(doneMap);
    }

    function handleSlotClick(slot) {
        setEditingSlot(slot);
        setEditValue(entries[slot] || '');
        setShowHints(false);
        setFilteredHints([]);
    }

    function handleSave(slot) {
        if (editValue.trim()) {
            upsertScheduleEntry(date, slot, editValue.trim());
        } else {
            deleteScheduleEntry(date, slot);
        }
        setEditingSlot(null);
        setShowHints(false);
        setHints(getScheduleHints());
        loadEntries();
    }

    function handleKeyDown(e, slot) {
        if (e.key === 'Enter') {
            handleSave(slot);
        } else if (e.key === 'Escape') {
            setEditingSlot(null);
            setShowHints(false);
        }
    }

    function handleInputChange(val) {
        setEditValue(val);
        if (val.trim().length >= 2) {
            const filtered = hints.filter(h => h.toLowerCase().includes(val.toLowerCase()));
            setFilteredHints(filtered.slice(0, 6));
            setShowHints(filtered.length > 0);
        } else {
            setFilteredHints([]);
            setShowHints(false);
        }
    }

    function selectHint(hint) {
        setEditValue(hint);
        setShowHints(false);
        if (inputRef.current) inputRef.current.focus();
    }

    function handleDeleteHint(e, hint) {
        e.preventDefault();
        e.stopPropagation();
        deleteScheduleHint(hint);
        const updatedHints = hints.map(h => h).filter(h => h.toLowerCase() !== hint.toLowerCase());
        setHints(updatedHints);
        const updatedFiltered = filteredHints.filter(h => h.toLowerCase() !== hint.toLowerCase());
        setFilteredHints(updatedFiltered);
        if (updatedFiltered.length === 0) setShowHints(false);
    }

    function handleClear(slot) {
        deleteScheduleEntry(date, slot);
        setEditingSlot(null);
        loadEntries();
    }

    function handleToggleDone(slot) {
        toggleScheduleSlotDone(date, slot);
        setSlotsDone(prev => ({ ...prev, [slot]: !prev[slot] }));
    }

    // Drag & Drop: allow dropping todos onto schedule slots
    function handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.style.background = 'var(--accent-primary-dim)';
    }

    function handleDragLeave(e) {
        e.currentTarget.style.background = '';
    }

    function handleDrop(e, slot) {
        e.preventDefault();
        e.currentTarget.style.background = '';
        const todoTitle = e.dataTransfer.getData('text/plain');
        if (todoTitle) {
            upsertScheduleEntry(date, slot, todoTitle);
            setHints(getScheduleHints());
            loadEntries();
        }
    }

    return (
        <div className="card">
            <div className="card-header">
                <div className="card-title">
                    <Clock />
                    Schedule
                </div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
                    Drag tasks here
                </span>
            </div>
            <div className="schedule-container">
                {TIME_SLOTS.map(slot => (
                    <div
                        key={slot}
                        className={`schedule-slot ${slotsDone[slot] ? 'schedule-slot-done' : ''}`}
                        onClick={() => !editingSlot && handleSlotClick(slot)}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={e => handleDrop(e, slot)}
                    >
                        {/* Checkbox */}
                        <button
                            className={`schedule-checkbox ${slotsDone[slot] ? 'checked' : ''}`}
                            onClick={e => { e.stopPropagation(); handleToggleDone(slot); }}
                            title="Mark hour as done"
                        >
                            {slotsDone[slot] && <Check size={10} />}
                        </button>

                        <span className={`schedule-time ${slotsDone[slot] ? 'done' : ''}`}>{slot}</span>

                        {editingSlot === slot ? (
                            <div style={{ flex: 1, position: 'relative' }} ref={hintRef}>
                                <input
                                    ref={inputRef}
                                    className="schedule-input"
                                    value={editValue}
                                    onChange={e => handleInputChange(e.target.value)}
                                    onBlur={() => setTimeout(() => handleSave(slot), 200)}
                                    onKeyDown={e => handleKeyDown(e, slot)}
                                    placeholder="Add activity..."
                                    onClick={e => e.stopPropagation()}
                                    onFocus={() => { }}
                                />
                                {showHints && filteredHints.length > 0 && (
                                    <div className="schedule-hints">
                                        {filteredHints.map((hint, i) => (
                                            <div
                                                key={i}
                                                className="schedule-hint-item"
                                                onMouseDown={e => { e.preventDefault(); selectHint(hint); }}
                                            >
                                                <span>{hint}</span>
                                                <button
                                                    className="hint-delete-btn"
                                                    onMouseDown={e => handleDeleteHint(e, hint)}
                                                    title="Remove from history"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <span className={`schedule-activity ${!entries[slot] ? 'schedule-activity-empty' : ''} ${slotsDone[slot] ? 'done' : ''}`}>
                                    {entries[slot] ? `- ${entries[slot]}` : '-'}
                                </span>
                                {entries[slot] && (
                                    <button
                                        className="btn-icon schedule-delete"
                                        onClick={e => { e.stopPropagation(); handleClear(slot); }}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

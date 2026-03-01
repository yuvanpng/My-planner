import { useState, useEffect } from 'react';
import { ListChecks, Check, Plus, X } from 'lucide-react';
import { getHabits, getHabitLogsForDate, toggleHabitLog, addHabit, deleteHabit } from '../../lib/store';

const CATEGORY_ORDER = ['morning', 'evening', 'night', 'general'];
const CATEGORY_LABELS = {
    morning: 'Morning',
    evening: 'Evening',
    night: 'Night',
    general: 'General',
};

export default function DailyHabits({ date }) {
    const [habits, setHabits] = useState([]);
    const [logs, setLogs] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');
    const [newCategory, setNewCategory] = useState('general');

    useEffect(() => { load(); }, [date]);

    function load() {
        setHabits(getHabits());
        setLogs(getHabitLogsForDate(date));
    }

    function isCompleted(habitId) {
        const log = logs.find(l => l.habit_id === habitId);
        return log ? log.completed : false;
    }

    function handleToggle(habitId) {
        toggleHabitLog(habitId, date);
        load();
    }

    function handleAdd() {
        if (!newName.trim()) return;
        addHabit({ name: newName.trim(), category: newCategory });
        setNewName('');
        setShowAdd(false);
        load();
    }

    function handleDelete(id) {
        deleteHabit(id);
        load();
    }

    // Group by category
    const grouped = {};
    CATEGORY_ORDER.forEach(cat => { grouped[cat] = []; });
    habits.forEach(h => {
        const cat = h.category || 'general';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(h);
    });

    return (
        <div className="card">
            <div className="card-header">
                <div className="card-title">
                    <ListChecks />
                    Daily Routine
                </div>
                <button className="btn-icon" onClick={() => setShowAdd(!showAdd)}>
                    <Plus size={16} />
                </button>
            </div>

            {CATEGORY_ORDER.map(cat => {
                if (grouped[cat].length === 0) return null;
                return (
                    <div key={cat}>
                        <div className="habit-category-label">{CATEGORY_LABELS[cat]}</div>
                        {grouped[cat].map(habit => (
                            <div key={habit.id} className="checklist-item">
                                <button
                                    className={`checkbox ${isCompleted(habit.id) ? 'checked' : ''}`}
                                    onClick={() => handleToggle(habit.id)}
                                >
                                    {isCompleted(habit.id) && <Check />}
                                </button>
                                <span className={`checklist-text ${isCompleted(habit.id) ? 'completed' : ''}`}>
                                    {habit.name}
                                </span>
                                <button className="btn-icon checklist-delete" onClick={() => handleDelete(habit.id)}>
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                );
            })}

            {showAdd && (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input
                        className="input"
                        placeholder="Habit name..."
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        autoFocus
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <select className="select" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                            <option value="morning">Morning</option>
                            <option value="evening">Evening</option>
                            <option value="night">Night</option>
                            <option value="general">General</option>
                        </select>
                        <button className="btn btn-primary btn-sm" onClick={handleAdd}>Add</button>
                    </div>
                </div>
            )}
        </div>
    );
}

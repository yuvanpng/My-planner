import { useState, useEffect } from 'react';
import { Trophy, Check, Plus, X } from 'lucide-react';
import { getDailyGoals, getGoalLogsForDate, toggleGoalLog, addDailyGoal, deleteDailyGoal } from '../../lib/store';

const CATEGORIES = [
    { key: 'physical', label: 'Physical Win', icon: '💪' },
    { key: 'technical', label: 'Technical Win', icon: '💻' },
    { key: 'mental', label: 'Mental Win', icon: '🧠' },
    { key: 'consume', label: 'Consume Eng', icon: '📚' },
];

export default function DailyGoals({ date }) {
    const [goals, setGoals] = useState([]);
    const [logs, setLogs] = useState([]);
    const [addingTo, setAddingTo] = useState(null);
    const [newName, setNewName] = useState('');

    useEffect(() => { load(); }, [date]);

    function load() {
        setGoals(getDailyGoals());
        setLogs(getGoalLogsForDate(date));
    }

    function isCompleted(goalId) {
        const log = logs.find(l => l.goal_id === goalId);
        return log ? log.completed : false;
    }

    function handleToggle(goalId) {
        toggleGoalLog(goalId, date);
        load();
    }

    function handleAdd(category) {
        if (!newName.trim()) return;
        addDailyGoal({ name: newName.trim(), category });
        setNewName('');
        setAddingTo(null);
        load();
    }

    function handleDelete(id) {
        deleteDailyGoal(id);
        load();
    }

    return (
        <div className="card">
            <div className="card-header">
                <div className="card-title">
                    <Trophy />
                    Daily Goals
                </div>
            </div>

            <div className="goals-grid">
                {CATEGORIES.map(cat => {
                    const catGoals = goals.filter(g => g.category === cat.key);
                    return (
                        <div key={cat.key} className={`goal-category ${cat.key}`}>
                            <div className="goal-category-label">
                                <span>{cat.icon}</span>
                                {cat.label}
                            </div>
                            {catGoals.map(goal => (
                                <div key={goal.id} className="checklist-item">
                                    <button
                                        className={`checkbox ${isCompleted(goal.id) ? 'checked' : ''}`}
                                        onClick={() => handleToggle(goal.id)}
                                    >
                                        {isCompleted(goal.id) && <Check />}
                                    </button>
                                    <span className={`checklist-text ${isCompleted(goal.id) ? 'completed' : ''}`} style={{ fontSize: '0.8rem' }}>
                                        {goal.name}
                                    </span>
                                    <button className="btn-icon checklist-delete" onClick={() => handleDelete(goal.id)} style={{ width: '22px', height: '22px' }}>
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            {addingTo === cat.key ? (
                                <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }}>
                                    <input
                                        className="input"
                                        style={{ fontSize: '0.75rem', padding: '5px 8px' }}
                                        placeholder="Goal name..."
                                        value={newName}
                                        onChange={e => setNewName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAdd(cat.key)}
                                        autoFocus
                                    />
                                    <button className="btn btn-primary btn-sm" style={{ fontSize: '0.68rem', padding: '4px 8px' }} onClick={() => handleAdd(cat.key)}>+</button>
                                </div>
                            ) : (
                                <button
                                    className="btn-icon"
                                    style={{ marginTop: '4px', width: '100%', justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}
                                    onClick={() => { setAddingTo(cat.key); setNewName(''); }}
                                >
                                    <Plus size={12} /> Add
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

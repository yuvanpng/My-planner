import { useState, useEffect } from 'react';
import { CheckSquare, Check, X, Plus, Calendar as CalendarIcon, GripVertical } from 'lucide-react';
import { getTodosForDate, addTodo, toggleTodo, deleteTodo } from '../../lib/store';

export default function Checklist({ date }) {
    const [tab, setTab] = useState('all');
    const [todos, setTodos] = useState([]);
    const [newTitle, setNewTitle] = useState('');
    const [newDeadline, setNewDeadline] = useState('');
    const [showDeadline, setShowDeadline] = useState(false);

    useEffect(() => { loadTodos(); }, [date, tab]);

    function loadTodos() {
        const category = tab === 'all' ? null : tab;
        setTodos(getTodosForDate(date, category));
    }

    function handleAdd() {
        if (!newTitle.trim()) return;
        const category = tab === 'all' ? 'personal' : tab;
        addTodo({
            title: newTitle.trim(),
            category,
            date,
            deadline: newDeadline || null,
        });
        setNewTitle('');
        setNewDeadline('');
        setShowDeadline(false);
        loadTodos();
    }

    function handleToggle(id) {
        toggleTodo(id);
        loadTodos();
    }

    function handleDelete(id) {
        deleteTodo(id);
        loadTodos();
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter') handleAdd();
    }

    function formatDeadline(deadline) {
        if (!deadline) return null;
        const d = new Date(deadline);
        const today = new Date(date);
        const diff = Math.floor((d - today) / (1000 * 60 * 60 * 24));
        if (diff < 0) return { text: 'Overdue', className: 'overdue' };
        if (diff === 0) return { text: 'Today', className: 'overdue' };
        if (diff === 1) return { text: 'Tomorrow', className: '' };
        return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), className: '' };
    }

    // Drag start: make todo items draggable to schedule
    function handleDragStart(e, todo) {
        e.dataTransfer.setData('text/plain', todo.title);
        e.dataTransfer.effectAllowed = 'copy';
    }

    // Show persistent task origin
    function isPersistent(todo) {
        return todo.date !== date && !todo.completed;
    }

    return (
        <div className="card">
            <div className="card-header">
                <div className="card-title">
                    <CheckSquare />
                    Checklist
                </div>
            </div>

            <div className="checklist-tabs">
                {['all', 'personal', 'academic'].map(t => (
                    <button
                        key={t}
                        className={`checklist-tab ${tab === t ? 'active' : ''}`}
                        onClick={() => setTab(t)}
                    >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>

            <div>
                {todos.map(todo => {
                    const dl = formatDeadline(todo.deadline);
                    const persistent = isPersistent(todo);
                    return (
                        <div
                            key={todo.id}
                            className="checklist-item"
                            draggable
                            onDragStart={e => handleDragStart(e, todo)}
                            style={{ cursor: 'grab' }}
                        >
                            <GripVertical size={12} style={{ color: 'var(--text-tertiary)', opacity: 0.4, flexShrink: 0 }} />
                            <button
                                className={`checkbox ${todo.completed ? 'checked' : ''}`}
                                onClick={() => handleToggle(todo.id)}
                            >
                                {todo.completed && <Check />}
                            </button>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <span className={`checklist-text ${todo.completed ? 'completed' : ''}`}>
                                    {todo.title}
                                </span>
                                {todo.isWeeklyPlan && (
                                    <span style={{ fontSize: '0.6rem', color: 'var(--accent-primary)', marginLeft: '6px', background: 'var(--accent-primary-dim)', padding: '1px 4px', borderRadius: '4px', fontWeight: 600 }}>
                                        weekly plan
                                    </span>
                                )}
                                {persistent && (
                                    <span style={{ fontSize: '0.6rem', color: 'var(--accent-warning)', marginLeft: '6px' }}>
                                        carried over
                                    </span>
                                )}
                            </div>
                            {dl && (
                                <span className={`checklist-deadline ${dl.className}`}>{dl.text}</span>
                            )}
                            <button className="btn-icon checklist-delete" onClick={() => handleDelete(todo.id)}>
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}

                {todos.length === 0 && (
                    <div className="empty-state">
                        <p>No tasks yet. Add one below.</p>
                    </div>
                )}
            </div>

            <div className="add-todo-row">
                <input
                    className="input"
                    placeholder="Add a task..."
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                <button
                    className="btn-icon"
                    onClick={() => setShowDeadline(!showDeadline)}
                    title="Set deadline"
                    style={showDeadline ? { color: 'var(--accent-primary)' } : {}}
                >
                    <CalendarIcon size={16} />
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleAdd}>
                    <Plus size={14} /> Add
                </button>
            </div>
            {showDeadline && (
                <div style={{ marginTop: '6px' }}>
                    <input
                        className="input"
                        type="date"
                        value={newDeadline}
                        onChange={e => setNewDeadline(e.target.value)}
                        style={{ maxWidth: '200px' }}
                    />
                </div>
            )}
        </div>
    );
}

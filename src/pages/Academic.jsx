import { useState, useEffect } from 'react';
import { GraduationCap, Plus, X, Check, Calendar, CheckSquare } from 'lucide-react';
import { getAcademicTodosWithDeadlines, addTodo, toggleTodo, deleteTodo, getProjects, addProject, updateProject, deleteProject } from '../lib/store';
import toast from 'react-hot-toast';

export default function Academic() {
    const [todos, setTodos] = useState([]);
    const [projects, setProjects] = useState([]);
    const [showAddTodo, setShowAddTodo] = useState(false);
    const [showAddProject, setShowAddProject] = useState(false);
    const [newTodo, setNewTodo] = useState({ title: '', deadline: '', priority: 'medium', description: '' });
    const [newProject, setNewProject] = useState({ name: '', next_meeting: '' });

    useEffect(() => { load(); }, []);

    function load() {
        setTodos(getAcademicTodosWithDeadlines());
        setProjects(getProjects());
    }

    function handleAddTodo() {
        if (!newTodo.title.trim()) return;
        addTodo({ ...newTodo, category: 'academic', date: newTodo.deadline || new Date().toISOString().split('T')[0] });
        setNewTodo({ title: '', deadline: '', priority: 'medium', description: '' });
        setShowAddTodo(false);
        toast.success('Task added');
        load();
    }

    function handleAddProject() {
        if (!newProject.name.trim()) return;
        addProject({ ...newProject, description: '', meeting_notes: '', progress: 0, semester: '' });
        setNewProject({ name: '', next_meeting: '' });
        setShowAddProject(false);
        toast.success('Project added');
        load();
    }

    function handleDateChange(id, newDate) {
        updateProject(id, { next_meeting: newDate });
        load();
    }

    function formatDeadline(deadline) {
        if (!deadline) return null;
        const d = new Date(deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = Math.floor((d - today) / (1000 * 60 * 60 * 24));
        if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, className: 'overdue' };
        if (diff === 0) return { text: 'Today', className: 'overdue' };
        if (diff === 1) return { text: 'Tomorrow', className: '' };
        return { text: `${diff}d left`, className: '' };
    }

    function formatDateShort(dateStr) {
        if (!dateStr) return '—';
        const d = new Date(dateStr + 'T00:00:00');
        const day = d.getDate();
        const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
        const month = d.toLocaleDateString('en-US', { month: 'short' });
        return `${day}${suffix} ${month}`;
    }

    function getPriorityDot(priority) {
        const colors = { high: 'var(--accent-danger)', medium: 'var(--accent-warning)', low: 'var(--accent-success)' };
        return <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors[priority] || colors.medium, flexShrink: 0 }} />;
    }

    return (
        <div>
            <div className="page-header">
                <h2>Academic</h2>
                <p>Track assignments, deadlines, and projects</p>
            </div>

            <div className="today-layout">
                {/* Assignments */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title"><GraduationCap /> Assignments & Tasks</div>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowAddTodo(!showAddTodo)}>
                            <Plus size={14} /> Add
                        </button>
                    </div>

                    {showAddTodo && (
                        <div style={{ padding: '12px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', marginBottom: '12px' }}>
                            <input className="input" placeholder="Task title" value={newTodo.title} onChange={e => setNewTodo({ ...newTodo, title: e.target.value })} style={{ marginBottom: '8px' }} />
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="input-label">Deadline</label>
                                    <input className="input" type="date" value={newTodo.deadline} onChange={e => setNewTodo({ ...newTodo, deadline: e.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="input-label">Priority</label>
                                    <select className="select" value={newTodo.priority} onChange={e => setNewTodo({ ...newTodo, priority: e.target.value })}>
                                        <option value="high">High</option>
                                        <option value="medium">Medium</option>
                                        <option value="low">Low</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-primary btn-sm" onClick={handleAddTodo}>Add Task</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddTodo(false)}>Cancel</button>
                            </div>
                        </div>
                    )}

                    {todos.length === 0 && <div className="empty-state"><p>No academic tasks yet</p></div>}
                    {todos.map(todo => {
                        const dl = formatDeadline(todo.deadline);
                        return (
                            <div key={todo.id} className="checklist-item">
                                {getPriorityDot(todo.priority)}
                                <button className={`checkbox ${todo.completed ? 'checked' : ''}`} onClick={() => { toggleTodo(todo.id); load(); }}>
                                    {todo.completed && <Check />}
                                </button>
                                <span className={`checklist-text ${todo.completed ? 'completed' : ''}`} style={{ flex: 1 }}>
                                    {todo.title}
                                </span>
                                {dl && <span className={`checklist-deadline ${dl.className}`}>{dl.text}</span>}
                                <button className="btn-icon checklist-delete" onClick={() => { deleteTodo(todo.id); load(); }}>
                                    <X size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Project Checklists */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title"><CheckSquare /> Project Checklists</div>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowAddProject(!showAddProject)}>
                            <Plus size={14} /> Add New
                        </button>
                    </div>

                    {showAddProject && (
                        <div style={{ padding: '12px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', marginBottom: '12px' }}>
                            <input
                                className="input"
                                placeholder="Project name (e.g. BI, CRM, EDA)"
                                value={newProject.name}
                                onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                                style={{ marginBottom: '8px' }}
                            />
                            <div style={{ marginBottom: '8px' }}>
                                <label className="input-label">Next Due Date</label>
                                <input
                                    className="input"
                                    type="date"
                                    value={newProject.next_meeting}
                                    onChange={e => setNewProject({ ...newProject, next_meeting: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-primary btn-sm" onClick={handleAddProject}>Add Project</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddProject(false)}>Cancel</button>
                            </div>
                        </div>
                    )}

                    {projects.length === 0 && <div className="empty-state"><p>No projects yet</p></div>}

                    <div className="project-checklist">
                        {projects.map(project => (
                            <div key={project.id} className="project-checklist-item">
                                <button
                                    className={`checkbox ${project.status === 'completed' ? 'checked' : ''}`}
                                    onClick={() => {
                                        const newStatus = project.status === 'completed' ? 'active' : 'completed';
                                        updateProject(project.id, { status: newStatus });
                                        load();
                                    }}
                                >
                                    {project.status === 'completed' && <Check />}
                                </button>

                                <span className={`project-name ${project.status === 'completed' ? 'completed' : ''}`}>
                                    {project.name}
                                </span>

                                <span className="project-arrow">→</span>

                                <span
                                    className="project-date"
                                    onClick={(e) => {
                                        // Click the hidden date input
                                        const input = e.currentTarget.nextElementSibling;
                                        if (input) input.showPicker?.() || input.click();
                                    }}
                                >
                                    {formatDateShort(project.next_meeting)}
                                </span>
                                <input
                                    type="date"
                                    className="project-date-input"
                                    value={project.next_meeting || ''}
                                    onChange={e => handleDateChange(project.id, e.target.value)}
                                />

                                <button
                                    className="btn-icon checklist-delete"
                                    onClick={() => { deleteProject(project.id); load(); }}
                                    style={{ marginLeft: '4px' }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

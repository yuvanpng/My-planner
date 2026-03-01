import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, startOfWeek, endOfWeek, isToday, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Star, Flame, Coffee } from 'lucide-react';
import { getCalendarDayData, getAllTodos, getEvents, isOffDay, toggleOffDay, calculateStreak, getHabits, getAllHabitLogs } from '../lib/store';
import toast from 'react-hot-toast';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarView() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [offDayLabel, setOffDayLabel] = useState('Holiday');

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: calStart, end: calEnd });

    // Get data for all visible days
    const allTodos = useMemo(() => getAllTodos(), [currentMonth]);
    const allEvents = useMemo(() => getEvents(), [currentMonth]);
    const dayDataMap = useMemo(() => {
        const map = {};
        calendarDays.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            map[dateStr] = {
                ...getCalendarDayData(dateStr),
                tasks: allTodos.filter(t => t.date === dateStr),
                events: allEvents.filter(e => e.event_date === dateStr),
            };
        });
        return map;
    }, [currentMonth]);

    const habits = getHabits();
    const allLogs = getAllHabitLogs();

    // Count streaks for the month
    const monthStats = useMemo(() => {
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd > new Date() ? new Date() : monthEnd });
        let bestDays = 0;
        let activeDays = 0;
        let offDays = 0;
        days.forEach(d => {
            const ds = format(d, 'yyyy-MM-dd');
            const data = dayDataMap[ds];
            if (data?.isOffDay) { offDays++; return; }
            if (data?.isBestDay) bestDays++;
            if (data?.habitsDone > 0 || data?.goalsCompleted > 0) activeDays++;
        });
        return { bestDays, activeDays, offDays, totalDays: days.length };
    }, [dayDataMap, monthStart, monthEnd]);

    function handleToggleOffDay(dateStr) {
        toggleOffDay(dateStr, offDayLabel);
        setSelectedDate(selectedDate === dateStr ? null : dateStr);
        toast.success(isOffDay(dateStr) ? 'Marked as off-day' : 'Off-day removed');
        setCurrentMonth(new Date(currentMonth));
    }

    function getDayClasses(day) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const data = dayDataMap[dateStr];
        const classes = ['calendar-cell'];
        if (isToday(day)) classes.push('today');
        if (!isSameMonth(day, currentMonth)) classes.push('other-month');
        if (data?.isOffDay) classes.push('off-day');
        if (data?.isBestDay && !data?.isOffDay) classes.push('best-day');
        return classes.join(' ');
    }

    return (
        <div>
            <div className="page-header">
                <h2>Calendar</h2>
                <p>Overview of your tasks, streaks, and off-days</p>
            </div>

            {/* Month navigation */}
            <div className="date-nav" style={{ marginBottom: '16px' }}>
                <button className="date-nav-btn" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft size={18} />
                </button>
                <h2 style={{ fontSize: '1.2rem' }}>{format(currentMonth, 'MMMM yyyy')}</h2>
                <button className="date-nav-btn" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight size={18} />
                </button>
                <button className="date-today-btn" onClick={() => setCurrentMonth(new Date())}>This Month</button>
            </div>

            {/* Month summary */}
            <div className="stats-mini-grid" style={{ marginBottom: '16px' }}>
                <div className="stat-card-mini card">
                    <div className="stat-number" style={{ fontSize: '1.3rem' }}>{monthStats.activeDays}</div>
                    <div className="stat-label">Active Days</div>
                </div>
                <div className="stat-card-mini card">
                    <div className="stat-number" style={{ fontSize: '1.3rem', color: 'var(--accent-warning)' }}>{monthStats.bestDays}</div>
                    <div className="stat-label">Best Days</div>
                </div>
                <div className="stat-card-mini card">
                    <div className="stat-number" style={{ fontSize: '1.3rem', color: 'var(--accent-danger)' }}>{monthStats.offDays}</div>
                    <div className="stat-label">Off Days</div>
                </div>
                <div className="stat-card-mini card">
                    <div className="stat-number" style={{ fontSize: '1.3rem' }}>
                        {monthStats.totalDays - monthStats.offDays > 0 ? Math.round((monthStats.activeDays / (monthStats.totalDays - monthStats.offDays)) * 100) : 0}%
                    </div>
                    <div className="stat-label">Consistency</div>
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)' }} /> Habits
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-secondary)' }} /> Goals
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Star size={10} style={{ color: 'var(--accent-warning)' }} /> Best Day
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Coffee size={10} style={{ color: 'var(--accent-danger)' }} /> Off Day
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="card" style={{ padding: '16px' }}>
                <div className="calendar-grid">
                    {WEEKDAYS.map(d => (
                        <div key={d} className="calendar-header-cell">{d}</div>
                    ))}

                    {calendarDays.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const data = dayDataMap[dateStr];
                        const inMonth = isSameMonth(day, currentMonth);
                        const tasks = data?.tasks || [];
                        const events = data?.events || [];
                        const incompleteTasks = tasks.filter(t => !t.completed);
                        const completedTasks = tasks.filter(t => t.completed);
                        const allItems = [
                            ...incompleteTasks.map(t => ({ id: t.id, label: t.title, type: 'task' })),
                            ...events.map(e => ({ id: e.id, label: e.title, type: 'event' })),
                        ];

                        return (
                            <div
                                key={dateStr}
                                className={getDayClasses(day)}
                                onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                            >
                                <span className="calendar-day-number">{format(day, 'd')}</span>

                                {/* Tasks & Events inside cell */}
                                {inMonth && allItems.length > 0 && (
                                    <div className="calendar-tasks">
                                        {allItems.slice(0, 3).map(item => (
                                            <div key={item.id} className={`calendar-task-item ${item.type === 'event' ? 'event' : ''}`}>
                                                {item.label.length > 14 ? item.label.slice(0, 12) + '…' : item.label}
                                            </div>
                                        ))}
                                        {allItems.length > 3 && (
                                            <div className="calendar-task-more">+{allItems.length - 3} more</div>
                                        )}
                                    </div>
                                )}

                                {inMonth && data && !data.isOffDay && (
                                    <div className="calendar-day-dots">
                                        {data.habitsDone > 0 && (
                                            <div className="calendar-dot" style={{ background: 'var(--accent-primary)' }} title={`${data.habitsDone} habits`} />
                                        )}
                                        {data.goalsCompleted > 0 && (
                                            <div className="calendar-dot" style={{ background: 'var(--accent-secondary)' }} title={`${data.goalsCompleted} goals`} />
                                        )}
                                        {completedTasks.length > 0 && (
                                            <div className="calendar-dot" style={{ background: 'var(--accent-success)' }} title={`${completedTasks.length} tasks done`} />
                                        )}
                                    </div>
                                )}

                                {inMonth && data?.isBestDay && !data?.isOffDay && (
                                    <span className="best-day-star">★</span>
                                )}

                                {inMonth && data?.isOffDay && (
                                    <span className="calendar-off-badge">OFF</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Selected day details or off-day toggle */}
            {selectedDate && (
                <div className="card" style={{ marginTop: '16px' }}>
                    <div className="card-header">
                        <div className="card-title">
                            <CalendarIcon /> {format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
                        </div>
                    </div>

                    {(() => {
                        const data = dayDataMap[selectedDate] || getCalendarDayData(selectedDate);
                        const tasks = data?.tasks || getTodosForDate(selectedDate);
                        return (
                            <div>
                                <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                    <div style={{ fontSize: '0.8rem' }}>
                                        <strong style={{ color: 'var(--accent-primary)' }}>{data.habitsDone}/{data.habitsTotal}</strong> habits
                                    </div>
                                    <div style={{ fontSize: '0.8rem' }}>
                                        <strong style={{ color: 'var(--accent-secondary)' }}>{data.goalsCompleted}</strong> goals
                                    </div>
                                    <div style={{ fontSize: '0.8rem' }}>
                                        <strong>{data.todoDone}/{data.todoCount}</strong> tasks
                                    </div>
                                    {data.isBestDay && (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--accent-warning)', fontWeight: 600 }}>
                                            ★ Best Day
                                        </span>
                                    )}
                                    {data.hasMood && (
                                        <span style={{ fontSize: '0.75rem', color: `var(--mood-${data.hasMood})`, fontWeight: 500 }}>
                                            Mood: {data.hasMood}
                                        </span>
                                    )}
                                </div>

                                {/* Task list for selected day */}
                                {tasks.length > 0 && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '6px', textTransform: 'uppercase' }}>Tasks</div>
                                        {tasks.map(t => (
                                            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '0.8rem' }}>
                                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.completed ? 'var(--accent-success)' : 'var(--text-tertiary)', flexShrink: 0 }} />
                                                <span style={{ textDecoration: t.completed ? 'line-through' : 'none', color: t.completed ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                                                    {t.title}
                                                </span>
                                                {t.deadline && (
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--accent-warning)', marginLeft: 'auto' }}>
                                                        {format(new Date(t.deadline), 'MMM d')}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                        className={`btn ${data.isOffDay ? 'btn-danger' : 'btn-ghost'}`}
                                        onClick={() => handleToggleOffDay(selectedDate)}
                                        style={{ fontSize: '0.75rem' }}
                                    >
                                        <Coffee size={14} />
                                        {data.isOffDay ? 'Remove Off-Day' : 'Mark as Off-Day'}
                                    </button>
                                    {!data.isOffDay && (
                                        <input
                                            className="input"
                                            value={offDayLabel}
                                            onChange={e => setOffDayLabel(e.target.value)}
                                            placeholder="Label (e.g. Holiday)"
                                            style={{ maxWidth: '180px', fontSize: '0.75rem' }}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}

import { useState, useMemo } from 'react';
import { format, subDays, eachDayOfInterval, startOfMonth, endOfMonth, startOfWeek } from 'date-fns';
import { BarChart3, Flame, TrendingUp, Activity, Award, Zap, Calendar, Trophy, CheckCircle, Target, Timer } from 'lucide-react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import {
    getAllHabits, getAllHabitLogs, getDailyGoals, getAllGoalLogs, getOffDays,
    calculateStreak, isBestDay, getAllStudySessions, getStudySubjects,
    getHabits, getHabitLogsForDate, getGoalLogsForDate, getScheduleForDate,
    getScheduleDoneForDate, getStudySessionsForDate,
} from '../lib/store';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const GOAL_COLORS = { physical: '#f97316', technical: '#3b82f6', mental: '#a855f7', consume: '#10b981' };

// Neutral progress bar — uses the app accent by default
function HorizBar({ value, max = 100, height = 6, color }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div style={{ flex: 1, height, background: 'var(--bg-elevated)', borderRadius: height / 2, overflow: 'hidden' }}>
            <div style={{
                width: `${pct}%`, height: '100%',
                background: color || 'var(--accent-primary)',
                borderRadius: height / 2,
                transition: 'width 0.6s ease',
            }} />
        </div>
    );
}

// Simple row: label left, value right, bar underneath
function MetricRow({ icon, label, value, progress, max = 100, sub }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border-primary)' }}>
            <span style={{ color: 'var(--text-tertiary)', display: 'flex', flexShrink: 0 }}>{icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{label}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginLeft: 8 }}>{value}</span>
                </div>
                <HorizBar value={progress} max={max} />
                {sub && <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: 3 }}>{sub}</div>}
            </div>
        </div>
    );
}

// Plain stat tile — no colored borders
function StatTile({ label, value }) {
    return (
        <div style={{ padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>{value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 4 }}>{label}</div>
        </div>
    );
}

const BADGE_DEFS = [
    { id: 'streak7',    icon: '🔥', label: '7-Day Streak',   desc: 'Any habit 7 days in a row',       check: s => s.maxStreak >= 7 },
    { id: 'streak30',   icon: '💎', label: '30-Day Streak',  desc: 'Any habit 30 days in a row',      check: s => s.maxStreak >= 30 },
    { id: 'study10',    icon: '📚', label: '10h Studied',    desc: '10+ total study hours',           check: s => s.totalStudyHours >= 10 },
    { id: 'study50',    icon: '🎓', label: '50h Studied',    desc: '50+ total study hours',           check: s => s.totalStudyHours >= 50 },
    { id: 'perfect',    icon: '⭐', label: 'Perfect Day',    desc: '3+ goal categories completed',   check: s => s.bestDayCount >= 1 },
    { id: 'consistent', icon: '🏆', label: 'Consistent',     desc: '80%+ monthly consistency',       check: s => s.monthlyConsistency >= 80 },
];

export default function Stats() {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

    const habits      = getAllHabits().filter(h => h.is_active);
    const habitLogs   = getAllHabitLogs();
    const goals       = getDailyGoals();
    const goalLogs    = getAllGoalLogs();
    const offDays     = new Set(getOffDays().map(d => d.date));
    const studySessions  = getAllStudySessions();
    const studySubjects  = getStudySubjects();
    const todayStr    = format(new Date(), 'yyyy-MM-dd');
    const yesterday   = subDays(new Date(), 1);

    const habitStats = useMemo(() =>
        habits.map(h => ({ ...h, ...calculateStreak(h.id) })),
    [habits, habitLogs]);

    // Today's productivity
    const productivity = useMemo(() => {
        const activeHabits   = getHabits();
        const todayHabitLogs = getHabitLogsForDate(todayStr);
        const habitsCompleted = todayHabitLogs.filter(l => l.completed).length;
        const habitsTotal     = activeHabits.length;
        const habitPct = habitsTotal > 0 ? habitsCompleted / habitsTotal : 0;

        const todayGoalLogs   = getGoalLogsForDate(todayStr);
        const goalsCompleted  = todayGoalLogs.filter(l => l.completed).length;
        const goalsTotal      = goals.length;
        const goalPct  = goalsTotal > 0 ? goalsCompleted / goalsTotal : 0;

        const entries  = getScheduleForDate(todayStr).filter(e => e.activity?.trim());
        const done     = getScheduleDoneForDate(todayStr).filter(d => d.done);
        const schedulePct = entries.length > 0 ? done.length / entries.length : 0;

        const todaySessions = getStudySessionsForDate(todayStr);
        const studyMins     = todaySessions.reduce((s, x) => s + x.duration_mins, 0);
        const studyHours    = +(studyMins / 60).toFixed(1);
        const studyPct      = Math.min(studyMins / 180, 1);

        const score = Math.round(habitPct * 30 + goalPct * 30 + schedulePct * 25 + studyPct * 15);
        const maxStreak = habitStats.length > 0 ? Math.max(...habitStats.map(h => h.currentStreak)) : 0;

        const bestCategory = Object.entries(GOAL_COLORS).map(([cat]) => {
            const catGoals = goals.filter(g => g.category === cat);
            if (!catGoals.length) return { cat, pct: 0 };
            const done = todayGoalLogs.filter(l => catGoals.map(g => g.id).includes(l.goal_id) && l.completed).length;
            return { cat, pct: done / catGoals.length };
        }).sort((a, b) => b.pct - a.pct)[0];

        return {
            score, habitsCompleted, habitsTotal, goalsCompleted, goalsTotal,
            schedulePct: Math.round(schedulePct * 100), studyHours, maxStreak,
            bestCategory: bestCategory?.pct > 0 ? bestCategory.cat : null,
        };
    }, [todayStr, goals, habitStats]);

    // Heatmap
    const heatmapData = useMemo(() => {
        const days = eachDayOfInterval({ start: subDays(new Date(), 365), end: yesterday });
        return days.map(day => {
            const d = format(day, 'yyyy-MM-dd');
            const doneHabits = habitLogs.filter(l => l.date === d && l.completed).length;
            const doneGoals  = goalLogs.filter(l => l.date === d && l.completed).length;
            const max = habits.length + goals.length;
            const ratio = max > 0 ? (doneHabits + doneGoals) / max : 0;
            let count = 0;
            if (ratio > 0.75) count = 4;
            else if (ratio > 0.5) count = 3;
            else if (ratio > 0.25) count = 2;
            else if (ratio > 0) count = 1;
            return { date: d, count, doneHabits, doneGoals };
        });
    }, [habitLogs, goalLogs, habits, goals]);

    // Weekly
    const weeklyData = useMemo(() => {
        const data = [];
        for (let i = 7; i >= 1; i--) {
            const day = subDays(new Date(), i);
            const d = format(day, 'yyyy-MM-dd');
            const dayMins = studySessions.filter(s => s.date === d).reduce((s, x) => s + x.duration_mins, 0);
            data.push({
                day: format(day, 'EEE'),
                Habits: habitLogs.filter(l => l.date === d && l.completed).length,
                Goals:  goalLogs.filter(l => l.date === d && l.completed).length,
                'Study(h)': +(dayMins / 60).toFixed(1),
            });
        }
        return data;
    }, [habitLogs, goalLogs, studySessions]);

    // Monthly
    const monthly = useMemo(() => {
        const year = new Date().getFullYear();
        const monthStart = startOfMonth(new Date(year, selectedMonth));
        const monthEnd   = endOfMonth(new Date(year, selectedMonth));
        const effectiveEnd = monthEnd > yesterday ? yesterday : monthEnd;
        if (effectiveEnd < monthStart) return null;

        const days = eachDayOfInterval({ start: monthStart, end: effectiveEnd });
        let totalHabits = 0, possHabits = 0, totalGoals = 0, possGoals = 0;
        let daysActive = 0, offCount = 0, studyMins = 0;
        const weekBuckets = {};
        const dowCounts = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
        const dowKeys = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        days.forEach(day => {
            const d = format(day, 'yyyy-MM-dd');
            if (offDays.has(d)) { offCount++; return; }
            const dh = habitLogs.filter(l => l.date === d && l.completed).length;
            const dg = goalLogs.filter(l => l.date === d && l.completed).length;
            const dm = studySessions.filter(s => s.date === d).reduce((s, x) => s + x.duration_mins, 0);
            totalHabits += dh; possHabits += habits.length;
            totalGoals  += dg; possGoals  += goals.length;
            studyMins   += dm;
            if (dh > 0 || dg > 0) daysActive++;
            const ws = format(startOfWeek(day, { weekStartsOn: 1 }), 'MMM d');
            weekBuckets[ws] = (weekBuckets[ws] || 0) + dh + dg;
            const dl = dowKeys[day.getDay()];
            if (dowCounts[dl] !== undefined) dowCounts[dl] += dh + dg;
        });

        const activeDays  = days.length - offCount;
        const consistency = activeDays > 0 ? Math.round((daysActive / activeDays) * 100) : 0;
        const habitRate   = possHabits > 0 ? Math.round((totalHabits / possHabits) * 100) : 0;
        const goalRate    = possGoals  > 0 ? Math.round((totalGoals  / possGoals)  * 100) : 0;
        const studyHours  = +(studyMins / 60).toFixed(1);
        const bestWeek    = Object.entries(weekBuckets).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
        const topDay      = Object.entries(dowCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

        return { consistency, habitRate, goalRate, studyHours, bestWeek, topDay };
    }, [selectedMonth, habitLogs, goalLogs, habits, goals, offDays, studySessions]);

    // Trends
    const trendData = useMemo(() => {
        const data = [];
        for (let i = 27; i >= 0; i--) {
            const day = subDays(new Date(), i + 1);
            const d = format(day, 'yyyy-MM-dd');
            const dh = habitLogs.filter(l => l.date === d && l.completed).length;
            const dg = goalLogs.filter(l => l.date === d && l.completed).length;
            const dm = studySessions.filter(s => s.date === d).reduce((s, x) => s + x.duration_mins, 0);
            const maxPoss = habits.length + goals.length;
            data.push({
                date: format(day, 'MMM d'),
                Productivity: maxPoss > 0 ? Math.round(((dh + dg) / maxPoss) * 100) : 0,
                Study: +(dm / 60).toFixed(1),
            });
        }
        return data;
    }, [habitLogs, goalLogs, habits, goals, studySessions]);

    const totalStudyHours = +(studySessions.reduce((s, x) => s + x.duration_mins, 0) / 60).toFixed(1);

    // Subject bars
    const subjectBars = useMemo(() => {
        const map = {};
        studySessions.forEach(s => { map[s.subject_id] = (map[s.subject_id] || 0) + s.duration_mins; });
        const items = Object.entries(map).map(([id, mins]) => {
            const sub = studySubjects.find(x => x.id === id);
            return { name: sub?.name || 'Unknown', hours: +(mins / 60).toFixed(1), color: sub?.color, mins };
        }).sort((a, b) => b.mins - a.mins);
        const maxMins = items[0]?.mins || 1;
        return items.map(i => ({ ...i, pct: Math.round((i.mins / maxMins) * 100) }));
    }, [studySessions, studySubjects]);

    // Habit table
    const habitTableData = useMemo(() => habits.map(h => {
        const stats = calculateStreak(h.id);
        const logs7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
            const log = habitLogs.find(l => l.habit_id === h.id && l.date === d);
            logs7.push({ date: d, done: log?.completed ?? false, isToday: d === todayStr });
        }
        const done30 = habitLogs.filter(l =>
            l.habit_id === h.id && l.completed && new Date(l.date) >= subDays(new Date(), 30)
        ).length;
        const todayLog = habitLogs.find(l => l.habit_id === h.id && l.date === todayStr);
        return { ...h, ...stats, logs7, completionPct: Math.round((done30 / 30) * 100), doneToday: todayLog?.completed ?? false };
    }), [habits, habitLogs, todayStr]);

    // Badges
    const badgeState = useMemo(() => {
        const maxStreak = habitStats.length > 0 ? Math.max(...habitStats.map(h => h.bestStreak)) : 0;
        let bestDayCount = 0;
        for (let i = 1; i <= 90; i++) {
            if (isBestDay(format(subDays(new Date(), i), 'yyyy-MM-dd'))) bestDayCount++;
        }
        return { maxStreak, totalStudyHours, bestDayCount, monthlyConsistency: monthly?.consistency || 0 };
    }, [habitStats, totalStudyHours, monthly]);

    const tooltipStyle = {
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-primary)',
        borderRadius: '8px',
        color: 'var(--text-primary)',
        fontSize: '0.78rem',
    };

    return (
        <div>
            <div className="page-header">
                <h2>Stats & Streaks</h2>
                <p>Track your consistency, streaks, and progress over time</p>
            </div>

            {/* Today's Overview */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <div className="card-title"><Trophy size={16} /> Today's Overview</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{format(new Date(), 'EEEE, MMM d')}</span>
                </div>

                <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    {/* Score ring */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <div style={{ position: 'relative', width: 100, height: 100 }}>
                            <svg width="100" height="100" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-elevated)" strokeWidth="8" />
                                <circle
                                    cx="50" cy="50" r="42" fill="none"
                                    stroke="var(--accent-primary)" strokeWidth="8" strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 42}`}
                                    strokeDashoffset={`${2 * Math.PI * 42 * (1 - productivity.score / 100)}`}
                                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                                />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{productivity.score}</span>
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>/ 100</span>
                            </div>
                        </div>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>Score</span>
                    </div>

                    {/* Metric rows */}
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <MetricRow icon={<Flame size={14} />} label="Current Streak"
                            value={`${productivity.maxStreak} days`}
                            progress={Math.min(productivity.maxStreak, 30)} max={30} />
                        <MetricRow icon={<Target size={14} />} label="Goals Today"
                            value={`${productivity.goalsCompleted} / ${productivity.goalsTotal}`}
                            progress={productivity.goalsCompleted} max={productivity.goalsTotal || 1}
                            sub={productivity.bestCategory ? `Best: ${productivity.bestCategory}` : undefined} />
                        <MetricRow icon={<Zap size={14} />} label="Habits Today"
                            value={`${productivity.habitsCompleted} / ${productivity.habitsTotal}`}
                            progress={productivity.habitsCompleted} max={productivity.habitsTotal || 1} />
                        <MetricRow icon={<Timer size={14} />} label="Study Today"
                            value={`${productivity.studyHours}h`}
                            progress={productivity.studyHours} max={3} sub="Target: 3h" />
                        <MetricRow icon={<CheckCircle size={14} />} label="Schedule"
                            value={`${productivity.schedulePct}%`}
                            progress={productivity.schedulePct} />
                    </div>
                </div>
            </div>

            {/* Weekly Progress */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <div className="card-title"><TrendingUp size={16} /> Weekly Progress</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Last 7 days</span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={weeklyData} barGap={3} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                        <XAxis dataKey="day" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--bg-elevated)' }} />
                        <Legend wrapperStyle={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', paddingTop: 8 }} />
                        <Bar dataKey="Habits"    fill="var(--accent-primary)" radius={[3, 3, 0, 0]} maxBarSize={20} opacity={0.9} />
                        <Bar dataKey="Goals"     fill="var(--accent-secondary)" radius={[3, 3, 0, 0]} maxBarSize={20} opacity={0.9} />
                        <Bar dataKey="Study(h)"  fill="var(--accent-warning)" radius={[3, 3, 0, 0]} maxBarSize={20} opacity={0.9} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Monthly Insights */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <div className="card-title"><Calendar size={16} /> Monthly Insights</div>
                </div>
                <div className="month-tabs" style={{ marginBottom: 18 }}>
                    {MONTHS.map((m, i) => (
                        <button key={i} className={`month-tab ${selectedMonth === i ? 'active' : ''}`} onClick={() => setSelectedMonth(i)}>{m}</button>
                    ))}
                </div>
                {monthly ? (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 18 }}>
                            <StatTile label="Consistency"    value={`${monthly.consistency}%`} />
                            <StatTile label="Goal Rate"      value={`${monthly.goalRate}%`} />
                            <StatTile label="Habit Rate"     value={`${monthly.habitRate}%`} />
                            <StatTile label="Study Hours"    value={`${monthly.studyHours}h`} />
                            <StatTile label="Best Week"      value={monthly.bestWeek} />
                            <StatTile label="Top Day"        value={monthly.topDay} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                                { label: 'Consistency', value: monthly.consistency },
                                { label: 'Goal Rate',   value: monthly.goalRate },
                                { label: 'Habit Rate',  value: monthly.habitRate },
                            ].map(({ label, value }) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ width: 90, fontSize: '0.78rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{label}</span>
                                    <HorizBar value={value} height={7} />
                                    <span style={{ width: 36, fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', flexShrink: 0 }}>{value}%</span>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="empty-state"><p>No data for this month yet</p></div>
                )}
            </div>

            {/* Trends */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <div className="card-title"><BarChart3 size={16} /> Trends</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Last 28 days</span>
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Productivity Score</div>
                <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} interval={6} />
                        <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Line type="monotone" dataKey="Productivity" stroke="var(--accent-primary)" strokeWidth={1.5} dot={false} />
                    </LineChart>
                </ResponsiveContainer>

                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: 20, marginBottom: 8 }}>Study Hours</div>
                <ResponsiveContainer width="100%" height={140}>
                    <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} interval={6} />
                        <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v}h`, 'Study']} />
                        <Line type="monotone" dataKey="Study" stroke="var(--accent-secondary)" strokeWidth={1.5} dot={false} />
                    </LineChart>
                </ResponsiveContainer>

                {subjectBars.length > 0 && (
                    <div style={{ marginTop: 20 }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                            Study by Subject · {totalStudyHours}h total
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {subjectBars.map(({ name, hours, color, pct }) => (
                                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: color || 'var(--accent-primary)', flexShrink: 0 }} />
                                    <span style={{ width: 100, fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                                    <HorizBar value={pct} color={color} height={6} />
                                    <span style={{ width: 34, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', flexShrink: 0 }}>{hours}h</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Activity Heatmap */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <div className="card-title"><Activity size={16} /> Activity Heatmap</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Past 12 months</span>
                </div>
                <div className="heatmap-container">
                    <CalendarHeatmap
                        startDate={subDays(new Date(), 365)}
                        endDate={new Date()}
                        values={heatmapData}
                        classForValue={v => !v || v.count === 0 ? 'color-empty' : `color-scale-${v.count}`}
                        titleForValue={v => v ? `${v.date}: ${v.doneHabits} habits · ${v.doneGoals} goals` : 'No data'}
                        showWeekdayLabels
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>Less</span>
                    {[0, 1, 2, 3, 4].map(n => (
                        <div key={n} style={{ width: 10, height: 10, borderRadius: 2, background: n === 0 ? 'var(--bg-elevated)' : `rgba(35,134,54,${0.2 + n * 0.2})` }} />
                    ))}
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>More</span>
                </div>
            </div>

            {/* Habit Tracker Table */}
            <div className="card" style={{ marginBottom: 24 }}>
                <div className="card-header">
                    <div className="card-title"><Flame size={16} /> Habit Tracker</div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>off-days excluded from streaks</span>
                </div>
                {habitTableData.length === 0 ? (
                    <div className="empty-state"><p>Add habits to start tracking</p></div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-primary)' }}>
                                    {['Habit', 'Today', 'Streak', 'Best', '30d %', 'Last 7 Days'].map(h => (
                                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {habitTableData.map((h, i) => (
                                    <tr key={h.id} style={{ borderBottom: '1px solid var(--border-primary)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)' }}>
                                        <td style={{ padding: '10px', fontWeight: 500, color: 'var(--text-primary)', maxWidth: 150 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                {h.icon && <span>{h.icon}</span>}
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            <span style={{
                                                fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                                                background: h.doneToday ? 'var(--accent-success-dim)' : 'var(--bg-elevated)',
                                                color: h.doneToday ? 'var(--accent-success)' : 'var(--text-tertiary)',
                                            }}>
                                                {h.doneToday ? '✓ Done' : '○ Pending'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                                            {h.currentStreak}
                                        </td>
                                        <td style={{ padding: '10px', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                            {h.bestStreak}
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div style={{ width: 44, height: 5, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                                                    <div style={{ width: `${h.completionPct}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: 3 }} />
                                                </div>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{h.completionPct}%</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            <div style={{ display: 'flex', gap: 3 }}>
                                                {h.logs7.map(({ date, done, isToday }) => (
                                                    <div key={date} title={`${date}: ${done ? '✓' : '—'}`} style={{
                                                        width: 12, height: 12, borderRadius: 2,
                                                        background: done ? 'var(--accent-success)' : 'var(--bg-elevated)',
                                                        border: isToday ? '1.5px solid var(--accent-primary)' : '1.5px solid transparent',
                                                        opacity: done ? 0.8 : 1,
                                                    }} />
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Achievements */}
            <div className="card">
                <div className="card-header">
                    <div className="card-title"><Award size={16} /> Achievements</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                    {BADGE_DEFS.map(badge => {
                        const earned = badge.check(badgeState);
                        return (
                            <div key={badge.id} style={{
                                padding: '14px', borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-primary)',
                                background: earned ? 'var(--accent-primary-dim)' : 'var(--bg-elevated)',
                                opacity: earned ? 1 : 0.4,
                                display: 'flex', alignItems: 'flex-start', gap: 10,
                            }}>
                                <span style={{ fontSize: '1.4rem', lineHeight: 1, flexShrink: 0 }}>{badge.icon}</span>
                                <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: earned ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>{badge.label}</div>
                                    <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{badge.desc}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

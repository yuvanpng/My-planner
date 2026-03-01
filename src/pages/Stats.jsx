import { useState, useMemo } from 'react';
import { format, subDays, eachDayOfInterval, startOfMonth, endOfMonth, subMonths, differenceInDays } from 'date-fns';
import { BarChart3, Flame, TrendingUp, Activity, Star, Award, Zap, Calendar } from 'lucide-react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell, ComposedChart, Legend } from 'recharts';
import { getAllHabits, getAllHabitLogs, getDailyGoals, getAllGoalLogs, getOffDays, calculateStreak, isBestDay, getAllJournalEntries } from '../lib/store';

const GOAL_COLORS = {
    physical: '#f97316',
    technical: '#3b82f6',
    mental: '#a855f7',
    consume: '#10b981',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Stats() {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const habits = getAllHabits().filter(h => h.is_active);
    const habitLogs = getAllHabitLogs();
    const goals = getDailyGoals();
    const goalLogs = getAllGoalLogs();
    const offDays = new Set(getOffDays().map(d => d.date));
    const journals = getAllJournalEntries();

    // Habit streaks (off-day aware)
    const habitStats = useMemo(() => {
        return habits.map(h => {
            const streak = calculateStreak(h.id);
            return { ...h, ...streak };
        });
    }, [habits, habitLogs]);

    // Heatmap data
    const heatmapData = useMemo(() => {
        const startDate = subDays(new Date(), 365);
        const days = eachDayOfInterval({ start: startDate, end: new Date() });
        return days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const completedHabits = habitLogs.filter(l => l.date === dateStr && l.completed).length;
            const completedGoals = goalLogs.filter(l => l.date === dateStr && l.completed).length;
            const total = completedHabits + completedGoals;
            const maxPossible = habits.length + goals.length;
            const ratio = maxPossible > 0 ? total / maxPossible : 0;
            let count = 0;
            if (ratio > 0.75) count = 4;
            else if (ratio > 0.5) count = 3;
            else if (ratio > 0.25) count = 2;
            else if (ratio > 0) count = 1;
            return { date: dateStr, count };
        });
    }, [habitLogs, goalLogs, habits, goals]);

    // Monthly stats for selected month
    const monthlyStats = useMemo(() => {
        const year = new Date().getFullYear();
        const monthStart = startOfMonth(new Date(year, selectedMonth));
        const monthEnd = endOfMonth(new Date(year, selectedMonth));
        const today = new Date();
        const effectiveEnd = monthEnd > today ? today : monthEnd;
        const days = eachDayOfInterval({ start: monthStart, end: effectiveEnd });

        let totalHabitCompletions = 0;
        let totalGoalCompletions = 0;
        let bestDaysCount = 0;
        let daysWithActivity = 0;
        let totalPossibleHabits = 0;
        let totalPossibleGoals = 0;
        let journalDays = 0;
        let offDayCount = 0;
        const dailyData = [];

        const journalDates = new Set(journals.map(j => j.date));

        days.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const isOff = offDays.has(dateStr);
            if (isOff) { offDayCount++; return; }

            const dayHabits = habitLogs.filter(l => l.date === dateStr && l.completed).length;
            const dayGoals = goalLogs.filter(l => l.date === dateStr && l.completed).length;
            totalHabitCompletions += dayHabits;
            totalGoalCompletions += dayGoals;
            totalPossibleHabits += habits.length;
            totalPossibleGoals += goals.length;
            if (dayHabits > 0 || dayGoals > 0) daysWithActivity++;
            if (isBestDay(dateStr)) bestDaysCount++;
            if (journalDates.has(dateStr)) journalDays++;

            dailyData.push({
                day: format(day, 'd'),
                habits: dayHabits,
                goals: dayGoals,
                total: dayHabits + dayGoals,
                cumulative: totalHabitCompletions + totalGoalCompletions,
            });
        });

        const activeDays = days.length - offDayCount;
        const habitRate = totalPossibleHabits > 0 ? Math.round((totalHabitCompletions / totalPossibleHabits) * 100) : 0;
        const goalRate = totalPossibleGoals > 0 ? Math.round((totalGoalCompletions / totalPossibleGoals) * 100) : 0;
        const consistencyRate = activeDays > 0 ? Math.round((daysWithActivity / activeDays) * 100) : 0;
        const journalRate = activeDays > 0 ? Math.round((journalDays / activeDays) * 100) : 0;

        return {
            totalHabitCompletions, totalGoalCompletions, bestDaysCount,
            daysWithActivity, habitRate, goalRate, consistencyRate,
            journalRate, journalDays, activeDays, offDayCount, dailyData,
        };
    }, [selectedMonth, habitLogs, goalLogs, habits, goals, offDays, journals]);

    // Weekly trend data
    const weeklyData = useMemo(() => {
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const day = subDays(new Date(), i);
            const dateStr = format(day, 'yyyy-MM-dd');
            data.push({
                day: format(day, 'EEE'),
                habits: habitLogs.filter(l => l.date === dateStr && l.completed).length,
                goals: goalLogs.filter(l => l.date === dateStr && l.completed).length,
                best: isBestDay(dateStr) ? 1 : 0,
            });
        }
        return data;
    }, [habitLogs, goalLogs]);

    // Goal category
    const goalCategoryData = useMemo(() => {
        return ['physical', 'technical', 'mental', 'consume'].map(cat => {
            const catGoalIds = goals.filter(g => g.category === cat).map(g => g.id);
            return {
                name: cat.charAt(0).toUpperCase() + cat.slice(1),
                value: goalLogs.filter(l => catGoalIds.includes(l.goal_id) && l.completed).length,
                color: GOAL_COLORS[cat],
            };
        }).filter(d => d.value > 0);
    }, [goals, goalLogs]);

    // Overall
    const totalHabitCompletions = habitLogs.filter(l => l.completed).length;
    const totalGoalCompletions = goalLogs.filter(l => l.completed).length;
    const maxCurrentStreak = habitStats.length > 0 ? Math.max(...habitStats.map(h => h.currentStreak)) : 0;
    const maxBestStreak = habitStats.length > 0 ? Math.max(...habitStats.map(h => h.bestStreak)) : 0;

    // Count total best days (last 30 days)
    const recentBestDays = useMemo(() => {
        let count = 0;
        for (let i = 0; i < 30; i++) {
            const dateStr = format(subDays(new Date(), i), 'yyyy-MM-dd');
            if (isBestDay(dateStr)) count++;
        }
        return count;
    }, [goalLogs]);

    const tooltipStyle = {
        backgroundColor: '#1e1e2a',
        border: '1px solid #22222e',
        borderRadius: '8px',
        color: '#e8e8f0',
        fontSize: '0.78rem',
    };

    return (
        <div>
            <div className="page-header">
                <h2>Stats & Streaks</h2>
                <p>Track your consistency, streaks, and find motivation in the numbers</p>
            </div>

            {/* Overview Stats */}
            <div className="stats-mini-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card-mini card">
                    <div className="stat-number">{maxCurrentStreak}</div>
                    <div className="stat-label">Active Streak</div>
                </div>
                <div className="stat-card-mini card">
                    <div className="stat-number">{maxBestStreak}</div>
                    <div className="stat-label">Best Streak</div>
                </div>
                <div className="stat-card-mini card">
                    <div className="stat-number">{recentBestDays}</div>
                    <div className="stat-label">Best Days (30d)</div>
                </div>
                <div className="stat-card-mini card">
                    <div className="stat-number">{totalHabitCompletions}</div>
                    <div className="stat-label">Habit ✓</div>
                </div>
                <div className="stat-card-mini card">
                    <div className="stat-number">{totalGoalCompletions}</div>
                    <div className="stat-label">Goal ✓</div>
                </div>
            </div>

            {/* Best Day Explanation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', padding: '8px 12px', background: 'var(--accent-warning-dim)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,166,35,0.15)' }}>
                <Star size={16} style={{ color: 'var(--accent-warning)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-warning)' }}>
                    <strong>Best Day</strong> = at least 1 goal done in 3 out of 4 categories (Physical / Technical / Mental / Consume)
                </span>
            </div>

            {/* Heatmap */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <div className="card-title"><Activity /> Activity Heatmap (Off-days skipped for streaks)</div>
                </div>
                <div className="heatmap-container">
                    <CalendarHeatmap
                        startDate={subDays(new Date(), 365)}
                        endDate={new Date()}
                        values={heatmapData}
                        classForValue={(value) => {
                            if (!value || value.count === 0) return 'color-empty';
                            return `color-scale-${value.count}`;
                        }}
                        titleForValue={(value) => value ? `${value.date}: Level ${value.count}` : 'No data'}
                        showWeekdayLabels
                    />
                </div>
            </div>

            {/* Monthly Stats Section */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="card-header">
                    <div className="card-title"><Calendar /> Monthly Statistics</div>
                </div>

                <div className="month-tabs">
                    {MONTHS.map((m, i) => (
                        <button key={i} className={`month-tab ${selectedMonth === i ? 'active' : ''}`} onClick={() => setSelectedMonth(i)}>
                            {m}
                        </button>
                    ))}
                </div>

                <div className="stats-mini-grid" style={{ marginBottom: '16px' }}>
                    <div className="stat-card-mini">
                        <div className="stat-number" style={{ fontSize: '1.3rem' }}>{monthlyStats.consistencyRate}%</div>
                        <div className="stat-label">Consistency</div>
                    </div>
                    <div className="stat-card-mini">
                        <div className="stat-number" style={{ fontSize: '1.3rem' }}>{monthlyStats.habitRate}%</div>
                        <div className="stat-label">Habit Rate</div>
                    </div>
                    <div className="stat-card-mini">
                        <div className="stat-number" style={{ fontSize: '1.3rem' }}>{monthlyStats.goalRate}%</div>
                        <div className="stat-label">Goal Rate</div>
                    </div>
                    <div className="stat-card-mini">
                        <div className="stat-number" style={{ fontSize: '1.3rem', color: 'var(--accent-warning)' }}>{monthlyStats.bestDaysCount}</div>
                        <div className="stat-label">Best Days</div>
                    </div>
                    <div className="stat-card-mini">
                        <div className="stat-number" style={{ fontSize: '1.3rem' }}>{monthlyStats.daysWithActivity}</div>
                        <div className="stat-label">Active Days</div>
                    </div>
                    <div className="stat-card-mini">
                        <div className="stat-number" style={{ fontSize: '1.3rem' }}>{monthlyStats.journalRate}%</div>
                        <div className="stat-label">Journal Rate</div>
                    </div>
                </div>

                {/* Monthly daily chart */}
                {monthlyStats.dailyData.length > 0 && (
                    <ResponsiveContainer width="100%" height={240}>
                        <ComposedChart data={monthlyStats.dailyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#22222e" />
                            <XAxis dataKey="day" tick={{ fill: '#5a5a70', fontSize: 10 }} axisLine={false} interval={2} />
                            <YAxis yAxisId="left" tick={{ fill: '#5a5a70', fontSize: 10 }} axisLine={false} />
                            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#5a5a70', fontSize: 10 }} axisLine={false} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend wrapperStyle={{ fontSize: '0.7rem', color: '#8b8ba0' }} />
                            <Bar yAxisId="left" dataKey="habits" stackId="1" fill="#7c5cfc" radius={[0, 0, 0, 0]} name="Habits" barSize={14} />
                            <Bar yAxisId="left" dataKey="goals" stackId="1" fill="#5ce0d8" radius={[3, 3, 0, 0]} name="Goals" barSize={14} />
                            <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#fbbf24" strokeWidth={2} dot={false} name="Cumulative" />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div className="stats-grid" style={{ marginBottom: '24px' }}>
                {/* Weekly chart */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title"><TrendingUp /> Last 7 Days</div>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={weeklyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#22222e" />
                            <XAxis dataKey="day" tick={{ fill: '#5a5a70', fontSize: 11 }} axisLine={false} />
                            <YAxis tick={{ fill: '#5a5a70', fontSize: 11 }} axisLine={false} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Bar dataKey="habits" fill="#7c5cfc" radius={[4, 4, 0, 0]} name="Habits" />
                            <Bar dataKey="goals" fill="#5ce0d8" radius={[4, 4, 0, 0]} name="Goals" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Goal category chart */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title"><BarChart3 /> Goal Categories</div>
                    </div>
                    {goalCategoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={goalCategoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                                    {goalCategoryData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty-state"><p>Complete goals to see breakdown</p></div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {Object.entries(GOAL_COLORS).map(([key, color]) => (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#8b8ba0' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                                {key.charAt(0).toUpperCase() + key.slice(1)}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Habit Streaks */}
            <div className="card">
                <div className="card-header">
                    <div className="card-title"><Flame /> Habit Streaks <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: '6px' }}>(off-days skipped)</span></div>
                </div>
                {habitStats.length === 0 ? (
                    <div className="empty-state"><p>Add habits to start tracking</p></div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                        {habitStats.map(h => (
                            <div key={h.id} style={{ padding: '12px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px' }}>{h.name}</div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <span className="streak-badge"><Flame size={12} /> {h.currentStreak}</span>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>current</span>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                    Best: {h.bestStreak} · Total: {h.totalDays}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

import { NavLink } from 'react-router-dom';
import { Calendar, BarChart3, BookOpen, Target, CalendarDays, Sun, Moon, Timer, Lightbulb, Layers, Gift } from 'lucide-react';
import { getActiveGoals } from '../../lib/store';
import { getCurrentBalance, ensureTodayTokens } from '../../lib/rewardStore';
import { useState, useEffect } from 'react';

function getTheme() {
    return localStorage.getItem('planner-theme') || 'light';
}

function setTheme(theme) {
    localStorage.setItem('planner-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
}

// Apply saved theme on load
if (typeof window !== 'undefined') {
    const saved = getTheme();
    if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
}

export default function Sidebar() {
    const [weeklyGoals, setWeeklyGoals] = useState([]);
    const [monthlyGoals, setMonthlyGoals] = useState([]);
    const [isDark, setIsDark] = useState(getTheme() === 'dark');
    const [tokenBalance, setTokenBalance] = useState(0);

    useEffect(() => {
        const load = () => {
            setWeeklyGoals(getActiveGoals('weekly'));
            setMonthlyGoals(getActiveGoals('monthly'));
            ensureTodayTokens();
            setTokenBalance(getCurrentBalance());
        };
        load();
        const interval = setInterval(load, 10000);
        return () => clearInterval(interval);
    }, []);

    function toggleTheme() {
        const next = isDark ? 'light' : 'dark';
        setTheme(next);
        setIsDark(!isDark);
    }

    const allGoals = [...weeklyGoals, ...monthlyGoals].slice(0, 5);

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <h1>My Planner</h1>
                <span>Done &gt; Perfect</span>
            </div>

            <nav className="sidebar-nav">
                <div className="sidebar-section-label">Daily</div>
                <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <Calendar />
                    Today
                </NavLink>
                <NavLink to="/stats" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <BarChart3 />
                    Stats & Streaks
                </NavLink>
                <NavLink to="/journal" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <BookOpen />
                    Journal
                </NavLink>
                <NavLink to="/calendar" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <CalendarDays />
                    Calendar
                </NavLink>
                <NavLink to="/study" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <Timer />
                    Study Timer
                </NavLink>

                <div className="sidebar-section-label">Planning</div>
                <NavLink to="/goals" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <Target />
                    Goals & Events
                </NavLink>

                <div className="sidebar-section-label">Growth</div>
                <NavLink to="/skills" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <Layers />
                    Skill Planner
                </NavLink>

                <div className="sidebar-section-label">Rewards</div>
                <NavLink to="/rewards" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center' }}>
                    <Gift />
                    <span style={{ flex: 1 }}>Rewards Store</span>
                    {tokenBalance > 0 && (
                        <span style={{
                            fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                            background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.12))',
                            border: '1px solid rgba(245,158,11,0.3)',
                            color: '#f59e0b', whiteSpace: 'nowrap',
                        }}>
                            🪙 {tokenBalance}
                        </span>
                    )}
                </NavLink>

                <div className="sidebar-section-label">Creative</div>
                <NavLink to="/ideas" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    <Lightbulb />
                    Idea Vault
                </NavLink>
            </nav>

            {allGoals.length > 0 && (
                <div className="sidebar-goals-summary">
                    <h4>Active Goals</h4>
                    {allGoals.map(g => (
                        <div key={g.id} className="sidebar-goal">
                            <div className="sidebar-goal-header">
                                <span className="sidebar-goal-title">{g.title}</span>
                                <span className="sidebar-goal-pct">{g.progress}%</span>
                            </div>
                            <div className="sidebar-goal-bar">
                                <div className="sidebar-goal-fill" style={{ width: `${g.progress}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <button className="theme-toggle" onClick={toggleTheme}>
                {isDark ? <Sun /> : <Moon />}
                {isDark ? 'Light Mode' : 'Dark Mode'}
            </button>
        </aside>
    );
}

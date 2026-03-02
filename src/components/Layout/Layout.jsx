import { Outlet, NavLink } from 'react-router-dom';
import { Calendar, BarChart3, BookOpen, GraduationCap, Target, CalendarDays, Timer } from 'lucide-react';
import Sidebar from './Sidebar';
import { Toaster } from 'react-hot-toast';

export default function Layout() {
    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <Outlet />
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="mobile-nav">
                <NavLink to="/" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                    <Calendar size={20} />
                    <span>Today</span>
                </NavLink>
                <NavLink to="/study" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                    <Timer size={20} />
                    <span>Study</span>
                </NavLink>
                <NavLink to="/stats" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                    <BarChart3 size={20} />
                    <span>Stats</span>
                </NavLink>
                <NavLink to="/journal" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                    <BookOpen size={20} />
                    <span>Journal</span>
                </NavLink>
                <NavLink to="/academic" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                    <GraduationCap size={20} />
                    <span>Academic</span>
                </NavLink>
                <NavLink to="/goals" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                    <Target size={20} />
                    <span>Goals</span>
                </NavLink>
                <NavLink to="/calendar" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                    <CalendarDays size={20} />
                    <span>Calendar</span>
                </NavLink>
            </nav>

            <Toaster
                position="top-center"
                toastOptions={{
                    style: {
                        background: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: '10px',
                        fontSize: '0.85rem',
                        fontFamily: 'Inter, sans-serif',
                        boxShadow: 'var(--shadow-md)',
                    },
                }}
            />
        </div>
    );
}

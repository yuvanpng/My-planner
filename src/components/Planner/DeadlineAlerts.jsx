import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { getUpcomingDeadlines } from '../../lib/store';

export default function DeadlineAlerts() {
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        setAlerts(getUpcomingDeadlines(3));
        const interval = setInterval(() => {
            setAlerts(getUpcomingDeadlines(3));
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    if (alerts.length === 0) return null;

    function getDaysText(deadline) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dl = new Date(deadline);
        dl.setHours(0, 0, 0, 0);
        const diff = Math.floor((dl - today) / (1000 * 60 * 60 * 24));
        if (diff <= 0) return 'Today!';
        if (diff === 1) return 'Tomorrow';
        return `in ${diff} days`;
    }

    return (
        <div className="alert-banner">
            <AlertTriangle size={18} />
            <div>
                <div className="alert-banner-text"><strong>Upcoming Deadlines</strong></div>
                {alerts.map(a => (
                    <div key={a.id} className="alert-item">
                        <div className={`alert-dot ${getDaysText(a.deadline) === 'Today!' ? 'urgent' : ''}`} />
                        <span style={{ color: 'var(--text-primary)', fontSize: '0.8rem' }}>{a.title}</span>
                        <span style={{ color: 'var(--accent-warning)', fontSize: '0.72rem', marginLeft: 'auto' }}>
                            {getDaysText(a.deadline)}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

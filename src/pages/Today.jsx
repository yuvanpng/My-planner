import { useState, useEffect } from 'react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Schedule from '../components/Planner/Schedule';
import Checklist from '../components/Planner/Checklist';
import DailyHabits from '../components/Planner/DailyHabits';
import DailyGoals from '../components/Planner/DailyGoals';
import DeadlineAlerts from '../components/Planner/DeadlineAlerts';

export default function Today() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const dateStr = format(currentDate, 'yyyy-MM-dd');



    const dayName = format(currentDate, 'EEEE');
    const dateDisplay = format(currentDate, 'MMMM d, yyyy');

    return (
        <div>
            <DeadlineAlerts />

            <div className="date-nav">
                <button className="date-nav-btn" onClick={() => setCurrentDate(subDays(currentDate, 1))}>
                    <ChevronLeft size={18} />
                </button>
                <h2>{dayName}, {dateDisplay}</h2>
                <button className="date-nav-btn" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
                    <ChevronRight size={18} />
                </button>
                {!isToday(currentDate) && (
                    <button className="date-today-btn" onClick={() => setCurrentDate(new Date())}>
                        Today
                    </button>
                )}
            </div>

            <div className="today-layout">
                <Schedule date={dateStr} />
                <div className="right-column">
                    <Checklist date={dateStr} />
                    <DailyHabits date={dateStr} />
                    <DailyGoals date={dateStr} />
                </div>
            </div>
        </div>
    );
}

/**
 * Local Storage Data Layer v2 + Supabase Sync
 * Pattern: Write-through cache
 * - localStorage = instant UI (synchronous)
 * - Supabase = persistent cloud (background async)
 */

import {
    pushUpsert, pushInsert, pushUpdate, pushDelete, pushDeleteMatch,
    pushUpsertComposite, pushCleanupOldSchedule,
} from './sync';

const STORAGE_KEYS = {
    SCHEDULE: 'planner_schedule',
    SCHEDULE_DONE: 'planner_schedule_done',
    TODOS: 'planner_todos',
    HABITS: 'planner_habits',
    HABIT_LOGS: 'planner_habit_logs',
    GOALS: 'planner_goals',
    GOAL_LOGS: 'planner_goal_logs',
    JOURNAL: 'planner_journal',
    PROJECTS: 'planner_projects',
    WEEKLY_MONTHLY_GOALS: 'planner_wm_goals',
    EVENTS: 'planner_events',
    OFF_DAYS: 'planner_off_days',
    SCHEDULE_HISTORY: 'planner_schedule_history',
};

function generateId() {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getStore(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
        return [];
    }
}

function setStore(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// ==================== SCHEDULE ====================
export function getScheduleForDate(date) {
    const all = getStore(STORAGE_KEYS.SCHEDULE);
    return all.filter(e => e.date === date);
}

export function upsertScheduleEntry(date, timeSlot, activity) {
    const all = getStore(STORAGE_KEYS.SCHEDULE);
    const idx = all.findIndex(e => e.date === date && e.time_slot === timeSlot);
    let record;
    if (idx >= 0) {
        all[idx].activity = activity;
        all[idx].updated_at = new Date().toISOString();
        record = all[idx];
    } else {
        record = { id: generateId(), date, time_slot: timeSlot, activity, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        all.push(record);
    }
    setStore(STORAGE_KEYS.SCHEDULE, all);
    addScheduleHint(activity);
    // Sync to Supabase
    pushUpsert('schedule_entries', record, ['date', 'time_slot']);
}

export function deleteScheduleEntry(date, timeSlot) {
    const all = getStore(STORAGE_KEYS.SCHEDULE);
    setStore(STORAGE_KEYS.SCHEDULE, all.filter(e => !(e.date === date && e.time_slot === timeSlot)));
    pushDeleteMatch('schedule_entries', { date, time_slot: timeSlot });
}

// Schedule slot completion (checkbox per hour)
export function getScheduleDoneForDate(date) {
    const all = getStore(STORAGE_KEYS.SCHEDULE_DONE);
    return all.filter(e => e.date === date);
}

export function toggleScheduleSlotDone(date, timeSlot) {
    const all = getStore(STORAGE_KEYS.SCHEDULE_DONE);
    const idx = all.findIndex(e => e.date === date && e.time_slot === timeSlot);
    let record;
    if (idx >= 0) {
        all[idx].done = !all[idx].done;
        record = all[idx];
    } else {
        record = { id: generateId(), date, time_slot: timeSlot, done: true, created_at: new Date().toISOString() };
        all.push(record);
    }
    setStore(STORAGE_KEYS.SCHEDULE_DONE, all);
    pushUpsert('schedule_done', record, ['date', 'time_slot']);
}

export function isScheduleSlotDone(date, timeSlot) {
    const all = getStore(STORAGE_KEYS.SCHEDULE_DONE);
    const entry = all.find(e => e.date === date && e.time_slot === timeSlot);
    return entry ? entry.done : false;
}

// Schedule hints / autocomplete from history
export function getScheduleHints() {
    const history = getStore(STORAGE_KEYS.SCHEDULE_HISTORY);
    return history.sort((a, b) => b.count - a.count).map(h => h.text);
}

function addScheduleHint(text) {
    if (!text || !text.trim()) return;
    const normalized = text.trim();
    const history = getStore(STORAGE_KEYS.SCHEDULE_HISTORY);
    const idx = history.findIndex(h => h.text.toLowerCase() === normalized.toLowerCase());
    let record;
    if (idx >= 0) {
        history[idx].count++;
        history[idx].text = normalized;
        record = history[idx];
    } else {
        record = { id: generateId(), text: normalized, count: 1, created_at: new Date().toISOString() };
        history.push(record);
    }
    setStore(STORAGE_KEYS.SCHEDULE_HISTORY, history);
    pushUpsert('schedule_history', record, ['text']);
}

// Monthly auto-delete of old schedule data
export function cleanupOldScheduleData() {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 1);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const schedule = getStore(STORAGE_KEYS.SCHEDULE);
    setStore(STORAGE_KEYS.SCHEDULE, schedule.filter(e => e.date >= cutoffStr));
    const done = getStore(STORAGE_KEYS.SCHEDULE_DONE);
    setStore(STORAGE_KEYS.SCHEDULE_DONE, done.filter(e => e.date >= cutoffStr));
    pushCleanupOldSchedule();
}

// ==================== TODOS ====================
export function getTodosForDate(date, category = null) {
    const all = getStore(STORAGE_KEYS.TODOS);
    let filtered = all.filter(t => {
        if (t.date === date) return true;
        if (!t.completed && t.date < date) return true;
        return false;
    });
    if (category) filtered = filtered.filter(t => t.category === category);
    return filtered;
}

export function getAllTodos() {
    return getStore(STORAGE_KEYS.TODOS);
}

export function getAcademicTodosWithDeadlines() {
    const all = getStore(STORAGE_KEYS.TODOS);
    return all.filter(t => t.category === 'academic' && !t.completed).sort((a, b) => {
        if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return 0;
    });
}

export function getUpcomingDeadlines(daysAhead = 3) {
    const all = getStore(STORAGE_KEYS.TODOS);
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const todayStr = today.toISOString().split('T')[0];
    const futureStr = futureDate.toISOString().split('T')[0];
    return all.filter(t => t.deadline && t.deadline >= todayStr && t.deadline <= futureStr && !t.completed)
        .sort((a, b) => a.deadline.localeCompare(b.deadline));
}

export function addTodo(todo) {
    const all = getStore(STORAGE_KEYS.TODOS);
    const newTodo = { id: generateId(), completed: false, priority: 'medium', description: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...todo };
    all.push(newTodo);
    setStore(STORAGE_KEYS.TODOS, all);
    pushInsert('todo_items', newTodo);
    return newTodo;
}

export function updateTodo(id, updates) {
    const all = getStore(STORAGE_KEYS.TODOS);
    const idx = all.findIndex(t => t.id === id);
    if (idx >= 0) {
        all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
        setStore(STORAGE_KEYS.TODOS, all);
        pushUpdate('todo_items', id, { ...updates, updated_at: all[idx].updated_at });
    }
}

export function deleteTodo(id) {
    const all = getStore(STORAGE_KEYS.TODOS);
    setStore(STORAGE_KEYS.TODOS, all.filter(t => t.id !== id));
    pushDelete('todo_items', id);
}

export function toggleTodo(id) {
    const all = getStore(STORAGE_KEYS.TODOS);
    const idx = all.findIndex(t => t.id === id);
    if (idx >= 0) {
        all[idx].completed = !all[idx].completed;
        all[idx].updated_at = new Date().toISOString();
        setStore(STORAGE_KEYS.TODOS, all);
        pushUpdate('todo_items', id, { completed: all[idx].completed, updated_at: all[idx].updated_at });
    }
}

// ==================== HABITS ====================
export function getHabits() {
    return getStore(STORAGE_KEYS.HABITS).filter(h => h.is_active);
}

export function getAllHabits() {
    return getStore(STORAGE_KEYS.HABITS);
}

export function addHabit(habit) {
    const all = getStore(STORAGE_KEYS.HABITS);
    const newHabit = { id: generateId(), icon: '', category: 'general', sort_order: all.length, is_active: true, created_at: new Date().toISOString(), ...habit };
    all.push(newHabit);
    setStore(STORAGE_KEYS.HABITS, all);
    pushInsert('daily_habits', newHabit);
    return newHabit;
}

export function updateHabit(id, updates) {
    const all = getStore(STORAGE_KEYS.HABITS);
    const idx = all.findIndex(h => h.id === id);
    if (idx >= 0) {
        all[idx] = { ...all[idx], ...updates };
        setStore(STORAGE_KEYS.HABITS, all);
        pushUpdate('daily_habits', id, updates);
    }
}

export function deleteHabit(id) {
    const all = getStore(STORAGE_KEYS.HABITS);
    const idx = all.findIndex(h => h.id === id);
    if (idx >= 0) {
        all[idx].is_active = false;
        setStore(STORAGE_KEYS.HABITS, all);
        pushUpdate('daily_habits', id, { is_active: false });
    }
    const logs = getStore(STORAGE_KEYS.HABIT_LOGS);
    setStore(STORAGE_KEYS.HABIT_LOGS, logs.filter(l => l.habit_id !== id));
}

// ==================== HABIT LOGS ====================
export function getHabitLogsForDate(date) {
    return getStore(STORAGE_KEYS.HABIT_LOGS).filter(l => l.date === date);
}

export function getAllHabitLogs() {
    return getStore(STORAGE_KEYS.HABIT_LOGS);
}

export function toggleHabitLog(habitId, date) {
    const all = getStore(STORAGE_KEYS.HABIT_LOGS);
    const idx = all.findIndex(l => l.habit_id === habitId && l.date === date);
    let record;
    if (idx >= 0) {
        all[idx].completed = !all[idx].completed;
        record = all[idx];
    } else {
        record = { id: generateId(), habit_id: habitId, date, completed: true, created_at: new Date().toISOString() };
        all.push(record);
    }
    setStore(STORAGE_KEYS.HABIT_LOGS, all);
    pushUpsertComposite('habit_logs', record, ['habit_id', 'date']);
}

// ==================== DAILY GOALS ====================
export function getDailyGoals() {
    return getStore(STORAGE_KEYS.GOALS).filter(g => g.is_active);
}

export function addDailyGoal(goal) {
    const all = getStore(STORAGE_KEYS.GOALS);
    const newGoal = { id: generateId(), is_active: true, sort_order: all.length, created_at: new Date().toISOString(), ...goal };
    all.push(newGoal);
    setStore(STORAGE_KEYS.GOALS, all);
    pushInsert('daily_goals', newGoal);
    return newGoal;
}

export function updateDailyGoal(id, updates) {
    const all = getStore(STORAGE_KEYS.GOALS);
    const idx = all.findIndex(g => g.id === id);
    if (idx >= 0) {
        all[idx] = { ...all[idx], ...updates };
        setStore(STORAGE_KEYS.GOALS, all);
        pushUpdate('daily_goals', id, updates);
    }
}

export function deleteDailyGoal(id) {
    const all = getStore(STORAGE_KEYS.GOALS);
    const idx = all.findIndex(g => g.id === id);
    if (idx >= 0) {
        all[idx].is_active = false;
        setStore(STORAGE_KEYS.GOALS, all);
        pushUpdate('daily_goals', id, { is_active: false });
    }
}

// ==================== GOAL LOGS ====================
export function getGoalLogsForDate(date) {
    return getStore(STORAGE_KEYS.GOAL_LOGS).filter(l => l.date === date);
}

export function getAllGoalLogs() {
    return getStore(STORAGE_KEYS.GOAL_LOGS);
}

export function toggleGoalLog(goalId, date) {
    const all = getStore(STORAGE_KEYS.GOAL_LOGS);
    const idx = all.findIndex(l => l.goal_id === goalId && l.date === date);
    let record;
    if (idx >= 0) {
        all[idx].completed = !all[idx].completed;
        record = all[idx];
    } else {
        record = { id: generateId(), goal_id: goalId, date, completed: true, notes: '', created_at: new Date().toISOString() };
        all.push(record);
    }
    setStore(STORAGE_KEYS.GOAL_LOGS, all);
    pushUpsertComposite('goal_logs', record, ['goal_id', 'date']);
}

// ==================== BEST DAY SCORING ====================
export function isBestDay(date) {
    const goals = getDailyGoals();
    const logs = getGoalLogsForDate(date);
    const categories = ['physical', 'technical', 'mental', 'consume'];
    let categoriesCompleted = 0;
    categories.forEach(cat => {
        const catGoals = goals.filter(g => g.category === cat);
        const catGoalIds = catGoals.map(g => g.id);
        const hasCompleted = logs.some(l => catGoalIds.includes(l.goal_id) && l.completed);
        if (hasCompleted) categoriesCompleted++;
    });
    return categoriesCompleted >= 3;
}

export function countBestDays(startDate, endDate) {
    let count = 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);
    while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        if (isBestDay(dateStr)) count++;
        current.setDate(current.getDate() + 1);
    }
    return count;
}

// ==================== OFF-DAYS / HOLIDAYS ====================
export function getOffDays() {
    return getStore(STORAGE_KEYS.OFF_DAYS);
}

export function isOffDay(date) {
    const offDays = getStore(STORAGE_KEYS.OFF_DAYS);
    return offDays.some(d => d.date === date);
}

export function toggleOffDay(date, label = 'Holiday') {
    const all = getStore(STORAGE_KEYS.OFF_DAYS);
    const idx = all.findIndex(d => d.date === date);
    if (idx >= 0) {
        all.splice(idx, 1);
        pushDeleteMatch('off_days', { date });
    } else {
        const record = { id: generateId(), date, label, created_at: new Date().toISOString() };
        all.push(record);
        pushInsert('off_days', record);
    }
    setStore(STORAGE_KEYS.OFF_DAYS, all);
}

// ==================== JOURNAL ====================
export function getJournalForDate(date) {
    const all = getStore(STORAGE_KEYS.JOURNAL);
    return all.find(j => j.date === date) || null;
}

export function getAllJournalEntries() {
    return getStore(STORAGE_KEYS.JOURNAL).sort((a, b) => b.date.localeCompare(a.date));
}

export function upsertJournal(date, content, mood) {
    const all = getStore(STORAGE_KEYS.JOURNAL);
    const idx = all.findIndex(j => j.date === date);
    let record;
    if (idx >= 0) {
        all[idx].content = content;
        all[idx].mood = mood;
        all[idx].updated_at = new Date().toISOString();
        record = all[idx];
    } else {
        record = { id: generateId(), date, content, mood, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        all.push(record);
    }
    setStore(STORAGE_KEYS.JOURNAL, all);
    pushUpsert('journal_entries', record, ['date']);
}

// ==================== ACADEMIC PROJECTS ====================
export function getProjects() {
    return getStore(STORAGE_KEYS.PROJECTS);
}

export function addProject(project) {
    const all = getStore(STORAGE_KEYS.PROJECTS);
    const newProject = {
        id: generateId(), description: '', status: 'active',
        next_meeting: null, meeting_notes: '',
        progress: 0, semester: '',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        ...project,
    };
    all.push(newProject);
    setStore(STORAGE_KEYS.PROJECTS, all);
    pushInsert('academic_projects', newProject);
    return newProject;
}

export function updateProject(id, updates) {
    const all = getStore(STORAGE_KEYS.PROJECTS);
    const idx = all.findIndex(p => p.id === id);
    if (idx >= 0) {
        all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
        setStore(STORAGE_KEYS.PROJECTS, all);
        pushUpdate('academic_projects', id, { ...updates, updated_at: all[idx].updated_at });
    }
}

export function deleteProject(id) {
    const all = getStore(STORAGE_KEYS.PROJECTS);
    setStore(STORAGE_KEYS.PROJECTS, all.filter(p => p.id !== id));
    pushDelete('academic_projects', id);
}

// ==================== WEEKLY/MONTHLY GOALS ====================
export function getWeeklyMonthlyGoals(type = null) {
    const all = getStore(STORAGE_KEYS.WEEKLY_MONTHLY_GOALS);
    if (type) return all.filter(g => g.type === type);
    return all;
}

export function getActiveGoals(type) {
    const all = getStore(STORAGE_KEYS.WEEKLY_MONTHLY_GOALS);
    const today = new Date().toISOString().split('T')[0];
    return all.filter(g => g.type === type && g.start_date <= today && g.end_date >= today);
}

export function addWeeklyMonthlyGoal(goal) {
    const all = getStore(STORAGE_KEYS.WEEKLY_MONTHLY_GOALS);
    const newGoal = { id: generateId(), progress: 0, completed: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...goal };
    all.push(newGoal);
    setStore(STORAGE_KEYS.WEEKLY_MONTHLY_GOALS, all);
    pushInsert('weekly_monthly_goals', newGoal);
    return newGoal;
}

export function updateWeeklyMonthlyGoal(id, updates) {
    const all = getStore(STORAGE_KEYS.WEEKLY_MONTHLY_GOALS);
    const idx = all.findIndex(g => g.id === id);
    if (idx >= 0) {
        all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
        setStore(STORAGE_KEYS.WEEKLY_MONTHLY_GOALS, all);
        pushUpdate('weekly_monthly_goals', id, { ...updates, updated_at: all[idx].updated_at });
    }
}

export function deleteWeeklyMonthlyGoal(id) {
    const all = getStore(STORAGE_KEYS.WEEKLY_MONTHLY_GOALS);
    setStore(STORAGE_KEYS.WEEKLY_MONTHLY_GOALS, all.filter(g => g.id !== id));
    pushDelete('weekly_monthly_goals', id);
}

// ==================== EVENTS ====================
export function getEvents() {
    return getStore(STORAGE_KEYS.EVENTS).sort((a, b) => a.event_date.localeCompare(b.event_date));
}

export function getUpcomingEvents(daysAhead = 7) {
    const all = getStore(STORAGE_KEYS.EVENTS);
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const todayStr = today.toISOString().split('T')[0];
    const futureStr = futureDate.toISOString().split('T')[0];
    return all.filter(e => e.event_date >= todayStr && e.event_date <= futureStr)
        .sort((a, b) => a.event_date.localeCompare(b.event_date));
}

export function addEvent(event) {
    const all = getStore(STORAGE_KEYS.EVENTS);
    const newEvent = { id: generateId(), description: '', event_time: '', category: 'general', created_at: new Date().toISOString(), ...event };
    all.push(newEvent);
    setStore(STORAGE_KEYS.EVENTS, all);
    pushInsert('events', newEvent);
    return newEvent;
}

export function updateEvent(id, updates) {
    const all = getStore(STORAGE_KEYS.EVENTS);
    const idx = all.findIndex(e => e.id === id);
    if (idx >= 0) {
        all[idx] = { ...all[idx], ...updates };
        setStore(STORAGE_KEYS.EVENTS, all);
        pushUpdate('events', id, updates);
    }
}

export function deleteEvent(id) {
    const all = getStore(STORAGE_KEYS.EVENTS);
    setStore(STORAGE_KEYS.EVENTS, all.filter(e => e.id !== id));
    pushDelete('events', id);
}

// ==================== CALENDAR DATA ====================
export function getCalendarDayData(date) {
    const todos = getTodosForDate(date);
    const habitLogs = getHabitLogsForDate(date);
    const goalLogs = getGoalLogsForDate(date);
    const journal = getJournalForDate(date);
    const offDay = isOffDay(date);
    const bestDay = isBestDay(date);
    const habits = getHabits();
    const completedHabits = habitLogs.filter(l => l.completed).length;
    const totalHabits = habits.length;

    return {
        date,
        todoCount: todos.length,
        todoDone: todos.filter(t => t.completed).length,
        habitsDone: completedHabits,
        habitsTotal: totalHabits,
        goalsCompleted: goalLogs.filter(l => l.completed).length,
        hasMood: journal?.mood || null,
        isOffDay: offDay,
        isBestDay: bestDay,
        hasJournal: !!journal?.content,
    };
}

// ==================== STREAK CALCULATION (OFF-DAY AWARE) ====================
export function calculateStreak(habitId) {
    const allLogs = getAllHabitLogs().filter(l => l.habit_id === habitId && l.completed);
    const logDates = new Set(allLogs.map(l => l.date));
    const offDays = new Set(getOffDays().map(d => d.date));

    let currentStreak = 0;
    const today = new Date();
    let checkDate = new Date(today);

    const todayStr = checkDate.toISOString().split('T')[0];
    if (!logDates.has(todayStr) && !offDays.has(todayStr)) {
        checkDate.setDate(checkDate.getDate() - 1);
    }

    for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (offDays.has(dateStr)) {
            checkDate.setDate(checkDate.getDate() - 1);
            continue;
        }
        if (logDates.has(dateStr)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }

    const sortedDates = [...logDates].sort();
    let bestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
            tempStreak = 1;
        } else {
            const prev = new Date(sortedDates[i - 1]);
            const curr = new Date(sortedDates[i]);
            let isConsecutive = true;
            const tempDate = new Date(prev);
            tempDate.setDate(tempDate.getDate() + 1);
            while (tempDate < curr) {
                const ds = tempDate.toISOString().split('T')[0];
                if (!offDays.has(ds)) {
                    isConsecutive = false;
                    break;
                }
                tempDate.setDate(tempDate.getDate() + 1);
            }
            if (isConsecutive) {
                tempStreak++;
            } else {
                bestStreak = Math.max(bestStreak, tempStreak);
                tempStreak = 1;
            }
        }
    }
    bestStreak = Math.max(bestStreak, tempStreak);

    return { currentStreak, bestStreak, totalDays: logDates.size };
}

// ==================== SEED DEFAULT HABITS & GOALS ====================
export function seedDefaultData() {
    const habits = getStore(STORAGE_KEYS.HABITS);
    if (habits.length === 0) {
        const defaults = [
            { name: 'Water', category: 'morning', sort_order: 0 },
            { name: 'Breakfast', category: 'morning', sort_order: 1 },
            { name: 'Workout', category: 'morning', sort_order: 2 },
            { name: 'Healthy Snack', category: 'evening', sort_order: 3 },
            { name: 'Skin Care', category: 'night', sort_order: 4 },
            { name: 'Plan Next Day', category: 'night', sort_order: 5 },
            { name: 'Journal', category: 'night', sort_order: 6 },
            { name: 'Read', category: 'night', sort_order: 7 },
        ];
        defaults.forEach(h => addHabit(h));
    }

    const goals = getStore(STORAGE_KEYS.GOALS);
    if (goals.length === 0) {
        const defaults = [
            { name: 'Gym / Exercise', category: 'physical', sort_order: 0 },
            { name: 'Coding Practice', category: 'technical', sort_order: 0 },
            { name: 'DSA Problem', category: 'technical', sort_order: 1 },
            { name: 'Meditation', category: 'mental', sort_order: 0 },
            { name: 'Reading', category: 'mental', sort_order: 1 },
            { name: 'Podcast / Video', category: 'consume', sort_order: 0 },
            { name: 'Article / Blog', category: 'consume', sort_order: 1 },
        ];
        defaults.forEach(g => addDailyGoal(g));
    }

    cleanupOldScheduleData();
}

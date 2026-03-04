/**
 * Supabase Sync Layer
 * Write-through cache: localStorage for instant UI, Supabase for persistence.
 * On app load: pull from Supabase → hydrate localStorage
 * On every write: update localStorage (instant) + push to Supabase (background)
 */

import { supabase, isSupabaseConnected } from './supabase';

// Table-to-localStorage key mapping
const TABLE_MAP = {
    schedule_entries: 'planner_schedule',
    schedule_done: 'planner_schedule_done',
    schedule_history: 'planner_schedule_history',
    todo_items: 'planner_todos',
    daily_habits: 'planner_habits',
    habit_logs: 'planner_habit_logs',
    daily_goals: 'planner_goals',
    goal_logs: 'planner_goal_logs',
    journal_entries: 'planner_journal',
    academic_projects: 'planner_projects',
    weekly_monthly_goals: 'planner_wm_goals',
    events: 'planner_events',
    off_days: 'planner_off_days',
    study_subjects: 'planner_study_subjects',
    study_sessions: 'planner_study_sessions',
    lifetime_goals: 'planner_lifetime_goals',
};

// ==================== PULL: Supabase → localStorage ====================
export async function pullFromSupabase() {
    if (!isSupabaseConnected()) return false;

    try {
        const tables = Object.keys(TABLE_MAP);
        const results = await Promise.all(
            tables.map(table => supabase.from(table).select('*'))
        );

        let hasData = false;
        tables.forEach((table, i) => {
            const { data, error } = results[i];
            if (!error && data) {
                const localKey = TABLE_MAP[table];
                // Deduplicate by id to prevent Supabase duplicate rows from polluting localStorage
                const seen = new Set();
                const deduped = data.filter(row => {
                    if (row.id && seen.has(row.id)) return false;
                    if (row.id) seen.add(row.id);
                    return true;
                });
                localStorage.setItem(localKey, JSON.stringify(deduped));
                if (deduped.length > 0) hasData = true;
            }
        });

        console.log('[Sync] Pulled from Supabase:', hasData ? 'data found' : 'empty');
        return true;
    } catch (err) {
        console.error('[Sync] Pull failed:', err);
        return false;
    }
}

// ==================== PUSH helpers: localStorage → Supabase ====================

// Generic upsert (insert or update)
export async function pushUpsert(table, record, conflictColumns = ['id']) {
    if (!isSupabaseConnected()) return;
    try {
        const { error } = await supabase.from(table).upsert(record, { onConflict: conflictColumns.join(',') });
        if (error) console.error(`[Sync] Upsert ${table}:`, error.message);
    } catch (err) {
        console.error(`[Sync] Upsert ${table}:`, err);
    }
}

// Generic insert
export async function pushInsert(table, record) {
    if (!isSupabaseConnected()) return;
    try {
        const { error } = await supabase.from(table).insert(record);
        if (error) console.error(`[Sync] Insert ${table}:`, error.message);
    } catch (err) {
        console.error(`[Sync] Insert ${table}:`, err);
    }
}

// Generic update by id
export async function pushUpdate(table, id, updates) {
    if (!isSupabaseConnected()) return;
    try {
        const { error } = await supabase.from(table).update(updates).eq('id', id);
        if (error) console.error(`[Sync] Update ${table}:`, error.message);
    } catch (err) {
        console.error(`[Sync] Update ${table}:`, err);
    }
}

// Generic delete by id
export async function pushDelete(table, id) {
    if (!isSupabaseConnected()) return;
    try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) console.error(`[Sync] Delete ${table}:`, error.message);
    } catch (err) {
        console.error(`[Sync] Delete ${table}:`, err);
    }
}

// Delete by matching columns (for composite keys)
export async function pushDeleteMatch(table, match) {
    if (!isSupabaseConnected()) return;
    try {
        let query = supabase.from(table).delete();
        Object.entries(match).forEach(([col, val]) => {
            query = query.eq(col, val);
        });
        const { error } = await query;
        if (error) console.error(`[Sync] DeleteMatch ${table}:`, error.message);
    } catch (err) {
        console.error(`[Sync] DeleteMatch ${table}:`, err);
    }
}

// Upsert by composite key (for schedule_done, habit_logs, goal_logs)
export async function pushUpsertComposite(table, record, conflictColumns) {
    if (!isSupabaseConnected()) return;
    try {
        const { error } = await supabase.from(table).upsert(record, { onConflict: conflictColumns.join(',') });
        if (error) console.error(`[Sync] UpsertComposite ${table}:`, error.message);
    } catch (err) {
        console.error(`[Sync] UpsertComposite ${table}:`, err);
    }
}

// Full table sync (push entire localStorage array to Supabase)
export async function pushFullTable(table) {
    if (!isSupabaseConnected()) return;
    try {
        const localKey = TABLE_MAP[table];
        const data = JSON.parse(localStorage.getItem(localKey) || '[]');
        // Delete all and re-insert
        await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (data.length > 0) {
            const { error } = await supabase.from(table).insert(data);
            if (error) console.error(`[Sync] FullPush ${table}:`, error.message);
        }
    } catch (err) {
        console.error(`[Sync] FullPush ${table}:`, err);
    }
}

// Cleanup old schedule data in Supabase too
export async function pushCleanupOldSchedule() {
    if (!isSupabaseConnected()) return;
    try {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - 1);
        const cutoffStr = cutoff.toISOString().split('T')[0];
        await supabase.from('schedule_entries').delete().lt('date', cutoffStr);
        await supabase.from('schedule_done').delete().lt('date', cutoffStr);
    } catch (err) {
        console.error('[Sync] Cleanup:', err);
    }
}

// Check connection
export async function testConnection() {
    if (!isSupabaseConnected()) return false;
    try {
        const { error } = await supabase.from('daily_habits').select('id').limit(1);
        return !error;
    } catch {
        return false;
    }
}

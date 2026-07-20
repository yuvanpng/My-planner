/**
 * Reward Token System - Data Layer
 * localStorage-only (no Supabase sync needed for personal reward data)
 */

import { format, subDays } from 'date-fns';
import {
    getHabits, getHabitLogsForDate, getGoalLogsForDate, getDailyGoals,
    getScheduleForDate, getScheduleDoneForDate, getStudySessionsForDate, calculateStreak,
} from './store';
import { pushUpsert, pushDelete, pushFullTable } from './sync';

// ── Storage Keys ───────────────────────────────────────────────────────────────
const KEYS = {
    CONFIG: 'planner_reward_config',
    REWARDS: 'planner_rewards',
    REDEMPTIONS: 'planner_redemptions',
    DAILY_TOKENS: 'planner_daily_tokens',
};

function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function get(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}

function set(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
}

// ── Default Config ─────────────────────────────────────────────────────────────
export const DEFAULT_CONFIG = {
    goalWeight: 45,
    habitWeight: 30,
    studyWeight: 20,
    scheduleWeight: 5,
    studyTargetMins: 180,          // 3 hours = full study score
    tokensPerTenPoints: 1,         // 10 score points → 1 token (max 10/day base)
    dailyTokenLimit: 12,
    streakBonusThreshold: 7,       // streak ≥ 7 → bonus
    streakBonusTokens: 1,
    perfectDayBonusTokens: 2,      // completing 3+ goal categories
    perfectDayThreshold: 3,        // # of categories with ≥1 completion
};

// ── Default Rewards ────────────────────────────────────────────────────────────
const DEFAULT_REWARDS = [
    { id: uid(), name: 'Movie Night', icon: '🎬', description: 'Pick any movie and enjoy it guilt-free', cost: 8, category: 'Entertainment', enabled: true, usageLimit: null, cooldownDays: 0, sortOrder: 0 },
    { id: uid(), name: 'Watch a Match', icon: '⚽', description: 'Watch your favourite sport live or streamed', cost: 6, category: 'Entertainment', enabled: true, usageLimit: null, cooldownDays: 0, sortOrder: 1 },
    { id: uid(), name: 'No Work Day', icon: '🏖️', description: 'A full rest day — zero obligations', cost: 15, category: 'Rest', enabled: true, usageLimit: null, cooldownDays: 3, sortOrder: 2 },
    { id: uid(), name: 'Unlimited Instagram', icon: '📱', description: 'Guilt-free scroll session for the day', cost: 5, category: 'Entertainment', enabled: true, usageLimit: null, cooldownDays: 1, sortOrder: 3 },
    { id: uid(), name: 'Cheat Meal', icon: '🍔', description: 'Order or cook whatever you\'re craving', cost: 4, category: 'Food', enabled: true, usageLimit: null, cooldownDays: 2, sortOrder: 4 },
    { id: uid(), name: 'Gaming Session', icon: '🎮', description: '2+ hours of uninterrupted gaming', cost: 7, category: 'Entertainment', enabled: true, usageLimit: null, cooldownDays: 1, sortOrder: 5 },
    { id: uid(), name: 'Coffee Treat', icon: '☕', description: 'Your favourite café order, no guilt', cost: 2, category: 'Food', enabled: true, usageLimit: null, cooldownDays: 0, sortOrder: 6 },
    { id: uid(), name: 'Buy a Book', icon: '📚', description: 'Pick up any book you\'ve been eyeing', cost: 5, category: 'Learning', enabled: true, usageLimit: null, cooldownDays: 0, sortOrder: 7 },
    { id: uid(), name: 'Shopping Budget', icon: '🛍️', description: 'Treat yourself to something you want', cost: 12, category: 'Shopping', enabled: true, usageLimit: null, cooldownDays: 7, sortOrder: 8 },
    { id: uid(), name: 'Day Trip', icon: '🌅', description: 'Plan and take a day trip somewhere new', cost: 20, category: 'Adventure', enabled: true, usageLimit: null, cooldownDays: 14, sortOrder: 9 },
];

// ── Config ─────────────────────────────────────────────────────────────────────
export function getTokenConfig() {
    const raw = get(KEYS.CONFIG);
    let stored = {};
    if (Array.isArray(raw)) {
        stored = raw[0]?.config || {};
    } else if (raw) {
        stored = raw; // migration from old format
    }
    return { ...DEFAULT_CONFIG, ...stored };
}

export function saveTokenConfig(config) {
    set(KEYS.CONFIG, [{ id: 'default', config }]);
    pushUpsert('reward_config', { id: 'default', config });
}

// ── Rewards ────────────────────────────────────────────────────────────────────
export function getRewards() {
    const stored = get(KEYS.REWARDS);
    if (!stored) {
        set(KEYS.REWARDS, DEFAULT_REWARDS);
        pushFullTable('rewards');
        return DEFAULT_REWARDS;
    }
    return stored.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function addReward(reward) {
    const all = getRewards();
    const newReward = {
        id: uid(),
        enabled: true,
        usageLimit: null,
        cooldownDays: 0,
        sortOrder: all.length,
        createdAt: new Date().toISOString(),
        ...reward,
    };
    all.push(newReward);
    set(KEYS.REWARDS, all);
    pushUpsert('rewards', newReward);
    return newReward;
}

export function updateReward(id, updates) {
    const all = getRewards();
    const idx = all.findIndex(r => r.id === id);
    if (idx >= 0) {
        all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
        set(KEYS.REWARDS, all);
        pushUpsert('rewards', all[idx]);
        return all[idx];
    }
    return null;
}

export function deleteReward(id) {
    const all = getRewards().filter(r => r.id !== id);
    set(KEYS.REWARDS, all);
    pushDelete('rewards', id);
}

export function reorderRewards(orderedIds) {
    const all = getRewards();
    orderedIds.forEach((id, idx) => {
        const r = all.find(x => x.id === id);
        if (r) r.sortOrder = idx;
    });
    set(KEYS.REWARDS, all);
    pushFullTable('rewards');
}

// ── Redemptions ────────────────────────────────────────────────────────────────
export function getRedemptions() {
    return (get(KEYS.REDEMPTIONS) || []).sort((a, b) => new Date(b.redeemedAt) - new Date(a.redeemedAt));
}

export function addRedemption(rewardId, rewardName, tokensSpent) {
    const all = get(KEYS.REDEMPTIONS) || [];
    const entry = {
        id: uid(),
        rewardId,
        rewardName,
        tokensSpent,
        redeemedAt: new Date().toISOString(),
        usedAt: null,
    };
    all.push(entry);
    set(KEYS.REDEMPTIONS, all);
    pushUpsert('redemptions', entry);
    return entry;
}

export function markRedemptionUsed(id) {
    const all = get(KEYS.REDEMPTIONS) || [];
    const idx = all.findIndex(r => r.id === id);
    if (idx >= 0) {
        all[idx].usedAt = new Date().toISOString();
        set(KEYS.REDEMPTIONS, all);
        pushUpsert('redemptions', all[idx]);
    }
}

// Check if a reward is on cooldown
export function isRewardOnCooldown(rewardId) {
    const reward = getRewards().find(r => r.id === rewardId);
    if (!reward || !reward.cooldownDays) return false;
    const redemptions = getRedemptions().filter(r => r.rewardId === rewardId);
    if (!redemptions.length) return false;
    const last = new Date(redemptions[0].redeemedAt);
    const cooldownEnd = new Date(last);
    cooldownEnd.setDate(cooldownEnd.getDate() + reward.cooldownDays);
    return new Date() < cooldownEnd;
}

export function getCooldownRemainingDays(rewardId) {
    const reward = getRewards().find(r => r.id === rewardId);
    if (!reward || !reward.cooldownDays) return 0;
    const redemptions = getRedemptions().filter(r => r.rewardId === rewardId);
    if (!redemptions.length) return 0;
    const last = new Date(redemptions[0].redeemedAt);
    const cooldownEnd = new Date(last);
    cooldownEnd.setDate(cooldownEnd.getDate() + reward.cooldownDays);
    const diff = Math.ceil((cooldownEnd - new Date()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
}

// ── Daily Token Calculation ────────────────────────────────────────────────────
export function calculateDailyTokens(dateStr) {
    const cfg = getTokenConfig();
    const goals = getDailyGoals();

    // Habits
    const activeHabits = getHabits();
    const habitLogs = getHabitLogsForDate(dateStr);
    const habitsCompleted = habitLogs.filter(l => l.completed).length;
    const habitPct = activeHabits.length > 0 ? habitsCompleted / activeHabits.length : 0;

    // Goals
    const goalLogs = getGoalLogsForDate(dateStr);
    const goalsCompleted = goalLogs.filter(l => l.completed).length;
    const goalPct = goals.length > 0 ? goalsCompleted / goals.length : 0;

    // Study
    const sessions = getStudySessionsForDate(dateStr);
    const studyMins = sessions.reduce((s, x) => s + x.duration_mins, 0);
    const studyPct = Math.min(studyMins / (cfg.studyTargetMins || 180), 1);

    // Schedule
    const entries = getScheduleForDate(dateStr).filter(e => e.activity?.trim());
    const done = getScheduleDoneForDate(dateStr).filter(d => d.done);
    const schedulePct = entries.length > 0 ? done.length / entries.length : 0;

    // Weighted score (0-100)
    const score = Math.round(
        habitPct * cfg.habitWeight +
        goalPct * cfg.goalWeight +
        studyPct * cfg.studyWeight +
        schedulePct * cfg.scheduleWeight
    );

    // Base tokens
    let tokens = Math.floor(score / 10) * cfg.tokensPerTenPoints;

    // Streak bonus
    const maxStreak = activeHabits.reduce((max, h) => {
        const s = calculateStreak(h.id);
        return Math.max(max, s.currentStreak);
    }, 0);
    const streakBonus = maxStreak >= cfg.streakBonusThreshold ? cfg.streakBonusTokens : 0;

    // Perfect day bonus (goals completed in N+ categories)
    const CATS = ['physical', 'technical', 'mental', 'consume'];
    const catsWithCompletions = CATS.filter(cat => {
        const catGoals = goals.filter(g => g.category === cat);
        if (!catGoals.length) return false;
        return goalLogs.some(l => catGoals.map(g => g.id).includes(l.goal_id) && l.completed);
    });
    const perfectBonus = catsWithCompletions.length >= (cfg.perfectDayThreshold || 3) ? cfg.perfectDayBonusTokens : 0;

    tokens = Math.min(tokens + streakBonus + perfectBonus, cfg.dailyTokenLimit);

    return {
        score,
        tokens,
        breakdown: {
            habitPct: Math.round(habitPct * 100),
            goalPct: Math.round(goalPct * 100),
            studyPct: Math.round(studyPct * 100),
            schedulePct: Math.round(schedulePct * 100),
            streakBonus,
            perfectBonus,
        },
    };
}

// ── Earned Token Ledger ────────────────────────────────────────────────────────
// Each entry: { date, tokens, score, breakdown }
function getDailyTokenLedger() {
    return get(KEYS.DAILY_TOKENS) || [];
}

export function saveDailyTokenEntry(dateStr) {
    const ledger = getDailyTokenLedger();
    const { score, tokens, breakdown } = calculateDailyTokens(dateStr);
    const existing = ledger.findIndex(e => e.date === dateStr);
    const entry = { date: dateStr, tokens, score, breakdown, savedAt: new Date().toISOString() };
    if (existing >= 0) ledger[existing] = entry;
    else ledger.push(entry);
    set(KEYS.DAILY_TOKENS, ledger);
    pushUpsert('daily_tokens', entry, ['date']);
    return entry;
}

export function getEarnedEntry(dateStr) {
    return getDailyTokenLedger().find(e => e.date === dateStr) || null;
}

// ── Token Balance ──────────────────────────────────────────────────────────────
export function getTotalEarned() {
    return getDailyTokenLedger().reduce((sum, e) => sum + (e.tokens || 0), 0);
}

export function getTotalSpent() {
    return getRedemptions().reduce((sum, r) => sum + (r.tokensSpent || 0), 0);
}

export function getCurrentBalance() {
    return Math.max(0, getTotalEarned() - getTotalSpent());
}

export function getTokensEarnedToday() {
    const today = format(new Date(), 'yyyy-MM-dd');
    const entry = getEarnedEntry(today);
    return entry ? entry.tokens : 0;
}

// Call this on app load / each day to ensure today's tokens are computed
export function ensureTodayTokens() {
    const today = format(new Date(), 'yyyy-MM-dd');
    // Always recompute today (score may have changed)
    return saveDailyTokenEntry(today);
}

// ── Motivational message ───────────────────────────────────────────────────────
export function getMotivationalMessage(rewardCost) {
    const balance = getCurrentBalance();
    const gap = rewardCost - balance;
    if (gap <= 0) return null;
    return `Only ${gap} more token${gap === 1 ? '' : 's'} to unlock this!`;
}

// Categories
export const REWARD_CATEGORIES = ['Entertainment', 'Rest', 'Food', 'Learning', 'Shopping', 'Adventure', 'Custom'];

export const CATEGORY_COLORS = {
    Entertainment: '#7c5cfc',
    Rest:          '#10b981',
    Food:          '#f97316',
    Learning:      '#3b82f6',
    Shopping:      '#ec4899',
    Adventure:     '#f59e0b',
    Custom:        '#94a3b8',
};

import { useState, useMemo, useEffect, useCallback } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
    ShoppingBag, History, Settings2, Plus, Trash2, Edit3,
    Check, X, ToggleLeft, ToggleRight, RotateCcw, Clock, Gift
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
    getTokenConfig, saveTokenConfig,
    getRewards, addReward, updateReward, deleteReward,
    getRedemptions, addRedemption, markRedemptionUsed,
    isRewardOnCooldown, getCooldownRemainingDays,
    getCurrentBalance, getTotalEarned, getTotalSpent,
    ensureTodayTokens, getMotivationalMessage,
    REWARD_CATEGORIES, calculateDailyTokens,
} from '../lib/rewardStore';

// Simple progress bar using app accent
function Bar({ value, max = 100, height = 5 }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div style={{ flex: 1, height, background: 'var(--bg-elevated)', borderRadius: height / 2, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: height / 2, transition: 'width 0.5s ease' }} />
        </div>
    );
}

// ── Reward Card ────────────────────────────────────────────────────────────────
function RewardCard({ reward, balance, onRedeem, onEdit, onDelete, onToggle }) {
    const onCooldown  = isRewardOnCooldown(reward.id);
    const cooldownDays = getCooldownRemainingDays(reward.id);
    const canAfford   = balance >= reward.cost;
    const canRedeem   = canAfford && !onCooldown && reward.enabled;
    const motivational = !canAfford ? getMotivationalMessage(reward.cost) : null;

    return (
        <div className="card" style={{ opacity: reward.enabled ? 1 : 0.5, display: 'flex', flexDirection: 'column' }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{reward.icon}</span>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{reward.name}</div>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>{reward.category}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                    <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={() => onToggle(reward.id)}>
                        {reward.enabled ? <ToggleRight size={14} style={{ color: 'var(--accent-secondary)' }} /> : <ToggleLeft size={14} />}
                    </button>
                    <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={() => onEdit(reward)}>
                        <Edit3 size={12} />
                    </button>
                    <button className="btn-icon" style={{ width: 26, height: 26 }} onClick={() => onDelete(reward.id)}>
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 14, flex: 1 }}>
                {reward.description}
            </p>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>🪙 {reward.cost}</span>
                {onCooldown ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                        <Clock size={12} /> {cooldownDays}d cooldown
                    </span>
                ) : (
                    <button
                        className={`btn btn-sm${canRedeem ? ' btn-primary' : ''}`}
                        disabled={!canRedeem}
                        onClick={() => onRedeem(reward)}
                        style={{ fontSize: '0.75rem', cursor: canRedeem ? 'pointer' : 'not-allowed', opacity: canRedeem ? 1 : 0.5 }}
                    >
                        Redeem
                    </button>
                )}
            </div>

            {motivational && (
                <div style={{ marginTop: 10, fontSize: '0.7rem', color: 'var(--text-tertiary)', padding: '5px 8px', background: 'var(--bg-elevated)', borderRadius: 6 }}>
                    {motivational}
                </div>
            )}
            {reward.cooldownDays > 0 && (
                <div style={{ marginTop: 4, fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                    {reward.cooldownDays}d between uses
                </div>
            )}
        </div>
    );
}

// ── Reward Form Modal ──────────────────────────────────────────────────────────
function RewardForm({ reward, onSave, onClose }) {
    const [form, setForm] = useState({
        name: reward?.name || '',
        icon: reward?.icon || '🎁',
        description: reward?.description || '',
        cost: reward?.cost || 5,
        category: reward?.category || 'Entertainment',
        cooldownDays: reward?.cooldownDays || 0,
        enabled: reward?.enabled ?? true,
    });

    const EMOJIS = ['🎬', '⚽', '🏖️', '📱', '🍔', '🎮', '☕', '📚', '🛍️', '🌅', '🎁', '🍕', '🎉', '💆', '🎧', '🎨', '🏃', '🍦', '🌮', '✈️'];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) return toast.error('Name is required');
        onSave(form);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="card" style={{ width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="card-header">
                    <div className="card-title">{reward ? <Edit3 size={15} /> : <Plus size={15} />} {reward ? 'Edit Reward' : 'New Reward'}</div>
                    <button className="btn-icon" onClick={onClose}><X size={16} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    {/* Emoji picker */}
                    <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8, display: 'block' }}>Icon</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {EMOJIS.map(e => (
                                <button key={e} type="button" onClick={() => setForm(f => ({ ...f, icon: e }))} style={{
                                    width: 34, height: 34, borderRadius: 8, border: `1px solid ${form.icon === e ? 'var(--accent-primary)' : 'var(--border-primary)'}`,
                                    background: form.icon === e ? 'var(--accent-primary-dim)' : 'var(--bg-elevated)',
                                    fontSize: '1.1rem', cursor: 'pointer',
                                }}>{e}</button>
                            ))}
                        </div>
                        <input className="input" style={{ marginTop: 8, maxWidth: 100 }} value={form.icon}
                            onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="Emoji" maxLength={4} />
                    </div>

                    <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>Name *</label>
                        <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Reward name" />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>Description</label>
                        <textarea className="input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this reward mean?" style={{ resize: 'vertical' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>Token Cost 🪙</label>
                            <input className="input" type="number" min={1} max={100} value={form.cost} onChange={e => setForm(f => ({ ...f, cost: parseInt(e.target.value) || 1 }))} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>Category</label>
                            <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ cursor: 'pointer' }}>
                                {REWARD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>Cooldown days (0 = none)</label>
                        <input className="input" type="number" min={0} max={365} value={form.cooldownDays} onChange={e => setForm(f => ({ ...f, cooldownDays: parseInt(e.target.value) || 0 }))} style={{ maxWidth: 100 }} />
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
                        <button type="button" className="btn" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Settings Panel ─────────────────────────────────────────────────────────────
function SettingsPanel() {
    const [cfg, setCfg] = useState(getTokenConfig());
    const total = cfg.goalWeight + cfg.habitWeight + cfg.studyWeight + cfg.scheduleWeight;

    const updateCfg = (key, val) => {
        const next = { ...cfg, [key]: val };
        setCfg(next);
        saveTokenConfig(next);
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Weights */}
            <div className="card">
                <div className="card-header"><div className="card-title"><Settings2 size={15} /> Scoring Weights</div></div>
                <div style={{ marginBottom: 12, padding: '7px 10px', borderRadius: 7, background: total === 100 ? 'var(--accent-success-dim)' : 'var(--accent-danger-dim)', fontSize: '0.72rem', color: total === 100 ? 'var(--accent-success)' : 'var(--accent-danger)', fontWeight: 600 }}>
                    {total === 100 ? '✓ Weights sum to 100%' : `⚠ Currently ${total}% (must equal 100%)`}
                </div>
                {[
                    { label: '🎯 Goals',    field: 'goalWeight' },
                    { label: '⚡ Habits',   field: 'habitWeight' },
                    { label: '📚 Study',    field: 'studyWeight' },
                    { label: '📅 Schedule', field: 'scheduleWeight' },
                ].map(({ label, field }) => (
                    <div key={field} style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cfg[field]}%</span>
                        </div>
                        <input type="range" min={0} max={100} value={cfg[field]}
                            onChange={e => updateCfg(field, parseInt(e.target.value))}
                            style={{ width: '100%' }} />
                    </div>
                ))}
                <button className="btn" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => {
                    const d = { ...cfg, goalWeight: 45, habitWeight: 30, studyWeight: 20, scheduleWeight: 5 };
                    setCfg(d); saveTokenConfig(d); toast.success('Reset to defaults');
                }}>
                    <RotateCcw size={12} /> Reset
                </button>
            </div>

            {/* Token rules */}
            <div className="card">
                <div className="card-header"><div className="card-title">Token Rules</div></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {[
                        { label: 'Study target (mins = 100%)', field: 'studyTargetMins', min: 30, max: 480 },
                        { label: 'Daily token limit',          field: 'dailyTokenLimit',  min: 1,  max: 30 },
                        { label: 'Streak bonus threshold (days)', field: 'streakBonusThreshold', min: 1, max: 100 },
                        { label: 'Streak bonus tokens',        field: 'streakBonusTokens', min: 0, max: 10 },
                        { label: 'Perfect day bonus tokens',   field: 'perfectDayBonusTokens', min: 0, max: 10 },
                        { label: 'Categories for perfect day', field: 'perfectDayThreshold', min: 1, max: 4 },
                    ].map(({ label, field, min, max }) => (
                        <div key={field}>
                            <label style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 5, display: 'block' }}>{label}</label>
                            <input className="input" type="number" min={min} max={max} value={cfg[field]}
                                onChange={e => updateCfg(field, parseInt(e.target.value) || min)}
                                style={{ maxWidth: 90 }} />
                        </div>
                    ))}
                    <div style={{ padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 7, fontSize: '0.7rem', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
                        Score = Σ(component% × weight)<br />
                        Tokens = floor(score / 10) + bonuses
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── History Panel ──────────────────────────────────────────────────────────────
function HistoryPanel() {
    const [redemptions, setRedemptions] = useState(getRedemptions());
    const rewards = getRewards();

    const reload = () => setRedemptions(getRedemptions());

    if (redemptions.length === 0) {
        return (
            <div className="empty-state" style={{ padding: 40 }}>
                <p>No redemptions yet. Earn tokens and redeem your first reward!</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {redemptions.map((r, i) => (
                <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 4px',
                    borderBottom: i < redemptions.length - 1 ? '1px solid var(--border-primary)' : 'none',
                    opacity: r.usedAt ? 0.55 : 1,
                }}>
                    <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>
                        {rewards.find(x => x.id === r.rewardId)?.icon || '🎁'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{r.rewardName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                            {formatDistanceToNow(new Date(r.redeemedAt))} ago · {format(new Date(r.redeemedAt), 'MMM d, yyyy')}
                        </div>
                        {r.usedAt && <div style={{ fontSize: '0.68rem', color: 'var(--accent-success)', marginTop: 1 }}>✓ Used</div>}
                    </div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>🪙 {r.tokensSpent}</span>
                    {!r.usedAt && (
                        <button className="btn btn-sm" style={{ fontSize: '0.72rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                            onClick={() => { markRedemptionUsed(r.id); reload(); toast.success('Marked as used!'); }}>
                            <Check size={11} /> Mark Used
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function RewardsStore() {
    const [tab, setTab] = useState('store');
    const [filterCat, setFilterCat] = useState('All');
    const [rewards, setRewards] = useState([]);
    const [editReward, setEditReward] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [balance, setBalance] = useState(0);
    const [todayTokens, setTodayTokens] = useState(0);
    const [totalEarned, setTotalEarned] = useState(0);
    const [totalSpent, setTotalSpent] = useState(0);
    const [todayBreakdown, setTodayBreakdown] = useState(null);

    const reload = useCallback(() => {
        const entry = ensureTodayTokens();
        setTodayTokens(entry?.tokens ?? 0);
        setBalance(getCurrentBalance());
        setTotalEarned(getTotalEarned());
        setTotalSpent(getTotalSpent());
        setRewards(getRewards());
        setTodayBreakdown(entry?.breakdown || null);
    }, []);

    useEffect(() => { reload(); }, [reload]);

    const handleRedeem = (reward) => {
        if (getCurrentBalance() < reward.cost) return toast.error('Not enough tokens!');
        if (isRewardOnCooldown(reward.id)) return toast.error('This reward is on cooldown!');
        addRedemption(reward.id, reward.name, reward.cost);
        reload();
        toast.success(`🎉 ${reward.name} redeemed!`);
    };

    const handleSave = (form) => {
        if (editReward) { updateReward(editReward.id, form); toast.success('Reward updated!'); }
        else { addReward(form); toast.success('Reward added!'); }
        setShowForm(false); setEditReward(null); reload();
    };

    const handleDelete = (id) => {
        if (!confirm('Delete this reward?')) return;
        deleteReward(id); reload(); toast.success('Deleted');
    };

    const handleToggle = (id) => {
        const r = rewards.find(x => x.id === id);
        if (!r) return;
        updateReward(id, { enabled: !r.enabled }); reload();
    };

    const categories = useMemo(() => ['All', ...new Set(rewards.map(r => r.category))], [rewards]);
    const filtered = useMemo(() =>
        rewards.filter(r => (filterCat === 'All' || r.category === filterCat) && (r.enabled || tab === 'settings')),
    [rewards, filterCat, tab]);

    const todayScore = useMemo(() => calculateDailyTokens(format(new Date(), 'yyyy-MM-dd')), []);

    const TABS = [
        { id: 'store',    label: 'Store',    icon: <ShoppingBag size={14} /> },
        { id: 'history',  label: 'History',  icon: <History size={14} /> },
        { id: 'settings', label: 'Settings', icon: <Settings2 size={14} /> },
    ];

    return (
        <div>
            <div className="page-header">
                <h2>Rewards Store</h2>
                <p>Earn tokens by being productive. Spend them on things you love.</p>
            </div>

            {/* Token summary — plain stat tiles */}
            <div className="stats-mini-grid" style={{ marginBottom: 24 }}>
                {[
                    { label: "Today's Tokens", value: `🪙 ${todayTokens}`, sub: `Score: ${todayScore.score}/100` },
                    { label: 'Balance',         value: `🪙 ${balance}`,     sub: 'Available' },
                    { label: 'Lifetime Earned', value: `🪙 ${totalEarned}`, sub: 'All time' },
                    { label: 'Spent',           value: `🪙 ${totalSpent}`,  sub: `${getRedemptions().length} redemptions` },
                ].map(({ label, value, sub }) => (
                    <div key={label} className="stat-card-mini card">
                        <div className="stat-number" style={{ fontSize: '1.3rem' }}>{value}</div>
                        <div className="stat-label">{label}</div>
                        {sub && <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: 2 }}>{sub}</div>}
                    </div>
                ))}
            </div>

            {/* Score breakdown */}
            {todayBreakdown && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-header">
                        <div className="card-title">Today's Score Breakdown</div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                            {todayScore.score}/100
                            {todayBreakdown.streakBonus ? ` · +${todayBreakdown.streakBonus} streak` : ''}
                            {todayBreakdown.perfectBonus ? ` · +${todayBreakdown.perfectBonus} perfect day` : ''}
                        </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[
                            { label: 'Goals',    pct: todayBreakdown.goalPct },
                            { label: 'Habits',   pct: todayBreakdown.habitPct },
                            { label: 'Study',    pct: todayBreakdown.studyPct },
                            { label: 'Schedule', pct: todayBreakdown.schedulePct },
                        ].map(({ label, pct }) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ width: 54, fontSize: '0.75rem', color: 'var(--text-secondary)', flexShrink: 0 }}>{label}</span>
                                <Bar value={pct} />
                                <span style={{ width: 32, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', flexShrink: 0 }}>{pct}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border-primary)', marginBottom: 20 }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
                        border: 'none', borderBottom: `2px solid ${tab === t.id ? 'var(--accent-primary)' : 'transparent'}`,
                        background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                        fontWeight: tab === t.id ? 600 : 400, fontSize: '0.82rem',
                        color: tab === t.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        transition: 'all 0.15s', marginBottom: -1,
                    }}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* ── Store ── */}
            {tab === 'store' && (
                <>
                    {/* Category pills */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
                        {categories.map(cat => (
                            <button key={cat} className={`month-tab ${filterCat === cat ? 'active' : ''}`}
                                onClick={() => setFilterCat(cat)}>
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14, marginBottom: 18 }}>
                        {filtered.map(r => (
                            <RewardCard key={r.id} reward={r} balance={balance}
                                onRedeem={handleRedeem}
                                onEdit={rw => { setEditReward(rw); setShowForm(true); }}
                                onDelete={handleDelete}
                                onToggle={handleToggle}
                            />
                        ))}
                    </div>

                    {filtered.length === 0 && (
                        <div className="empty-state"><p>No rewards in this category.</p></div>
                    )}

                    <button className="btn" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                        onClick={() => { setEditReward(null); setShowForm(true); }}>
                        <Plus size={14} /> Add Reward
                    </button>
                </>
            )}

            {/* ── History ── */}
            {tab === 'history' && (
                <div className="card">
                    <HistoryPanel key="history" />
                </div>
            )}

            {/* ── Settings ── */}
            {tab === 'settings' && (
                <>
                    <SettingsPanel />
                    <div className="card" style={{ marginTop: 16 }}>
                        <div className="card-header">
                            <div className="card-title"><ShoppingBag size={15} /> All Rewards</div>
                            <button className="btn btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                                onClick={() => { setEditReward(null); setShowForm(true); }}>
                                <Plus size={12} /> Add
                            </button>
                        </div>
                        <div>
                            {rewards.map((r, i) => (
                                <div key={r.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px',
                                    borderBottom: i < rewards.length - 1 ? '1px solid var(--border-primary)' : 'none',
                                }}>
                                    <span style={{ fontSize: '1.2rem', width: 28, textAlign: 'center', flexShrink: 0 }}>{r.icon}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 500, color: r.enabled ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{r.name}</div>
                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>{r.category} · 🪙 {r.cost}{r.cooldownDays ? ` · ${r.cooldownDays}d cd` : ''}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 2 }}>
                                        <button className="btn-icon" onClick={() => handleToggle(r.id)}>
                                            {r.enabled ? <ToggleRight size={15} style={{ color: 'var(--accent-secondary)' }} /> : <ToggleLeft size={15} />}
                                        </button>
                                        <button className="btn-icon" onClick={() => { setEditReward(r); setShowForm(true); }}><Edit3 size={12} /></button>
                                        <button className="btn-icon" onClick={() => handleDelete(r.id)}><Trash2 size={12} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Form modal */}
            {showForm && (
                <RewardForm
                    reward={editReward}
                    onSave={handleSave}
                    onClose={() => { setShowForm(false); setEditReward(null); }}
                />
            )}
        </div>
    );
}

import { useState, useEffect } from 'react';
import { Lightbulb, Plus, Trash2, Shuffle, Zap, Clock, Search, Filter, X, CheckCircle2 } from 'lucide-react';
import { getIdeas, addIdea, updateIdea, deleteIdea } from '../lib/store';
import toast from 'react-hot-toast';

const TAG_OPTIONS = ['Productive', 'Fun', 'Brain activity', 'Relax', 'Chores', 'Social', 'Learning'];
const ENERGY_LEVELS = [
    { value: 'low', label: 'Low Energy', color: '#3b82f6' },
    { value: 'medium', label: 'Mid Energy', color: '#f59e0b' },
    { value: 'high', label: 'High Energy', color: '#ef4444' }
];
const DURATIONS = [
    { value: 'short', label: '< 15m', color: '#10b981' },
    { value: 'medium', label: '15-60m', color: '#6366f1' },
    { value: 'long', label: '1h+', color: '#a855f7' }
];

export default function IdeaVault() {
    const [ideas, setIdeas] = useState([]);
    const [newIdea, setNewIdea] = useState('');
    const [selectedTags, setSelectedTags] = useState([]);
    const [selectedEnergy, setSelectedEnergy] = useState('medium');
    const [selectedDuration, setSelectedDuration] = useState('medium');
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTags, setFilterTags] = useState([]);
    const [filterEnergy, setFilterEnergy] = useState('all');
    
    // Randomizer State
    const [isShuffling, setIsShuffling] = useState(false);
    const [surpriseIdea, setSurpriseIdea] = useState(null);

    useEffect(() => {
        loadIdeas();
    }, []);

    const loadIdeas = () => {
        setIdeas(getIdeas());
    };

    const handleAddIdea = (e) => {
        e.preventDefault();
        if (!newIdea.trim()) return;

        addIdea({
            text: newIdea.trim(),
            tags: selectedTags,
            energy: selectedEnergy,
            duration: selectedDuration
        });

        setNewIdea('');
        setSelectedTags([]);
        setSelectedEnergy('medium');
        setSelectedDuration('medium');
        loadIdeas();
        toast.success('Idea added to the vault!');
    };

    const toggleTag = (tag) => {
        setSelectedTags(prev => 
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleDelete = (id) => {
        deleteIdea(id);
        loadIdeas();
        toast.success('Idea removed');
    };

    const handleShuffle = () => {
        const filtered = ideas.filter(idea => {
            const matchesTags = filterTags.length === 0 || filterTags.some(t => idea.tags.includes(t));
            const matchesEnergy = filterEnergy === 'all' || idea.energy === filterEnergy;
            const matchesSearch = idea.text.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesTags && matchesEnergy && matchesSearch;
        });

        if (filtered.length === 0) {
            toast.error('No ideas match your current filters!');
            return;
        }

        setIsShuffling(true);
        setSurpriseIdea(null);
        
        // Animation effect: cycle through random ideas
        let counter = 0;
        const interval = setInterval(() => {
            const randomIdx = Math.floor(Math.random() * filtered.length);
            setSurpriseIdea(filtered[randomIdx]);
            counter++;
            if (counter > 10) {
                clearInterval(interval);
                setIsShuffling(false);
                const finalIdx = Math.floor(Math.random() * filtered.length);
                setSurpriseIdea(filtered[finalIdx]);
            }
        }, 100);
    };

    const filteredIdeas = ideas.filter(idea => {
        const matchesTags = filterTags.length === 0 || filterTags.some(t => idea.tags.includes(t));
        const matchesEnergy = filterEnergy === 'all' || idea.energy === filterEnergy;
        const matchesSearch = idea.text.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesTags && matchesEnergy && matchesSearch;
    });

    return (
        <div className="idea-vault-page">
            <header className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2>Idea Vault</h2>
                        <p>Dump your ideas and decide what to do later</p>
                    </div>
                    <button 
                        className={`btn btn-primary btn-shuffle ${isShuffling ? 'shuffling' : ''}`}
                        onClick={handleShuffle}
                        disabled={isShuffling || ideas.length === 0}
                    >
                        <Shuffle size={18} />
                        I'm Bored
                    </button>
                </div>
            </header>

            {surpriseIdea && !isShuffling && (
                <div className="surprise-highlight-card">
                    <div className="highlight-label">How about this?</div>
                    <h3>{surpriseIdea.text}</h3>
                    <div className="highlight-meta">
                        {surpriseIdea.tags.map(tag => (
                            <span key={tag} className="idea-tag">{tag}</span>
                        ))}
                        <span className="idea-meta-item">
                            <Zap size={14} color={ENERGY_LEVELS.find(e => e.value === surpriseIdea.energy)?.color} />
                            {ENERGY_LEVELS.find(e => e.value === surpriseIdea.energy)?.label}
                        </span>
                        <span className="idea-meta-item">
                            <Clock size={14} color={DURATIONS.find(d => d.value === surpriseIdea.duration)?.color} />
                            {DURATIONS.find(d => d.value === surpriseIdea.duration)?.label}
                        </span>
                    </div>
                    <button className="close-surprise" onClick={() => setSurpriseIdea(null)}>
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="idea-vault-layout">
                <aside className="idea-form-sidebar">
                    <div className="card">
                        <div className="card-title">
                            <Plus size={16} /> Add New Idea
                        </div>
                        <form onSubmit={handleAddIdea}>
                            <textarea 
                                className="textarea idea-input"
                                placeholder="What's an exciting idea or activity?"
                                value={newIdea}
                                onChange={(e) => setNewIdea(e.target.value)}
                                required
                            />
                            
                            <div className="form-section">
                                <label className="input-label">Tags</label>
                                <div className="tag-cloud">
                                    {TAG_OPTIONS.map(tag => (
                                        <button 
                                            key={tag}
                                            type="button"
                                            className={`tag-chip ${selectedTags.includes(tag) ? 'active' : ''}`}
                                            onClick={() => toggleTag(tag)}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-col">
                                    <label className="input-label">Energy</label>
                                    <select 
                                        className="select"
                                        value={selectedEnergy}
                                        onChange={(e) => setSelectedEnergy(e.target.value)}
                                    >
                                        {ENERGY_LEVELS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                                    </select>
                                </div>
                                <div className="form-col">
                                    <label className="input-label">Duration</label>
                                    <select 
                                        className="select"
                                        value={selectedDuration}
                                        onChange={(e) => setSelectedDuration(e.target.value)}
                                    >
                                        {DURATIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary add-idea-btn">
                                Save to Vault
                            </button>
                        </form>
                    </div>
                </aside>

                <main className="idea-list-container">
                    <div className="idea-filters card">
                        <div className="search-bar-wrap">
                            <Search size={18} className="search-icon" />
                            <input 
                                type="text" 
                                className="input search-input" 
                                placeholder="Search ideas..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="filter-controls">
                            <div className="filter-group">
                                <Filter size={16} />
                                {TAG_OPTIONS.filter(t => ideas.some(i => i.tags.includes(t))).map(tag => (
                                    <button 
                                        key={tag}
                                        className={`filter-chip ${filterTags.includes(tag) ? 'active' : ''}`}
                                        onClick={() => setFilterTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="idea-grid">
                        {filteredIdeas.length > 0 ? (
                            filteredIdeas.map(idea => (
                                <div key={idea.id} className="idea-card">
                                    <button className="delete-idea-btn" onClick={() => handleDelete(idea.id)}>
                                        <Trash2 size={14} />
                                    </button>
                                    <p className="idea-text">{idea.text}</p>
                                    <div className="idea-footer">
                                        <div className="idea-tags">
                                            {idea.tags.map(tag => (
                                                <span key={tag} className="tag-mini">{tag}</span>
                                            ))}
                                        </div>
                                        <div className="idea-meta">
                                            <span title={ENERGY_LEVELS.find(e => e.value === idea.energy)?.label}>
                                                <Zap size={14} color={ENERGY_LEVELS.find(e => e.value === idea.energy)?.color} />
                                            </span>
                                            <span title={DURATIONS.find(d => d.value === idea.duration)?.label}>
                                                <Clock size={14} color={DURATIONS.find(d => d.value === idea.duration)?.color} />
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-ideas">
                                <Lightbulb size={48} />
                                <p>Your vault is empty. Add some ideas to get started!</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

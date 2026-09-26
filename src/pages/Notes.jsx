import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FileText, Plus, Trash2, Pin, PinOff, Search, Tag, X,
    Bold, Italic, Underline, Heading1, Heading2, List, Link2,
    Clock, Check, ChevronRight,
} from 'lucide-react';
import {
    getNotes, getNoteById, createNote, saveNote, deleteNote, togglePinNote,
} from '../lib/notesStore';
import toast from 'react-hot-toast';

// ─── Debounce hook ──────────────────────────────────────────────────────────
function useDebounce(fn, delay) {
    const timer = useRef(null);
    return useCallback((...args) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => fn(...args), delay);
    }, [fn, delay]);
}

// ─── Format relative time ───────────────────────────────────────────────────
function relativeTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
}

// ─── Tag pill ───────────────────────────────────────────────────────────────
function TagPill({ label, onRemove }) {
    return (
        <span className="note-tag-pill">
            {label}
            {onRemove && (
                <button className="note-tag-remove" onClick={onRemove} title="Remove tag">
                    <X size={10} />
                </button>
            )}
        </span>
    );
}

// ─── Toolbar button ─────────────────────────────────────────────────────────
function ToolbarBtn({ title, onClick, children, active }) {
    return (
        <button
            className={`note-toolbar-btn ${active ? 'active' : ''}`}
            title={title}
            onMouseDown={(e) => { e.preventDefault(); onClick(); }}
        >
            {children}
        </button>
    );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function Notes() {
    const { id: urlId } = useParams();
    const navigate = useNavigate();

    const [notes, setNotes] = useState([]);
    const [activeNote, setActiveNote] = useState(null);
    const [search, setSearch] = useState('');
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'unsaved'
    const [tagInput, setTagInput] = useState('');
    const [showTagInput, setShowTagInput] = useState(false);
    const [linkPopup, setLinkPopup] = useState({ visible: false, query: '', x: 0, y: 0 });

    const editorRef = useRef(null);
    const titleRef = useRef(null);
    const lastSavedContent = useRef('');
    const lastSavedTitle = useRef('');

    // ── Load notes on mount ──────────────────────────────────────────────────
    useEffect(() => {
        const loaded = getNotes();
        setNotes(loaded);
        if (urlId) {
            const found = loaded.find(n => n.id === urlId);
            if (found) openNote(found, false);
        }
    }, []);

    // ── Open a note ──────────────────────────────────────────────────────────
    function openNote(note, pushNav = true) {
        setActiveNote(note);
        lastSavedContent.current = note.content;
        lastSavedTitle.current = note.title;
        setSaveStatus('saved');
        if (pushNav) navigate(`/notes/${note.id}`, { replace: true });
        // Set editor content after render
        setTimeout(() => {
            if (editorRef.current) {
                editorRef.current.innerHTML = note.content || '';
            }
            if (titleRef.current) {
                titleRef.current.textContent = note.title || 'Untitled';
            }
        }, 0);
    }

    // ── Create new note ──────────────────────────────────────────────────────
    function handleNewNote() {
        const note = createNote('Untitled');
        const refreshed = getNotes();
        setNotes(refreshed);
        openNote(note);
        toast.success('New note created');
        // Focus title after render
        setTimeout(() => {
            if (titleRef.current) {
                titleRef.current.focus();
                // Select all text in title
                const range = document.createRange();
                range.selectNodeContents(titleRef.current);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }, 50);
    }

    // ── Auto-save (debounced) ────────────────────────────────────────────────
    const doSave = useCallback((noteOverride) => {
        const note = noteOverride || activeNote;
        if (!note) return;
        const content = editorRef.current?.innerHTML || '';
        const title = titleRef.current?.textContent?.trim() || 'Untitled';
        if (content === lastSavedContent.current && title === lastSavedTitle.current) return;
        setSaveStatus('saving');
        const saved = saveNote({ ...note, content, title });
        lastSavedContent.current = content;
        lastSavedTitle.current = title;
        setActiveNote(saved);
        setNotes(getNotes());
        setSaveStatus('saved');
    }, [activeNote]);

    const debouncedSave = useDebounce(doSave, 1500);

    // ── Editor input handler ─────────────────────────────────────────────────
    function handleEditorInput() {
        setSaveStatus('unsaved');
        debouncedSave();
        // Detect [[ for link popup
        const sel = window.getSelection();
        if (!sel.rangeCount) return;
        const text = sel.anchorNode?.textContent || '';
        const offset = sel.anchorOffset;
        const before = text.slice(0, offset);
        const match = before.match(/\[\[([^\]]*)$/);
        if (match) {
            const query = match[1];
            const range = sel.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const editorRect = editorRef.current.getBoundingClientRect();
            setLinkPopup({
                visible: true,
                query,
                x: rect.left - editorRect.left,
                y: rect.bottom - editorRect.top + 4,
            });
        } else {
            setLinkPopup(p => ({ ...p, visible: false }));
        }
    }

    // ── Title blur ───────────────────────────────────────────────────────────
    function handleTitleBlur() {
        if (!activeNote) return;
        const title = titleRef.current?.textContent?.trim() || 'Untitled';
        if (title !== lastSavedTitle.current) {
            doSave({ ...activeNote, title });
        }
    }

    // ── Prevent Enter key in title ───────────────────────────────────────────
    function handleTitleKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            editorRef.current?.focus();
        }
    }

    // ── Keyboard shortcuts for formatting ────────────────────────────────────
    function handleEditorKeyDown(e) {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b') { e.preventDefault(); exec('bold'); }
            if (e.key === 'i') { e.preventDefault(); exec('italic'); }
            if (e.key === 'u') { e.preventDefault(); exec('underline'); }
            if (e.key === 's') { e.preventDefault(); doSave(); toast.success('Saved!'); }
        }
    }

    // ── execCommand formatting ───────────────────────────────────────────────
    function exec(cmd, value) {
        editorRef.current?.focus();
        document.execCommand(cmd, false, value || null);
        setSaveStatus('unsaved');
        debouncedSave();
    }

    function execHeading(tag) {
        editorRef.current?.focus();
        document.execCommand('formatBlock', false, tag);
        setSaveStatus('unsaved');
        debouncedSave();
    }

    // ── Insert note link from popup ──────────────────────────────────────────
    function insertNoteLink(note) {
        editorRef.current?.focus();
        // Remove the [[ + typed query
        const sel = window.getSelection();
        if (sel.rangeCount) {
            const range = sel.getRangeAt(0);
            const node = range.startContainer;
            const text = node.textContent;
            const offset = range.startOffset;
            const before = text.slice(0, offset);
            const match = before.match(/\[\[([^\]]*)$/);
            if (match) {
                const startIdx = offset - match[0].length;
                const newRange = document.createRange();
                newRange.setStart(node, startIdx);
                newRange.setEnd(node, offset);
                newRange.deleteContents();
                // Insert linked text
                const span = document.createElement('span');
                span.className = 'note-internal-link';
                span.setAttribute('data-note-id', note.id);
                span.textContent = `→ ${note.title}`;
                newRange.insertNode(span);
                // Move cursor after span
                const cursorRange = document.createRange();
                cursorRange.setStartAfter(span);
                cursorRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(cursorRange);
            }
        }
        setLinkPopup(p => ({ ...p, visible: false }));
        setSaveStatus('unsaved');
        debouncedSave();
    }

    // ── Handle clicking internal note link ───────────────────────────────────
    function handleEditorClick(e) {
        const link = e.target.closest('.note-internal-link');
        if (link) {
            const targetId = link.getAttribute('data-note-id');
            const target = notes.find(n => n.id === targetId);
            if (target) {
                doSave();
                openNote(target);
            }
        }
    }

    // ── Delete note ──────────────────────────────────────────────────────────
    function handleDelete(id) {
        deleteNote(id);
        const refreshed = getNotes();
        setNotes(refreshed);
        if (activeNote?.id === id) {
            setActiveNote(null);
            navigate('/notes', { replace: true });
        }
        toast.success('Note deleted');
    }

    // ── Pin/unpin ────────────────────────────────────────────────────────────
    function handlePin(id) {
        togglePinNote(id);
        const refreshed = getNotes();
        setNotes(refreshed);
        if (activeNote?.id === id) {
            setActiveNote(refreshed.find(n => n.id === id) || null);
        }
    }

    // ── Tags ─────────────────────────────────────────────────────────────────
    function addTag(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const tag = tagInput.trim().replace(/,/g, '');
            if (!tag || !activeNote) return;
            if (activeNote.tags.includes(tag)) { setTagInput(''); return; }
            const updated = { ...activeNote, tags: [...activeNote.tags, tag] };
            const saved = saveNote(updated);
            setActiveNote(saved);
            setNotes(getNotes());
            setTagInput('');
        }
        if (e.key === 'Escape') setShowTagInput(false);
    }

    function removeTag(tag) {
        if (!activeNote) return;
        const updated = { ...activeNote, tags: activeNote.tags.filter(t => t !== tag) };
        const saved = saveNote(updated);
        setActiveNote(saved);
        setNotes(getNotes());
    }

    // ── Filter notes ─────────────────────────────────────────────────────────
    const filteredNotes = notes.filter(n => {
        if (!search) return true;
        const q = search.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q));
    });

    const pinnedNotes = filteredNotes.filter(n => n.is_pinned);
    const unpinnedNotes = filteredNotes.filter(n => !n.is_pinned);

    // ── Link popup filtered results ──────────────────────────────────────────
    const linkSuggestions = notes.filter(n =>
        n.id !== activeNote?.id &&
        n.title.toLowerCase().includes(linkPopup.query.toLowerCase())
    ).slice(0, 6);

    // ── Save status icon ─────────────────────────────────────────────────────
    const SaveIndicator = () => (
        <span className={`note-save-status note-save-${saveStatus}`}>
            {saveStatus === 'saving' && <Clock size={12} />}
            {saveStatus === 'saved' && <Check size={12} />}
            {saveStatus === 'unsaved' && <Clock size={12} />}
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Unsaved'}
        </span>
    );

    return (
        <div className="notes-page">
            {/* ── Left Panel ── */}
            <aside className="notes-list-panel">
                <div className="notes-panel-header">
                    <h2 className="notes-panel-title">
                        <FileText size={18} />
                        Notes
                    </h2>
                    <button className="btn btn-primary btn-sm notes-new-btn" onClick={handleNewNote}>
                        <Plus size={14} />
                        New
                    </button>
                </div>

                <div className="notes-search-wrap">
                    <Search size={14} className="notes-search-icon" />
                    <input
                        className="notes-search-input"
                        type="text"
                        placeholder="Search notes…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="notes-search-clear" onClick={() => setSearch('')}>
                            <X size={12} />
                        </button>
                    )}
                </div>

                <div className="notes-list">
                    {filteredNotes.length === 0 && (
                        <div className="notes-empty-list">
                            <FileText size={32} />
                            <p>{search ? 'No notes match your search' : 'No notes yet — create one!'}</p>
                        </div>
                    )}

                    {pinnedNotes.length > 0 && (
                        <>
                            <div className="notes-group-label">📌 Pinned</div>
                            {pinnedNotes.map(note => (
                                <NoteListItem
                                    key={note.id}
                                    note={note}
                                    isActive={activeNote?.id === note.id}
                                    onClick={() => { doSave(); openNote(note); }}
                                    onDelete={() => handleDelete(note.id)}
                                    onPin={() => handlePin(note.id)}
                                />
                            ))}
                        </>
                    )}

                    {unpinnedNotes.length > 0 && (
                        <>
                            {pinnedNotes.length > 0 && <div className="notes-group-label">All Notes</div>}
                            {unpinnedNotes.map(note => (
                                <NoteListItem
                                    key={note.id}
                                    note={note}
                                    isActive={activeNote?.id === note.id}
                                    onClick={() => { doSave(); openNote(note); }}
                                    onDelete={() => handleDelete(note.id)}
                                    onPin={() => handlePin(note.id)}
                                />
                            ))}
                        </>
                    )}
                </div>
            </aside>

            {/* ── Editor Panel ── */}
            <main className="notes-editor-panel">
                {activeNote ? (
                    <>
                        {/* Title */}
                        <div className="note-title-wrap">
                            <div
                                ref={titleRef}
                                className="note-title-editable"
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={handleTitleBlur}
                                onKeyDown={handleTitleKeyDown}
                                data-placeholder="Untitled"
                            />
                        </div>

                        {/* Tags row */}
                        <div className="note-tags-row">
                            <Tag size={13} className="note-tags-icon" />
                            {activeNote.tags.map(tag => (
                                <TagPill key={tag} label={tag} onRemove={() => removeTag(tag)} />
                            ))}
                            {showTagInput ? (
                                <input
                                    autoFocus
                                    className="note-tag-input"
                                    placeholder="Add tag, press Enter"
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={addTag}
                                    onBlur={() => setShowTagInput(false)}
                                />
                            ) : (
                                <button className="note-add-tag-btn" onClick={() => setShowTagInput(true)}>
                                    <Plus size={11} /> Add tag
                                </button>
                            )}
                            <span className="note-timestamp">
                                <Clock size={11} />
                                {relativeTime(activeNote.updated_at)}
                            </span>
                            <SaveIndicator />
                        </div>

                        {/* Toolbar */}
                        <div className="note-toolbar">
                            <div className="note-toolbar-group">
                                <ToolbarBtn title="Bold (Ctrl+B)" onClick={() => exec('bold')}><Bold size={14} /></ToolbarBtn>
                                <ToolbarBtn title="Italic (Ctrl+I)" onClick={() => exec('italic')}><Italic size={14} /></ToolbarBtn>
                                <ToolbarBtn title="Underline (Ctrl+U)" onClick={() => exec('underline')}><Underline size={14} /></ToolbarBtn>
                            </div>
                            <div className="note-toolbar-sep" />
                            <div className="note-toolbar-group">
                                <ToolbarBtn title="Heading 1" onClick={() => execHeading('h1')}><Heading1 size={14} /></ToolbarBtn>
                                <ToolbarBtn title="Heading 2" onClick={() => execHeading('h2')}><Heading2 size={14} /></ToolbarBtn>
                            </div>
                            <div className="note-toolbar-sep" />
                            <div className="note-toolbar-group">
                                <ToolbarBtn title="Bullet list" onClick={() => exec('insertUnorderedList')}><List size={14} /></ToolbarBtn>
                                <ToolbarBtn
                                    title="Link to another note (type [[ in editor)"
                                    onClick={() => {
                                        editorRef.current?.focus();
                                        document.execCommand('insertText', false, '[[');
                                    }}
                                >
                                    <Link2 size={14} />
                                </ToolbarBtn>
                            </div>
                            <div className="note-toolbar-sep" />
                            <div className="note-toolbar-group">
                                <ToolbarBtn title={activeNote.is_pinned ? 'Unpin' : 'Pin note'} onClick={() => handlePin(activeNote.id)}>
                                    {activeNote.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}
                                </ToolbarBtn>
                                <ToolbarBtn title="Delete note" onClick={() => handleDelete(activeNote.id)}>
                                    <Trash2 size={14} />
                                </ToolbarBtn>
                            </div>
                        </div>

                        {/* Content editor */}
                        <div className="note-editor-scroll">
                            <div
                                ref={editorRef}
                                className="note-editor-content"
                                contentEditable
                                suppressContentEditableWarning
                                onInput={handleEditorInput}
                                onKeyDown={handleEditorKeyDown}
                                onClick={handleEditorClick}
                                data-placeholder="Start writing… dump your thoughts, ideas, anything."
                            />

                            {/* [[ link popup */}
                            {linkPopup.visible && linkSuggestions.length > 0 && (
                                <div
                                    className="note-link-popup"
                                    style={{ left: linkPopup.x, top: linkPopup.y }}
                                >
                                    <div className="note-link-popup-label">Link to note</div>
                                    {linkSuggestions.map(n => (
                                        <button
                                            key={n.id}
                                            className="note-link-popup-item"
                                            onMouseDown={(e) => { e.preventDefault(); insertNoteLink(n); }}
                                        >
                                            <ChevronRight size={12} />
                                            {n.title}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="notes-editor-empty">
                        <FileText size={56} />
                        <h3>Pick a note or create one</h3>
                        <p>Your thoughts, ideas and brain dumps live here.</p>
                        <button className="btn btn-primary" onClick={handleNewNote}>
                            <Plus size={16} /> New Note
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}

// ─── Note list item ──────────────────────────────────────────────────────────
function NoteListItem({ note, isActive, onClick, onDelete, onPin }) {
    const [showActions, setShowActions] = useState(false);

    return (
        <div
            className={`note-list-item ${isActive ? 'active' : ''}`}
            onClick={onClick}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className="note-list-item-title">{note.title || 'Untitled'}</div>
            {note.tags.length > 0 && (
                <div className="note-list-item-tags">
                    {note.tags.slice(0, 3).map(t => (
                        <span key={t} className="note-list-tag">{t}</span>
                    ))}
                </div>
            )}
            <div className="note-list-item-meta">
                <span className="note-list-date">{relativeTime(note.updated_at)}</span>
                {showActions && (
                    <div className="note-list-actions" onClick={e => e.stopPropagation()}>
                        <button
                            className="note-list-action-btn"
                            title={note.is_pinned ? 'Unpin' : 'Pin'}
                            onClick={onPin}
                        >
                            {note.is_pinned ? <PinOff size={12} /> : <Pin size={12} />}
                        </button>
                        <button
                            className="note-list-action-btn danger"
                            title="Delete"
                            onClick={onDelete}
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

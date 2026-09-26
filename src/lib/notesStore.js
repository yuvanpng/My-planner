/**
 * Notes Store
 * Write-through cache: localStorage for instant UI, Supabase for persistence.
 * Mirrors the pattern used in store.js and sync.js.
 */

import { pushUpsert, pushDelete } from './sync';

const LOCAL_KEY = 'planner_notes';

// ==================== localStorage helpers ====================

function readAll() {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    } catch {
        return [];
    }
}

function writeAll(notes) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(notes));
}

// ==================== Public API ====================

export function getNotes() {
    return readAll().sort((a, b) => {
        // Pinned first, then by updated_at desc
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.updated_at) - new Date(a.updated_at);
    });
}

export function getNoteById(id) {
    return readAll().find(n => n.id === id) || null;
}

export function createNote(title = 'Untitled') {
    const now = new Date().toISOString();
    const note = {
        id: crypto.randomUUID(),
        title,
        content: '',
        tags: [],
        is_pinned: false,
        created_at: now,
        updated_at: now,
    };
    const notes = readAll();
    notes.push(note);
    writeAll(notes);
    pushUpsert('notes', note);
    return note;
}

export function saveNote(updatedNote) {
    const now = new Date().toISOString();
    const note = { ...updatedNote, updated_at: now };
    const notes = readAll();
    const idx = notes.findIndex(n => n.id === note.id);
    if (idx >= 0) {
        notes[idx] = note;
    } else {
        notes.push(note);
    }
    writeAll(notes);
    // Push to Supabase in background
    pushUpsert('notes', note);
    return note;
}

export function deleteNote(id) {
    const notes = readAll().filter(n => n.id !== id);
    writeAll(notes);
    pushDelete('notes', id);
}

export function togglePinNote(id) {
    const notes = readAll();
    const idx = notes.findIndex(n => n.id === id);
    if (idx < 0) return;
    notes[idx].is_pinned = !notes[idx].is_pinned;
    notes[idx].updated_at = new Date().toISOString();
    writeAll(notes);
    pushUpsert('notes', notes[idx]);
    return notes[idx];
}

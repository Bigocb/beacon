import React, { useState, useMemo } from 'react';
import { NoteUI, TagUI, NoteType } from '../types/enrichment';
import { NoteCard } from './NoteCard';
import '../styles/NotesUI.css';

interface NoteListProps {
  notes: NoteUI[];
  tags: TagUI[];
  onEdit: (note: NoteUI) => void;
  onDelete: (noteId: string) => void;
  onAddTag?: (noteId: string, tag: TagUI) => void;
  onRemoveTag?: (noteId: string, tagId: string) => void;
  onCreateNew: () => void;
  loading?: boolean;
}

type SortBy = 'date-desc' | 'date-asc' | 'type' | 'title';
const noteTypeOrder: Record<NoteType, number> = {
  milestone: 0,
  achievement: 1,
  issue: 2,
  general: 3,
};

export const NoteList: React.FC<NoteListProps> = ({
  notes,
  tags,
  onEdit,
  onDelete,
  onAddTag,
  onRemoveTag,
  onCreateNew,
  loading,
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<NoteType[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>('date-desc');

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    let filtered = [...notes];

    // Text search
    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      filtered = filtered.filter(
        note =>
          note.title?.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(note => selectedTypes.includes(note.type));
    }

    // Tag filter (match any tag)
    if (selectedTags.length > 0) {
      filtered = filtered.filter(note =>
        note.tags?.some(tag => selectedTags.includes(tag.id))
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'date-asc':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'type':
          return noteTypeOrder[a.type] - noteTypeOrder[b.type];
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
    });

    return filtered;
  }, [notes, searchText, selectedTypes, selectedTags, sortBy]);

  const toggleTypeFilter = (type: NoteType) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleTagFilter = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <div className="note-list-container">
      <div className="note-list-header">
        <h2>Notes</h2>
        <button
          className="btn-primary"
          onClick={onCreateNew}
          disabled={loading}
        >
          + New Note
        </button>
      </div>

      {loading ? (
        <div className="note-list-loading">Loading notes...</div>
      ) : notes.length === 0 ? (
        <div className="note-list-empty">
          <p>No notes yet. Create one to document your world progression!</p>
          <button className="btn-primary" onClick={onCreateNew}>
            Create First Note
          </button>
        </div>
      ) : (
        <>
          <div className="note-list-filters">
            <div className="filter-group">
              <input
                type="text"
                placeholder="Search notes..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="note-search-input"
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">Type:</label>
              <div className="filter-buttons">
                {(['general', 'milestone', 'achievement', 'issue'] as NoteType[]).map(
                  type => (
                    <button
                      key={type}
                      className={`filter-btn ${
                        selectedTypes.includes(type) ? 'active' : ''
                      }`}
                      onClick={() => toggleTypeFilter(type)}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  )
                )}
              </div>
            </div>

            {tags.length > 0 && (
              <div className="filter-group">
                <label className="filter-label">Tags:</label>
                <div className="filter-buttons">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      className={`filter-btn tag-filter ${
                        selectedTags.includes(tag.id) ? 'active' : ''
                      }`}
                      style={{
                        borderColor: tag.color || '#60a5fa',
                        backgroundColor: selectedTags.includes(tag.id)
                          ? (tag.color || '#60a5fa') + '20'
                          : 'transparent',
                      }}
                      onClick={() => toggleTagFilter(tag.id)}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="filter-group">
              <label htmlFor="note-sort">Sort:</label>
              <select
                id="note-sort"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortBy)}
                className="note-sort-select"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="type">By Type</option>
                <option value="title">By Title</option>
              </select>
            </div>
          </div>

          <div className="note-list-results">
            {filteredNotes.length === 0 ? (
              <div className="note-list-no-results">
                No notes match your filters. Try adjusting your search.
              </div>
            ) : (
              <>
                <div className="note-list-count">
                  Showing {filteredNotes.length} of {notes.length} notes
                </div>
                <div className="note-list">
                  {filteredNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onAddTag={onAddTag}
                      onRemoveTag={onRemoveTag}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

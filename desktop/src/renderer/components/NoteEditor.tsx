import React, { useState, useEffect } from 'react';
import { NoteUI, NoteType, TagUI } from '../types/enrichment';
import '../styles/NotesUI.css';

interface NoteEditorProps {
  note?: NoteUI;
  onSave: (note: Omit<NoteUI, 'id'>) => Promise<void>;
  onCancel: () => void;
  saveName: string;
  tags: TagUI[];
}

const noteTypeEmojis: Record<NoteType, string> = {
  general: '📝',
  milestone: '🎯',
  achievement: '⭐',
  issue: '⚠️',
};

const noteTypeLabels: Record<NoteType, string> = {
  general: 'Note',
  milestone: 'Milestone',
  achievement: 'Achievement',
  issue: 'Issue',
};

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  onSave,
  onCancel,
  saveName,
  tags,
}) => {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [noteType, setNoteType] = useState<NoteType>(note?.type || 'general');
  const [timestamp, setTimestamp] = useState(
    note?.timestamp ? note.timestamp.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(
    note?.tags?.map(t => t.id) || []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleAddTag = (tagId: string) => {
    if (!selectedTags.includes(tagId)) {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter(id => id !== tagId));
  };

  const handleSave = async () => {
    if (!content.trim()) {
      setError('Note content cannot be empty');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const noteTags = tags.filter(t => selectedTags.includes(t.id));

      await onSave({
        title: title || undefined,
        content,
        type: noteType,
        timestamp: new Date(timestamp),
        tags: noteTags,
        created_at: note?.created_at || new Date(),
        updated_at: new Date(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  // Simple markdown to HTML preview
  const renderMarkdownPreview = (markdown: string) => {
    let html = markdown
      .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^\- (.*?)$/gm, '<li>$1</li>')
      .replace(/(<li>.*?<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n/g, '<br />');

    return html;
  };

  return (
    <div className="note-editor-container">
      <div className="note-editor-header">
        <div className="note-editor-meta">
          <span className="note-save-name">World: {saveName}</span>
          <span className="note-timestamp">
            {new Date(timestamp).toLocaleDateString()}
          </span>
        </div>
        <div className="note-editor-actions">
          <button
            className="btn-secondary"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </div>

      {error && <div className="note-editor-error">{error}</div>}

      <div className="note-editor-type-row">
        <div className="note-type-selector">
          <label>Type:</label>
          <div className="note-type-buttons">
            {(Object.keys(noteTypeLabels) as NoteType[]).map(type => (
              <button
                key={type}
                className={`note-type-btn ${noteType === type ? 'active' : ''}`}
                onClick={() => setNoteType(type)}
              >
                <span className="emoji">{noteTypeEmojis[type]}</span>
                {noteTypeLabels[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="note-date-picker">
          <label htmlFor="note-date">Date:</label>
          <input
            id="note-date"
            type="date"
            value={timestamp}
            onChange={e => setTimestamp(e.target.value)}
          />
        </div>
      </div>

      <div className="note-editor-title">
        <input
          type="text"
          placeholder="Note title (optional)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="note-title-input"
        />
      </div>

      <div className="note-editor-toolbar">
        <div className="toolbar-buttons">
          <button
            className="toolbar-btn"
            onClick={() => setContent(content + '**bold**')}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            className="toolbar-btn"
            onClick={() => setContent(content + '*italic*')}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            className="toolbar-btn"
            onClick={() => setContent(content + '`code`')}
            title="Code"
          >
            {'<>'}
          </button>
          <button
            className="toolbar-btn"
            onClick={() => setContent(content + '\n- ')}
            title="Bullet list"
          >
            •
          </button>
          <button
            className="toolbar-btn"
            onClick={() => setContent(content + '### ')}
            title="Heading"
          >
            H
          </button>
        </div>

        <div className="toolbar-spacer" />

        <button
          className={`toolbar-preview-btn ${showPreview ? 'active' : ''}`}
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? 'Edit' : 'Preview'}
        </button>
      </div>

      <div className="note-editor-content">
        <textarea
          className="note-content-input"
          placeholder="Write your note here... Supports **bold**, *italic*, `code`, and markdown formatting"
          value={content}
          onChange={e => setContent(e.target.value)}
          style={{ display: showPreview ? 'none' : 'block' }}
        />

        {showPreview && (
          <div
            className="note-preview"
            dangerouslySetInnerHTML={{ __html: renderMarkdownPreview(content) }}
          />
        )}
      </div>

      <div className="note-editor-tags">
        <label>Tags:</label>
        <div className="tag-selection">
          <div className="tags-available">
            {tags.length > 0 ? (
              tags.map(tag => (
                <button
                  key={tag.id}
                  className={`tag-option ${selectedTags.includes(tag.id) ? 'selected' : ''}`}
                  onClick={() =>
                    selectedTags.includes(tag.id)
                      ? handleRemoveTag(tag.id)
                      : handleAddTag(tag.id)
                  }
                  style={{
                    borderColor: tag.color || '#60a5fa',
                    backgroundColor: selectedTags.includes(tag.id)
                      ? (tag.color || '#60a5fa') + '20'
                      : 'transparent',
                  }}
                >
                  {tag.name}
                </button>
              ))
            ) : (
              <span className="no-tags">No tags available</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

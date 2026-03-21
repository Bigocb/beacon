import React, { useState } from 'react';
import { NoteUI, TagUI } from '../types/enrichment';
import '../styles/NotesUI.css';

interface NoteCardProps {
  note: NoteUI;
  onEdit: (note: NoteUI) => void;
  onDelete: (noteId: string) => void;
  onAddTag?: (noteId: string, tag: TagUI) => void;
  onRemoveTag?: (noteId: string, tagId: string) => void;
}

const noteTypeEmojis: Record<string, string> = {
  general: '📝',
  milestone: '🎯',
  achievement: '⭐',
  issue: '⚠️',
};

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onEdit,
  onDelete,
  onRemoveTag,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Simple markdown preview rendering
  const renderContent = (content: string) => {
    if (isExpanded) {
      return (
        <div
          className="note-content-rendered"
          dangerouslySetInnerHTML={{
            __html: content
              .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
              .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
              .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/`(.*?)`/g, '<code>$1</code>')
              .replace(/^\- (.*?)$/gm, '<li>$1</li>')
              .replace(/(<li>.*?<\/li>)/s, '<ul>$1</ul>')
              .replace(/\n/g, '<br />'),
          }}
        />
      );
    }

    // Show truncated preview when collapsed
    const lines = content.split('\n');
    const preview = lines.slice(0, 2).join(' ').substring(0, 150);
    const needsTruncation = lines.length > 2 || preview.length < content.length;

    return (
      <div className="note-content-preview">
        {preview}
        {needsTruncation && <span className="truncation-indicator">...</span>}
      </div>
    );
  };

  return (
    <div className={`note-card ${note.type}`}>
      <div className="note-card-header">
        <div className="note-card-title-row">
          <span className="note-emoji">{noteTypeEmojis[note.type]}</span>
          <div className="note-card-title-info">
            {note.title && <h3 className="note-card-title">{note.title}</h3>}
            <div className="note-card-dates">
              <span className="note-date">
                {formatDate(note.timestamp)}
              </span>
              {isExpanded && (
                <span className="note-time">{formatTime(note.timestamp)}</span>
              )}
              {note.timestamp.getTime() !== note.created_at.getTime() && (
                <span className="note-created">
                  Created {formatDate(note.created_at)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="note-card-actions">
          <button
            className="note-card-expand"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '−' : '+'}
          </button>
          <button
            className="note-card-edit"
            onClick={() => onEdit(note)}
            title="Edit note"
          >
            ✏️
          </button>
          {!showDeleteConfirm ? (
            <button
              className="note-card-delete"
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete note"
            >
              🗑️
            </button>
          ) : (
            <>
              <button
                className="note-card-confirm-delete"
                onClick={() => onDelete(note.id)}
              >
                Confirm
              </button>
              <button
                className="note-card-cancel-delete"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="note-card-content">{renderContent(note.content)}</div>

          {note.tags && note.tags.length > 0 && (
            <div className="note-card-tags">
              {note.tags.map(tag => (
                <div
                  key={tag.id}
                  className="note-tag-badge"
                  style={{
                    borderColor: tag.color || '#60a5fa',
                    backgroundColor: (tag.color || '#60a5fa') + '20',
                  }}
                >
                  {tag.name}
                  {onRemoveTag && (
                    <button
                      className="tag-remove"
                      onClick={() => onRemoveTag(note.id, tag.id)}
                      title="Remove tag"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="note-card-meta">
            <span className="note-meta-time">
              Updated {formatDate(note.updated_at)}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

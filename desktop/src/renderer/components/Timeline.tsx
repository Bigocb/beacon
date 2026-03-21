import React, { useState, useMemo } from 'react';
import '../styles/Timeline.css';

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  title: string;
  description?: string;
  type: 'note' | 'milestone' | 'achievement' | 'first_play' | 'snapshot' | 'issue';
  emoji: string;
  color: string;
  metadata?: {
    noteType?: string;
    achieved?: boolean;
    playtimeHours?: number;
    chunkCount?: number;
  };
}

interface TimelineProps {
  events: TimelineEvent[];
  onSelectEvent?: (event: TimelineEvent) => void;
  view?: 'month' | 'week' | 'day';
  filterTypes?: string[];
  startDate?: Date;
  endDate?: Date;
  loading?: boolean;
}

interface TimelineEventUI extends TimelineEvent {
  relativeTime?: string;
}

const typeLabels: Record<string, string> = {
  'note': 'Note',
  'milestone': 'Milestone',
  'achievement': 'Achievement',
  'first_play': 'First Play',
  'snapshot': 'Snapshot',
  'issue': 'Issue',
};

export const Timeline: React.FC<TimelineProps> = ({
  events,
  onSelectEvent,
  view = 'month',
  filterTypes = [],
  startDate,
  endDate,
  loading = false,
}) => {
  const [selectedView, setSelectedView] = useState<'month' | 'week' | 'day'>(view);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>(filterTypes);

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    // Type filter
    if (activeFilters.length > 0) {
      filtered = filtered.filter(e => activeFilters.includes(e.type));
    }

    // Date range filter
    if (startDate || endDate) {
      filtered = filtered.filter(e => {
        const eventTime = new Date(e.timestamp).getTime();
        if (startDate && eventTime < startDate.getTime()) return false;
        if (endDate && eventTime > endDate.getTime()) return false;
        return true;
      });
    }

    // Sort by date (descending)
    return filtered.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [events, activeFilters, startDate, endDate]);

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups = new Map<string, TimelineEventUI[]>();

    filteredEvents.forEach(event => {
      const date = new Date(event.timestamp);
      const key = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      const eventUI: TimelineEventUI = {
        ...event,
        emoji: event.emoji || '📌',
        color: event.color || '#60a5fa',
      };

      // Calculate relative time
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        eventUI.relativeTime = 'Today';
      } else if (diffDays === 1) {
        eventUI.relativeTime = 'Yesterday';
      } else if (diffDays < 7) {
        eventUI.relativeTime = `${diffDays} days ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        eventUI.relativeTime = `${weeks}w ago`;
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        eventUI.relativeTime = `${months}mo ago`;
      } else {
        const years = Math.floor(diffDays / 365);
        eventUI.relativeTime = `${years}y ago`;
      }

      groups.get(key)!.push(eventUI);
    });

    return groups;
  }, [filteredEvents]);

  const toggleTypeFilter = (type: string) => {
    setActiveFilters(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const uniqueTypes = Array.from(new Set(events.map(e => e.type)));

  if (loading) {
    return (
      <div className="timeline-container">
        <div className="timeline-loading">
          <div className="loading-spinner" />
          <p>Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (filteredEvents.length === 0) {
    return (
      <div className="timeline-container">
        <div className="timeline-empty">
          <p>📭 No events in your timeline</p>
          <p className="timeline-empty-hint">Start adding notes or milestones to see them here!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <div className="timeline-title">
          <h2>World Timeline</h2>
          <span className="timeline-count">{filteredEvents.length} events</span>
        </div>

        <div className="timeline-controls">
          <div className="timeline-view-selector">
            <button
              className={`view-btn ${selectedView === 'month' ? 'active' : ''}`}
              onClick={() => setSelectedView('month')}
            >
              Month
            </button>
            <button
              className={`view-btn ${selectedView === 'week' ? 'active' : ''}`}
              onClick={() => setSelectedView('week')}
            >
              Week
            </button>
            <button
              className={`view-btn ${selectedView === 'day' ? 'active' : ''}`}
              onClick={() => setSelectedView('day')}
            >
              Day
            </button>
          </div>
        </div>
      </div>

      <div className="timeline-filters">
        <div className="filter-label">Event Types:</div>
        <div className="filter-buttons">
          {uniqueTypes.map(type => (
            <button
              key={type}
              className={`filter-btn ${activeFilters.includes(type) ? 'active' : ''}`}
              onClick={() => toggleTypeFilter(type)}
            >
              {typeLabels[type] || type}
            </button>
          ))}
        </div>
      </div>

      <div className="timeline">
        {Array.from(groupedEvents.entries()).map(([dateKey, dayEvents]) => (
          <div key={dateKey} className="timeline-day-group">
            <div className="timeline-day-header">
              <span className="timeline-day-date">{dateKey}</span>
              <span className="timeline-day-count">{dayEvents.length}</span>
            </div>

            <div className="timeline-events">
              {dayEvents.map((event, index) => (
                <div
                  key={event.id}
                  className={`timeline-event ${event.type} ${
                    expandedEventId === event.id ? 'expanded' : ''
                  }`}
                  onClick={() => {
                    setExpandedEventId(expandedEventId === event.id ? null : event.id);
                    onSelectEvent?.(event);
                  }}
                >
                  {/* Timeline dot and connector */}
                  <div className="timeline-dot-container">
                    <div
                      className="timeline-dot"
                      style={{ backgroundColor: event.color || '#60a5fa' }}
                    >
                      <span className="timeline-dot-emoji">{event.emoji}</span>
                    </div>
                    {index < dayEvents.length - 1 && <div className="timeline-connector" />}
                  </div>

                  {/* Event content */}
                  <div className="timeline-event-content">
                    <div className="timeline-event-header">
                      <h3 className="timeline-event-title">{event.title}</h3>
                      <span className="timeline-event-type">{typeLabels[event.type] || event.type}</span>
                    </div>

                    <div className="timeline-event-meta">
                      <time className="timeline-event-time">
                        {new Date(event.timestamp).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </time>
                      <span className="timeline-event-relative">{event.relativeTime}</span>
                    </div>

                    {event.description && (
                      <p className="timeline-event-description">{event.description}</p>
                    )}

                    {expandedEventId === event.id && (
                      <div className="timeline-event-details">
                        {event.metadata && (
                          <div className="timeline-metadata">
                            {event.metadata.playtimeHours && (
                              <div className="metadata-item">
                                ⏱️ <strong>{event.metadata.playtimeHours.toFixed(1)}h</strong> playtime
                              </div>
                            )}
                            {event.metadata.chunkCount && (
                              <div className="metadata-item">
                                📦 <strong>{event.metadata.chunkCount}</strong> chunks
                              </div>
                            )}
                            {event.metadata.achieved && (
                              <div className="metadata-item">
                                ✅ Milestone achieved
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="timeline-footer">
        <p className="timeline-footer-text">
          📍 Timeline spans {filteredEvents.length} events from your Minecraft journey
        </p>
      </div>
    </div>
  );
};

export default Timeline;

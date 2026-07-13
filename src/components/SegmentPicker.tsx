import React, { useState, useEffect, useRef } from 'react';
import { Tag, Segment, SegmentFilters, Customer } from '../types';
import { api } from '../lib/api';
import { TagBadge } from './TagBadge';
import { Save, Users, Filter, Check, ChevronDown, RefreshCw } from 'lucide-react';

interface SegmentPickerProps {
  onChange: (value: { segmentId: number | null; filters: SegmentFilters; customerCount: number }) => void;
  initialSegmentId?: number | null;
  initialFilters?: SegmentFilters;
}

export const SegmentPicker: React.FC<SegmentPickerProps> = ({
  onChange,
  initialSegmentId = null,
  initialFilters
}) => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(initialSegmentId);
  
  const [filters, setFilters] = useState<SegmentFilters>(initialFilters || {
    tagIds: [],
    tagMatch: 'any',
    hasEmail: undefined,
    hasPhone: undefined,
    lastVisitBeforeDays: undefined,
    lastVisitAfterDays: undefined
  });

  const [customerCount, setCustomerCount] = useState<number>(0);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [savingSegment, setSavingSegment] = useState<boolean>(false);
  const [newSegmentName, setNewSegmentName] = useState<string>('');
  const [showSaveForm, setShowSaveForm] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load tags and segments
  const fetchData = async () => {
    try {
      const [allTags, allSegments] = await Promise.all([
        api.getTags(),
        api.getSegments()
      ]);
      setTags(allTags);
      setSegments(allSegments);

      // If a segment is selected, load its filters
      if (selectedSegmentId) {
        const seg = allSegments.find(s => s.id === selectedSegmentId);
        if (seg) {
          setFilters(seg.filters || JSON.parse(seg.filters_json || '{}'));
        }
      }
    } catch (err) {
      console.error('Error fetching tags or segments:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update when selectedSegmentId changes
  useEffect(() => {
    if (selectedSegmentId && segments.length > 0) {
      const seg = segments.find(s => s.id === selectedSegmentId);
      if (seg) {
        setFilters(seg.filters || JSON.parse(seg.filters_json || '{}'));
      }
    } else if (!selectedSegmentId) {
      // Keep or reset filters if switched to Custom
    }
  }, [selectedSegmentId, segments]);

  // Debounced preview count update
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setLoadingPreview(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.previewSegment(filters);
        setCustomerCount(res.count);
        onChange({
          segmentId: selectedSegmentId,
          filters,
          customerCount: res.count
        });
      } catch (err) {
        console.error('Error previewing segment:', err);
      } finally {
        setLoadingPreview(false);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [filters, selectedSegmentId]);

  const handleTagToggle = (tagId: number) => {
    // If a saved segment is currently selected, switch to custom since we are tweaking filters
    if (selectedSegmentId) {
      setSelectedSegmentId(null);
    }

    setFilters(prev => {
      const tagIds = prev.tagIds.includes(tagId)
        ? prev.tagIds.filter(id => id !== tagId)
        : [...prev.tagIds, tagId];
      return { ...prev, tagIds };
    });
  };

  const handleFilterChange = <K extends keyof SegmentFilters>(key: K, value: SegmentFilters[K]) => {
    // If a saved segment is currently selected, switch to custom since we are tweaking filters
    if (selectedSegmentId) {
      setSelectedSegmentId(null);
    }

    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSegmentName.trim()) {
      setError('Segment name is required');
      return;
    }

    setSavingSegment(true);
    setError(null);

    try {
      const newSeg = await api.addSegment({
        name: newSegmentName.trim(),
        filters
      });
      setSegments(prev => [...prev, newSeg]);
      setSelectedSegmentId(newSeg.id);
      setNewSegmentName('');
      setShowSaveForm(false);
    } catch (err: any) {
      setError(err.message || 'Error saving segment');
    } finally {
      setSavingSegment(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border-theme bg-surface-theme/50 p-4" id="segment-picker-container">
      {/* Target Dropdown Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary-theme" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Target Audience</span>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            id="segment-select"
            value={selectedSegmentId || ''}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedSegmentId(val ? parseInt(val, 10) : null);
            }}
            className="rounded bg-bg-theme border border-border-theme text-slate-200 text-xs px-3 py-1.5 focus:border-primary-theme focus:outline-none"
          >
            <option value="">Custom Filters (Ad-Hoc)</option>
            {segments.map(seg => (
              <option key={seg.id} value={seg.id}>
                Saved Segment: {seg.name}
              </option>
            ))}
          </select>

          {!selectedSegmentId && !showSaveForm && (
            <button
              type="button"
              id="btn-show-save-segment"
              onClick={() => setShowSaveForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary-theme/10 hover:bg-primary-theme/20 text-primary-theme text-xs font-medium cursor-pointer transition"
            >
              <Save className="w-3.5 h-3.5" />
              Save as Segment
            </button>
          )}
        </div>
      </div>

      {/* Save Segment Name Input Form */}
      {showSaveForm && (
        <form onSubmit={handleSaveSegment} className="flex flex-col gap-2 p-3 bg-bg-theme/30 rounded-lg border border-border-theme/60 animate-in fade-in slide-in-from-top-1 duration-200" id="save-segment-form">
          <div className="text-xs font-medium text-slate-300">Save Current Filters as Segment</div>
          <div className="flex gap-2">
            <input
              type="text"
              id="segment-name-input"
              placeholder="e.g. Loyal Customers, Inactive Customers"
              value={newSegmentName}
              onChange={(e) => setNewSegmentName(e.target.value)}
              className="flex-1 rounded bg-bg-theme border border-border-theme text-slate-200 text-xs px-3 py-1.5 focus:border-primary-theme focus:outline-none"
            />
            <button
              type="submit"
              id="btn-confirm-save-segment"
              disabled={savingSegment}
              className="px-3 py-1.5 bg-primary-theme hover:bg-primary-theme/90 disabled:bg-primary-theme/50 text-white text-xs font-medium rounded cursor-pointer transition"
            >
              {savingSegment ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              id="btn-cancel-save-segment"
              onClick={() => {
                setShowSaveForm(false);
                setError(null);
              }}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium rounded cursor-pointer transition"
            >
              Cancel
            </button>
          </div>
          {error && <div className="text-[11px] text-rose-400 mt-1">{error}</div>}
        </form>
      )}

      {/* Filter Options Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border-theme/40">
        
        {/* Left Side: Tag Selectors */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300">Filter by Tags</label>
            {filters.tagIds.length > 0 && (
              <select
                id="tag-match-select"
                value={filters.tagMatch}
                onChange={(e) => handleFilterChange('tagMatch', e.target.value as 'any' | 'all')}
                className="rounded bg-bg-theme border border-border-theme text-slate-300 text-[11px] px-2 py-1 focus:outline-none focus:border-primary-theme"
              >
                <option value="any">Match: Any Tag</option>
                <option value="all">Match: All Tags</option>
              </select>
            )}
          </div>

          {tags.length === 0 ? (
            <div className="text-xs text-slate-500 italic py-1">No tags created yet. Add tags from Customers view.</div>
          ) : (
            <div className="flex flex-wrap gap-1.5 p-2 bg-bg-theme/20 rounded-lg border border-border-theme/30 max-h-[110px] overflow-y-auto">
              {tags.map(tag => {
                const isSelected = filters.tagIds.includes(tag.id);
                return (
                  <button
                    type="button"
                    key={tag.id}
                    onClick={() => handleTagToggle(tag.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-all ${
                      isSelected 
                        ? 'shadow-md scale-[1.02]' 
                        : 'opacity-60 hover:opacity-100 border-dashed border-slate-600 bg-transparent text-slate-400'
                    }`}
                    style={isSelected ? {
                      backgroundColor: `${tag.color}25`,
                      borderColor: tag.color,
                      color: tag.color,
                    } : undefined}
                  >
                    <span>{tag.name}</span>
                    {isSelected && <Check className="w-3 h-3 text-current ml-0.5" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Additional criteria */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-slate-300">Contact & History Criteria</label>
          <div className="grid grid-cols-2 gap-2">
            
            {/* Email Checkbox */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Email Option</span>
              <select
                id="filter-email-select"
                value={filters.hasEmail === undefined ? 'any' : filters.hasEmail ? 'yes' : 'no'}
                onChange={(e) => {
                  const val = e.target.value;
                  handleFilterChange('hasEmail', val === 'any' ? undefined : val === 'yes');
                }}
                className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-xs px-2.5 py-1.5 focus:border-primary-theme focus:outline-none"
              >
                <option value="any">Any (With or Without)</option>
                <option value="yes">Must Have Email</option>
                <option value="no">Must NOT Have Email</option>
              </select>
            </div>

            {/* Phone Checkbox */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Phone Option</span>
              <select
                id="filter-phone-select"
                value={filters.hasPhone === undefined ? 'any' : filters.hasPhone ? 'yes' : 'no'}
                onChange={(e) => {
                  const val = e.target.value;
                  handleFilterChange('hasPhone', val === 'any' ? undefined : val === 'yes');
                }}
                className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-xs px-2.5 py-1.5 focus:border-primary-theme focus:outline-none"
              >
                <option value="any">Any (With or Without)</option>
                <option value="yes">Must Have Phone</option>
                <option value="no">Must NOT Have Phone</option>
              </select>
            </div>

            {/* Last Visit Before Days */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Inactive For (Days)</span>
              <input
                type="number"
                min="0"
                id="filter-inactive-input"
                placeholder="e.g. 90 days ago"
                value={filters.lastVisitBeforeDays !== undefined ? filters.lastVisitBeforeDays : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  handleFilterChange('lastVisitBeforeDays', val === '' ? undefined : parseInt(val, 10));
                }}
                className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-xs px-2.5 py-1.5 focus:border-primary-theme focus:outline-none"
              />
            </div>

            {/* Last Visit After Days */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Active Within (Days)</span>
              <input
                type="number"
                min="0"
                id="filter-active-input"
                placeholder="e.g. 30 days"
                value={filters.lastVisitAfterDays !== undefined ? filters.lastVisitAfterDays : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  handleFilterChange('lastVisitAfterDays', val === '' ? undefined : parseInt(val, 10));
                }}
                className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-xs px-2.5 py-1.5 focus:border-primary-theme focus:outline-none"
              />
            </div>

          </div>
        </div>

      </div>

      {/* Recipient Count Indicator */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-bg-theme/40 border border-border-theme/30" id="segment-preview-panel">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>Active filter resolution:</span>
        </div>
        <div className="flex items-center gap-2">
          {loadingPreview ? (
            <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin" />
          ) : (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold px-2.5 py-1 rounded text-xs animate-in fade-in duration-200" id="recipient-count">
              <span>{customerCount} recipients</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

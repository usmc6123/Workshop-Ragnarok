import React from 'react';
import { Tag } from '../types';
import { X } from 'lucide-react';

interface TagBadgeProps {
  tag: Tag;
  onRemove?: () => void;
  className?: string;
}

export const TagBadge: React.FC<TagBadgeProps> = ({ tag, onRemove, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shadow-xs transition-colors ${className}`}
      style={{
        backgroundColor: `${tag.color}15`, // 8% opacity
        borderColor: tag.color,
        color: tag.color,
      }}
    >
      <span>{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:bg-black/10 rounded-full p-0.5 text-current cursor-pointer transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};

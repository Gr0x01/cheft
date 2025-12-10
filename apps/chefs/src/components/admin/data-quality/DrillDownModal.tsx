'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';

interface Entity {
  id: string;
  name: string;
  slug: string;
  city?: string;
  state?: string | null;
}

interface DrillDownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entities: Entity[];
  entityType: 'chef' | 'restaurant';
}

export function DrillDownModal({
  isOpen,
  onClose,
  title,
  entities,
  entityType,
}: DrillDownModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-copper-500 to-copper-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">{title}</h2>
              <p className="font-mono text-sm text-copper-100 mt-1">
                {entities.length} {entityType === 'chef' ? 'chefs' : 'restaurants'} found
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-120px)] p-6">
          {entities.length > 0 ? (
            <ul className="space-y-2">
              {entities.map((entity) => (
                <li
                  key={entity.id}
                  className="p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                >
                  <a
                    href={`/${entityType === 'chef' ? 'chefs' : 'restaurants'}/${entity.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between group"
                  >
                    <div>
                      <span className="font-display font-medium text-slate-900 group-hover:text-copper-600 transition-colors">
                        {entity.name}
                      </span>
                      {entity.city && (
                        <span className="font-mono text-xs text-slate-500 ml-3">
                          {entity.city}
                          {entity.state && `, ${entity.state}`}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs text-slate-400 group-hover:text-copper-500 transition-colors">
                      /{entity.slug}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12">
              <p className="font-ui text-slate-500">No entities found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

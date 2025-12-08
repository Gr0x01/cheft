'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Check, Tv, User, Store, ExternalLink } from 'lucide-react';
import type { PendingDiscovery, DiscoveryType } from './types';

interface DiscoveryDetailProps {
  item: PendingDiscovery | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

const typeConfig: Record<DiscoveryType, { icon: typeof Tv; color: string; label: string }> = {
  show: { icon: Tv, color: 'text-purple-600', label: 'TV Show' },
  chef: { icon: User, color: 'text-blue-600', label: 'Chef' },
  restaurant: { icon: Store, color: 'text-amber-600', label: 'Restaurant' },
};

export function DiscoveryDetail({ item, onClose, onApprove, onReject }: DiscoveryDetailProps) {
  if (!item) return null;

  const config = typeConfig[item.discovery_type];
  const Icon = config.icon;
  const data = item.data;

  const renderValue = (value: unknown): React.ReactNode => {
    if (value === null || value === undefined) return <span className="text-stone-400">—</span>;
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-stone-400">None</span>;
      return (
        <ul className="list-disc list-inside">
          {value.map((v, i) => (
            <li key={i} className="text-sm">{String(v)}</li>
          ))}
        </ul>
      );
    }
    if (typeof value === 'object') {
      return (
        <pre className="text-xs bg-stone-100 p-2 overflow-x-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    return String(value);
  };

  const getName = (): string => {
    if (data.name) return String(data.name);
    if (data.chef_name) return String(data.chef_name);
    return 'Unknown';
  };

  return (
    <Transition appear show={!!item} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <Dialog.Title className="font-display text-xl font-bold text-stone-900">
                      {getName()}
                    </Dialog.Title>
                    <span className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs font-mono uppercase">
                      {config.label}
                    </span>
                  </div>
                  <button onClick={onClose} className="p-1 hover:bg-stone-100 transition-colors">
                    <X className="w-5 h-5 text-stone-500" />
                  </button>
                </div>

                <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                  {item.source_chef_name && (
                    <div className="mb-4 px-3 py-2 bg-stone-50 border border-stone-200">
                      <span className="text-xs text-stone-500 uppercase tracking-wider">Source:</span>
                      <span className="ml-2 text-sm font-medium text-stone-700">{item.source_chef_name}</span>
                    </div>
                  )}

                  {item.error_message && (
                    <div className="mb-4 px-3 py-2 bg-orange-50 border border-orange-200 text-orange-800 text-sm">
                      <strong>Warning:</strong> {item.error_message}
                    </div>
                  )}

                  <div className="space-y-4">
                    {Object.entries(data).map(([key, value]) => (
                      <div key={key} className="border-b border-stone-100 pb-3">
                        <dt className="font-mono text-xs text-stone-500 uppercase tracking-wider mb-1">
                          {key.replace(/_/g, ' ')}
                        </dt>
                        <dd className="text-stone-900">{renderValue(value)}</dd>
                      </div>
                    ))}
                  </div>

                  <details className="mt-6">
                    <summary className="cursor-pointer font-mono text-xs text-stone-400 uppercase tracking-wider hover:text-stone-600">
                      Raw JSON
                    </summary>
                    <pre className="mt-2 p-3 bg-stone-900 text-stone-100 text-xs overflow-x-auto">
                      {JSON.stringify(item, null, 2)}
                    </pre>
                  </details>
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 bg-stone-50">
                  <span className="text-xs text-stone-500">
                    Created {new Date(item.created_at).toLocaleString()}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onReject(item.id);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        onApprove(item.id);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, Flag, X } from 'lucide-react';

interface ReportIssueButtonProps {
  entityType: 'chef' | 'restaurant';
  entityId: string;
  entityName: string;
  variant?: 'default' | 'header';
}

type IssueType = 'closed' | 'incorrect_info' | 'wrong_photo' | 'other';

const issueOptions: { value: IssueType; label: string; forType?: 'restaurant' | 'chef' }[] = [
  { value: 'closed', label: 'Permanently Closed', forType: 'restaurant' },
  { value: 'incorrect_info', label: 'Incorrect Information' },
  { value: 'wrong_photo', label: 'Wrong Photo' },
  { value: 'other', label: 'Other Issue' },
];

export function ReportIssueButton({ entityType, entityId, entityName, variant = 'default' }: ReportIssueButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<IssueType | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const filteredOptions = issueOptions.filter(
    opt => !opt.forType || opt.forType === entityType
  );

  const handleSubmit = async () => {
    if (!selectedIssue) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type: entityType,
          entity_id: entityId,
          issue_type: selectedIssue,
          message: message.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setSubmitStatus('success');
      setTimeout(() => {
        setIsOpen(false);
        setSelectedIssue(null);
        setMessage('');
        setSubmitStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isHeader = variant === 'header';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 font-mono text-sm font-semibold transition-all ${
          isHeader 
            ? 'p-2 sm:px-4 sm:py-2 hover:bg-white/10 hover:border-white/40'
            : 'px-4 py-2 hover:brightness-95'
        }`}
        style={isHeader ? {
          background: 'rgba(255,255,255,0.05)',
          color: 'rgba(255,255,255,0.6)',
          border: '1px solid rgba(255,255,255,0.15)',
        } : {
          background: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          border: '2px solid var(--border-light)',
        }}
        aria-label="Report an issue with this page"
        title="Report an issue with this page"
      >
        <Flag className="w-4 h-4" />
        <span className={isHeader ? 'hidden sm:inline' : ''}>
          REPORT ISSUE
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${isHeader ? 'hidden sm:block' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="absolute right-0 mt-2 w-80 z-50 shadow-2xl"
            style={{
              background: 'white',
              border: '2px solid var(--border-light)',
            }}
          >
            <div
              className="px-4 py-3 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--border-light)' }}
            >
              <div>
                <h3 className="font-display font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Report Issue
                </h3>
                <p className="font-ui text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {entityName}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {submitStatus === 'success' ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mb-3" />
                  <p className="font-ui text-sm font-medium text-slate-900">
                    Thank you for your feedback!
                  </p>
                  <p className="font-ui text-xs text-slate-500 mt-1">
                    We'll review this report shortly.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="font-mono text-xs uppercase tracking-wide block mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Issue Type
                    </label>
                    <div className="space-y-2">
                      {filteredOptions.map(option => (
                        <button
                          key={option.value}
                          onClick={() => setSelectedIssue(option.value)}
                          className="w-full text-left px-3 py-2 font-ui text-sm transition-all"
                          style={{
                            background: selectedIssue === option.value ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                            color: selectedIssue === option.value ? 'white' : 'var(--text-primary)',
                            border: `1px solid ${selectedIssue === option.value ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedIssue && (
                    <div>
                      <label className="font-mono text-xs uppercase tracking-wide block mb-2" style={{ color: 'var(--text-secondary)' }}>
                        Additional Details {selectedIssue !== 'other' && '(Optional)'}
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Provide more context about the issue..."
                        maxLength={1000}
                        rows={3}
                        className="w-full px-3 py-2 font-ui text-sm resize-none focus:outline-none focus:ring-2"
                        style={{
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-light)',
                          '--tw-ring-color': 'var(--accent-primary)',
                        } as React.CSSProperties}
                      />
                      <p className="font-mono text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {message.length}/1000
                      </p>
                    </div>
                  )}

                  {submitStatus === 'error' && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="font-ui text-xs text-red-800">
                        Failed to submit. Please try again.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={!selectedIssue || isSubmitting}
                    className="w-full font-mono text-sm font-semibold py-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'var(--accent-primary)',
                      color: 'white',
                    }}
                  >
                    {isSubmitting ? 'SUBMITTING...' : 'SUBMIT REPORT'}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

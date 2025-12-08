import { createClient } from '@/lib/supabase/server';
import { ReviewTabs } from './ReviewTabs';
import { DiscoveriesSection } from './components/DiscoveriesSection';
import { DuplicatesSection } from './components/DuplicatesSection';
import { FeedbackSection } from './components/FeedbackSection';

export default async function ReviewQueuePage() {
  const supabase = await createClient();
  
  const [
    { count: discoveryCount }, 
    { count: duplicateCount }, 
    { count: feedbackCount }
  ] = await Promise.all([
    supabase
      .from('pending_discoveries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('duplicate_candidates')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('user_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ]);

  const discoveriesContent = <DiscoveriesSection />;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="pt-4">
        <h1 className="font-display text-4xl font-bold text-stone-900 tracking-tight">Editorial Review</h1>
        <p className="font-mono text-xs text-stone-400 uppercase tracking-[0.2em] mt-1">Approve discoveries and manage data quality</p>
      </header>

      <ReviewTabs
        discoveriesContent={discoveriesContent}
        duplicatesContent={<DuplicatesSection />}
        feedbackContent={<FeedbackSection />}
        discoveryCount={discoveryCount || 0}
        duplicateCount={duplicateCount || 0}
        feedbackCount={feedbackCount || 0}
      />
    </div>
  );
}

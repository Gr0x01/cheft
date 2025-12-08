export type DiscoveryType = 'show' | 'chef' | 'restaurant';
export type DiscoveryStatus = 'pending' | 'approved' | 'rejected' | 'needs_review' | 'merged';

export interface PendingDiscovery {
  id: string;
  discovery_type: DiscoveryType;
  source_chef_id: string | null;
  source_chef_name: string | null;
  data: Record<string, unknown>;
  status: DiscoveryStatus;
  notes: string | null;
  error_message: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface DiscoveryStats {
  pending: number;
  approved: number;
  rejected: number;
  needs_review: number;
  byType: Record<DiscoveryType, number>;
}

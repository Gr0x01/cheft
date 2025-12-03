import { promises as fs } from 'fs';
import path from 'path';
import { DuplicateReview } from './DuplicateReview';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string | null;
  address: string | null;
  google_place_id: string | null;
  google_rating: number | null;
  photo_urls: string[] | null;
  status: 'open' | 'closed' | 'unknown' | null;
  price_tier: string | null;
  website_url: string | null;
  chef_id: string;
}

interface DuplicateGroup {
  restaurants: Restaurant[];
  confidence: number;
  reasoning: string;
  similarity: number;
}

interface DuplicateReport {
  scannedAt: string;
  totalRestaurants: number;
  citiesScanned: number;
  duplicateGroupsFound: number;
  groups: DuplicateGroup[];
  estimatedCost: number;
}

async function getDuplicateReport(): Promise<DuplicateReport | null> {
  try {
    const reportPath = path.join(process.cwd(), 'duplicate-report.json');
    const fileContent = await fs.readFile(reportPath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    return null;
  }
}

export default async function DuplicatesPage() {
  const report = await getDuplicateReport();

  if (!report) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Duplicate Detection</h1>
          <p className="text-slate-600 mt-2">Review and merge duplicate restaurant entries</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-amber-900 mb-2">No scan results found</h2>
          <p className="text-amber-700 mb-4">
            Run the duplicate detection script to generate a report.
          </p>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded font-mono text-sm">
            npm run find-duplicates
          </pre>
        </div>
      </div>
    );
  }

  const scanDate = new Date(report.scannedAt);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Duplicate Detection</h1>
        <p className="text-slate-600 mt-2">Review and merge duplicate restaurant entries</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-medium text-slate-500">Scanned</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {report.totalRestaurants}
          </div>
          <div className="text-xs text-slate-500 mt-1">restaurants</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-medium text-slate-500">Cities</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {report.citiesScanned}
          </div>
          <div className="text-xs text-slate-500 mt-1">locations</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-medium text-slate-500">Duplicates Found</div>
          <div className="text-2xl font-bold text-orange-600 mt-1">
            {report.duplicateGroupsFound}
          </div>
          <div className="text-xs text-slate-500 mt-1">potential pairs</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-sm font-medium text-slate-500">Scan Cost</div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            ${report.estimatedCost.toFixed(4)}
          </div>
          <div className="text-xs text-slate-500 mt-1">gpt-5-nano</div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-blue-900">
              <strong>Last scan:</strong> {scanDate.toLocaleString()}
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Review each pair and choose which restaurant to keep. Data from the merged restaurant will be preserved if missing from the winner.
            </p>
          </div>
        </div>
      </div>

      {report.groups.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-green-900 mb-2">🎉 No duplicates found!</h2>
          <p className="text-green-700">Your database is clean.</p>
        </div>
      ) : (
        <DuplicateReview groups={report.groups} />
      )}
    </div>
  );
}

'use client';

import { BatchImportWizard } from '../../components/batch-import';

export default function BatchImportPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Batch Import</h1>
          <p className="mt-2 text-gray-600">
            Import large CSV files with 1,000+ patient records for batch assessment processing.
          </p>
        </div>

        <BatchImportWizard />

        {/* Tips Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Tips for Large Imports</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>Files up to 100MB and 100,000 rows are supported</li>
            <li>Enable &quot;Continue on errors&quot; to process valid rows even if some fail</li>
            <li>Use duplicate detection to prevent importing the same records twice</li>
            <li>Processing speed: approximately 100-500 rows per second</li>
            <li>You can close this page - the import will continue in the background</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

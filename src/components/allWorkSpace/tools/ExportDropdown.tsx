import React, { useState } from 'react';
import { Download, ChevronDown, FileText, Lock } from 'lucide-react';
import { useDatabase } from '../../../context/DatabaseContext';
import { useSubscription } from '../../../context/SubscriptionContext'; // Added subscription context
import FeatureGate from '../../subscription/FeatureGate'; // Added feature gate

const ExportDropdown: React.FC = () => {
  const { exportSchema, currentSchema } = useDatabase();
  const { canUseFeature, setShowUpgradeModal, setUpgradeReason } = useSubscription(); // Added subscription hooks
  const [isOpen, setIsOpen] = useState(false);

  const exportFormats = [
    { id: 'mysql', name: 'MySQL', icon: '🐬' },
    { id: 'postgresql', name: 'PostgreSQL', icon: '🐘' },
    { id: 'sqlserver', name: 'SQL Server', icon: '🏢' },
    { id: 'oracle', name: 'Oracle', icon: '🔴' },
    { id: 'mongodb', name: 'MongoDB', icon: '🍃' },
  ];

  const handleExport = (format: string) => {
    // Check if user can export SQL
    if (!canUseFeature('canExportSQL')) {
      setUpgradeReason('SQL export is available in Pro and Ultimate plans. Upgrade to export your database schema.');
      setShowUpgradeModal(true);
      setIsOpen(false);
      return;
    }

    const script = exportSchema(format);
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentSchema.name.toLowerCase().replace(/\s+/g, '_')}_${format}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-lg transition-colors duration-200 font-medium ${
          canUseFeature('canExportSQL')
            ? 'bg-sky-600 hover:bg-sky-700 text-white'
            : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        disabled={!canUseFeature('canExportSQL')}
      >
        <div className="flex items-center gap-2">
          {canUseFeature('canExportSQL') ? (
            <Download className="w-4 h-4" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
          Export Scripts
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Show upgrade prompt for free users */}
      {!canUseFeature('canExportSQL') && (
        <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Pro Feature
            </span>
          </div>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">
            SQL export is available in Pro and Ultimate plans
          </p>
          <button
            onClick={() => {
              setUpgradeReason('Upgrade to Pro or Ultimate to export your database schema as SQL scripts.');
              setShowUpgradeModal(true);
            }}
            className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded transition-colors duration-200"
          >
            Upgrade Now
          </button>
        </div>
      )}

      {isOpen && canUseFeature('canExportSQL') && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute bottom-full left-0 w-full mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
            <div className="p-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2 font-medium">
                Select Database Format
              </div>
              {exportFormats.map((format) => (
                <button
                  key={format.id}
                  onClick={() => handleExport(format.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
                  disabled={currentSchema.tables.length === 0}
                >
                  <span className="text-lg">{format.icon}</span>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{format.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Export as {format.name} script
                    </div>
                  </div>
                  <FileText className="w-4 h-4 text-gray-400" />
                </button>
              ))}
              
              {currentSchema.tables.length === 0 && (
                <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  Create some tables first to enable export
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExportDropdown;
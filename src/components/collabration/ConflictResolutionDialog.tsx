import React, { useState } from 'react';
import { AlertTriangle, User, Clock, Check, X } from 'lucide-react';

interface ConflictData {
  id: string;
  type: 'schema_change' | 'data_change';
  conflictingChanges: {
    local: any;
    remote: any;
    user: string;
    timestamp: number;
  }[];
  affectedResource: string; // table name, column name, etc.
}

interface ConflictResolutionDialogProps {
  isOpen: boolean;
  conflict: ConflictData | null;
  onResolve: (resolution: 'accept_local' | 'accept_remote' | 'merge') => void;
  onCancel: () => void;
}

const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  isOpen,
  conflict,
  onResolve,
  onCancel
}) => {
  const [selectedResolution, setSelectedResolution] = useState<'accept_local' | 'accept_remote' | 'merge'>('accept_remote');

  if (!isOpen || !conflict) return null;

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const renderChangePreview = (change: any, label: string) => {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">{label}</h4>
        <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
          {JSON.stringify(change, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Conflict Detected</h2>
              <p className="text-orange-100">
                Multiple users modified "{conflict.affectedResource}" simultaneously
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Conflicting Changes
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {conflict.conflictingChanges.map((change, index) => (
                <div key={index} className="space-y-4">
                  {/* Local Change */}
                  <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-800 dark:text-blue-200">Your Changes</span>
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {formatTimestamp(change.timestamp)}
                      </span>
                    </div>
                    {renderChangePreview(change.local, 'Local Version')}
                  </div>

                  {/* Remote Change */}
                  <div className="border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-800 dark:text-green-200">
                        {change.user}'s Changes
                      </span>
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {formatTimestamp(change.timestamp)}
                      </span>
                    </div>
                    {renderChangePreview(change.remote, 'Remote Version')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution Options */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Choose Resolution
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input
                  type="radio"
                  name="resolution"
                  value="accept_local"
                  checked={selectedResolution === 'accept_local'}
                  onChange={(e) => setSelectedResolution(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Keep My Changes
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Discard remote changes and keep your local modifications
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input
                  type="radio"
                  name="resolution"
                  value="accept_remote"
                  checked={selectedResolution === 'accept_remote'}
                  onChange={(e) => setSelectedResolution(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Accept Their Changes
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Discard your changes and accept the remote modifications
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <input
                  type="radio"
                  name="resolution"
                  value="merge"
                  checked={selectedResolution === 'merge'}
                  onChange={(e) => setSelectedResolution(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Merge Changes
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Attempt to automatically merge both sets of changes
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Important</span>
            </div>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              This action cannot be undone. Make sure you understand the implications of your choice.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onResolve(selectedResolution)}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            <Check className="w-4 h-4" />
            Resolve Conflict
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictResolutionDialog;
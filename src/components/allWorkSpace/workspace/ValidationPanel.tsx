import React from 'react';
import { AlertTriangle, CheckCircle, X, Database, Key, Link2 } from 'lucide-react';
import { useDatabase } from '../../../context/DatabaseContext';

const ValidationPanel: React.FC = () => {
  const { validationErrors, currentSchema } = useDatabase();

  const errorCount = validationErrors.filter(e => e.type === 'error').length;
  const warningCount = validationErrors.filter(e => e.type === 'warning').length;

  const getTableName = (tableId?: string) => {
    if (!tableId) return 'Unknown';
    return currentSchema.tables.find(t => t.id === tableId)?.name || 'Unknown';
  };

  const getColumnName = (tableId?: string, columnId?: string) => {
    if (!tableId || !columnId) return 'Unknown';
    const table = currentSchema.tables.find(t => t.id === tableId);
    return table?.columns.find(c => c.id === columnId)?.name || 'Unknown';
  };

  const getRelationshipName = (relationshipId?: string) => {
    if (!relationshipId) return 'Unknown';
    return currentSchema.relationships.find(r => r.id === relationshipId)?.name || 'Unknown';
  };

  const getErrorIcon = (error: any) => {
    if (error.tableId && error.columnId) {
      return <Key className="w-4 h-4" />;
    } else if (error.relationshipId) {
      return <Link2 className="w-4 h-4" />;
    } else if (error.tableId) {
      return <Database className="w-4 h-4" />;
    }
    return <AlertTriangle className="w-4 h-4" />;
  };

  if (validationErrors.length === 0) {
    return (
      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Schema Valid</span>
        </div>
        <p className="text-green-700 dark:text-green-300 text-sm mt-1">
          No validation errors or warnings found. Your schema is ready for export.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <span className="font-medium text-gray-900 dark:text-white">
            Schema Validation
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <X className="w-4 h-4" />
              {errorCount} error{errorCount !== 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="w-4 h-4" />
              {warningCount} warning{warningCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Errors */}
      {errorCount > 0 && (
        <div>
          <h4 className="font-medium text-red-800 dark:text-red-200 mb-3 flex items-center gap-2">
            <X className="w-4 h-4" />
            Errors ({errorCount})
          </h4>
          <div className="space-y-2">
            {validationErrors
              .filter(error => error.type === 'error')
              .map((error, index) => (
                <div
                  key={index}
                  className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-red-600 dark:text-red-400 mt-0.5">
                      {getErrorIcon(error)}
                    </div>
                    <div className="flex-1">
                      <p className="text-red-800 dark:text-red-200 text-sm font-medium">
                        {error.message}
                      </p>
                      <div className="text-red-700 dark:text-red-300 text-xs mt-1">
                        {error.tableId && (
                          <span>
                            Table: {getTableName(error.tableId)}
                            {error.columnId && ` → Column: ${getColumnName(error.tableId, error.columnId)}`}
                          </span>
                        )}
                        {error.relationshipId && (
                          <span>Relationship: {getRelationshipName(error.relationshipId)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warningCount > 0 && (
        <div>
          <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Warnings ({warningCount})
          </h4>
          <div className="space-y-2">
            {validationErrors
              .filter(error => error.type === 'warning')
              .map((error, index) => (
                <div
                  key={index}
                  className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-yellow-600 dark:text-yellow-400 mt-0.5">
                      {getErrorIcon(error)}
                    </div>
                    <div className="flex-1">
                      <p className="text-yellow-800 dark:text-yellow-200 text-sm font-medium">
                        {error.message}
                      </p>
                      <div className="text-yellow-700 dark:text-yellow-300 text-xs mt-1">
                        {error.tableId && (
                          <span>
                            Table: {getTableName(error.tableId)}
                            {error.columnId && ` → Column: ${getColumnName(error.tableId, error.columnId)}`}
                          </span>
                        )}
                        {error.relationshipId && (
                          <span>Relationship: {getRelationshipName(error.relationshipId)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Quick Fixes */}
      {validationErrors.length > 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
            Quick Fixes
          </h4>
          <ul className="text-blue-700 dark:text-blue-300 text-sm space-y-1">
            <li>• Ensure each table has exactly one primary key</li>
            <li>• Verify all foreign key references point to existing tables and columns</li>
            <li>• Remove duplicate column names within the same table</li>
            <li>• Check for circular foreign key references</li>
            <li>• Ensure unique constraints are not duplicated</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ValidationPanel;
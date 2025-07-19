import React, { useState } from 'react';
import { Download, FileText, Database, Code, Settings, Check, Copy } from 'lucide-react';
import { useDatabase } from '../../../context/DatabaseContext';

const SmartExportManager: React.FC = () => {
  const { exportSchema, currentSchema, generateSQL } = useDatabase();
  const [selectedFormat, setSelectedFormat] = useState('mysql');
  const [exportOptions, setExportOptions] = useState({
    includeData: false,
    includeIndexes: true,
    includeConstraints: true,
    includeComments: true,
    formatOutput: true
  });
  const [previewSQL, setPreviewSQL] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const exportFormats = [
    { 
      id: 'mysql', 
      name: 'MySQL', 
      icon: '🐬',
      description: 'MySQL 5.7+ compatible SQL',
      extension: 'sql'
    },
    { 
      id: 'postgresql', 
      name: 'PostgreSQL', 
      icon: '🐘',
      description: 'PostgreSQL 12+ compatible SQL',
      extension: 'sql'
    },
    { 
      id: 'sqlserver', 
      name: 'SQL Server', 
      icon: '🏢',
      description: 'Microsoft SQL Server T-SQL',
      extension: 'sql'
    },
    { 
      id: 'oracle', 
      name: 'Oracle', 
      icon: '🔴',
      description: 'Oracle Database SQL',
      extension: 'sql'
    },
    { 
      id: 'mongodb', 
      name: 'MongoDB', 
      icon: '🍃',
      description: 'MongoDB schema definition',
      extension: 'js'
    },
    { 
      id: 'json', 
      name: 'JSON Schema', 
      icon: '📄',
      description: 'JSON schema definition',
      extension: 'json'
    }
  ];

  const handleExport = () => {
    const format = exportFormats.find(f => f.id === selectedFormat);
    if (!format) return;

    let content = '';
    
    if (selectedFormat === 'json') {
      content = JSON.stringify({
        name: currentSchema.name,
        version: '1.0.0',
        tables: currentSchema.tables.map(table => ({
          name: table.name,
          columns: table.columns.map(col => ({
            name: col.name,
            type: col.type,
            nullable: col.nullable,
            defaultValue: col.defaultValue,
            isPrimaryKey: col.isPrimaryKey,
            isForeignKey: col.isForeignKey,
            isUnique: col.isUnique,
            referencedTable: col.referencedTable,
            referencedColumn: col.referencedColumn
          }))
        })),
        relationships: currentSchema.relationships.map(rel => ({
          name: rel.name,
          sourceTable: currentSchema.tables.find(t => t.id === rel.sourceTableId)?.name,
          sourceColumn: currentSchema.tables.find(t => t.id === rel.sourceTableId)?.columns.find(c => c.id === rel.sourceColumnId)?.name,
          targetTable: currentSchema.tables.find(t => t.id === rel.targetTableId)?.name,
          targetColumn: currentSchema.tables.find(t => t.id === rel.targetTableId)?.columns.find(c => c.id === rel.targetColumnId)?.name,
          cardinality: rel.cardinality
        })),
        exportedAt: new Date().toISOString(),
        exportOptions
      }, null, 2);
    } else {
      content = exportSchema(selectedFormat);
    }

    // Create and download file with schema name
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Use schema name for filename
    const sanitizedName = currentSchema.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    a.download = `${sanitizedName || 'database_schema'}.${format.extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePreview = () => {
    const sql = selectedFormat === 'json' 
      ? JSON.stringify(currentSchema, null, 2)
      : exportSchema(selectedFormat);
    setPreviewSQL(sql);
    setShowPreview(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(previewSQL);
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Smart Export Manager
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Export your schema with automatic naming based on project: "{currentSchema.name}"
        </p>
      </div>

      {/* Export Format Selection */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
          Select Export Format
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {exportFormats.map(format => (
            <label key={format.id} className="relative">
              <input
                type="radio"
                name="exportFormat"
                value={format.id}
                checked={selectedFormat === format.id}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="sr-only"
              />
              <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                selectedFormat === format.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{format.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {format.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {format.description}
                    </div>
                  </div>
                  {selectedFormat === format.id && (
                    <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  )}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Export Options */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
          Export Options
        </h4>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={exportOptions.includeData}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeData: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Include Data</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Export INSERT statements for existing data</p>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={exportOptions.includeIndexes}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeIndexes: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Include Indexes</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Export CREATE INDEX statements</p>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={exportOptions.includeConstraints}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeConstraints: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Include Constraints</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Export foreign key and check constraints</p>
              </div>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={exportOptions.includeComments}
                onChange={(e) => setExportOptions(prev => ({ ...prev, includeComments: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Include Comments</span>
                <p className="text-xs text-gray-500 dark:text-gray-400">Add descriptive comments to SQL</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Export Actions */}
      <div className="flex gap-3">
        <button
          onClick={handlePreview}
          disabled={currentSchema.tables.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200"
        >
          <FileText className="w-4 h-4" />
          Preview
        </button>
        
        <button
          onClick={handleExport}
          disabled={currentSchema.tables.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 flex-1"
        >
          <Download className="w-4 h-4" />
          Export as {exportFormats.find(f => f.id === selectedFormat)?.name}
        </button>
      </div>

      {/* Schema Summary */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
          Schema Summary
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Database className="w-6 h-6 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-blue-800 dark:text-blue-200">
              {currentSchema.tables.length}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400">Tables</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <Settings className="w-6 h-6 text-green-600 dark:text-green-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-green-800 dark:text-green-200">
              {currentSchema.tables.reduce((sum, table) => sum + table.columns.length, 0)}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">Columns</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Code className="w-6 h-6 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-purple-800 dark:text-purple-200">
              {currentSchema.relationships.length}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400">Relationships</div>
          </div>
          
          <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <FileText className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
              {currentSchema.indexes.length}
            </div>
            <div className="text-xs text-yellow-600 dark:text-yellow-400">Indexes</div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Export Preview - {exportFormats.find(f => f.id === selectedFormat)?.name}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 text-sm"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <span className="sr-only">Close</span>
                  ✕
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-6">
              <pre className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-sm font-mono text-gray-900 dark:text-gray-100 overflow-auto whitespace-pre-wrap">
                {previewSQL}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartExportManager;
import React, { useState } from 'react';
import { Download, ChevronDown, FileText, Lock } from 'lucide-react';
import { useDatabase } from '../../../context/DatabaseContext';

const ExportDropdown: React.FC = () => {
  const { exportSchema, currentSchema } = useDatabase();
  const [isOpen, setIsOpen] = useState(false);

  const exportFormats = [
    { id: 'mysql', name: 'MySQL', icon: '🐬' },
    { id: 'postgresql', name: 'PostgreSQL', icon: '🐘' },
    { id: 'sqlserver', name: 'SQL Server', icon: '🏢' },
    { id: 'oracle', name: 'Oracle', icon: '🔴' },
    { id: 'mongodb', name: 'MongoDB', icon: '🍃' },
  ];

  const handleExport = (format: string) => {
    const script = exportSchema(format);
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Smart naming based on current schema name
    const sanitizedName = currentSchema.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    const fileName = `${sanitizedName || 'database_schema'}_${format}.${format === 'mongodb' ? 'js' : 'sql'}`;
    a.download = fileName;
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
          'bg-sky-600 hover:bg-sky-700 text-white'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Scripts
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
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
// src/components/portfolio/PortfolioManager.tsx
import React, { useState, useEffect } from 'react';
import { ArrowRight, Folder, Calendar, Eye, Trash2, Plus } from 'lucide-react';
import { useDatabase } from '../../../context/DatabaseContext';
import { usePortfolio, Portfolio } from '../../../context/PortfolioContext';

const PortfolioManager: React.FC = () => {
  const {
    currentSchema,
    createNewSchema,
    saveSchema,
    generateSQL,
    importSchema,
  } = useDatabase();

  const {
    portfolios,
    loadPortfolios,
    savePortfolio,
    deletePortfolio,
  } = usePortfolio();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSchemaName, setNewSchemaName] = useState('');

  useEffect(() => {
    loadPortfolios();
  }, [loadPortfolios]);

  const handleCreateSchema = () => {
    if (!newSchemaName.trim()) return;
    createNewSchema(newSchemaName.trim());
    setNewSchemaName('');
    setShowCreateModal(false);
  };

  const handleSaveCurrentSchema = async () => {
    saveSchema();
    const payload = JSON.stringify(currentSchema);
    try {
      await savePortfolio(currentSchema.name, payload);
      await loadPortfolios();
    } catch (err) {
      console.error('Portfolio saxlama xətası:', err);
    }
  };

  const confirmAndDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this database?')) return;
    try {
      await deletePortfolio(id);
      await loadPortfolios();
    } catch (err) {
      console.error('Portfolio silmə xətası:', err);
    }
  };

  const handleLoadPortfolio = (p: Portfolio) => {
    try {
      const schemaObj = JSON.parse(p.scripts);
      importSchema(schemaObj);
    } catch (error) {
      console.error('Could not parse portfolio scripts:', error);
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Schema Portfolio
          </h3>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm"
          >
            <Plus className="w-4 h-4" /> New
          </button>
        </div>
        {/* Current Schema Info */}
        <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sky-800 dark:text-sky-200">
              Current Schema
            </h4>
            <button
              onClick={handleSaveCurrentSchema}
              className="text-sm bg-sky-600 hover:bg-sky-700 text-white px-3 py-1 rounded"
            >
              Save
            </button>
          </div>
          <p className="font-medium text-sky-700 dark:text-sky-300">
            {currentSchema.name}
          </p>
          <div className="flex items-center gap-4 mt-2 text-sm text-sky-600 dark:text-sky-400">
            <span>{currentSchema.tables.length} tables</span>
            <span>{currentSchema.relationships.length} relationships</span>
          </div>
        </div>
      </div>

      {/* Portfolio Button */}
      <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg mb-6">
        <ArrowRight className="w-4 h-4" /> Go to Portfolio
      </button>

      {/* Portfolios List */}
      <div className="flex-1 overflow-y-auto">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
          Saved Schemas ({portfolios.length})
        </h4>

        {portfolios.length === 0 ? (
          <div className="text-center py-8">
            <Folder className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              No saved schemas yet
            </p>
            <p className="text-sm text-gray-400">
              Create and save your first schema to see it here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {portfolios.map((p) => {
              // parse tables/relationships counts if JSON
              let tblCount = null;
              let relCount = null;
              try {
                const s = JSON.parse(p.scripts);
                tblCount = s.tables.length;
                relCount = s.relationships.length;
              } catch {}
              return (
                <div
                  key={p._id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-medium text-gray-900 dark:text-white truncate">
                      {p.name}
                    </h5>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleLoadPortfolio(p)}
                        className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded"
                        title="Load schema"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => confirmAndDelete(p._id)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                        title="Delete schema"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <span>{tblCount !== null ? tblCount : '-'} tables</span>
                    <span>{relCount !== null ? relCount : '-'} relationships</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    <span>Created {new Date(p.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Schema Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create New Schema
            </h3>
            <input
              type="text"
              value={newSchemaName}
              onChange={(e) => setNewSchemaName(e.target.value)}
              placeholder="Enter schema name"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleCreateSchema()}
              className="w-full px-3 py-2 border rounded-lg mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewSchemaName('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSchema}
                disabled={!newSchemaName.trim()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded disabled:bg-gray-400"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioManager;

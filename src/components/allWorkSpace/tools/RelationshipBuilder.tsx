import React, { useState } from 'react';
import { Link2, Trash2 } from 'lucide-react';
import { useDatabase } from '../../../context/DatabaseContext';

const RelationshipBuilder: React.FC = () => {
  const { currentSchema, addRelationship, removeRelationship } = useDatabase();
  const [sourceTable, setSourceTable] = useState('');
  const [sourceColumn, setSourceColumn] = useState('');
  const [targetTable, setTargetTable] = useState('');
  const [targetColumn, setTargetColumn] = useState('');
  const [cardinality, setCardinality] = useState<'1:1' | '1:N' | 'N:M'>('1:N');

  const sourceTableData = currentSchema.tables.find(t => t.id === sourceTable);
  const targetTableData = currentSchema.tables.find(t => t.id === targetTable);

  const createRelationship = () => {
    if (!sourceTable || !sourceColumn || !targetTable || !targetColumn) {
      return;
    }

    addRelationship({
      sourceTableId: sourceTable,
      sourceColumnId: sourceColumn,
      targetTableId: targetTable,
      targetColumnId: targetColumn,
      cardinality,
    });

    // Reset form
    setSourceTable('');
    setSourceColumn('');
    setTargetTable('');
    setTargetColumn('');
    setCardinality('1:N');
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Create Relationship
        </h3>

        {currentSchema.tables.length < 2 ? (
          <div className="text-center py-8">
            <Link2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              You need at least 2 tables to create relationships
            </p>
            <p className="text-sm text-gray-400">
              Create some tables first using the Table Builder
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Source Table */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Source Table
              </label>
              <select
                value={sourceTable}
                onChange={(e) => {
                  setSourceTable(e.target.value);
                  setSourceColumn('');
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="">Select source table</option>
                {currentSchema.tables.map(table => (
                  <option key={table.id} value={table.id}>
                    {table.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Source Column */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Source Column
              </label>
              <select
                value={sourceColumn}
                onChange={(e) => setSourceColumn(e.target.value)}
                disabled={!sourceTable}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:opacity-50"
              >
                <option value="">Select source column</option>
                {sourceTableData?.columns.map(column => (
                  <option key={column.id} value={column.id}>
                    {column.name} ({column.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Cardinality */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Relationship Type
              </label>
              <select
                value={cardinality}
                onChange={(e) => setCardinality(e.target.value as '1:1' | '1:N' | 'N:M')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="1:1">One to One (1:1)</option>
                <option value="1:N">One to Many (1:N)</option>
                <option value="N:M">Many to Many (N:M)</option>
              </select>
            </div>

            {/* Target Table */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Table
              </label>
              <select
                value={targetTable}
                onChange={(e) => {
                  setTargetTable(e.target.value);
                  setTargetColumn('');
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="">Select target table</option>
                {currentSchema.tables.filter(table => table.id !== sourceTable).map(table => (
                  <option key={table.id} value={table.id}>
                    {table.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Column */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Column
              </label>
              <select
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                disabled={!targetTable}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:opacity-50"
              >
                <option value="">Select target column</option>
                {targetTableData?.columns.map(column => (
                  <option key={column.id} value={column.id}>
                    {column.name} ({column.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Create Button */}
            <button
              onClick={createRelationship}
              disabled={!sourceTable || !sourceColumn || !targetTable || !targetColumn}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 font-medium flex items-center justify-center gap-2"
            >
              <Link2 className="w-4 h-4" />
              Create Relationship
            </button>
          </div>
        )}
      </div>

      {/* Existing Relationships */}
      <div className="flex-1 overflow-y-auto">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
          Existing Relationships ({currentSchema.relationships.length})
        </h4>
        
        {currentSchema.relationships.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No relationships created yet
          </p>
        ) : (
          <div className="space-y-3">
            {currentSchema.relationships.map(relationship => {
              const sourceTable = currentSchema.tables.find(t => t.id === relationship.sourceTableId);
              const targetTable = currentSchema.tables.find(t => t.id === relationship.targetTableId);
              const sourceColumn = sourceTable?.columns.find(c => c.id === relationship.sourceColumnId);
              const targetColumn = targetTable?.columns.find(c => c.id === relationship.targetColumnId);

              return (
                <div
                  key={relationship.id}
                  className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {relationship.cardinality} Relationship
                    </span>
                    <button
                      onClick={() => removeRelationship(relationship.id)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                        {sourceTable?.name}.{sourceColumn?.name}
                      </span>
                      <Link2 className="w-4 h-4" />
                      <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                        {targetTable?.name}.{targetColumn?.name}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RelationshipBuilder;
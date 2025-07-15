import React, { useState } from 'react';
import { Plus, Edit, Trash2, Table, Columns, Settings } from 'lucide-react';
import { useDatabase, Column } from '../../../context/DatabaseContext';
import { useSubscription } from '../../../context/SubscriptionContext'; // Added subscription context
import FeatureGate from '../../subscription/FeatureGate'// Added feature gate
import { v4 as uuidv4 } from 'uuid';

const ZeroCodeDDLBuilder: React.FC = () => {
  const { currentSchema, addTable, removeTable, alterTable } = useDatabase();
  // Added subscription hooks for plan checking
  const { isLimitReached, setShowUpgradeModal, setUpgradeReason } = useSubscription();
  
  const [activeModal, setActiveModal] = useState<'create' | 'alter' | 'drop' | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableForm, setTableForm] = useState({
    name: '',
    columns: [] as Omit<Column, 'id'>[]
  });

  const dataTypes = [
    'VARCHAR(255)', 'VARCHAR(100)', 'VARCHAR(50)',
    'INT', 'BIGINT', 'SMALLINT', 'TINYINT',
    'DECIMAL(10,2)', 'DECIMAL(15,4)', 'FLOAT', 'DOUBLE',
    'BOOLEAN', 'BIT',
    'DATE', 'DATETIME', 'TIMESTAMP', 'TIME',
    'TEXT', 'LONGTEXT', 'MEDIUMTEXT',
    'JSON', 'BLOB', 'LONGBLOB'
  ];

  const openCreateModal = () => {
    // Check table limit before allowing creation
    if (isLimitReached('maxTables', currentSchema.tables.length)) {
      setUpgradeReason('You have reached the maximum number of tables for your plan. Upgrade to create more tables.');
      setShowUpgradeModal(true);
      return;
    }
    
    setTableForm({ name: '', columns: [] });
    setActiveModal('create');
  };

  const openAlterModal = (tableId: string) => {
    const table = currentSchema.tables.find(t => t.id === tableId);
    if (table) {
      setSelectedTable(tableId);
      setTableForm({
        name: table.name,
        columns: table.columns.map(col => ({
          name: col.name,
          type: col.type,
          nullable: col.nullable,
          defaultValue: col.defaultValue,
          isPrimaryKey: col.isPrimaryKey,
          isForeignKey: col.isForeignKey,
          isUnique: col.isUnique,
          isIndexed: col.isIndexed
        }))
      });
      setActiveModal('alter');
    }
  };

  const openDropModal = (tableId: string) => {
    setSelectedTable(tableId);
    setActiveModal('drop');
  };

  const addColumn = () => {
    // Check column limit before allowing addition
    if (isLimitReached('maxColumns', tableForm.columns.length)) {
      setUpgradeReason('You have reached the maximum number of columns for your plan. Upgrade to add more columns.');
      setShowUpgradeModal(true);
      return;
    }
    
    setTableForm(prev => ({
      ...prev,
      columns: [
        ...prev.columns,
        {
          name: '',
          type: 'VARCHAR(255)',
          nullable: true,
          isPrimaryKey: false,
          isForeignKey: false,
          isUnique: false,
          isIndexed: false
        }
      ]
    }));
  };

  const removeColumn = (index: number) => {
    setTableForm(prev => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== index)
    }));
  };

  const updateColumn = (index: number, updates: Partial<Omit<Column, 'id'>>) => {
    setTableForm(prev => ({
      ...prev,
      columns: prev.columns.map((col, i) => 
        i === index ? { ...col, ...updates } : col
      )
    }));
  };

  const handleCreateTable = () => {
    if (!tableForm.name.trim() || tableForm.columns.length === 0) return;

    addTable({
      name: tableForm.name,
      columns: tableForm.columns.map(col => ({ ...col, id: uuidv4() })),
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 }
    });

    setActiveModal(null);
    setTableForm({ name: '', columns: [] });
  };

  const handleAlterTable = () => {
    if (!selectedTable) return;

    const originalTable = currentSchema.tables.find(t => t.id === selectedTable);
    if (!originalTable) return;

    // Compare columns and generate alter operations
    const originalColumns = originalTable.columns;
    const newColumns = tableForm.columns;

    // Find added columns
    newColumns.forEach(newCol => {
      const exists = originalColumns.find(origCol => origCol.name === newCol.name);
      if (!exists) {
        alterTable(selectedTable, 'ADD_COLUMN', newCol);
      }
    });

    // Find removed columns
    originalColumns.forEach(origCol => {
      const exists = newColumns.find(newCol => newCol.name === origCol.name);
      if (!exists) {
        alterTable(selectedTable, 'DROP_COLUMN', { columnId: origCol.id });
      }
    });

    setActiveModal(null);
  };

  const handleDropTable = () => {
    if (selectedTable) {
      removeTable(selectedTable);
      setActiveModal(null);
      setSelectedTable('');
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedTable('');
    setTableForm({ name: '', columns: [] });
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          DDL Operations
        </h3>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors duration-200"
          >
            <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-left">
              <div className="font-medium text-green-800 dark:text-green-200">Create Table</div>
              <div className="text-sm text-green-600 dark:text-green-400">Add a new table with columns</div>
              {/* Added limit indicator */}
              <div className="text-xs text-green-500 dark:text-green-400 mt-1">
                {currentSchema.tables.length} tables created
              </div>
            </div>
          </button>

          <button
            onClick={() => currentSchema.tables.length > 0 && openAlterModal(currentSchema.tables[0].id)}
            disabled={currentSchema.tables.length === 0}
            className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center">
              <Edit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <div className="font-medium text-blue-800 dark:text-blue-200">Alter Table</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Modify existing table structure</div>
            </div>
          </button>

          <button
            onClick={() => currentSchema.tables.length > 0 && openDropModal(currentSchema.tables[0].id)}
            disabled={currentSchema.tables.length === 0}
            className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-10 h-10 bg-red-100 dark:bg-red-800 rounded-lg flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-left">
              <div className="font-medium text-red-800 dark:text-red-200">Drop Table</div>
              <div className="text-sm text-red-600 dark:text-red-400">Remove table and all data</div>
            </div>
          </button>
        </div>
      </div>

      {/* Existing Tables */}
      <div className="flex-1 overflow-y-auto">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
          Existing Tables ({currentSchema.tables.length})
        </h4>

        {currentSchema.tables.length === 0 ? (
          <div className="text-center py-8">
            <Table className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">No tables created yet</p>
            <p className="text-sm text-gray-400">Create your first table to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentSchema.tables.map(table => (
              <div
                key={table.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-sky-100 dark:bg-sky-900 rounded-lg flex items-center justify-center">
                      <Table className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white">{table.name}</h5>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {table.columns.length} columns • {table.rowCount} rows
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openAlterModal(table.id)}
                      className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
                      title="Alter table"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDropModal(table.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                      title="Drop table"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {table.columns.slice(0, 3).map(column => (
                    <div key={column.id} className="flex items-center gap-2 text-sm">
                      <Columns className="w-3 h-3 text-gray-400" />
                      <span className="font-mono text-gray-700 dark:text-gray-300">{column.name}</span>
                      <span className="text-gray-500 dark:text-gray-400">{column.type}</span>
                      {column.isPrimaryKey && (
                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs rounded">PK</span>
                      )}
                    </div>
                  ))}
                  {table.columns.length > 3 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      +{table.columns.length - 3} more columns
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {activeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {activeModal === 'create' && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Create New Table
                </h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Table Name
                  </label>
                  <input
                    type="text"
                    value={tableForm.name}
                    onChange={(e) => setTableForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="Enter table name"
                  />
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Columns
                    </label>
                    <button
                      onClick={addColumn}
                      className="flex items-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors duration-200 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Column
                    </button>
                  </div>

                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {tableForm.columns.map((column, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Column {index + 1}
                          </span>
                          <button
                            onClick={() => removeColumn(index)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={column.name}
                            onChange={(e) => updateColumn(index, { name: e.target.value })}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                            placeholder="Column name"
                          />

                          <select
                            value={column.type}
                            onChange={(e) => updateColumn(index, { type: e.target.value })}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                          >
                            {dataTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>

                          <input
                            type="text"
                            value={column.defaultValue || ''}
                            onChange={(e) => updateColumn(index, { defaultValue: e.target.value })}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                            placeholder="Default value (optional)"
                          />

                          <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={!column.nullable}
                                onChange={(e) => updateColumn(index, { nullable: !e.target.checked })}
                                className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                              />
                              <span className="text-gray-700 dark:text-gray-300">Not Null</span>
                            </label>

                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={column.isPrimaryKey || false}
                                onChange={(e) => updateColumn(index, { isPrimaryKey: e.target.checked })}
                                className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                              />
                              <span className="text-gray-700 dark:text-gray-300">Primary Key</span>
                            </label>

                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={column.isUnique || false}
                                onChange={(e) => updateColumn(index, { isUnique: e.target.checked })}
                                className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                              />
                              <span className="text-gray-700 dark:text-gray-300">Unique</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTable}
                    disabled={!tableForm.name.trim() || tableForm.columns.length === 0}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200"
                  >
                    Create Table
                  </button>
                </div>
              </>
            )}

            {activeModal === 'alter' && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Alter Table: {tableForm.name}
                </h3>
                
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Columns
                    </label>
                    <button
                      onClick={addColumn}
                      className="flex items-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors duration-200 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Column
                    </button>
                  </div>

                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {tableForm.columns.map((column, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {column.name || `Column ${index + 1}`}
                          </span>
                          <button
                            onClick={() => removeColumn(index)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={column.name}
                            onChange={(e) => updateColumn(index, { name: e.target.value })}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                            placeholder="Column name"
                          />

                          <select
                            value={column.type}
                            onChange={(e) => updateColumn(index, { type: e.target.value })}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                          >
                            {dataTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAlterTable}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
                  >
                    Alter Table
                  </button>
                </div>
              </>
            )}

            {activeModal === 'drop' && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Drop Table
                </h3>
                
                <div className="mb-6">
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <span className="font-medium text-red-800 dark:text-red-200">Warning</span>
                    </div>
                    <p className="text-red-700 dark:text-red-300 text-sm">
                      This action will permanently delete the table and all its data. This cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDropTable}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
                  >
                    Drop Table
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ZeroCodeDDLBuilder;
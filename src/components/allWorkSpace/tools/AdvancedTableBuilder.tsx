import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Key, Link2 } from 'lucide-react';
import { useDatabase, Column, Table, ValidationError } from '../../../context/DatabaseContext';
import { v4 as uuidv4 } from 'uuid';

const AdvancedTableBuilder: React.FC = () => {
  const { 
    currentSchema, 
    addTable, 
    removeTable
  } = useDatabase();
  
  const [activeModal, setActiveModal] = useState<'create' | null>(null);
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
    'JSON', 'BLOB', 'LONGBLOB', 'UUID'
  ];

  const openCreateModal = () => {
    setTableForm({ name: '', columns: [] });
    setActiveModal('create');
  };

  const addColumn = () => {
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
      columns: prev.columns.map((col, i) => {
        if (i === index) {
          const updatedCol = { ...col, ...updates };
          
          // Validation: Only one primary key per table
          if (updates.isPrimaryKey && updatedCol.isPrimaryKey) {
            // Remove primary key from other columns
            prev.columns.forEach((otherCol, otherIndex) => {
              if (otherIndex !== index && otherCol.isPrimaryKey) {
                prev.columns[otherIndex] = { ...otherCol, isPrimaryKey: false };
              }
            });
          }
          
          // If setting as foreign key, clear primary key
          if (updates.isForeignKey && updatedCol.isForeignKey) {
            updatedCol.isPrimaryKey = false;
          }
          
          // If setting as primary key, clear foreign key
          if (updates.isPrimaryKey && updatedCol.isPrimaryKey) {
            updatedCol.isForeignKey = false;
            updatedCol.referencedTable = undefined;
            updatedCol.referencedColumn = undefined;
            updatedCol.constraintName = undefined;
          }
          
          return updatedCol;
        }
        return col;
      })
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

  const getAvailableReferenceTables = () => {
    return currentSchema.tables.filter(table => 
      table.columns.some(col => col.isPrimaryKey)
    );
  };

  const getAvailableReferenceColumns = (tableName: string) => {
    const table = currentSchema.tables.find(t => t.name === tableName);
    // Only return primary key columns for foreign key references
    return table?.columns.filter(col => col.isPrimaryKey) || [];
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedTable('');
    setTableForm({ name: '', columns: [] });
    setErrors([]);
  };

  const renderValidationErrors = () => {
    const currentErrors = [...errors, ...validationErrors.filter(e => e.tableId === selectedTable)];
    
    if (currentErrors.length === 0) return null;

    return (
      <div className="mb-4 space-y-2">
        {currentErrors.map((error, index) => (
            key={index}
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Advanced Table Builder
        </h3>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            Create Table
          </button>
        </div>
      </div>

      {/* Existing Tables with Enhanced Actions */}
      <div className="flex-1 overflow-y-auto">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Existing Tables ({currentSchema.tables.length})
        </h4>

        {currentSchema.tables.length === 0 ? (
          <div className="text-center py-8">
            <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">No tables created yet</p>
            <p className="text-sm text-gray-400">Create your first table to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentSchema.tables.map(table => {
              return (
                <div
                  key={table.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-sky-100 dark:bg-sky-900 rounded-lg flex items-center justify-center">
                        <Database className="w-4 h-4 text-sky-600 dark:text-sky-400" />
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
                        onClick={() => removeTable(table.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                        title="Drop table"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Column Preview */}
                  <div className="space-y-2">
                    {table.columns.slice(0, 3).map(column => (
                      <div key={column.id} className="flex items-center gap-2 text-sm">
                        <div className="flex gap-1">
                          {column.isPrimaryKey && (
                            <Key className="w-3 h-3 text-yellow-500" title="Primary Key" />
                          )}
                          {column.isForeignKey && (
                            <Link2 className="w-3 h-3 text-blue-500" title="Foreign Key" />
                          )}
                          {column.isUnique && (
                            <div className="w-3 h-3 bg-purple-500 rounded-full" title="Unique" />
                          )}
                        </div>
                        <span className="font-mono text-gray-700 dark:text-gray-300">{column.name}</span>
                        <span className="text-gray-500 dark:text-gray-400">{column.type}</span>
                        {!column.nullable && (
                          <span className="text-xs bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 px-1 rounded">
                            NOT NULL
                          </span>
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
              );
            })}
          </div>
        )}
      </div>

      {/* Enhanced Modals */}
      {activeModal === 'create' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Create New Table
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Table Info */}
              <div className="lg:col-span-1">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4">Table Information</h4>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Table Name
                    </label>
                    <input
                      type="text"
                      value={tableForm.name}
                      onChange={(e) => setTableForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      placeholder="Enter table name"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Columns:</span>
                      <span className="font-medium">{tableForm.columns.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Primary Keys:</span>
                      <span className="font-medium">{tableForm.columns.filter(c => c.isPrimaryKey).length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Foreign Keys:</span>
                      <span className="font-medium">{tableForm.columns.filter(c => c.isForeignKey).length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Unique Constraints:</span>
                      <span className="font-medium">{tableForm.columns.filter(c => c.isUnique).length}</span>
                    </div>
                  </div>

                  <button
                    onClick={addColumn}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors duration-200"
                  >
                    <Plus className="w-4 h-4" />
                    Add Column
                  </button>
                </div>
              </div>

              {/* Columns */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">Columns</h4>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {tableForm.columns.length} column{tableForm.columns.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {tableForm.columns.map((column, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Column {index + 1}
                          </span>
                          {column.isPrimaryKey && (
                            <Key className="w-4 h-4 text-yellow-500" title="Primary Key" />
                          )}
                          {column.isForeignKey && (
                            <Link2 className="w-4 h-4 text-blue-500" title="Foreign Key" />
                          )}
                          {column.isUnique && (
                            <div className="w-4 h-4 bg-purple-500 rounded-full" title="Unique" />
                          )}
                        </div>
                        <button
                          onClick={() => removeColumn(index)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
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

                        {/* Foreign Key Reference */}
                        {column.isForeignKey && (
                          <>
                          <select
                            value={column.referencedTable || ''}
                            onChange={(e) => updateColumn(index, { 
                              referencedTable: e.target.value,
                              referencedColumn: '' // Reset column when table changes
                            })}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                          >
                            <option value="">Select referenced table</option>
                            {getAvailableReferenceTables().map(table => (
                              <option key={table.id} value={table.name}>
                                {table.name} ({table.columns.filter(c => c.isPrimaryKey).length} PK)
                              </option>
                            ))}
                          </select>

                          {column.referencedTable && (
                            <select
                              value={column.referencedColumn || ''}
                              onChange={(e) => updateColumn(index, { referencedColumn: e.target.value })}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                            >
                              <option value="">Select referenced column</option>
                              {getAvailableReferenceColumns(column.referencedTable).map(refCol => (
                                <option key={refCol.id} value={refCol.name}>
                                  {refCol.name} ({refCol.type}) - PK
                                </option>
                              ))}
                            </select>
                          )}
                          </>
                        )}
                      </div>

                      {/* Constraints */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                            onChange={(e) => {
                              if (e.target.checked) {
                                // Ensure only one primary key per table
                                const updatedColumns = tableForm.columns.map((col, i) => 
                                  i === index 
                                    ? { ...col, isPrimaryKey: true, isForeignKey: false }
                                    : { ...col, isPrimaryKey: false }
                                );
                                setTableForm(prev => ({ ...prev, columns: updatedColumns }));
                              } else {
                                updateColumn(index, { isPrimaryKey: false });
                              }
                            }}
                            className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                          />
                          <Key className="w-4 h-4 text-yellow-500" />
                          <span className="text-gray-700 dark:text-gray-300">Primary Key</span>
                        </label>

                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={column.isForeignKey || false}
                            onChange={(e) => {
                              if (e.target.checked) {
                                updateColumn(index, { 
                                  isForeignKey: true, 
                                  isPrimaryKey: false,
                                  referencedTable: '',
                                  referencedColumn: ''
                                });
                              } else {
                                updateColumn(index, { 
                                  isForeignKey: false,
                                  referencedTable: undefined,
                                  referencedColumn: undefined
                                });
                              }
                            }}
                            className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                          />
                          <Link2 className="w-4 h-4 text-blue-500" />
                          <span className="text-gray-700 dark:text-gray-300">Foreign Key</span>
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
                  ))}

                  {tableForm.columns.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No columns defined. Click "Add Column" to get started.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTable}
                disabled={!tableForm.name.trim() || tableForm.columns.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200"
              >
                Create Table
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedTableBuilder;
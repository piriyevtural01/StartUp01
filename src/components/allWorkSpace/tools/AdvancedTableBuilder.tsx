import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Key, Link2, AlertTriangle, Check, X, Database, Shield } from 'lucide-react';
import { useDatabase, Column, Table, ValidationError } from '../../../context/DatabaseContext';
import { v4 as uuidv4 } from 'uuid';

const AdvancedTableBuilder: React.FC = () => {
  const { 
    currentSchema, 
    addTable, 
    updateTable, 
    removeTable, 
    alterTable,
    validateTable,
    validationErrors 
  } = useDatabase();
  
  const [activeModal, setActiveModal] = useState<'create' | 'alter' | 'relationships' | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableForm, setTableForm] = useState({
    name: '',
    columns: [] as Omit<Column, 'id'>[]
  });
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const dataTypes = [
    'VARCHAR(255)', 'VARCHAR(100)', 'VARCHAR(50)',
    'INT', 'BIGINT', 'SMALLINT', 'TINYINT',
    'DECIMAL(10,2)', 'DECIMAL(15,4)', 'FLOAT', 'DOUBLE',
    'BOOLEAN', 'BIT',
    'DATE', 'DATETIME', 'TIMESTAMP', 'TIME',
    'TEXT', 'LONGTEXT', 'MEDIUMTEXT',
    'JSON', 'BLOB', 'LONGBLOB', 'UUID'
  ];

  // Real-time validation
  useEffect(() => {
    if (tableForm.name && tableForm.columns.length > 0) {
      const mockTable: Table = {
        id: 'temp',
        name: tableForm.name,
        columns: tableForm.columns.map(col => ({ ...col, id: uuidv4() })),
        position: { x: 0, y: 0 },
        data: [],
        rowCount: 0
      };
      const tableErrors = validateTable(mockTable);
      setErrors(tableErrors);
    } else {
      setErrors([]);
    }
  }, [tableForm, validateTable]);

  const openCreateModal = () => {
    setTableForm({ name: '', columns: [] });
    setActiveModal('create');
    setErrors([]);
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
          isIndexed: col.isIndexed,
          referencedTable: col.referencedTable,
          referencedColumn: col.referencedColumn,
          constraintName: col.constraintName
        }))
      });
      setActiveModal('alter');
      setErrors([]);
    }
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
    if (errors.some(e => e.type === 'error')) return;

    // Check for duplicate table names
    const existingTable = currentSchema.tables.find(t => 
      t.name.toLowerCase() === tableForm.name.toLowerCase()
    );
    
    if (existingTable) {
      setErrors([{
        type: 'error',
        message: `Table "${tableForm.name}" already exists`
      }]);
      return;
    }

    addTable({
      name: tableForm.name,
      columns: tableForm.columns.map(col => ({ ...col, id: uuidv4() })),
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 }
    });

    setActiveModal(null);
    setTableForm({ name: '', columns: [] });
    setErrors([]);
  };

  const handleAlterTable = () => {
    if (!selectedTable) return;
    if (errors.some(e => e.type === 'error')) return;

    const originalTable = currentSchema.tables.find(t => t.id === selectedTable);
    if (!originalTable) return;

    // Update the table with new structure
    updateTable(selectedTable, {
      name: tableForm.name,
      columns: tableForm.columns.map(col => ({ ...col, id: col.id || uuidv4() }))
    });

    setActiveModal(null);
    setSelectedTable('');
    setTableForm({ name: '', columns: [] });
    setErrors([]);
  };

  const getAvailableReferenceTables = () => {
    return currentSchema.tables.filter(table => table.id !== selectedTable);
  };

  const getAvailableReferenceColumns = (tableName: string) => {
    const table = currentSchema.tables.find(t => t.name === tableName);
    return table?.columns || [];
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
          <div
            key={index}
            className={`p-3 rounded-lg border flex items-start gap-2 ${
              error.type === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
            }`}
          >
            {error.type === 'error' ? (
              <X className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            )}
            <span className={`text-sm ${
              error.type === 'error'
                ? 'text-red-800 dark:text-red-200'
                : 'text-yellow-800 dark:text-yellow-200'
            }`}>
              {error.message}
            </span>
          </div>
        ))}
      </div>
    );
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
            className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors duration-200"
          >
            <div className="w-10 h-10 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-left">
              <div className="font-medium text-green-800 dark:text-green-200">Create Table</div>
              <div className="text-sm text-green-600 dark:text-green-400">Design a new table with advanced constraints</div>
            </div>
          </button>

          <button
            onClick={() => setActiveModal('relationships')}
            className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200"
          >
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center">
              <Link2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <div className="font-medium text-blue-800 dark:text-blue-200">Manage Relationships</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">View and edit table relationships</div>
            </div>
          </button>
        </div>
      </div>

      {/* Existing Tables with Enhanced Actions */}
      <div className="flex-1 overflow-y-auto">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
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
              const tableErrors = validationErrors.filter(e => e.tableId === table.id);
              const hasErrors = tableErrors.some(e => e.type === 'error');
              const hasWarnings = tableErrors.some(e => e.type === 'warning');
              
              return (
                <div
                  key={table.id}
                  className={`bg-white dark:bg-gray-800 border rounded-lg p-4 ${
                    hasErrors 
                      ? 'border-red-300 dark:border-red-700' 
                      : hasWarnings 
                      ? 'border-yellow-300 dark:border-yellow-700'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        hasErrors 
                          ? 'bg-red-100 dark:bg-red-900' 
                          : hasWarnings 
                          ? 'bg-yellow-100 dark:bg-yellow-900'
                          : 'bg-sky-100 dark:bg-sky-900'
                      }`}>
                        {hasErrors ? (
                          <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                        ) : hasWarnings ? (
                          <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        ) : (
                          <Database className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                        )}
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white">{table.name}</h5>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {table.columns.length} columns • {table.rowCount} rows
                          {tableErrors.length > 0 && (
                            <span className={`ml-2 ${hasErrors ? 'text-red-600' : 'text-yellow-600'}`}>
                              • {tableErrors.length} issue{tableErrors.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openAlterModal(table.id)}
                        className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
                        title="Alter table structure"
                      >
                        <Shield className="w-4 h-4" />
                      </button>
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

                  {/* Show validation errors for this table */}
                  {tableErrors.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="space-y-1">
                        {tableErrors.map((error, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs">
                            {error.type === 'error' ? (
                              <X className="w-3 h-3 text-red-500" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-yellow-500" />
                            )}
                            <span className={error.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}>
                              {error.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enhanced Modals */}
      {(activeModal === 'create' || activeModal === 'alter') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-6xl max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {activeModal === 'create' ? 'Create New Table' : 'Alter Table Structure'}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {renderValidationErrors()}

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
                              <option key={table.id} value={table.name}>{table.name}</option>
                            ))}
                          </select>
                        )}

                        {column.isForeignKey && column.referencedTable && (
                          <select
                            value={column.referencedColumn || ''}
                            onChange={(e) => updateColumn(index, { referencedColumn: e.target.value })}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                          >
                            <option value="">Select referenced column</option>
                            {getAvailableReferenceColumns(column.referencedTable).map(refCol => (
                              <option key={refCol.id} value={refCol.name}>{refCol.name}</option>
                            ))}
                          </select>
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
                            onChange={(e) => updateColumn(index, { isPrimaryKey: e.target.checked })}
                            className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                          />
                          <Key className="w-4 h-4 text-yellow-500" />
                          <span className="text-gray-700 dark:text-gray-300">Primary Key</span>
                        </label>

                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={column.isForeignKey || false}
                            onChange={(e) => updateColumn(index, { isForeignKey: e.target.checked })}
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
                onClick={activeModal === 'create' ? handleCreateTable : handleAlterTable}
                disabled={!tableForm.name.trim() || tableForm.columns.length === 0 || errors.some(e => e.type === 'error')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200"
              >
                <Check className="w-4 h-4" />
                {activeModal === 'create' ? 'Create Table' : 'Apply Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Relationships Modal */}
      {activeModal === 'relationships' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Table Relationships
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {currentSchema.relationships.length === 0 ? (
                <div className="text-center py-8">
                  <Link2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-2">No relationships defined</p>
                  <p className="text-sm text-gray-400">Create foreign keys to establish relationships</p>
                </div>
              ) : (
                currentSchema.relationships.map(relationship => {
                  const sourceTable = currentSchema.tables.find(t => t.id === relationship.sourceTableId);
                  const targetTable = currentSchema.tables.find(t => t.id === relationship.targetTableId);
                  const sourceColumn = sourceTable?.columns.find(c => c.id === relationship.sourceColumnId);
                  const targetColumn = targetTable?.columns.find(c => c.id === relationship.targetColumnId);

                  return (
                    <div
                      key={relationship.id}
                      className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Link2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {relationship.name}
                          </h4>
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                            {relationship.cardinality}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Created: {relationship.createdAt.toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-gray-500" />
                          <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                            {sourceTable?.name}.{sourceColumn?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <span>→</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-gray-500" />
                          <span className="font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                            {targetTable?.name}.{targetColumn?.name}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        Constraint: {relationship.constraintName}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedTableBuilder;
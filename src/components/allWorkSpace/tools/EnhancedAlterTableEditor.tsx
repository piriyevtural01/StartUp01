import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Key, Link2, AlertTriangle, Check, X, Database, Shield, Edit, Save } from 'lucide-react';
import { useDatabase, Column, Table, ValidationError } from '../../../context/DatabaseContext';
import { v4 as uuidv4 } from 'uuid';

interface AlterOperation {
  type: 'ADD_COLUMN' | 'DROP_COLUMN' | 'MODIFY_COLUMN' | 'ADD_PRIMARY_KEY' | 'DROP_PRIMARY_KEY' | 'ADD_FOREIGN_KEY' | 'DROP_FOREIGN_KEY' | 'ADD_UNIQUE' | 'DROP_UNIQUE' | 'ADD_INDEX' | 'DROP_INDEX';
  data: any;
  sql: string;
}

const EnhancedAlterTableEditor: React.FC = () => {
  const { 
    currentSchema, 
    updateTable, 
    removeTable, 
    alterTable,
    validateTable,
    validationErrors,
    generateSQL 
  } = useDatabase();
  
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [tableForm, setTableForm] = useState({
    name: '',
    columns: [] as Column[]
  });
  const [pendingOperations, setPendingOperations] = useState<AlterOperation[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSQL, setPreviewSQL] = useState('');

  const dataTypes = [
    'VARCHAR(255)', 'VARCHAR(100)', 'VARCHAR(50)',
    'INT', 'BIGINT', 'SMALLINT', 'TINYINT',
    'DECIMAL(10,2)', 'DECIMAL(15,4)', 'FLOAT', 'DOUBLE',
    'BOOLEAN', 'BIT',
    'DATE', 'DATETIME', 'TIMESTAMP', 'TIME',
    'TEXT', 'LONGTEXT', 'MEDIUMTEXT',
    'JSON', 'BLOB', 'LONGBLOB', 'UUID'
  ];

  // Load table when selected
  useEffect(() => {
    if (selectedTableId) {
      const table = currentSchema.tables.find(t => t.id === selectedTableId);
      if (table) {
        setTableForm({
          name: table.name,
          columns: [...table.columns]
        });
        setPendingOperations([]);
        setErrors([]);
      }
    }
  }, [selectedTableId, currentSchema.tables]);

  // Real-time validation
  useEffect(() => {
    if (tableForm.name && tableForm.columns.length > 0) {
      const mockTable: Table = {
        id: selectedTableId || 'temp',
        name: tableForm.name,
        columns: tableForm.columns,
        position: { x: 0, y: 0 },
        data: [],
        rowCount: 0
      };
      const tableErrors = validateTable(mockTable);
      setErrors(tableErrors);
    } else {
      setErrors([]);
    }
  }, [tableForm, validateTable, selectedTableId]);

  // Generate preview SQL
  useEffect(() => {
    if (pendingOperations.length > 0) {
      const sql = pendingOperations.map(op => op.sql).join('\n');
      setPreviewSQL(sql);
    } else {
      setPreviewSQL('');
    }
  }, [pendingOperations]);

  const addColumn = () => {
    const newColumn: Column = {
      id: uuidv4(),
      name: '',
      type: 'VARCHAR(255)',
      nullable: true,
      isPrimaryKey: false,
      isForeignKey: false,
      isUnique: false,
      isIndexed: false
    };

    setTableForm(prev => ({
      ...prev,
      columns: [...prev.columns, newColumn]
    }));

    // Add to pending operations
    const operation: AlterOperation = {
      type: 'ADD_COLUMN',
      data: newColumn,
      sql: `ALTER TABLE ${tableForm.name} ADD COLUMN ${newColumn.name || 'new_column'} ${newColumn.type}${!newColumn.nullable ? ' NOT NULL' : ''};`
    };
    setPendingOperations(prev => [...prev, operation]);
  };

  const removeColumn = (columnId: string) => {
    const column = tableForm.columns.find(c => c.id === columnId);
    if (!column) return;

    setTableForm(prev => ({
      ...prev,
      columns: prev.columns.filter(c => c.id !== columnId)
    }));

    // Add to pending operations
    const operation: AlterOperation = {
      type: 'DROP_COLUMN',
      data: { columnId },
      sql: `ALTER TABLE ${tableForm.name} DROP COLUMN ${column.name};`
    };
    setPendingOperations(prev => [...prev, operation]);
  };

  const updateColumn = (columnId: string, updates: Partial<Column>) => {
    const originalColumn = tableForm.columns.find(c => c.id === columnId);
    if (!originalColumn) return;

    setTableForm(prev => ({
      ...prev,
      columns: prev.columns.map(col => {
        if (col.id === columnId) {
          const updatedCol = { ...col, ...updates };
          
          // Validation: Only one primary key per table
          if (updates.isPrimaryKey && updatedCol.isPrimaryKey) {
            // Remove primary key from other columns
            prev.columns.forEach((otherCol, otherIndex) => {
              if (otherCol.id !== columnId && otherCol.isPrimaryKey) {
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

    // Generate appropriate ALTER statement
    const updatedColumn = { ...originalColumn, ...updates };
    let sql = '';

    if (updates.isPrimaryKey !== undefined) {
      if (updates.isPrimaryKey) {
        sql = `ALTER TABLE ${tableForm.name} ADD PRIMARY KEY (${updatedColumn.name});`;
      } else {
        sql = `ALTER TABLE ${tableForm.name} DROP PRIMARY KEY;`;
      }
    } else if (updates.isForeignKey !== undefined) {
      if (updates.isForeignKey && updates.referencedTable && updates.referencedColumn) {
        sql = `ALTER TABLE ${tableForm.name} ADD CONSTRAINT FK_${tableForm.name}_${updatedColumn.name} FOREIGN KEY (${updatedColumn.name}) REFERENCES ${updates.referencedTable}(${updates.referencedColumn});`;
      } else {
        sql = `ALTER TABLE ${tableForm.name} DROP FOREIGN KEY ${originalColumn.constraintName};`;
      }
    } else if (updates.isUnique !== undefined) {
      if (updates.isUnique) {
        sql = `ALTER TABLE ${tableForm.name} ADD UNIQUE (${updatedColumn.name});`;
      } else {
        sql = `ALTER TABLE ${tableForm.name} DROP INDEX ${updatedColumn.name};`;
      }
    } else {
      // Column modification
      sql = `ALTER TABLE ${tableForm.name} MODIFY COLUMN ${updatedColumn.name} ${updatedColumn.type}${!updatedColumn.nullable ? ' NOT NULL' : ''};`;
    }

    if (sql) {
      const operation: AlterOperation = {
        type: 'MODIFY_COLUMN',
        data: { columnId, updates },
        sql
      };
      setPendingOperations(prev => [...prev, operation]);
    }
  };

  const applyChanges = () => {
    if (!selectedTableId) return;
    if (errors.some(e => e.type === 'error')) return;

    // Apply all pending operations
    pendingOperations.forEach(operation => {
      alterTable(selectedTableId, operation.type, operation.data);
    });

    // Update the table with final form state
    updateTable(selectedTableId, {
      name: tableForm.name,
      columns: tableForm.columns
    });

    // Clear pending operations
    setPendingOperations([]);
    setErrors([]);
  };

  const discardChanges = () => {
    if (selectedTableId) {
      const table = currentSchema.tables.find(t => t.id === selectedTableId);
      if (table) {
        setTableForm({
          name: table.name,
          columns: [...table.columns]
        });
      }
    }
    setPendingOperations([]);
    setErrors([]);
  };

  const getAvailableReferenceTables = () => {
    return currentSchema.tables.filter(table => 
      table.id !== selectedTableId && 
      table.columns.some(col => col.isPrimaryKey)
    );
  };

  const getAvailableReferenceColumns = (tableName: string) => {
    const table = currentSchema.tables.find(t => t.name === tableName);
    return table?.columns.filter(col => col.isPrimaryKey) || [];
  };

  const renderValidationErrors = () => {
    const currentErrors = [...errors, ...validationErrors.filter(e => e.tableId === selectedTableId)];
    
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
          Enhanced ALTER TABLE Editor
        </h3>

        {/* Table Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Table to Modify
          </label>
          <select
            value={selectedTableId}
            onChange={(e) => setSelectedTableId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Choose a table to modify</option>
            {currentSchema.tables.map(table => (
              <option key={table.id} value={table.id}>
                {table.name} ({table.columns.length} columns)
              </option>
            ))}
          </select>
        </div>

        {selectedTableId && (
          <>
            {renderValidationErrors()}

            {/* Pending Operations Summary */}
            {pendingOperations.length > 0 && (
              <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">
                    Pending Changes ({pendingOperations.length})
                  </h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors duration-200"
                    >
                      {showPreview ? 'Hide' : 'Show'} SQL
                    </button>
                  </div>
                </div>
                {showPreview && (
                  <pre className="bg-blue-100 dark:bg-blue-800/20 rounded p-3 text-sm font-mono text-blue-900 dark:text-blue-100 overflow-x-auto">
                    {previewSQL}
                  </pre>
                )}
              </div>
            )}

            {/* Table Name */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Table Name
              </label>
              <input
                type="text"
                value={tableForm.name}
                onChange={(e) => setTableForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter table name"
              />
            </div>

            {/* Columns Editor */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 dark:text-white">Columns</h4>
                <button
                  onClick={addColumn}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Column
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {tableForm.columns.map((column, index) => (
                  <div key={column.id} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
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
                        onClick={() => removeColumn(column.id)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <input
                        type="text"
                        value={column.name}
                        onChange={(e) => updateColumn(column.id, { name: e.target.value })}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Column name"
                      />

                      <select
                        value={column.type}
                        onChange={(e) => updateColumn(column.id, { type: e.target.value })}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {dataTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>

                      <input
                        type="text"
                        value={column.defaultValue || ''}
                        onChange={(e) => updateColumn(column.id, { defaultValue: e.target.value })}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Default value (optional)"
                      />

                      {/* Foreign Key Reference */}
                      {column.isForeignKey && (
                        <>
                          <select
                            value={column.referencedTable || ''}
                            onChange={(e) => updateColumn(column.id, { 
                              referencedTable: e.target.value,
                              referencedColumn: '' // Reset column when table changes
                            })}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select referenced table</option>
                            {getAvailableReferenceTables().map(table => (
                              <option key={table.id} value={table.name}>{table.name}</option>
                            ))}
                          </select>

                          {column.referencedTable && (
                            <select
                              value={column.referencedColumn || ''}
                              onChange={(e) => updateColumn(column.id, { referencedColumn: e.target.value })}
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="">Select referenced column</option>
                              {getAvailableReferenceColumns(column.referencedTable).map(refCol => (
                                <option key={refCol.id} value={refCol.name}>{refCol.name}</option>
                              ))}
                            </select>
                          )}
                        </>
                      )}
                    </div>

                    {/* Constraints */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!column.nullable}
                          onChange={(e) => updateColumn(column.id, { nullable: !e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Not Null</span>
                      </label>

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={column.isPrimaryKey || false}
                          onChange={(e) => updateColumn(column.id, { isPrimaryKey: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <Key className="w-4 h-4 text-yellow-500" />
                        <span className="text-gray-700 dark:text-gray-300">Primary Key</span>
                      </label>

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={column.isForeignKey || false}
                          onChange={(e) => updateColumn(column.id, { isForeignKey: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <Link2 className="w-4 h-4 text-blue-500" />
                        <span className="text-gray-700 dark:text-gray-300">Foreign Key</span>
                      </label>

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={column.isUnique || false}
                          onChange={(e) => updateColumn(column.id, { isUnique: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Unique</span>
                      </label>

                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={column.isIndexed || false}
                          onChange={(e) => updateColumn(column.id, { isIndexed: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-700 dark:text-gray-300">Indexed</span>
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

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={discardChanges}
                disabled={pendingOperations.length === 0}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200 disabled:opacity-50"
              >
                Discard Changes
              </button>
              <button
                onClick={applyChanges}
                disabled={pendingOperations.length === 0 || errors.some(e => e.type === 'error')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200"
              >
                <Save className="w-4 h-4" />
                Apply Changes ({pendingOperations.length})
              </button>
            </div>
          </>
        )}

        {!selectedTableId && (
          <div className="text-center py-12">
            <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Select a Table to Modify
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Choose a table from the dropdown above to start making structural changes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedAlterTableEditor;
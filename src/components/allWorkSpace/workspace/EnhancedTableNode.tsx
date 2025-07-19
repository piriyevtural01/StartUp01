import React, { memo, useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Key, Link2, Trash2, MoreVertical, Database, Edit, Plus, Copy, AlertTriangle, Check } from 'lucide-react';
import { Table, ValidationError } from '../../../context/DatabaseContext';
import { useDatabase } from '../../../context/DatabaseContext';

interface EnhancedTableNodeProps {
  data: Table;
  selected?: boolean;
}

const EnhancedTableNode: React.FC<EnhancedTableNodeProps> = memo(({ data, selected }) => {
  const { 
    removeTable, 
    insertRow, 
    duplicateTable, 
    validationErrors,
    currentSchema 
  } = useDatabase();
  
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [newRowData, setNewRowData] = useState<Record<string, any>>({});
  const [tableErrors, setTableErrors] = useState<ValidationError[]>([]);

  // Get validation errors for this table
  useEffect(() => {
    const errors = validationErrors.filter(error => error.tableId === data.id);
    setTableErrors(errors);
  }, [validationErrors, data.id]);

  // Get relationships for this table
  const relationships = currentSchema.relationships.filter(
    rel => rel.sourceTableId === data.id || rel.targetTableId === data.id
  );

  const hasErrors = tableErrors.some(error => error.type === 'error');
  const hasWarnings = tableErrors.some(error => error.type === 'warning');

  const handleDeleteTable = () => {
    removeTable(data.id);
    setShowDeleteConfirm(false);
    setShowMenu(false);
  };

  const handleAddRow = () => {
    const initialData: Record<string, any> = {};
    data.columns.forEach(column => {
      initialData[column.name] = column.defaultValue || '';
    });
    setNewRowData(initialData);
    setShowAddRowModal(true);
    setShowMenu(false);
  };

  const handleSaveNewRow = () => {
    insertRow(data.id, newRowData);
    setShowAddRowModal(false);
    setNewRowData({});
  };

  const handleEditTable = () => {
    window.dispatchEvent(new CustomEvent('openAlterTable', { 
      detail: { tableId: data.id } 
    }));
    setShowMenu(false);
  };

  const handleDuplicateTable = () => {
    duplicateTable(data.id);
    setShowMenu(false);
  };

  const updateNewRowData = (columnName: string, value: any) => {
    setNewRowData(prev => ({ ...prev, [columnName]: value }));
  };

  const renderInputForColumn = (column: any, value: any) => {
    const baseClasses = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm";

    if (column.type.includes('BOOLEAN') || column.type.includes('BIT')) {
      return (
        <select
          value={value || 'false'}
          onChange={(e) => updateNewRowData(column.name, e.target.value === 'true')}
          className={baseClasses}
        >
          <option value="false">False</option>
          <option value="true">True</option>
        </select>
      );
    }

    if (column.type.includes('DATE')) {
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => updateNewRowData(column.name, e.target.value)}
          className={baseClasses}
        />
      );
    }

    if (column.type.includes('DATETIME') || column.type.includes('TIMESTAMP')) {
      return (
        <input
          type="datetime-local"
          value={value || ''}
          onChange={(e) => updateNewRowData(column.name, e.target.value)}
          className={baseClasses}
        />
      );
    }

    if (column.type.includes('INT') || column.type.includes('DECIMAL') || column.type.includes('FLOAT')) {
      return (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => updateNewRowData(column.name, e.target.value)}
          className={baseClasses}
          step={column.type.includes('DECIMAL') || column.type.includes('FLOAT') ? '0.01' : '1'}
        />
      );
    }

    if (column.type.includes('TEXT')) {
      return (
        <textarea
          value={value || ''}
          onChange={(e) => updateNewRowData(column.name, e.target.value)}
          className={baseClasses}
          rows={3}
        />
      );
    }

    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => updateNewRowData(column.name, e.target.value)}
        className={baseClasses}
      />
    );
  };

  return (
    <div className={`
      bg-white dark:bg-gray-800 border-2 rounded-lg shadow-lg min-w-64 max-w-80 relative transition-all duration-200
      ${selected 
        ? 'border-sky-500 shadow-sky-200 dark:shadow-sky-900 scale-105' 
        : hasErrors
        ? 'border-red-500 shadow-red-200 dark:shadow-red-900'
        : hasWarnings
        ? 'border-yellow-500 shadow-yellow-200 dark:shadow-yellow-900'
        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }
    `}>
      {/* Table Header */}
      <div className={`px-4 py-3 rounded-t-lg border-b border-gray-200 dark:border-gray-700 ${
        hasErrors 
          ? 'bg-red-50 dark:bg-red-900/20' 
          : hasWarnings 
          ? 'bg-yellow-50 dark:bg-yellow-900/20'
          : 'bg-gray-50 dark:bg-gray-900'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Database className={`w-4 h-4 ${
                hasErrors 
                  ? 'text-red-600 dark:text-red-400' 
                  : hasWarnings 
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-sky-600 dark:text-sky-400'
              }`} />
              {hasErrors && <AlertTriangle className="w-3 h-3 text-red-500" />}
              {hasWarnings && !hasErrors && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
              {!hasErrors && !hasWarnings && relationships.length > 0 && (
                <Link2 className="w-3 h-3 text-blue-500" title={`${relationships.length} relationship(s)`} />
              )}
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
              {data.name}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${
              hasErrors 
                ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                : hasWarnings
                ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}>
              {data.rowCount} rows
            </span>
            
            {/* More Options Menu */}
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors duration-200"
                title="More options"
              >
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowMenu(false)}
                  />
                  
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                    <div className="py-1">
                      <button
                        onClick={handleAddRow}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                      >
                        <Plus className="w-4 h-4 text-green-500" />
                        Add Row
                      </button>
                      
                      <button
                        onClick={handleEditTable}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                      >
                        <Edit className="w-4 h-4 text-blue-500" />
                        Edit Structure
                      </button>
                      
                      <button
                        onClick={handleDuplicateTable}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                      >
                        <Copy className="w-4 h-4 text-purple-500" />
                        Duplicate Table
                      </button>
                      
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                      
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowDeleteConfirm(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Table
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Validation Errors Summary */}
        {tableErrors.length > 0 && (
          <div className="mt-2 text-xs">
            <span className={hasErrors ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}>
              {tableErrors.length} validation issue{tableErrors.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Columns */}
      <div className="p-0">
        {data.columns.map((column, index) => {
          const columnErrors = tableErrors.filter(error => error.columnId === column.id);
          const hasColumnErrors = columnErrors.length > 0;
          
          return (
            <div
              key={column.id}
              className={`relative flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors duration-200 ${
                hasColumnErrors 
                  ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20' 
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              {/* Source Handle for connections */}
              <Handle
                type="source"
                position={Position.Right}
                id={column.id}
                className="!w-3 !h-3 !bg-sky-500 !border-2 !border-white dark:!border-gray-800 !right-[-6px]"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              />

              {/* Target Handle for connections */}
              <Handle
                type="target"
                position={Position.Left}
                id={column.id}
                className="!w-3 !h-3 !bg-sky-500 !border-2 !border-white dark:!border-gray-800 !left-[-6px]"
                style={{ top: '50%', transform: 'translateY(-50%)' }}
              />

              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Key Icons */}
                <div className="flex gap-1">
                  {column.isPrimaryKey && (
                    <Key className="w-3 h-3 text-yellow-500 flex-shrink-0" title="Primary Key" />
                  )}
                  {column.isForeignKey && (
                    <Link2 className="w-3 h-3 text-blue-500 flex-shrink-0" title="Foreign Key" />
                  )}
                  {column.isUnique && (
                    <div className="w-3 h-3 bg-purple-500 rounded-full flex-shrink-0" title="Unique" />
                  )}
                  {column.isIndexed && (
                    <div className="w-3 h-3 bg-green-500 rounded-sm flex-shrink-0" title="Indexed" />
                  )}
                  {hasColumnErrors && (
                    <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" title="Validation Error" />
                  )}
                </div>

                {/* Column Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {column.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {column.type}
                    {!column.nullable && (
                      <span className="ml-1 text-red-500 font-medium">NOT NULL</span>
                    )}
                    {column.defaultValue && (
                      <span className="ml-1 text-green-600 dark:text-green-400">
                        DEFAULT: {column.defaultValue}
                      </span>
                    )}
                    {column.isForeignKey && column.referencedTable && (
                      <span className="ml-1 text-blue-600 dark:text-blue-400">
                        → {column.referencedTable}.{column.referencedColumn}
                      </span>
                    )}
                  </div>
                  
                  {/* Column-specific errors */}
                  {columnErrors.length > 0 && (
                    <div className="mt-1">
                      {columnErrors.map((error, errorIndex) => (
                        <div key={errorIndex} className="text-xs text-red-600 dark:text-red-400">
                          {error.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {data.columns.length === 0 && (
          <div className="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">
            No columns defined
          </div>
        )}
      </div>

      {/* Table Footer */}
      <div className={`px-4 py-2 rounded-b-lg border-t border-gray-200 dark:border-gray-700 ${
        hasErrors 
          ? 'bg-red-50 dark:bg-red-900/20' 
          : hasWarnings 
          ? 'bg-yellow-50 dark:bg-yellow-900/20'
          : 'bg-gray-50 dark:bg-gray-900'
      }`}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <span>{data.columns.length} columns</span>
            <span>{data.rowCount} rows</span>
            {relationships.length > 0 && (
              <span className="flex items-center gap-1">
                <Link2 className="w-3 h-3" />
                {relationships.length} rel.
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {tableErrors.length > 0 && (
              <span className={`flex items-center gap-1 ${
                hasErrors ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                <AlertTriangle className="w-3 h-3" />
                {tableErrors.length}
              </span>
            )}
            {!hasErrors && !hasWarnings && (
              <Check className="w-3 h-3 text-green-500" title="Valid" />
            )}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="hover:text-red-500 transition-colors duration-200 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
              title="Delete table"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Row Modal */}
      {showAddRowModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" />
          
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Add New Row - {data.name}
                </h3>
                <button
                  onClick={() => setShowAddRowModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <span className="sr-only">Close</span>
                  ✕
                </button>
              </div>

              <div className="space-y-4 mb-6">
                {data.columns.map(column => (
                  <div key={column.id}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {column.name}
                      <span className="ml-1 text-xs text-gray-500">({column.type})</span>
                      {!column.nullable && <span className="ml-1 text-red-500">*</span>}
                      {column.isPrimaryKey && <Key className="w-3 h-3 inline ml-1 text-yellow-500" />}
                      {column.isForeignKey && <Link2 className="w-3 h-3 inline ml-1 text-blue-500" />}
                    </label>
                    {renderInputForColumn(column, newRowData[column.name])}
                    {column.defaultValue && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Default: {column.defaultValue}
                      </p>
                    )}
                    {column.isForeignKey && column.referencedTable && (
                      <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                        References: {column.referencedTable}.{column.referencedColumn}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowAddRowModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNewRow}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Row
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" />
          
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Delete Table
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Are you sure you want to delete table <strong>"{data.name}"</strong>?
                </p>
                
                {relationships.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                    <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">Warning</span>
                    </div>
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                      This table has {relationships.length} relationship{relationships.length !== 1 ? 's' : ''} that will also be deleted.
                    </p>
                  </div>
                )}
                
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• All {data.rowCount} rows of data will be permanently removed</li>
                  <li>• All {data.columns.length} columns will be deleted</li>
                  {relationships.length > 0 && (
                    <li>• {relationships.length} relationship{relationships.length !== 1 ? 's' : ''} will be removed</li>
                  )}
                </ul>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteTable}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Table
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

EnhancedTableNode.displayName = 'EnhancedTableNode';

export default EnhancedTableNode;
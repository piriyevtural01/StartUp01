import React, { useState, useEffect } from 'react';
import { Link2, Trash2, Plus, Edit, Eye, ArrowRight, Database, Key } from 'lucide-react';
import { useDatabase } from '../../../context/DatabaseContext';

const RelationshipVisualizer: React.FC = () => {
  const { 
    currentSchema, 
    addRelationship, 
    removeRelationship, 
    updateRelationship 
  } = useDatabase();
  
  const [selectedRelationship, setSelectedRelationship] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [relationshipForm, setRelationshipForm] = useState({
    sourceTableId: '',
    sourceColumnId: '',
    targetTableId: '',
    targetColumnId: '',
    cardinality: '1:N' as '1:1' | '1:N' | 'N:M',
    constraintName: ''
  });

  // Auto-generate constraint name when tables/columns change
  useEffect(() => {
    if (relationshipForm.sourceTableId && relationshipForm.sourceColumnId && 
        relationshipForm.targetTableId && relationshipForm.targetColumnId) {
      const sourceTable = currentSchema.tables.find(t => t.id === relationshipForm.sourceTableId);
      const targetTable = currentSchema.tables.find(t => t.id === relationshipForm.targetTableId);
      const sourceColumn = sourceTable?.columns.find(c => c.id === relationshipForm.sourceColumnId);
      const targetColumn = targetTable?.columns.find(c => c.id === relationshipForm.targetColumnId);
      
      if (sourceTable && targetTable && sourceColumn && targetColumn) {
        const constraintName = `FK_${sourceTable.name}_${sourceColumn.name}_${targetTable.name}_${targetColumn.name}`;
        setRelationshipForm(prev => ({ ...prev, constraintName }));
      }
    }
  }, [
    relationshipForm.sourceTableId, 
    relationshipForm.sourceColumnId,
    relationshipForm.targetTableId, 
    relationshipForm.targetColumnId,
    currentSchema.tables
  ]);

  const createRelationship = () => {
    if (!relationshipForm.sourceTableId || !relationshipForm.sourceColumnId || 
        !relationshipForm.targetTableId || !relationshipForm.targetColumnId) {
      return;
    }

    // Check if relationship already exists
    const existingRelationship = currentSchema.relationships.find(rel =>
      rel.sourceTableId === relationshipForm.sourceTableId &&
      rel.sourceColumnId === relationshipForm.sourceColumnId &&
      rel.targetTableId === relationshipForm.targetTableId &&
      rel.targetColumnId === relationshipForm.targetColumnId
    );

    if (existingRelationship) {
      alert('This relationship already exists');
      return;
    }

    addRelationship({
      sourceTableId: relationshipForm.sourceTableId,
      sourceColumnId: relationshipForm.sourceColumnId,
      targetTableId: relationshipForm.targetTableId,
      targetColumnId: relationshipForm.targetColumnId,
      cardinality: relationshipForm.cardinality,
      constraintName: relationshipForm.constraintName
    });

    // Reset form
    setRelationshipForm({
      sourceTableId: '',
      sourceColumnId: '',
      targetTableId: '',
      targetColumnId: '',
      cardinality: '1:N',
      constraintName: ''
    });
    setShowCreateModal(false);
  };

  const getTableName = (tableId: string) => {
    return currentSchema.tables.find(t => t.id === tableId)?.name || 'Unknown';
  };

  const getColumnName = (tableId: string, columnId: string) => {
    const table = currentSchema.tables.find(t => t.id === tableId);
    return table?.columns.find(c => c.id === columnId)?.name || 'Unknown';
  };

  const getAvailableColumns = (tableId: string) => {
    const table = currentSchema.tables.find(t => t.id === tableId);
    return table?.columns || [];
  };

  const getCardinalityIcon = (cardinality: string) => {
    switch (cardinality) {
      case '1:1':
        return '1:1';
      case '1:N':
        return '1:∞';
      case 'N:M':
        return '∞:∞';
      default:
        return '1:∞';
    }
  };

  const getCardinalityColor = (cardinality: string) => {
    switch (cardinality) {
      case '1:1':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
      case '1:N':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700';
      case 'N:M':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Relationship Visualizer
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage table relationships and foreign key constraints
            </p>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={currentSchema.tables.length < 2}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            Create Relationship
          </button>
        </div>

        {currentSchema.tables.length < 2 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <Database className="w-4 h-4" />
              <span className="font-medium">Need More Tables</span>
            </div>
            <p className="text-yellow-700 dark:text-yellow-300 text-sm mt-1">
              You need at least 2 tables to create relationships. Create more tables first.
            </p>
          </div>
        )}
      </div>

      {/* Relationships List */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">
            Active Relationships ({currentSchema.relationships.length})
          </h4>
          
          {currentSchema.relationships.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Link2 className="w-4 h-4" />
              <span>Click to view details</span>
            </div>
          )}
        </div>

        {currentSchema.relationships.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Link2 className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Relationships Yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
              Create relationships between tables to establish foreign key constraints and data integrity.
            </p>
            {currentSchema.tables.length >= 2 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
              >
                <Plus className="w-4 h-4" />
                Create Your First Relationship
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {currentSchema.relationships.map(relationship => {
              const sourceTable = currentSchema.tables.find(t => t.id === relationship.sourceTableId);
              const targetTable = currentSchema.tables.find(t => t.id === relationship.targetTableId);
              const sourceColumn = sourceTable?.columns.find(c => c.id === relationship.sourceColumnId);
              const targetColumn = targetTable?.columns.find(c => c.id === relationship.targetColumnId);
              const isSelected = selectedRelationship === relationship.id;

              return (
                <div
                  key={relationship.id}
                  className={`bg-white dark:bg-gray-800 border rounded-lg p-4 transition-all duration-200 cursor-pointer ${
                    isSelected 
                      ? 'border-blue-500 shadow-lg ring-2 ring-blue-200 dark:ring-blue-800' 
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                  }`}
                  onClick={() => setSelectedRelationship(isSelected ? '' : relationship.id)}
                >
                  {/* Relationship Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        <Link2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white">
                          {relationship.name}
                        </h5>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getCardinalityColor(relationship.cardinality)}`}>
                            {getCardinalityIcon(relationship.cardinality)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Created {relationship.createdAt.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRelationship(relationship.id);
                        }}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete the relationship "${relationship.name}"?`)) {
                            removeRelationship(relationship.id);
                          }
                        }}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                        title="Delete relationship"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Relationship Visualization */}
                  <div className="flex items-center gap-4">
                    {/* Source Table */}
                    <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {sourceTable?.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {sourceColumn?.isPrimaryKey && (
                          <Key className="w-3 h-3 text-yellow-500" />
                        )}
                        <span className="font-mono text-sm bg-white dark:bg-gray-800 px-2 py-1 rounded border">
                          {sourceColumn?.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {sourceColumn?.type}
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex flex-col items-center gap-1">
                      <ArrowRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {relationship.cardinality}
                      </span>
                    </div>

                    {/* Target Table */}
                    <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Database className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {targetTable?.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {targetColumn?.isPrimaryKey && (
                          <Key className="w-3 h-3 text-yellow-500" />
                        )}
                        <span className="font-mono text-sm bg-white dark:bg-gray-800 px-2 py-1 rounded border">
                          {targetColumn?.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {targetColumn?.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h6 className="font-medium text-gray-900 dark:text-white mb-2">Constraint Details</h6>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Constraint Name:</span>
                              <span className="font-mono">{relationship.constraintName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Cardinality:</span>
                              <span>{relationship.cardinality}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Created:</span>
                              <span>{relationship.createdAt.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h6 className="font-medium text-gray-900 dark:text-white mb-2">SQL Definition</h6>
                          <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 text-xs font-mono">
                            ALTER TABLE {sourceTable?.name}<br/>
                            ADD CONSTRAINT {relationship.constraintName}<br/>
                            FOREIGN KEY ({sourceColumn?.name})<br/>
                            REFERENCES {targetTable?.name}({targetColumn?.name});
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Relationship Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create New Relationship
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <span className="sr-only">Close</span>
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Source Table & Column */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Source Table (Child)
                  </label>
                  <select
                    value={relationshipForm.sourceTableId}
                    onChange={(e) => {
                      setRelationshipForm(prev => ({ 
                        ...prev, 
                        sourceTableId: e.target.value,
                        sourceColumnId: '' 
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select source table</option>
                    {currentSchema.tables.map(table => (
                      <option key={table.id} value={table.id}>
                        {table.name} ({table.columns.length} columns)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Source Column (Foreign Key)
                  </label>
                  <select
                    value={relationshipForm.sourceColumnId}
                    onChange={(e) => setRelationshipForm(prev => ({ ...prev, sourceColumnId: e.target.value }))}
                    disabled={!relationshipForm.sourceTableId}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="">Select source column</option>
                    {getAvailableColumns(relationshipForm.sourceTableId).map(column => (
                      <option key={column.id} value={column.id}>
                        {column.name} ({column.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Table & Column */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Target Table (Parent)
                  </label>
                  <select
                    value={relationshipForm.targetTableId}
                    onChange={(e) => {
                      setRelationshipForm(prev => ({ 
                        ...prev, 
                        targetTableId: e.target.value,
                        targetColumnId: '' 
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select target table</option>
                    {currentSchema.tables
                      .filter(table => table.id !== relationshipForm.sourceTableId)
                      .map(table => (
                        <option key={table.id} value={table.id}>
                          {table.name} ({table.columns.length} columns)
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Target Column (Referenced)
                  </label>
                  <select
                    value={relationshipForm.targetColumnId}
                    onChange={(e) => setRelationshipForm(prev => ({ ...prev, targetColumnId: e.target.value }))}
                    disabled={!relationshipForm.targetTableId}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  >
                    <option value="">Select target column</option>
                    {getAvailableColumns(relationshipForm.targetTableId).map(column => (
                      <option key={column.id} value={column.id}>
                        {column.name} ({column.type})
                        {column.isPrimaryKey && ' - PK'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cardinality */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Relationship Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: '1:1', label: 'One to One', desc: 'Each record in source relates to exactly one in target' },
                    { value: '1:N', label: 'One to Many', desc: 'Each record in target can relate to many in source' },
                    { value: 'N:M', label: 'Many to Many', desc: 'Records can relate to multiple records in both tables' }
                  ].map(option => (
                    <label key={option.value} className="relative">
                      <input
                        type="radio"
                        name="cardinality"
                        value={option.value}
                        checked={relationshipForm.cardinality === option.value}
                        onChange={(e) => setRelationshipForm(prev => ({ ...prev, cardinality: e.target.value as any }))}
                        className="sr-only"
                      />
                      <div className={`p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        relationshipForm.cardinality === option.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {option.desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Constraint Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Constraint Name
                </label>
                <input
                  type="text"
                  value={relationshipForm.constraintName}
                  onChange={(e) => setRelationshipForm(prev => ({ ...prev, constraintName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="FK_table_column_reftable_refcolumn"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Auto-generated based on table and column names
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={createRelationship}
                disabled={!relationshipForm.sourceTableId || !relationshipForm.sourceColumnId || 
                         !relationshipForm.targetTableId || !relationshipForm.targetColumnId}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200"
              >
                <Link2 className="w-4 h-4" />
                Create Relationship
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RelationshipVisualizer;
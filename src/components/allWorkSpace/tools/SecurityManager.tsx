import React, { useState } from 'react';
import { Shield, User, Plus, Trash2, Key, Lock } from 'lucide-react';
import { useDatabase } from '../../../context/DatabaseContext';
import { useSubscription } from '../../../context/SubscriptionContext'; // Added subscription context
import FeatureGate from '../../subscription/FeatureGate'; // Added feature gate

const SecurityManager: React.FC = () => {
  const { currentSchema, addUser, removeUser, grantPermission, revokePermission, addIndex, addConstraint } = useDatabase();
  const { canUseFeature } = useSubscription(); // Added subscription hook
  
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'indexes' | 'constraints'>('users');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showIndexModal, setShowIndexModal] = useState(false);
  const [showConstraintModal, setShowConstraintModal] = useState(false);
  
  const [userForm, setUserForm] = useState({ name: '', role: 'user' });
  const [permissionForm, setPermissionForm] = useState({
    userId: '',
    tableId: '',
    permissions: [] as string[]
  });
  const [indexForm, setIndexForm] = useState({
    name: '',
    tableId: '',
    columns: [] as string[],
    isUnique: false
  });
  const [constraintForm, setConstraintForm] = useState({
    name: '',
    type: 'CHECK' as 'CHECK' | 'UNIQUE' | 'NOT_NULL',
    tableId: '',
    columnId: '',
    expression: ''
  });

  const permissionTypes = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
  const userRoles = ['admin', 'user', 'readonly'];
  const constraintTypes = ['CHECK', 'UNIQUE', 'NOT_NULL'];

  const handleCreateUser = () => {
    if (!userForm.name.trim()) return;
    
    addUser({
      name: userForm.name,
      role: userForm.role
    });
    
    setShowUserModal(false);
    setUserForm({ name: '', role: 'user' });
  };

  const handleGrantPermission = () => {
    if (!permissionForm.userId || !permissionForm.tableId || permissionForm.permissions.length === 0) return;
    
    grantPermission({
      userId: permissionForm.userId,
      tableId: permissionForm.tableId,
      permissions: permissionForm.permissions as ('SELECT' | 'INSERT' | 'UPDATE' | 'DELETE')[]
    });
    
    setShowPermissionModal(false);
    setPermissionForm({ userId: '', tableId: '', permissions: [] });
  };

  const handleCreateIndex = () => {
    if (!indexForm.name.trim() || !indexForm.tableId || indexForm.columns.length === 0) return;
    
    addIndex({
      name: indexForm.name,
      tableId: indexForm.tableId,
      columns: indexForm.columns,
      isUnique: indexForm.isUnique
    });
    
    setShowIndexModal(false);
    setIndexForm({ name: '', tableId: '', columns: [], isUnique: false });
  };

  const handleCreateConstraint = () => {
    if (!constraintForm.name.trim() || !constraintForm.tableId) return;
    
    addConstraint({
      name: constraintForm.name,
      type: constraintForm.type,
      tableId: constraintForm.tableId,
      columnId: constraintForm.columnId || undefined,
      expression: constraintForm.expression || undefined
    });
    
    setShowConstraintModal(false);
    setConstraintForm({ name: '', type: 'CHECK', tableId: '', columnId: '', expression: '' });
  };

  const togglePermission = (permission: string) => {
    setPermissionForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const toggleIndexColumn = (columnName: string) => {
    setIndexForm(prev => ({
      ...prev,
      columns: prev.columns.includes(columnName)
        ? prev.columns.filter(c => c !== columnName)
        : [...prev.columns, columnName]
    }));
  };

  const getTableName = (tableId: string) => {
    return currentSchema.tables.find(t => t.id === tableId)?.name || 'Unknown';
  };

  const getUserName = (userId: string) => {
    return currentSchema.users.find(u => u.id === userId)?.name || 'Unknown';
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Security & Constraints
        </h3>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'users', name: 'Users', icon: User, requiresPro: false },
              { id: 'permissions', name: 'Permissions', icon: Shield, requiresPro: false },
              { id: 'indexes', name: 'Indexes', icon: Key, requiresPro: true }, // Added Pro requirement
              { id: 'constraints', name: 'Constraints', icon: Lock, requiresPro: true } // Added Pro requirement
            ].map(tab => {
              const Icon = tab.icon;
              const isDisabled = tab.requiresPro && !canUseFeature('canUseIndexes');
              
              return (
                <button
                  key={tab.id}
                  onClick={() => !isDisabled && setActiveTab(tab.id as any)}
                  disabled={isDisabled}
                  className={`
                    flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200
                    ${activeTab === tab.id && !isDisabled
                      ? 'border-sky-500 text-sky-600 dark:text-sky-400'
                      : isDisabled
                      ? 'border-transparent text-gray-400 cursor-not-allowed'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                  {/* Added Pro badge for premium features */}
                  {tab.requiresPro && !canUseFeature('canUseIndexes') && (
                    <span className="text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-1 rounded">
                      Pro
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900 dark:text-white">
                Database Users ({currentSchema.users.length})
              </h4>
              <button
                onClick={() => setShowUserModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors duration-200 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add User
              </button>
            </div>

            <div className="space-y-3">
              {currentSchema.users.map(user => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-100 dark:bg-sky-900 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white">{user.name}</h5>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeUser(user.id)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {currentSchema.users.length === 0 && (
                <div className="text-center py-8">
                  <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No users created yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900 dark:text-white">
                Table Permissions ({currentSchema.permissions.length})
              </h4>
              <button
                onClick={() => setShowPermissionModal(true)}
                disabled={currentSchema.users.length === 0 || currentSchema.tables.length === 0}
                className="flex items-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 text-sm"
              >
                <Shield className="w-4 h-4" />
                Grant Permission
              </button>
            </div>

            <div className="space-y-3">
              {currentSchema.permissions.map(permission => (
                <div key={permission.id} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white">
                          {getUserName(permission.userId)} → {getTableName(permission.tableId)}
                        </h5>
                      </div>
                    </div>
                    <button
                      onClick={() => revokePermission(permission.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {permission.permissions.map(perm => (
                      <span key={perm} className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 text-xs rounded">
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              
              {currentSchema.permissions.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No permissions granted yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Indexes Tab - Wrapped with FeatureGate */}
        {activeTab === 'indexes' && (
          <FeatureGate feature="Indexes" requiredPlan="pro">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900 dark:text-white">
                  Database Indexes ({currentSchema.indexes.length})
                </h4>
                <button
                  onClick={() => setShowIndexModal(true)}
                  disabled={currentSchema.tables.length === 0}
                  className="flex items-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 text-sm"
                >
                  <Key className="w-4 h-4" />
                  Add Index
                </button>
              </div>

              <div className="space-y-3">
                {currentSchema.indexes.map(index => (
                  <div key={index.id} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white">{index.name}</h5>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {getTableName(index.tableId)} • {index.isUnique ? 'Unique' : 'Non-unique'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {/* removeIndex(index.id) */}}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {index.columns.map(column => (
                        <span key={column} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-xs rounded font-mono">
                          {column}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                
                {currentSchema.indexes.length === 0 && (
                  <div className="text-center py-8">
                    <Key className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No indexes created yet</p>
                  </div>
                )}
              </div>
            </div>
          </FeatureGate>
        )}

        {/* Constraints Tab - Wrapped with FeatureGate */}
        {activeTab === 'constraints' && (
          <FeatureGate feature="Constraints" requiredPlan="pro">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900 dark:text-white">
                  Table Constraints ({currentSchema.constraints.length})
                </h4>
                <button
                  onClick={() => setShowConstraintModal(true)}
                  disabled={currentSchema.tables.length === 0}
                  className="flex items-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 text-sm"
                >
                  <Lock className="w-4 h-4" />
                  Add Constraint
                </button>
              </div>

              <div className="space-y-3">
                {currentSchema.constraints.map(constraint => (
                  <div key={constraint.id} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white">{constraint.name}</h5>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {getTableName(constraint.tableId)} • {constraint.type}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {/* removeConstraint(constraint.id) */}}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {constraint.expression && (
                      <div className="mt-2">
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200 text-xs rounded font-mono">
                          {constraint.expression}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                
                {currentSchema.constraints.length === 0 && (
                  <div className="text-center py-8">
                    <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No constraints created yet</p>
                  </div>
                )}
              </div>
            </div>
          </FeatureGate>
        )}
      </div>

      {/* Modals - keeping existing modal code but adding feature checks where needed */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add User</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username</label>
                <input
                  type="text"
                  value={userForm.name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  {userRoles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors duration-200"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {showPermissionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Grant Permission</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">User</label>
                <select
                  value={permissionForm.userId}
                  onChange={(e) => setPermissionForm(prev => ({ ...prev, userId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">Select user</option>
                  {currentSchema.users.map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Table</label>
                <select
                  value={permissionForm.tableId}
                  onChange={(e) => setPermissionForm(prev => ({ ...prev, tableId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">Select table</option>
                  {currentSchema.tables.map(table => (
                    <option key={table.id} value={table.id}>{table.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permissions</label>
                <div className="space-y-2">
                  {permissionTypes.map(permission => (
                    <label key={permission} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={permissionForm.permissions.includes(permission)}
                        onChange={() => togglePermission(permission)}
                        className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                      />
                      <span className="text-gray-700 dark:text-gray-300">{permission}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowPermissionModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleGrantPermission}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors duration-200"
              >
                Grant Permission
              </button>
            </div>
          </div>
        </div>
      )}

      {showIndexModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Index</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Index Name</label>
                <input
                  type="text"
                  value={indexForm.name}
                  onChange={(e) => setIndexForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Table</label>
                <select
                  value={indexForm.tableId}
                  onChange={(e) => setIndexForm(prev => ({ ...prev, tableId: e.target.value, columns: [] }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">Select table</option>
                  {currentSchema.tables.map(table => (
                    <option key={table.id} value={table.id}>{table.name}</option>
                  ))}
                </select>
              </div>
              
              {indexForm.tableId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Columns</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {currentSchema.tables.find(t => t.id === indexForm.tableId)?.columns.map(column => (
                      <label key={column.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={indexForm.columns.includes(column.name)}
                          onChange={() => toggleIndexColumn(column.name)}
                          className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                        />
                        <span className="text-gray-700 dark:text-gray-300">{column.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={indexForm.isUnique}
                    onChange={(e) => setIndexForm(prev => ({ ...prev, isUnique: e.target.checked }))}
                    className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Unique Index</span>
                </label>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowIndexModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateIndex}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors duration-200"
              >
                Add Index
              </button>
            </div>
          </div>
        </div>
      )}

      {showConstraintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3  className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Constraint</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Constraint Name</label>
                <input
                  type="text"
                  value={constraintForm.name}
                  onChange={(e) => setConstraintForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                <select
                  value={constraintForm.type}
                  onChange={(e) => setConstraintForm(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  {constraintTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Table</label>
                <select
                  value={constraintForm.tableId}
                  onChange={(e) => setConstraintForm(prev => ({ ...prev, tableId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                >
                  <option value="">Select table</option>
                  {currentSchema.tables.map(table => (
                    <option key={table.id} value={table.id}>{table.name}</option>
                  ))}
                </select>
              </div>
              
              {constraintForm.type === 'CHECK' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expression</label>
                  <input
                    type="text"
                    value={constraintForm.expression}
                    onChange={(e) => setConstraintForm(prev => ({ ...prev, expression: e.target.value }))}
                    placeholder="e.g., age >= 18"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              )}
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConstraintModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateConstraint}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors duration-200"
              >
                Add Constraint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityManager;
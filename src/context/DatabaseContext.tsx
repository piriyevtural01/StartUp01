import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
// @ts-ignore: module has no type declarations
import initSqlJs from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import {mongoService} from '../services/mongoService'

export interface Column {
  id: string;
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  referencedTable?: string;
  referencedColumn?: string;
  isUnique?: boolean;
  isIndexed?: boolean;
}

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  position: { x: number; y: number };
  rowCount: number;
  data: Record<string, any>[];
}

export interface Relationship {
  id: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  cardinality: '1:1' | '1:N' | 'N:M';
}

export interface Index {
  id: string;
  name: string;
  tableId: string;
  columns: string[];
  isUnique: boolean;
}

export interface Constraint {
  id: string;
  name: string;
  type: 'CHECK' | 'UNIQUE' | 'NOT_NULL';
  tableId: string;
  columnId?: string;
  expression?: string;
}

export interface User {
  id: string;
  name: string;
  role: string;
}

export interface Permission {
  id: string;
  userId: string;
  tableId: string;
  permissions: ('SELECT' | 'INSERT' | 'UPDATE' | 'DELETE')[];
}

export interface SavedQuery {
  id: string;
  name: string;
  description: string;
  tables: string[];
  joins: any[];
  filters: any[];
  columns: string[];
  aggregates: any[];
  createdAt: Date;
}

// Enhanced workspace sharing interfaces for team collaboration
export interface WorkspaceMember {
  id: string;
  username: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  inviterUsername: string;
  inviteeUsername: string;
  role: 'editor' | 'viewer';
  joinCode: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired';
}

export interface Schema {
  id: string;
  name: string;
  tables: Table[];
  relationships: Relationship[];
  indexes: Index[];
  constraints: Constraint[];
  users: User[];
  permissions: Permission[];
  savedQueries: SavedQuery[];
  // Enhanced team collaboration fields
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  isShared: boolean;
  ownerId: string;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseContextType {
  currentSchema: Schema;
  schemas: Schema[];
  sqlEngine: any;
  isRealTimeEnabled: boolean;
  lastSyncTime: Date | null;
  importSchema: (schema: Schema) => void;
  // Table operations
  addTable: (table: Omit<Table, 'id' | 'rowCount' | 'data'>) => void;
  removeTable: (tableId: string) => void;
  updateTable: (tableId: string, updates: Partial<Table>) => void;
  alterTable: (tableId: string, operation: 'ADD_COLUMN' | 'DROP_COLUMN' | 'MODIFY_COLUMN', data: any) => void;
  duplicateTable: (tableId: string) => void;
  
  // Data operations
  insertRow: (tableId: string, data: Record<string, any>) => void;
  updateRow: (tableId: string, rowIndex: number, data: Record<string, any>) => void;
  deleteRow: (tableId: string, rowIndex: number) => void;
  truncateTable: (tableId: string) => void;
  
  // Relationship operations
  addRelationship: (relationship: Omit<Relationship, 'id'>) => void;
  removeRelationship: (relationshipId: string) => void;
  
  // Index and constraint operations
  addIndex: (index: Omit<Index, 'id'>) => void;
  removeIndex: (indexId: string) => void;
  addConstraint: (constraint: Omit<Constraint, 'id'>) => void;
  removeConstraint: (constraintId: string) => void;
  
  // Security operations
  addUser: (user: Omit<User, 'id'>) => void;
  removeUser: (userId: string) => void;
  grantPermission: (permission: Omit<Permission, 'id'>) => void;
  revokePermission: (permissionId: string) => void;
  
  // Enhanced team collaboration operations with MongoDB integration
//  inviteToWorkspace: (invitation: Omit<WorkspaceInvitation, 'id' | 'workspaceId' | 'createdAt' | 'expiresAt' | 'status'>) => Promise<string>;
  acceptWorkspaceInvitation: (joinCode: string) => Promise<boolean>;
  removeWorkspaceMember: (memberId: string) => void;
  validateUsername: (username: string) => Promise<boolean>;
  syncWorkspaceWithMongoDB: () => Promise<void>;
  
  // Query operations
  executeVisualQuery: (query: any) => Promise<any>;
  executeSQL: (sql: string) => Promise<any>;
  saveQuery: (query: Omit<SavedQuery, 'id' | 'createdAt'>) => void;
  removeQuery: (queryId: string) => void;
  
  // Export operations
  exportSchema: (format: string) => string;
  
  // Schema management
  createNewSchema: (name: string) => void;
  loadSchema: (schemaId: string) => void;
  saveSchema: () => void;
  importFromSQL: (sqlCode: string) => Promise<boolean>;
  
  // SQL preview
  generateSQL: () => string;
  
  // Real-time collaboration state
 
  inviteToWorkspace: (invitation: Omit<WorkspaceInvitation, 'id'|'workspaceId'|'createdAt'|'expiresAt'|'status'|'joinCode'>) => Promise<string>;

}  

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  // Get current user from localStorage - moved to top
  const getCurrentUser = useCallback(() => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }, []);

  const [sqlEngine, setSqlEngine] = useState<any>(null);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  const [currentSchema, setCurrentSchema] = useState<Schema>({
    id: uuidv4(),
    name: 'Untitled Schema',
    tables: [],
    relationships: [],
    indexes: [],
    constraints: [],
    users: [],
    permissions: [],
    savedQueries: [],
    // Enhanced team collaboration fields with default owner
    members: [
      {
        id: uuidv4(),
        username: getCurrentUser()?.username || 'current_user',
        role: 'owner',
        joinedAt: new Date()
      }
    ],
    invitations: [],
    isShared: false,
    ownerId: getCurrentUser()?.id || 'current_user',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const [schemas, setSchemas] = useState<Schema[]>([]);


  // Load workspace from localStorage on mount
  useEffect(() => {
    const savedWorkspace = localStorage.getItem('currentWorkspace');
    if (savedWorkspace) {
      try {
        const workspace = JSON.parse(savedWorkspace);
        setCurrentSchema(workspace);
        setIsRealTimeEnabled(workspace.isShared);
        console.log('Loaded workspace from localStorage:', workspace.name);
      } catch (error) {
        console.error('Failed to load workspace from localStorage:', error);
      }
    }
  }, []);

  // Save workspace to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('currentWorkspace', JSON.stringify(currentSchema));
    console.log('Saved workspace to localStorage:', currentSchema.name);
  }, [currentSchema]);

  // Real-time sync for shared workspaces
  useEffect(() => {
    if (!isRealTimeEnabled || !currentSchema.isShared) return;

    const syncInterval = setInterval(async () => {
      try {
        // Fetch latest workspace data from MongoDB
        const response = await fetch(`/api/workspaces/${currentSchema.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const latestWorkspace = await response.json();
          
          // Only update if the workspace has been modified by others
          if (new Date(latestWorkspace.updatedAt) > new Date(currentSchema.updatedAt)) {
            console.log('Syncing workspace changes from other users...');
            setCurrentSchema(prev => ({
              ...latestWorkspace,
              // Preserve local state that shouldn't be overwritten
              id: prev.id,
              name: prev.name
            }));
            setLastSyncTime(new Date());
          }
        }
      } catch (error) {
        console.error('Real-time sync failed:', error);
      }
    }, 3000); // Sync every 3 seconds

    return () => clearInterval(syncInterval);
  }, [isRealTimeEnabled, currentSchema.isShared, currentSchema.id, currentSchema.updatedAt]);
 
  // Initialize SQL.js
  useEffect(() => {
    const initSQL = async () => {
      try {
        const SQL = await initSqlJs({
          locateFile: (file: string) => `https://sql.js.org/dist/${file}`
        });
        const db = new SQL.Database();
        setSqlEngine(db);
      } catch (error) {
        console.error('Failed to initialize SQL.js:', error);
      }
    };
    
    initSQL();
  }, []);
  const importSchema = useCallback((schema: Schema) => {
    setCurrentSchema(schema);
  }, []);
  // Enhanced team collaboration functions with MongoDB integration
  const validateUsername = useCallback(async (username: string): Promise<boolean> => {
    return await mongoService.validateUsername(username);
  }, []);

  const inviteToWorkspace = useCallback(async (
    invitation: Omit<WorkspaceInvitation, 'id' | 'workspaceId' | 'createdAt' | 'expiresAt' | 'status'| 'joinCode'>
  ): Promise<string> => {
    console.log('inviteToWorkspace called with:', invitation);
    
    // Generate secure join code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let joinCode = '';
    for (let i = 0; i < 8; i++) {
      joinCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    console.log('Generated join code:', joinCode);

    const newInvitation: WorkspaceInvitation = {
      ...invitation,
      id: uuidv4(),
      workspaceId: currentSchema.id,
      joinCode,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      status: 'pending'
    };
    
    console.log('Created invitation object:', newInvitation);

    // Update local state
    setCurrentSchema(prev => ({
      ...prev,
      invitations: [...prev.invitations, newInvitation],
      isShared: true, // Mark workspace as shared
      updatedAt: new Date()
    }));

    // Enable real-time sync
    setIsRealTimeEnabled(true);
    console.log('Updated local schema with invitation');
    
    // Save to MongoDB - CRITICAL for join code validation
    try {
      const saved = await mongoService.saveInvitation(newInvitation);
      if (!saved) {
        console.error('Failed to save invitation to MongoDB');
        // Rollback local state
        setCurrentSchema(prev => ({
          ...prev,
          invitations: prev.invitations.filter(inv => inv.id !== newInvitation.id),
          updatedAt: new Date()
        }));
        throw new Error('Failed to save invitation');
      }
      console.log('Successfully saved invitation to MongoDB');
      
      // Sync workspace to MongoDB
      await syncWorkspaceWithMongoDB();
    } catch (error) {
      console.error('Failed to save invitation to MongoDB:', error);
      throw error;
    }
    
    console.log('Returning join code:', joinCode);

    return joinCode;
  }, [currentSchema.id]);

  const acceptWorkspaceInvitation = useCallback(async (joinCode: string): Promise<boolean> => {
    console.log('Attempting to accept invitation with code:', joinCode);
    
    try {
      // Validate the join code with MongoDB
      const validation = await mongoService.validateJoinCode(joinCode);
      
      if (!validation.valid || !validation.invitation) {
        console.error('Join code validation failed:', validation.error);
        return false;
      }
      
      const invitation = validation.invitation;
      console.log('Valid invitation found:', invitation);
      
      // Load the workspace from MongoDB
      try {
        const response = await fetch(`/api/workspaces/${invitation.workspaceId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const workspaceData = await response.json();
          console.log('Loaded workspace data:', workspaceData);
          
          // Import the shared workspace
          setCurrentSchema(workspaceData);
          setIsRealTimeEnabled(true);
        }
      } catch (error) {
        console.error('Failed to load workspace:', error);
      }
      
      // Check if user is already a member
      const existingMember = currentSchema.members.find(
        member => member.username.toLowerCase() === invitation.inviteeUsername.toLowerCase()
      );
      
      if (existingMember) {
        console.error('User is already a member');
        return false;
      }
      
      // Update invitation status to accepted in MongoDB
      const statusUpdated = await mongoService.updateInvitationStatus(invitation.id, 'accepted');
      if (!statusUpdated) {
        console.error('Failed to update invitation status in MongoDB');
        return false;
      }
      
      // Update local state - mark invitation as accepted
      setCurrentSchema(prev => ({
        ...prev,
        invitations: prev.invitations.map(inv =>
          inv.joinCode === joinCode.toUpperCase() 
            ? { ...inv, status: 'accepted' as const }
            : inv
        ),
        isShared: true,
        updatedAt: new Date()
      }));
      
      // Add new member to local state
      const newMember: WorkspaceMember = {
        id: uuidv4(),
        username: invitation.inviteeUsername,
        role: invitation.role,
        joinedAt: new Date()
      };
      
      setCurrentSchema(prev => ({
        ...prev,
        members: [...prev.members, newMember],
        isShared: true,
        updatedAt: new Date()
      }));
      
      // Save new member to MongoDB
      const memberSaved = await mongoService.saveWorkspaceMember(newMember, currentSchema.id);
      if (!memberSaved) {
        console.warn('Failed to save member to MongoDB, but continuing...');
      }
      
      // Sync workspace to MongoDB
      await syncWorkspaceWithMongoDB();
      
      // Enable real-time sync
      setIsRealTimeEnabled(true);
      
      console.log('Local state updated successfully');
      return true;
      
    } catch (error) {
      console.error('Error accepting workspace invitation:', error);
      return false;
    }
  }, [currentSchema.members]);

  // Original implementation as fallback

  const removeWorkspaceMember = useCallback((memberId: string) => {
    setCurrentSchema(prev => ({
      ...prev,
      members: prev.members.filter(member => member.id !== memberId),
      updatedAt: new Date()
    }));
  }, []);

  // Enhanced workspace sync with MongoDB
  const syncWorkspaceWithMongoDB = useCallback(async () => {
    try {
      console.log('Syncing workspace with MongoDB...');
      // Update workspace data in MongoDB
      await mongoService.updateWorkspace(currentSchema.id, {
        ...currentSchema,
        lastSyncedAt: new Date()
      });
      
      setCurrentSchema(prev => ({
        ...prev,
        lastSyncedAt: new Date()
      }));
      
      setLastSyncTime(new Date());
      console.log('Workspace synced successfully');
    } catch (error) {
      console.error('Failed to sync workspace with MongoDB:', error);
    }
  }, [currentSchema]);

  // SQL Import functionality
  const importFromSQL = useCallback(async (sqlCode: string): Promise<boolean> => {
    try {
      console.log('Importing SQL code:', sqlCode);
      
      // Parse SQL code to extract tables and structure
      const parsedSchema = await parseSQLCode(sqlCode);
      
      if (parsedSchema.tables.length === 0) {
        throw new Error('No valid tables found in SQL code');
      }
      
      // Update current schema with parsed data
      setCurrentSchema(prev => ({
        ...prev,
        tables: parsedSchema.tables,
        relationships: parsedSchema.relationships,
        indexes: parsedSchema.indexes,
        updatedAt: new Date()
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to import SQL:', error);
      return false;
    }
  }, []);

  // SQL Parser function
  const parseSQLCode = async (sqlCode: string) => {
    const tables: Table[] = [];
    const relationships: Relationship[] = [];
    const indexes: Index[] = [];
    
    // Clean and normalize SQL
    const cleanSQL = sqlCode
      .replace(/--.*$/gm, '') // Remove comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Extract CREATE TABLE statements
    const createTableRegex = /CREATE\s+TABLE\s+(?:`?(\w+)`?|"?(\w+)"?|\[?(\w+)\]?)\s*\(([\s\S]*?)\);?/gi;
    let match;
    
    while ((match = createTableRegex.exec(cleanSQL)) !== null) {
      const tableName = match[1] || match[2] || match[3];
      const columnDefinitions = match[4];
      
      if (!tableName || !columnDefinitions) continue;
      
      const columns: Column[] = [];
      
      // Parse column definitions
      const columnLines = columnDefinitions.split(',').map(line => line.trim());
      
      columnLines.forEach(line => {
        // Skip constraint definitions
        if (line.toUpperCase().includes('PRIMARY KEY') || 
            line.toUpperCase().includes('FOREIGN KEY') || 
            line.toUpperCase().includes('CONSTRAINT')) {
          return;
        }
        
        // Parse column definition
        const columnMatch = line.match(/(?:`?(\w+)`?|"?(\w+)"?|\[?(\w+)\]?)\s+(\w+(?:\(\d+(?:,\d+)?\))?)/i);
        if (columnMatch) {
          const columnName = columnMatch[1] || columnMatch[2] || columnMatch[3];
          const dataType = columnMatch[4];
          
          const column: Column = {
            id: uuidv4(),
            name: columnName,
            type: dataType.toUpperCase(),
            nullable: !line.toUpperCase().includes('NOT NULL'),
            isPrimaryKey: line.toUpperCase().includes('PRIMARY KEY'),
            isUnique: line.toUpperCase().includes('UNIQUE'),
            isIndexed: false,
            isForeignKey: false
          };
          
          // Extract default value
          const defaultMatch = line.match(/DEFAULT\s+(?:'([^']*)'|(\w+))/i);
          if (defaultMatch) {
            column.defaultValue = defaultMatch[1] || defaultMatch[2];
          }
          
          columns.push(column);
        }
      });
      
      if (columns.length > 0) {
        const table: Table = {
          id: uuidv4(),
          name: tableName,
          columns,
          position: { 
            x: Math.random() * 400 + 100, 
            y: Math.random() * 300 + 100 
          },
          rowCount: 0,
          data: []
        };
        
        tables.push(table);
      }
    }
    
    // Extract INSERT statements and populate data
    const insertRegex = /INSERT\s+INTO\s+(?:`?(\w+)`?|"?(\w+)"?|\[?(\w+)\]?)\s*\((.*?)\)\s*VALUES\s*\((.*?)\);?/gi;
    
    while ((match = insertRegex.exec(cleanSQL)) !== null) {
      const tableName = match[1] || match[2] || match[3];
      const columnNames = match[4].split(',').map(col => col.trim().replace(/[`"[\]]/g, ''));
      const values = match[5].split(',').map(val => {
        val = val.trim();
        if (val === 'NULL') return null;
        if (val === 'TRUE' || val === '1') return true;
        if (val === 'FALSE' || val === '0') return false;
        if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
        if (!isNaN(Number(val))) return Number(val);
        return val;
      });
      
      const table = tables.find(t => t.name === tableName);
      if (table && columnNames.length === values.length) {
        const rowData: Record<string, any> = {};
        columnNames.forEach((colName, index) => {
          rowData[colName] = values[index];
        });
        table.data.push(rowData);
        table.rowCount = table.data.length;
      }
    }
    
    return { tables, relationships, indexes };
  };

  const addTable = useCallback((table: Omit<Table, 'id' | 'rowCount' | 'data'>) => {
    const newTable: Table = {
      ...table,
      id: uuidv4(),
      rowCount: 0,
      data: [],
    };
    
    setCurrentSchema(prev => ({
      ...prev,
      tables: [...prev.tables, newTable],
      updatedAt: new Date(),
    }));

    // Auto-sync for shared workspaces
    if (currentSchema.isShared) {
      setTimeout(() => syncWorkspaceWithMongoDB(), 1000);
    }
    // Create table in SQL engine
    if (sqlEngine) {
      const columnDefs = newTable.columns.map(col => {
        let def = `${col.name} ${col.type}`;
        if (!col.nullable) def += ' NOT NULL';
        if (col.defaultValue) def += ` DEFAULT '${col.defaultValue}'`;
        if (col.isPrimaryKey) def += ' PRIMARY KEY';
        return def;
      }).join(', ');
      
      const createSQL = `CREATE TABLE ${newTable.name} (${columnDefs})`;
      try {
        sqlEngine.run(createSQL);
      } catch (error) {
        console.error('Failed to create table in SQL engine:', error);
      }
    }
  }, [sqlEngine]);

  const removeTable = useCallback((tableId: string) => {
    const table = currentSchema.tables.find(t => t.id === tableId);
    if (!table) return;

    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.filter(table => table.id !== tableId),
      relationships: prev.relationships.filter(
        rel => rel.sourceTableId !== tableId && rel.targetTableId !== tableId
      ),
      indexes: prev.indexes.filter(idx => idx.tableId !== tableId),
      constraints: prev.constraints.filter(con => con.tableId !== tableId),
      permissions: prev.permissions.filter(perm => perm.tableId !== tableId),
      updatedAt: new Date(),
    }));

    // Auto-sync for shared workspaces
    if (currentSchema.isShared) {
      setTimeout(() => syncWorkspaceWithMongoDB(), 1000);
    }
    // Drop table in SQL engine
    if (sqlEngine) {
      try {
        sqlEngine.run(`DROP TABLE IF EXISTS ${table.name}`);
      } catch (error) {
        console.error('Failed to drop table in SQL engine:', error);
      }
    }
  }, [currentSchema.tables, sqlEngine]);

  const updateTable = useCallback((tableId: string, updates: Partial<Table>) => {
    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.map(table =>
        table.id === tableId ? { ...table, ...updates } : table
      ),
      updatedAt: new Date(),
    }));
    
    // Auto-sync for shared workspaces
    if (currentSchema.isShared) {
      setTimeout(() => syncWorkspaceWithMongoDB(), 1000);
    }
  }, []);

  const duplicateTable = useCallback((tableId: string) => {
    const originalTable = currentSchema.tables.find(t => t.id === tableId);
    if (!originalTable) return;

    const newTable: Table = {
      id: uuidv4(),
      name: `${originalTable.name}_copy`,
      columns: originalTable.columns.map(col => ({ ...col, id: uuidv4() })),
      position: { 
        x: originalTable.position.x + 50, 
        y: originalTable.position.y + 50 
      },
      rowCount: 0,
      data: []
    };

    setCurrentSchema(prev => ({
      ...prev,
      tables: [...prev.tables, newTable],
      updatedAt: new Date(),
    }));

    // Create table in SQL engine
    if (sqlEngine) {
      const columnDefs = newTable.columns.map(col => {
        let def = `${col.name} ${col.type}`;
        if (!col.nullable) def += ' NOT NULL';
        if (col.defaultValue) def += ` DEFAULT '${col.defaultValue}'`;
        if (col.isPrimaryKey) def += ' PRIMARY KEY';
        return def;
      }).join(', ');
      
      const createSQL = `CREATE TABLE ${newTable.name} (${columnDefs})`;
      try {
        sqlEngine.run(createSQL);
      } catch (error) {
        console.error('Failed to create duplicated table in SQL engine:', error);
      }
    }
  }, [currentSchema.tables, sqlEngine]);

  const alterTable = useCallback((tableId: string, operation: 'ADD_COLUMN' | 'DROP_COLUMN' | 'MODIFY_COLUMN', data: any) => {
    const table = currentSchema.tables.find(t => t.id === tableId);
    if (!table) return;

    let newColumns = [...table.columns];
    let alterSQL = '';

    switch (operation) {
      case 'ADD_COLUMN':
        const newColumn: Column = { ...data, id: uuidv4() };
        newColumns.push(newColumn);
        alterSQL = `ALTER TABLE ${table.name} ADD COLUMN ${newColumn.name} ${newColumn.type}`;
        if (!newColumn.nullable) alterSQL += ' NOT NULL';
        if (newColumn.defaultValue) alterSQL += ` DEFAULT '${newColumn.defaultValue}'`;
        break;
      
      case 'DROP_COLUMN':
        newColumns = newColumns.filter(col => col.id !== data.columnId);
        const columnToDrop = table.columns.find(col => col.id === data.columnId);
        if (columnToDrop) {
          alterSQL = `ALTER TABLE ${table.name} DROP COLUMN ${columnToDrop.name}`;
        }
        break;
      
      case 'MODIFY_COLUMN':
        newColumns = newColumns.map(col => 
          col.id === data.columnId ? { ...col, ...data.updates } : col
        );
        const modifiedColumn = newColumns.find(col => col.id === data.columnId);
        if (modifiedColumn) {
          alterSQL = `ALTER TABLE ${table.name} MODIFY COLUMN ${modifiedColumn.name} ${modifiedColumn.type}`;
        }
        break;
    }

    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId ? { ...t, columns: newColumns } : t
      ),
      updatedAt: new Date(),
    }));

    // Execute ALTER in SQL engine
    if (sqlEngine && alterSQL) {
      try {
        sqlEngine.run(alterSQL);
      } catch (error) {
        console.error('Failed to alter table in SQL engine:', error);
      }
    }
  }, [currentSchema.tables, sqlEngine]);

  const insertRow = useCallback((tableId: string, data: Record<string, any>) => {
    const table = currentSchema.tables.find(t => t.id === tableId);
    if (!table) return;

    const newData = [...table.data, data];
    
    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId 
          ? { ...t, data: newData, rowCount: newData.length }
          : t
      ),
      updatedAt: new Date(),
    }));

    // Insert into SQL engine
    if (sqlEngine) {
      const columns = Object.keys(data).join(', ');
      const values = Object.values(data).map(v => `'${v}'`).join(', ');
      const insertSQL = `INSERT INTO ${table.name} (${columns}) VALUES (${values})`;
      
      try {
        sqlEngine.run(insertSQL);
      } catch (error) {
        console.error('Failed to insert row in SQL engine:', error);
      }
    }
  }, [currentSchema.tables, sqlEngine]);

  const updateRow = useCallback((tableId: string, rowIndex: number, data: Record<string, any>) => {
    const table = currentSchema.tables.find(t => t.id === tableId);
    if (!table || rowIndex >= table.data.length) return;

    const newData = [...table.data];
    newData[rowIndex] = { ...newData[rowIndex], ...data };
    
    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId ? { ...t, data: newData } : t
      ),
      updatedAt: new Date(),
    }));
  }, [currentSchema.tables]);

  const deleteRow = useCallback((tableId: string, rowIndex: number) => {
    const table = currentSchema.tables.find(t => t.id === tableId);
    if (!table || rowIndex >= table.data.length) return;

    const newData = table.data.filter((_, index) => index !== rowIndex);
    
    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId 
          ? { ...t, data: newData, rowCount: newData.length }
          : t
      ),
      updatedAt: new Date(),
    }));
  }, [currentSchema.tables]);

  const truncateTable = useCallback((tableId: string) => {
    const table = currentSchema.tables.find(t => t.id === tableId);
    if (!table) return;

    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.map(t =>
        t.id === tableId ? { ...t, data: [], rowCount: 0 } : t
      ),
      updatedAt: new Date(),
    }));

    // Truncate in SQL engine
    if (sqlEngine) {
      try {
        sqlEngine.run(`DELETE FROM ${table.name}`);
      } catch (error) {
        console.error('Failed to truncate table in SQL engine:', error);
      }
    }
  }, [currentSchema.tables, sqlEngine]);

  const addRelationship = useCallback((relationship: Omit<Relationship, 'id'>) => {
    const newRelationship: Relationship = {
      ...relationship,
      id: uuidv4(),
    };
    
    setCurrentSchema(prev => ({
      ...prev,
      relationships: [...prev.relationships, newRelationship],
      updatedAt: new Date(),
    }));
  }, []);

  const removeRelationship = useCallback((relationshipId: string) => {
    setCurrentSchema(prev => ({
      ...prev,
      relationships: prev.relationships.filter(rel => rel.id !== relationshipId),
      updatedAt: new Date(),
    }));
  }, []);

  const addIndex = useCallback((index: Omit<Index, 'id'>) => {
    const newIndex: Index = {
      ...index,
      id: uuidv4(),
    };
    
    setCurrentSchema(prev => ({
      ...prev,
      indexes: [...prev.indexes, newIndex],
      updatedAt: new Date(),
    }));
  }, []);

  const removeIndex = useCallback((indexId: string) => {
    setCurrentSchema(prev => ({
      ...prev,
      indexes: prev.indexes.filter(idx => idx.id !== indexId),
      updatedAt: new Date(),
    }));
  }, []);

  const addConstraint = useCallback((constraint: Omit<Constraint, 'id'>) => {
    const newConstraint: Constraint = {
      ...constraint,
      id: uuidv4(),
    };
    
    setCurrentSchema(prev => ({
      ...prev,
      constraints: [...prev.constraints, newConstraint],
      updatedAt: new Date(),
    }));
  }, []);

  const removeConstraint = useCallback((constraintId: string) => {
    setCurrentSchema(prev => ({
      ...prev,
      constraints: prev.constraints.filter(con => con.id !== constraintId),
      updatedAt: new Date(),
    }));
  }, []);

  const addUser = useCallback((user: Omit<User, 'id'>) => {
    const newUser: User = {
      ...user,
      id: uuidv4(),
    };
    
    setCurrentSchema(prev => ({
      ...prev,
      users: [...prev.users, newUser],
      updatedAt: new Date(),
    }));
  }, []);

  const removeUser = useCallback((userId: string) => {
    setCurrentSchema(prev => ({
      ...prev,
      users: prev.users.filter(user => user.id !== userId),
      permissions: prev.permissions.filter(perm => perm.userId !== userId),
      updatedAt: new Date(),
    }));
  }, []);

  const grantPermission = useCallback((permission: Omit<Permission, 'id'>) => {
    const newPermission: Permission = {
      ...permission,
      id: uuidv4(),
    };
    
    setCurrentSchema(prev => ({
      ...prev,
      permissions: [...prev.permissions, newPermission],
      updatedAt: new Date(),
    }));
  }, []);

  const revokePermission = useCallback((permissionId: string) => {
    setCurrentSchema(prev => ({
      ...prev,
      permissions: prev.permissions.filter(perm => perm.id !== permissionId),
      updatedAt: new Date(),
    }));
  }, []);

  const executeVisualQuery = useCallback(async (query: any) => {
    if (!sqlEngine) return { columns: [], values: [] };

    try {
      // Build SQL from visual query
      let sql = 'SELECT ';
      sql += query.columns.length > 0 ? query.columns.join(', ') : '*';
      sql += ` FROM ${query.tables.join(', ')}`;
      
      if (query.joins && query.joins.length > 0) {
        query.joins.forEach((join: any) => {
          sql += ` ${join.type} JOIN ${join.table} ON ${join.condition}`;
        });
      }
      
      if (query.filters && query.filters.length > 0) {
        sql += ' WHERE ' + query.filters.map((f: any) => `${f.column} ${f.operator} '${f.value}'`).join(' AND ');
      }
      
      if (query.groupBy && query.groupBy.length > 0) {
        sql += ` GROUP BY ${query.groupBy.join(', ')}`;
      }
      
      if (query.orderBy && query.orderBy.length > 0) {
        sql += ` ORDER BY ${query.orderBy.map((o: any) => `${o.column} ${o.direction}`).join(', ')}`;
      }

      const result = sqlEngine.exec(sql);
      return result.length > 0 ? result[0] : { columns: [], values: [] };
    } catch (e) {
      const error = e as Error
      console.error('Query execution failed:', error);
      return { columns: [], values: [], error: error.message };
    }
  }, [sqlEngine]);

  const executeSQL = useCallback(async (sql: string) => {
    if (!sqlEngine) return { columns: [], values: [] };

    try {
      const result = sqlEngine.exec(sql);
      return result.length > 0 ? result[0] : { columns: [], values: [] };
    } catch (e) {
      const error = e as Error;
      console.error('SQL execution failed:', error);
      throw new Error(error.message);
    }
  }, [sqlEngine]);

  const saveQuery = useCallback((query: Omit<SavedQuery, 'id' | 'createdAt'>) => {
    const newQuery: SavedQuery = {
      ...query,
      id: uuidv4(),
      createdAt: new Date(),
    };
    
    setCurrentSchema(prev => ({
      ...prev,
      savedQueries: [...prev.savedQueries, newQuery],
      updatedAt: new Date(),
    }));
  }, []);

  const removeQuery = useCallback((queryId: string) => {
    setCurrentSchema(prev => ({
      ...prev,
      savedQueries: prev.savedQueries.filter(q => q.id !== queryId),
      updatedAt: new Date(),
    }));
  }, []);

  const exportSchema = useCallback((format: string) => {
    const { tables, relationships, indexes, constraints, users, permissions } = currentSchema;
    const databaseName = currentSchema.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    let script = '';
    
    switch (format.toLowerCase()) {
      case 'mysql':
        script = generateMySQLScript(tables, relationships, indexes, constraints, users, permissions, databaseName);
        break;
      case 'postgresql':
        script = generatePostgreSQLScript(tables, relationships, indexes, constraints, users, permissions, databaseName);
        break;
      case 'sqlserver':
        script = generateSQLServerScript(tables, relationships, indexes, constraints, users, permissions, databaseName);
        break;
      case 'oracle':
        script = generateOracleScript(tables, relationships, indexes, constraints, users, permissions, databaseName);
        break;
      case 'mongodb':
        script = generateMongoDBScript(tables, databaseName);
        break;
      default:
        script = generateMySQLScript(tables, relationships, indexes, constraints, users, permissions, databaseName);
    }
    
    return script;
  }, [currentSchema]);

  const generateSQL = useCallback(() => {
    return exportSchema('mysql');
  }, [exportSchema]);

  const createNewSchema = useCallback((name: string) => {
    const newSchema: Schema = {
      id: uuidv4(),
      name,
      tables: [],
      relationships: [],
      indexes: [],
      constraints: [],
      users: [],
      permissions: [],
      savedQueries: [],
      // Enhanced team collaboration fields with default owner
      members: [
        {
          id: uuidv4(),
          username: 'current_user', // In real app, get from auth context
          role: 'owner',
          joinedAt: new Date()
        }
      ],
      invitations: [],
      isShared: false,
      ownerId: 'current_user', // In real app, get from auth context
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setCurrentSchema(newSchema);
    setSchemas(prev => [...prev, newSchema]);
  }, []);

  const loadSchema = useCallback((schemaId: string) => {
    const schema = schemas.find(s => s.id === schemaId);
    if (schema) {
      setCurrentSchema(schema);
    }
  }, [schemas]);

  const saveSchema = useCallback(() => {
    setSchemas(prev => {
      const existingIndex = prev.findIndex(s => s.id === currentSchema.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = currentSchema;
        return updated;
      }
      return [...prev, currentSchema];
    });
    
  },
 
  [currentSchema]);

  const value: DatabaseContextType = {
    currentSchema,
    schemas,
    sqlEngine,
    isRealTimeEnabled,
    lastSyncTime,
    importSchema,
    addTable,
    removeTable,
    updateTable,
    alterTable,
    duplicateTable,
    
    insertRow,
    updateRow,
    deleteRow,
    truncateTable,
    addRelationship,
    removeRelationship,
    addIndex,
    removeIndex,
    addConstraint,
    removeConstraint,
    addUser,
    removeUser,
    grantPermission,
    revokePermission,
    // Enhanced team collaboration functions
    inviteToWorkspace,
    acceptWorkspaceInvitation,
    removeWorkspaceMember,
    validateUsername,
    syncWorkspaceWithMongoDB,
    executeVisualQuery,
    executeSQL,
    saveQuery,
    removeQuery,
    exportSchema,
    createNewSchema,
    loadSchema,
    saveSchema,
    importFromSQL,
    generateSQL,
    // Real-time collaboration state
  
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

// SQL generation functions (keeping existing implementations)
function generateMySQLScript(tables: Table[], relationships: Relationship[], indexes: Index[], _constraints: Constraint[], users: User[], permissions: Permission[], databaseName: string = 'database_export'): string {
  let script = `-- MySQL Database Schema Export
-- Generated by Database Creator on ${new Date().toISOString()}
-- ================================================================

-- 1. Create Database
CREATE DATABASE IF NOT EXISTS \`${databaseName}\`;
USE \`${databaseName}\`;

-- 2. Create Tables
`;
  
  tables.forEach(table => {
    script += `CREATE TABLE \`${table.name}\` (\n`;
    const columnDefs = table.columns.map(col => {
      let def = `  \`${col.name}\` ${col.type}`;
      if (!col.nullable) def += ' NOT NULL';
      if (col.defaultValue) def += ` DEFAULT '${col.defaultValue}'`;
      if (col.isPrimaryKey) def += ' PRIMARY KEY';
      if (col.isUnique) def += ' UNIQUE';
      if (col.type.includes('BOOLEAN')) {
        def = def.replace(col.type, 'BOOLEAN');
      }
      return def;
    });
    script += columnDefs.join(',\n') + '\n';
    script += ');\n\n';
  });
  
  // 3. Insert Data
  script += '-- 3. Insert Data\n';
  tables.forEach(table => {
    if (table.data && table.data.length > 0) {
      script += `-- Data for table \`${table.name}\`\n`;
      table.data.forEach(row => {
        const columns = Object.keys(row).map(col => `\`${col}\``).join(', ');
        const values = Object.values(row).map(val => {
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          if (typeof val === 'number') return val.toString();
          return `'${val.toString().replace(/'/g, "''")}'`;
        }).join(', ');
        script += `INSERT INTO \`${table.name}\` (${columns}) VALUES (${values});\n`;
      });
      script += '\n';
    }
  });
  
  // 4. Constraints & Indexes
  script += '-- 4. Constraints & Indexes\n';
  
  // Create indexes
  indexes.forEach(index => {
    const table = tables.find(t => t.id === index.tableId);
    if (table) {
      const uniqueStr = index.isUnique ? 'UNIQUE ' : '';
      script += `CREATE ${uniqueStr}INDEX \`${index.name}\` ON \`${table.name}\` (${index.columns.map(c => `\`${c}\``).join(', ')});\n`;
    }
  });
  
  if (indexes.length > 0) script += '\n';
  
  // Create foreign keys
  relationships.forEach(rel => {
    const sourceTable = tables.find(t => t.id === rel.sourceTableId);
    const targetTable = tables.find(t => t.id === rel.targetTableId);
    const sourceColumn = sourceTable?.columns.find(c => c.id === rel.sourceColumnId);
    const targetColumn = targetTable?.columns.find(c => c.id === rel.targetColumnId);
    
    if (sourceTable && targetTable && sourceColumn && targetColumn) {
      script += `ALTER TABLE \`${sourceTable.name}\` ADD FOREIGN KEY (\`${sourceColumn.name}\`) REFERENCES \`${targetTable.name}\`(\`${targetColumn.name}\`);\n`;
    }
  });
  
  if (relationships.length > 0) script += '\n';
  
  // 5. Users and Permissions
  script += '-- 5. Users and Permissions\n';
  // Create users and permissions
  users.forEach(user => {
    script += `CREATE USER '${user.name}'@'localhost';\n`;
  });
  
  permissions.forEach(perm => {
    const user = users.find(u => u.id === perm.userId);
    const table = tables.find(t => t.id === perm.tableId);
    if (user && table) {
      const perms = perm.permissions.join(', ');
      script += `GRANT ${perms} ON \`${table.name}\` TO '${user.name}'@'localhost';\n`;
    }
  });
  
  return script;
}

function generatePostgreSQLScript(tables: Table[], _relationships: Relationship[], _indexes: Index[], _constraints: Constraint[], _users: User[], _permissions: Permission[]): string {
  let script = `-- PostgreSQL Database Schema Export
-- Generated by Database Creator on ${new Date().toISOString()}
-- ================================================================

-- 1) Create database and schema
CREATE DATABASE database_export;
\\c database_export;
CREATE SCHEMA IF NOT EXISTS public;
SET search_path TO public;

-- 2) Create tables
`;
  
  tables.forEach(table => {
    script += `CREATE TABLE "${table.name}" (\n`;
    const columnDefs = table.columns.map(col => {
      let def = `  "${col.name}" ${col.type}`;
      if (col.type.includes('BOOLEAN')) {
        def = def.replace(col.type, 'BOOLEAN');
      }
      if (!col.nullable) def += ' NOT NULL';
      if (col.defaultValue) def += ` DEFAULT '${col.defaultValue}'`;
      if (col.isPrimaryKey) def += ' PRIMARY KEY';
      if (col.isUnique) def += ' UNIQUE';
      return def;
    });
    script += columnDefs.join(',\n') + '\n';
    script += ');\n\n';
  });
  
  // 3) Insert data
  script += '-- 3) Insert data\n';
  tables.forEach(table => {
    if (table.data && table.data.length > 0) {
      script += `-- Data for table "${table.name}"\n`;
      table.data.forEach(row => {
        const columns = Object.keys(row).map(col => `"${col}"`).join(', ');
        const values = Object.values(row).map(val => {
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          if (typeof val === 'number') return val.toString();
          return `'${val.toString().replace(/'/g, "''")}'`;
        }).join(', ');
        script += `INSERT INTO "${table.name}" (${columns}) VALUES (${values});\n`;
      });
      script += '\n';
    }
  });
  
  // 4) Constraints & indexes
  script += '-- 4) Constraints & indexes\n';
  
  // Create indexes
  _indexes.forEach(index => {
    const table = tables.find(t => t.id === index.tableId);
    if (table) {
      const uniqueStr = index.isUnique ? 'UNIQUE ' : '';
      script += `CREATE ${uniqueStr}INDEX "${index.name}" ON "${table.name}" (${index.columns.map(c => `"${c}"`).join(', ')});\n`;
    }
  });
  
  // Create foreign keys
  _relationships.forEach(rel => {
    const sourceTable = tables.find(t => t.id === rel.sourceTableId);
    const targetTable = tables.find(t => t.id === rel.targetTableId);
    const sourceColumn = sourceTable?.columns.find(c => c.id === rel.sourceColumnId);
    const targetColumn = targetTable?.columns.find(c => c.id === rel.targetColumnId);
    
    if (sourceTable && targetTable && sourceColumn && targetColumn) {
      script += `ALTER TABLE "${sourceTable.name}" ADD CONSTRAINT "fk_${sourceTable.name}_${sourceColumn.name}" FOREIGN KEY ("${sourceColumn.name}") REFERENCES "${targetTable.name}"("${targetColumn.name}");\n`;
    }
  });
  
  return script;
}

function generateSQLServerScript(tables: Table[], relationships: Relationship[], indexes: Index[], _constraints: Constraint[], _users: User[], _permissions: Permission[], databaseName: string = 'database_export'): string {
  let script = `-- SQL Server Database Schema Export
-- Generated by Database Creator on ${new Date().toISOString()}
-- ================================================================

-- 1. Create Database
CREATE DATABASE [${databaseName}];
GO
USE [${databaseName}];
GO

-- 2. Create Tables
`;
  
  tables.forEach(table => {
    script += `CREATE TABLE [${table.name}] (\n`;
    const columnDefs = table.columns.map(col => {
      let def = `  [${col.name}] ${col.type}`;
      if (col.type.includes('BOOLEAN')) {
        def = def.replace(col.type, 'BIT');
      }
      if (!col.nullable) def += ' NOT NULL';
      if (col.defaultValue) def += ` DEFAULT '${col.defaultValue}'`;
      if (col.isPrimaryKey) def += ' PRIMARY KEY';
      if (col.isUnique) def += ' UNIQUE';
      return def;
    });
    script += columnDefs.join(',\n') + '\n';
    script += ');\n\n';
  });
  
  // 3. Insert Data
  script += '-- 3. Insert Data\n';
  tables.forEach(table => {
    if (table.data && table.data.length > 0) {
      script += `-- Data for table [${table.name}]\n`;
      table.data.forEach(row => {
        const columns = Object.keys(row).map(col => `[${col}]`).join(', ');
        const values = Object.values(row).map(val => {
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'boolean') return val ? '1' : '0';
          if (typeof val === 'number') return val.toString();
          return `'${val.toString().replace(/'/g, "''")}'`;
        }).join(', ');
        script += `INSERT INTO [${table.name}] (${columns}) VALUES (${values});\n`;
      });
      script += 'GO\n\n';
    }
  });
  
  // 4. Constraints & Indexes
  script += '-- 4. Constraints & Indexes\n';
  
  // Create indexes
  indexes.forEach(index => {
    const table = tables.find(t => t.id === index.tableId);
    if (table) {
      const uniqueStr = index.isUnique ? 'UNIQUE ' : '';
      script += `CREATE ${uniqueStr}INDEX [${index.name}] ON [${table.name}] (${index.columns.map(c => `[${c}]`).join(', ')});\nGO\n`;
    }
  });
  
  // Create foreign keys
  relationships.forEach(rel => {
    const sourceTable = tables.find(t => t.id === rel.sourceTableId);
    const targetTable = tables.find(t => t.id === rel.targetTableId);
    const sourceColumn = sourceTable?.columns.find(c => c.id === rel.sourceColumnId);
    const targetColumn = targetTable?.columns.find(c => c.id === rel.targetColumnId);
    
    if (sourceTable && targetTable && sourceColumn && targetColumn) {
      script += `ALTER TABLE [${sourceTable.name}] ADD CONSTRAINT [FK_${sourceTable.name}_${sourceColumn.name}] FOREIGN KEY ([${sourceColumn.name}]) REFERENCES [${targetTable.name}]([${targetColumn.name}]);\nGO\n`;
    }
  });
  
  return script;
}

function generateOracleScript(tables: Table[], relationships: Relationship[], indexes: Index[], _constraints: Constraint[], _users: User[], _permissions: Permission[], databaseName: string = 'database_export'): string {
  let script = `-- Oracle Database Schema Export
-- Generated by Database Creator on ${new Date().toISOString()}
-- ================================================================

-- 1. Create User and Schema (run as SYSDBA)
-- CREATE USER ${databaseName} IDENTIFIED BY password;
-- GRANT CONNECT, RESOURCE TO ${databaseName};
-- ALTER USER ${databaseName} DEFAULT TABLESPACE USERS;

-- 2. Create Tables
`;
  
  tables.forEach(table => {
    script += `CREATE TABLE ${table.name} (\n`;
    const columnDefs = table.columns.map(col => {
      let def = `  ${col.name} ${col.type}`;
      if (col.type.includes('BOOLEAN')) {
        def = def.replace(col.type, 'NUMBER(1)');
      }
      if (!col.nullable) def += ' NOT NULL';
      if (col.defaultValue) def += ` DEFAULT '${col.defaultValue}'`;
      if (col.isPrimaryKey) def += ' PRIMARY KEY';
      return def;
    });
    script += columnDefs.join(',\n') + '\n';
    script += ');\n\n';
  });
  
  // 3. Insert Data
  script += '-- 3. Insert Data\n';
  tables.forEach(table => {
    if (table.data && table.data.length > 0) {
      script += `-- Data for table ${table.name}\n`;
      table.data.forEach(row => {
        const columns = Object.keys(row).join(', ');
        const values = Object.values(row).map(val => {
          if (val === null || val === undefined) return 'NULL';
          if (typeof val === 'boolean') return val ? '1' : '0';
          if (typeof val === 'number') return val.toString();
          return `'${val.toString().replace(/'/g, "''")}'`;
        }).join(', ');
        script += `INSERT INTO ${table.name} (${columns}) VALUES (${values});\n`;
      });
      script += '\n';
    }
  });
  
  // 4. Constraints & Indexes
  script += '-- 4. Constraints & Indexes\n';
  
  // Create indexes
  indexes.forEach(index => {
    const table = tables.find(t => t.id === index.tableId);
    if (table) {
      const uniqueStr = index.isUnique ? 'UNIQUE ' : '';
      script += `CREATE ${uniqueStr}INDEX ${index.name} ON ${table.name} (${index.columns.join(', ')});\n`;
    }
  });
  
  // Create foreign keys
  relationships.forEach(rel => {
    const sourceTable = tables.find(t => t.id === rel.sourceTableId);
    const targetTable = tables.find(t => t.id === rel.targetTableId);
    const sourceColumn = sourceTable?.columns.find(c => c.id === rel.sourceColumnId);
    const targetColumn = targetTable?.columns.find(c => c.id === rel.targetColumnId);
    
    if (sourceTable && targetTable && sourceColumn && targetColumn) {
      script += `ALTER TABLE ${sourceTable.name} ADD CONSTRAINT FK_${sourceTable.name}_${sourceColumn.name} FOREIGN KEY (${sourceColumn.name}) REFERENCES ${targetTable.name}(${targetColumn.name});\n`;
    }
  });
  
  script += '\nCOMMIT;\n';
  return script;
}

function generateMongoDBScript(tables: Table[], databaseName: string = 'database_export'): string {
  let script = `// MongoDB Database Export
// Generated by Database Creator on ${new Date().toISOString()}
// ================================================================

// 1. Use Database
use('${databaseName}');

// 2. Create Collections and Insert Data
`;
  
  tables.forEach(table => {
    script += `\n// Collection: ${table.name}\n`;
    script += `db.createCollection("${table.name}");\n\n`;
    
    // Insert data
    if (table.data && table.data.length > 0) {
      script += `// Insert data for ${table.name}\n`;
      script += `db.${table.name}.insertMany([\n`;
      const documents = table.data.map(row => {
        const doc: Record<string, any> = {};
        table.columns.forEach(col => {
          let value = row[col.name];
          if (value !== undefined && value !== null) {
            if (col.type.includes('INT') || col.type.includes('DECIMAL') || col.type.includes('FLOAT')) {
              value = Number(value);
            } else if (col.type.includes('BOOLEAN')) {
              value = Boolean(value);
            } else if (col.type.includes('DATE')) {
              value = new Date(value);
            }
            doc[col.name] = value;
          }
        });
        return '  ' + JSON.stringify(doc, null, 2).replace(/\n/g, '\n  ');
      });
      script += documents.join(',\n') + '\n]);\n\n';
    }
    
    // Schema validation
    const schema = {
      $jsonSchema: {
        bsonType: "object",
        required: table.columns.filter(col => !col.nullable).map(col => col.name),
        properties: {} as Record<string, any>
      }
    };
    
    table.columns.forEach(col => {
      let bsonType = 'string';
      if (col.type.includes('INT')) bsonType = 'int';
      else if (col.type.includes('DECIMAL') || col.type.includes('FLOAT')) bsonType = 'double';
      else if (col.type.includes('BOOLEAN')) bsonType = 'bool';
      else if (col.type.includes('DATE')) bsonType = 'date';
      
      (schema.$jsonSchema.properties as Record<string, any>)[col.name] = {
        bsonType,
        description: `${col.name} field`
      };
    });
    
    script += `// Schema validation for ${table.name}\n`;
    script += `db.runCommand({\n`;
    script += `  collMod: "${table.name}",\n`;
    script += `  validator: ${JSON.stringify(schema, null, 2)}\n`;
    script += `});\n\n`;
    
    // Create indexes
    table.columns.forEach(col => {
      if (col.isPrimaryKey || col.isUnique || col.isIndexed) {
        const unique = col.isPrimaryKey || col.isUnique ? ', { unique: true }' : '';
        script += `db.${table.name}.createIndex({ "${col.name}": 1 }${unique});\n`;
      }
    });
  });
  
  return script;
}
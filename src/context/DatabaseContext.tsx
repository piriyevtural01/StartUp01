import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import initSqlJs, { Database } from 'sql.js';

// Enhanced types for enterprise features
export interface Column {
  id: string;
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isUnique?: boolean;
  isIndexed?: boolean;
  referencedTable?: string;
  referencedColumn?: string;
  constraintName?: string;
}

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  position: { x: number; y: number };
  data: Record<string, any>[];
  rowCount: number;
}

export interface Relationship {
  id: string;
  name: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  cardinality: '1:1' | '1:N' | 'N:M';
  constraintName: string;
  createdAt: Date;
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
  type: 'CHECK' | 'UNIQUE' | 'NOT_NULL' | 'FOREIGN_KEY' | 'PRIMARY_KEY';
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

export interface WorkspaceMember {
  id: string;
  username: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
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
  invitations: WorkspaceInvitation[];
  members: WorkspaceMember[];
  isShared: boolean;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  tableId?: string;
  columnId?: string;
  relationshipId?: string;
}

interface DatabaseContextType {
  currentSchema: Schema;
  validationErrors: ValidationError[];
  sqlDatabase: Database | null;
  
  // Schema operations
  createNewSchema: (name: string) => void;
  saveSchema: () => void;
  importSchema: (schema: Schema) => void;
  exportSchema: (format: string) => string;
  generateSQL: () => string;
  importFromSQL: (sql: string) => void;
  
  // Table operations
  addTable: (table: Omit<Table, 'id' | 'data' | 'rowCount'>) => void;
  removeTable: (tableId: string) => void;
  updateTable: (tableId: string, updates: Partial<Table>) => void;
  alterTable: (tableId: string, operation: string, data: any) => void;
  duplicateTable: (tableId: string) => void;
  
  // Column operations
  addColumn: (tableId: string, column: Omit<Column, 'id'>) => void;
  removeColumn: (tableId: string, columnId: string) => void;
  updateColumn: (tableId: string, columnId: string, updates: Partial<Column>) => void;
  
  // Relationship operations
  addRelationship: (relationship: Omit<Relationship, 'id' | 'name' | 'createdAt'>) => void;
  removeRelationship: (relationshipId: string) => void;
  updateRelationship: (relationshipId: string, updates: Partial<Relationship>) => void;
  
  // Data operations
  insertRow: (tableId: string, data: Record<string, any>) => void;
  updateRow: (tableId: string, rowIndex: number, data: Record<string, any>) => void;
  deleteRow: (tableId: string, rowIndex: number) => void;
  truncateTable: (tableId: string) => void;
  
  // Query operations
  executeSQL: (sql: string) => Promise<any>;
  executeVisualQuery: (query: any) => Promise<any>;
  saveQuery: (query: Omit<SavedQuery, 'id'>) => void;
  removeQuery: (queryId: string) => void;
  
  // Security operations
  addUser: (user: Omit<User, 'id'>) => void;
  removeUser: (userId: string) => void;
  grantPermission: (permission: Omit<Permission, 'id'>) => void;
  revokePermission: (permissionId: string) => void;
  addIndex: (index: Omit<Index, 'id'>) => void;
  addConstraint: (constraint: Omit<Constraint, 'id'>) => void;
  
  // Collaboration operations
  inviteToWorkspace: (invitation: Omit<WorkspaceInvitation, 'id' | 'joinCode' | 'createdAt' | 'expiresAt' | 'status'>) => Promise<string>;
  acceptWorkspaceInvitation: (joinCode: string) => Promise<boolean>;
  removeWorkspaceMember: (memberId: string) => void;
  validateUsername: (username: string) => Promise<boolean>;
  syncWorkspaceWithMongoDB: () => Promise<void>;
  
  // Validation
  validateSchema: () => ValidationError[];
  validateTable: (table: Table) => ValidationError[];
  validateRelationship: (relationship: Relationship) => ValidationError[];
  
  // SQL Editor
  parseSQLStatement: (sql: string) => void;
  getAvailableTables: () => Table[];
  getTableColumns: (tableId: string) => Column[];
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSchema, setCurrentSchema] = useState<Schema>({
    id: uuidv4(),
    name: 'New Database Schema',
    tables: [],
    relationships: [],
    indexes: [],
    constraints: [],
    users: [],
    permissions: [],
    savedQueries: [],
    invitations: [],
    members: [{
      id: uuidv4(),
      username: 'current_user',
      role: 'owner',
      joinedAt: new Date()
    }],
    isShared: false,
    ownerId: 'current_user',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [sqlDatabase, setSqlDatabase] = useState<Database | null>(null);

  // Initialize SQL.js database
  useEffect(() => {
    const initDB = async () => {
      try {
        const SQL = await initSqlJs({
          locateFile: (file) => `https://sql.js.org/dist/${file}`
        });
        const db = new SQL.Database();
        setSqlDatabase(db);
      } catch (error) {
        console.error('Failed to initialize SQL.js:', error);
      }
    };
    initDB();
  }, []);

  // Validation functions
  const validateSchema = useCallback((): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    // Check for duplicate table names
    const tableNames = new Set<string>();
    currentSchema.tables.forEach(table => {
      if (tableNames.has(table.name.toLowerCase())) {
        errors.push({
          type: 'error',
          message: `Duplicate table name: ${table.name}`,
          tableId: table.id
        });
      }
      tableNames.add(table.name.toLowerCase());
      
      // Validate each table
      errors.push(...validateTable(table));
    });

    // Validate relationships
    currentSchema.relationships.forEach(relationship => {
      errors.push(...validateRelationship(relationship));
    });

    return errors;
  }, [currentSchema]);

  const validateTable = useCallback((table: Table): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    // Check for multiple primary keys
    const primaryKeys = table.columns.filter(col => col.isPrimaryKey);
    if (primaryKeys.length > 1) {
      errors.push({
        type: 'error',
        message: `Table "${table.name}" cannot have multiple primary keys`,
        tableId: table.id
      });
    }

    // Check for duplicate column names
    const columnNames = new Set<string>();
    table.columns.forEach(column => {
      if (columnNames.has(column.name.toLowerCase())) {
        errors.push({
          type: 'error',
          message: `Duplicate column name "${column.name}" in table "${table.name}"`,
          tableId: table.id,
          columnId: column.id
        });
      }
      columnNames.add(column.name.toLowerCase());

      // Validate foreign key references
      if (column.isForeignKey && column.referencedTable) {
        const referencedTable = currentSchema.tables.find(t => t.name === column.referencedTable);
        if (!referencedTable) {
          errors.push({
            type: 'error',
            message: `Referenced table "${column.referencedTable}" not found`,
            tableId: table.id,
            columnId: column.id
          });
        } else if (column.referencedColumn) {
          const referencedColumn = referencedTable.columns.find(c => c.name === column.referencedColumn);
          if (!referencedColumn) {
            errors.push({
              type: 'error',
              message: `Referenced column "${column.referencedColumn}" not found in table "${column.referencedTable}"`,
              tableId: table.id,
              columnId: column.id
            });
          }
        }
      }

      // Check for duplicate unique constraints
      const uniqueColumns = table.columns.filter(col => col.isUnique && col.name === column.name);
      if (uniqueColumns.length > 1) {
        errors.push({
          type: 'error',
          message: `Duplicate unique constraint on column "${column.name}"`,
          tableId: table.id,
          columnId: column.id
        });
      }
    });

    return errors;
  }, [currentSchema.tables]);

  const validateRelationship = useCallback((relationship: Relationship): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    const sourceTable = currentSchema.tables.find(t => t.id === relationship.sourceTableId);
    const targetTable = currentSchema.tables.find(t => t.id === relationship.targetTableId);
    
    if (!sourceTable) {
      errors.push({
        type: 'error',
        message: `Source table not found for relationship "${relationship.name}"`,
        relationshipId: relationship.id
      });
    }
    
    if (!targetTable) {
      errors.push({
        type: 'error',
        message: `Target table not found for relationship "${relationship.name}"`,
        relationshipId: relationship.id
      });
    }

    if (sourceTable && targetTable) {
      const sourceColumn = sourceTable.columns.find(c => c.id === relationship.sourceColumnId);
      const targetColumn = targetTable.columns.find(c => c.id === relationship.targetColumnId);
      
      if (!sourceColumn) {
        errors.push({
          type: 'error',
          message: `Source column not found for relationship "${relationship.name}"`,
          relationshipId: relationship.id
        });
      }
      
      if (!targetColumn) {
        errors.push({
          type: 'error',
          message: `Target column not found for relationship "${relationship.name}"`,
          relationshipId: relationship.id
        });
      }

      // Check for circular references
      if (sourceTable.id === targetTable.id) {
        errors.push({
          type: 'warning',
          message: `Self-referencing relationship in table "${sourceTable.name}"`,
          relationshipId: relationship.id
        });
      }
    }

    return errors;
  }, [currentSchema.tables]);

  // Update validation errors when schema changes
  useEffect(() => {
    const errors = validateSchema();
    setValidationErrors(errors);
  }, [currentSchema, validateSchema]);

  // Schema operations
  const createNewSchema = useCallback((name: string) => {
    setCurrentSchema({
      id: uuidv4(),
      name,
      tables: [],
      relationships: [],
      indexes: [],
      constraints: [],
      users: [],
      permissions: [],
      savedQueries: [],
      invitations: [],
      members: [{
        id: uuidv4(),
        username: 'current_user',
        role: 'owner',
        joinedAt: new Date()
      }],
      isShared: false,
      ownerId: 'current_user',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }, []);

  const saveSchema = useCallback(() => {
    setCurrentSchema(prev => ({
      ...prev,
      updatedAt: new Date()
    }));
  }, []);

  const importSchema = useCallback((schema: Schema) => {
    setCurrentSchema(schema);
  }, []);

  const exportSchema = useCallback((format: string): string => {
    switch (format.toLowerCase()) {
      case 'mysql':
        return generateMySQLScript();
      case 'postgresql':
        return generatePostgreSQLScript();
      case 'sqlserver':
        return generateSQLServerScript();
      case 'oracle':
        return generateOracleScript();
      case 'mongodb':
        return generateMongoDBScript();
      default:
        return generateSQL();
    }
  }, [currentSchema]);

  const generateSQL = useCallback((): string => {
    let sql = `-- Database Schema: ${currentSchema.name}\n`;
    sql += `-- Generated on: ${new Date().toISOString()}\n\n`;

    // Generate CREATE TABLE statements
    currentSchema.tables.forEach(table => {
      sql += `CREATE TABLE ${table.name} (\n`;
      
      const columnDefinitions = table.columns.map(column => {
        let def = `  ${column.name} ${column.type}`;
        if (!column.nullable) def += ' NOT NULL';
        if (column.defaultValue) def += ` DEFAULT ${column.defaultValue}`;
        if (column.isPrimaryKey) def += ' PRIMARY KEY';
        if (column.isUnique) def += ' UNIQUE';
        return def;
      });
      
      sql += columnDefinitions.join(',\n');
      sql += '\n);\n\n';
    });

    // Generate ALTER TABLE statements for foreign keys
    currentSchema.relationships.forEach(relationship => {
      const sourceTable = currentSchema.tables.find(t => t.id === relationship.sourceTableId);
      const targetTable = currentSchema.tables.find(t => t.id === relationship.targetTableId);
      const sourceColumn = sourceTable?.columns.find(c => c.id === relationship.sourceColumnId);
      const targetColumn = targetTable?.columns.find(c => c.id === relationship.targetColumnId);
      
      if (sourceTable && targetTable && sourceColumn && targetColumn) {
        sql += `ALTER TABLE ${sourceTable.name} ADD CONSTRAINT ${relationship.constraintName} `;
        sql += `FOREIGN KEY (${sourceColumn.name}) REFERENCES ${targetTable.name}(${targetColumn.name});\n`;
      }
    });

    // Generate CREATE INDEX statements
    currentSchema.indexes.forEach(index => {
      const table = currentSchema.tables.find(t => t.id === index.tableId);
      if (table) {
        sql += `CREATE ${index.isUnique ? 'UNIQUE ' : ''}INDEX ${index.name} ON ${table.name} (${index.columns.join(', ')});\n`;
      }
    });

    return sql;
  }, [currentSchema]);

  const generateMySQLScript = useCallback((): string => {
    let sql = `-- MySQL Database Schema: ${currentSchema.name}\n`;
    sql += `-- Generated on: ${new Date().toISOString()}\n\n`;
    sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    currentSchema.tables.forEach(table => {
      sql += `CREATE TABLE \`${table.name}\` (\n`;
      
      const columnDefinitions = table.columns.map(column => {
        let def = `  \`${column.name}\` ${column.type}`;
        if (!column.nullable) def += ' NOT NULL';
        if (column.defaultValue) def += ` DEFAULT ${column.defaultValue}`;
        if (column.isPrimaryKey) def += ' AUTO_INCREMENT PRIMARY KEY';
        return def;
      });
      
      sql += columnDefinitions.join(',\n');
      sql += '\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n';
    });

    sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    return sql;
  }, [currentSchema]);

  const generatePostgreSQLScript = useCallback((): string => {
    let sql = `-- PostgreSQL Database Schema: ${currentSchema.name}\n`;
    sql += `-- Generated on: ${new Date().toISOString()}\n\n`;

    currentSchema.tables.forEach(table => {
      sql += `CREATE TABLE "${table.name}" (\n`;
      
      const columnDefinitions = table.columns.map(column => {
        let def = `  "${column.name}" ${column.type}`;
        if (!column.nullable) def += ' NOT NULL';
        if (column.defaultValue) def += ` DEFAULT ${column.defaultValue}`;
        if (column.isPrimaryKey) def += ' PRIMARY KEY';
        return def;
      });
      
      sql += columnDefinitions.join(',\n');
      sql += '\n);\n\n';
    });

    return sql;
  }, [currentSchema]);

  const generateSQLServerScript = useCallback((): string => {
    let sql = `-- SQL Server Database Schema: ${currentSchema.name}\n`;
    sql += `-- Generated on: ${new Date().toISOString()}\n\n`;

    currentSchema.tables.forEach(table => {
      sql += `CREATE TABLE [${table.name}] (\n`;
      
      const columnDefinitions = table.columns.map(column => {
        let def = `  [${column.name}] ${column.type}`;
        if (!column.nullable) def += ' NOT NULL';
        if (column.defaultValue) def += ` DEFAULT ${column.defaultValue}`;
        if (column.isPrimaryKey) def += ' IDENTITY(1,1) PRIMARY KEY';
        return def;
      });
      
      sql += columnDefinitions.join(',\n');
      sql += '\n);\n\n';
    });

    return sql;
  }, [currentSchema]);

  const generateOracleScript = useCallback((): string => {
    let sql = `-- Oracle Database Schema: ${currentSchema.name}\n`;
    sql += `-- Generated on: ${new Date().toISOString()}\n\n`;

    currentSchema.tables.forEach(table => {
      sql += `CREATE TABLE "${table.name}" (\n`;
      
      const columnDefinitions = table.columns.map(column => {
        let def = `  "${column.name}" ${column.type}`;
        if (!column.nullable) def += ' NOT NULL';
        if (column.defaultValue) def += ` DEFAULT ${column.defaultValue}`;
        return def;
      });
      
      sql += columnDefinitions.join(',\n');
      sql += '\n);\n\n';
    });

    return sql;
  }, [currentSchema]);

  const generateMongoDBScript = useCallback((): string => {
    const mongoSchema = {
      database: currentSchema.name,
      collections: currentSchema.tables.map(table => ({
        name: table.name,
        schema: {
          bsonType: 'object',
          required: table.columns.filter(col => !col.nullable).map(col => col.name),
          properties: Object.fromEntries(
            table.columns.map(col => [
              col.name,
              {
                bsonType: col.type.toLowerCase().includes('int') ? 'int' : 
                         col.type.toLowerCase().includes('string') || col.type.toLowerCase().includes('varchar') ? 'string' :
                         col.type.toLowerCase().includes('bool') ? 'bool' :
                         col.type.toLowerCase().includes('date') ? 'date' : 'string',
                description: `${col.name} field`
              }
            ])
          )
        },
        indexes: currentSchema.indexes
          .filter(idx => idx.tableId === table.id)
          .map(idx => ({
            key: Object.fromEntries(idx.columns.map(col => [col, 1])),
            unique: idx.isUnique,
            name: idx.name
          }))
      }))
    };

    return `// MongoDB Schema: ${currentSchema.name}\n// Generated on: ${new Date().toISOString()}\n\n${JSON.stringify(mongoSchema, null, 2)}`;
  }, [currentSchema]);

  const importFromSQL = useCallback((sql: string) => {
    try {
      // Basic SQL parsing - this is a simplified implementation
      const statements = sql.split(';').filter(stmt => stmt.trim());
      const newTables: Table[] = [];
      
      statements.forEach(statement => {
        const trimmed = statement.trim().toUpperCase();
        if (trimmed.startsWith('CREATE TABLE')) {
          // Parse CREATE TABLE statement
          const match = statement.match(/CREATE TABLE\s+(\w+)\s*\((.*)\)/is);
          if (match) {
            const tableName = match[1];
            const columnsText = match[2];
            
            const columns: Column[] = [];
            const columnDefs = columnsText.split(',');
            
            columnDefs.forEach(colDef => {
              const parts = colDef.trim().split(/\s+/);
              if (parts.length >= 2) {
                const column: Column = {
                  id: uuidv4(),
                  name: parts[0],
                  type: parts[1],
                  nullable: !colDef.toUpperCase().includes('NOT NULL'),
                  isPrimaryKey: colDef.toUpperCase().includes('PRIMARY KEY'),
                  isForeignKey: false,
                  isUnique: colDef.toUpperCase().includes('UNIQUE')
                };
                columns.push(column);
              }
            });
            
            newTables.push({
              id: uuidv4(),
              name: tableName,
              columns,
              position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
              data: [],
              rowCount: 0
            });
          }
        }
      });
      
      setCurrentSchema(prev => ({
        ...prev,
        tables: [...prev.tables, ...newTables],
        updatedAt: new Date()
      }));
    } catch (error) {
      console.error('Failed to import SQL:', error);
      throw new Error('Invalid SQL format');
    }
  }, []);

  // Table operations
  const addTable = useCallback((table: Omit<Table, 'id' | 'data' | 'rowCount'>) => {
    const newTable: Table = {
      ...table,
      id: uuidv4(),
      data: [],
      rowCount: 0
    };

    setCurrentSchema(prev => ({
      ...prev,
      tables: [...prev.tables, newTable],
      updatedAt: new Date()
    }));
  }, []);

  const removeTable = useCallback((tableId: string) => {
    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.filter(t => t.id !== tableId),
      relationships: prev.relationships.filter(r => r.sourceTableId !== tableId && r.targetTableId !== tableId),
      indexes: prev.indexes.filter(i => i.tableId !== tableId),
      constraints: prev.constraints.filter(c => c.tableId !== tableId),
      updatedAt: new Date()
    }));
  }, []);

  const updateTable = useCallback((tableId: string, updates: Partial<Table>) => {
    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.map(table => 
        table.id === tableId ? { ...table, ...updates } : table
      ),
      updatedAt: new Date()
    }));
  }, []);

  const alterTable = useCallback((tableId: string, operation: string, data: any) => {
    setCurrentSchema(prev => {
      const tables = [...prev.tables];
      const tableIndex = tables.findIndex(t => t.id === tableId);
      
      if (tableIndex === -1) return prev;
      
      const table = { ...tables[tableIndex] };
      
      switch (operation) {
        case 'ADD_COLUMN':
          table.columns = [...table.columns, { ...data, id: uuidv4() }];
          break;
        case 'DROP_COLUMN':
          table.columns = table.columns.filter(col => col.id !== data.columnId);
          break;
        case 'MODIFY_COLUMN':
          table.columns = table.columns.map(col => 
            col.id === data.columnId ? { ...col, ...data.updates } : col
          );
          break;
        case 'ADD_PRIMARY_KEY':
          // Remove existing primary keys first
          table.columns = table.columns.map(col => ({ ...col, isPrimaryKey: false }));
          // Add new primary key
          table.columns = table.columns.map(col => 
            data.columnIds.includes(col.id) ? { ...col, isPrimaryKey: true } : col
          );
          break;
        case 'DROP_PRIMARY_KEY':
          table.columns = table.columns.map(col => ({ ...col, isPrimaryKey: false }));
          break;
        case 'ADD_FOREIGN_KEY':
          table.columns = table.columns.map(col => 
            col.id === data.columnId ? { 
              ...col, 
              isForeignKey: true, 
              referencedTable: data.referencedTable,
              referencedColumn: data.referencedColumn,
              constraintName: data.constraintName
            } : col
          );
          break;
        case 'DROP_FOREIGN_KEY':
          table.columns = table.columns.map(col => 
            col.constraintName === data.constraintName ? { 
              ...col, 
              isForeignKey: false, 
              referencedTable: undefined,
              referencedColumn: undefined,
              constraintName: undefined
            } : col
          );
          break;
      }
      
      tables[tableIndex] = table;
      
      return {
        ...prev,
        tables,
        updatedAt: new Date()
      };
    });
  }, []);

  const duplicateTable = useCallback((tableId: string) => {
    const table = currentSchema.tables.find(t => t.id === tableId);
    if (!table) return;

    const newTable: Table = {
      ...table,
      id: uuidv4(),
      name: `${table.name}_copy`,
      position: { x: table.position.x + 50, y: table.position.y + 50 },
      columns: table.columns.map(col => ({ ...col, id: uuidv4() })),
      data: [],
      rowCount: 0
    };

    setCurrentSchema(prev => ({
      ...prev,
      tables: [...prev.tables, newTable],
      updatedAt: new Date()
    }));
  }, [currentSchema.tables]);

  // Column operations
  const addColumn = useCallback((tableId: string, column: Omit<Column, 'id'>) => {
    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.map(table => 
        table.id === tableId 
          ? { ...table, columns: [...table.columns, { ...column, id: uuidv4() }] }
          : table
      ),
      updatedAt: new Date()
    }));
  }, []);

  const removeColumn = useCallback((tableId: string, columnId: string) => {
    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.map(table => 
        table.id === tableId 
          ? { ...table, columns: table.columns.filter(col => col.id !== columnId) }
          : table
      ),
      relationships: prev.relationships.filter(r => 
        r.sourceColumnId !== columnId && r.targetColumnId !== columnId
      ),
      updatedAt: new Date()
    }));
  }, []);

  const updateColumn = useCallback((tableId: string, columnId: string, updates: Partial<Column>) => {
    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.map(table => 
        table.id === tableId 
          ? {
              ...table,
              columns: table.columns.map(col => 
                col.id === columnId ? { ...col, ...updates } : col
              )
            }
          : table
      ),
      updatedAt: new Date()
    }));
  }, []);

  // Relationship operations
  const addRelationship = useCallback((relationship: Omit<Relationship, 'id' | 'name' | 'createdAt'>) => {
    const sourceTable = currentSchema.tables.find(t => t.id === relationship.sourceTableId);
    const targetTable = currentSchema.tables.find(t => t.id === relationship.targetTableId);
    const sourceColumn = sourceTable?.columns.find(c => c.id === relationship.sourceColumnId);
    const targetColumn = targetTable?.columns.find(c => c.id === relationship.targetColumnId);
    
    if (!sourceTable || !targetTable || !sourceColumn || !targetColumn) {
      console.error('Invalid relationship: missing table or column');
      return;
    }

    const constraintName = `FK_${sourceTable.name}_${sourceColumn.name}_${targetTable.name}_${targetColumn.name}`;
    
    const newRelationship: Relationship = {
      ...relationship,
      id: uuidv4(),
      name: constraintName,
      constraintName,
      createdAt: new Date()
    };

    setCurrentSchema(prev => ({
      ...prev,
      relationships: [...prev.relationships, newRelationship],
      tables: prev.tables.map(table => 
        table.id === relationship.sourceTableId
          ? {
              ...table,
              columns: table.columns.map(col => 
                col.id === relationship.sourceColumnId
                  ? {
                      ...col,
                      isForeignKey: true,
                      referencedTable: targetTable.name,
                      referencedColumn: targetColumn.name,
                      constraintName
                    }
                  : col
              )
            }
          : table
      ),
      updatedAt: new Date()
    }));
  }, [currentSchema.tables]);

  const removeRelationship = useCallback((relationshipId: string) => {
    const relationship = currentSchema.relationships.find(r => r.id === relationshipId);
    if (!relationship) return;

    setCurrentSchema(prev => ({
      ...prev,
      relationships: prev.relationships.filter(r => r.id !== relationshipId),
      tables: prev.tables.map(table => 
        table.id === relationship.sourceTableId
          ? {
              ...table,
              columns: table.columns.map(col => 
                col.id === relationship.sourceColumnId
                  ? {
                      ...col,
                      isForeignKey: false,
                      referencedTable: undefined,
                      referencedColumn: undefined,
                      constraintName: undefined
                    }
                  : col
              )
            }
          : table
      ),
      updatedAt: new Date()
    }));
  }, [currentSchema.relationships, currentSchema.tables]);

  const updateRelationship = useCallback((relationshipId: string, updates: Partial<Relationship>) => {
    setCurrentSchema(prev => ({
      ...prev,
      relationships: prev.relationships.map(rel => 
        rel.id === relationshipId ? { ...rel, ...updates } : rel
      ),
      updatedAt: new Date()
    }));
  }, []);

  // Data operations
  const insertRow = useCallback((tableId: string, data: Record<string, any>) => {
    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.map(table => 
        table.id === tableId 
          ? { 
              ...table, 
              data: [...table.data, data],
              rowCount: table.rowCount + 1
            }
          : table
      ),
      updatedAt: new Date()
    }));
  }, []);

  const updateRow = useCallback((tableId: string, rowIndex: number, data: Record<string, any>) => {
    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.map(table => 
        table.id === tableId 
          ? { 
              ...table, 
              data: table.data.map((row, index) => index === rowIndex ? data : row)
            }
          : table
      ),
      updatedAt: new Date()
    }));
  }, []);

  const deleteRow = useCallback((tableId: string, rowIndex: number) => {
    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.map(table => 
        table.id === tableId 
          ? { 
              ...table, 
              data: table.data.filter((_, index) => index !== rowIndex),
              rowCount: Math.max(0, table.rowCount - 1)
            }
          : table
      ),
      updatedAt: new Date()
    }));
  }, []);

  const truncateTable = useCallback((tableId: string) => {
    setCurrentSchema(prev => ({
      ...prev,
      tables: prev.tables.map(table => 
        table.id === tableId 
          ? { ...table, data: [], rowCount: 0 }
          : table
      ),
      updatedAt: new Date()
    }));
  }, []);

  // Query operations
  const executeSQL = useCallback(async (sql: string): Promise<any> => {
    if (!sqlDatabase) {
      throw new Error('Database not initialized');
    }

    try {
      const result = sqlDatabase.exec(sql);
      return {
        columns: result[0]?.columns || [],
        values: result[0]?.values || []
      };
    } catch (error) {
      throw new Error(`SQL Error: ${error}`);
    }
  }, [sqlDatabase]);

  const executeVisualQuery = useCallback(async (query: any): Promise<any> => {
    // Convert visual query to SQL and execute
    let sql = `SELECT ${query.columns.length > 0 ? query.columns.join(', ') : '*'} FROM ${query.tables[0]}`;
    
    // Add JOINs
    query.joins.forEach((join: any) => {
      sql += ` ${join.type} JOIN ${join.table} ON ${join.condition}`;
    });
    
    // Add WHERE clause
    if (query.filters.length > 0) {
      const conditions = query.filters.map((filter: any) => 
        `${filter.column} ${filter.operator} '${filter.value}'`
      );
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // Add GROUP BY
    if (query.groupBy.length > 0) {
      sql += ` GROUP BY ${query.groupBy.join(', ')}`;
    }
    
    // Add ORDER BY
    if (query.orderBy.length > 0) {
      const orderClauses = query.orderBy.map((order: any) => 
        `${order.column} ${order.direction}`
      );
      sql += ` ORDER BY ${orderClauses.join(', ')}`;
    }
    
    // Add LIMIT
    if (query.limit) {
      sql += ` LIMIT ${query.limit}`;
    }

    return executeSQL(sql);
  }, [executeSQL]);

  const saveQuery = useCallback((query: Omit<SavedQuery, 'id'>) => {
    const newQuery: SavedQuery = {
      ...query,
      id: uuidv4()
    };

    setCurrentSchema(prev => ({
      ...prev,
      savedQueries: [...prev.savedQueries, newQuery],
      updatedAt: new Date()
    }));
  }, []);

  const removeQuery = useCallback((queryId: string) => {
    setCurrentSchema(prev => ({
      ...prev,
      savedQueries: prev.savedQueries.filter(q => q.id !== queryId),
      updatedAt: new Date()
    }));
  }, []);

  // Security operations
  const addUser = useCallback((user: Omit<User, 'id'>) => {
    const newUser: User = {
      ...user,
      id: uuidv4()
    };

    setCurrentSchema(prev => ({
      ...prev,
      users: [...prev.users, newUser],
      updatedAt: new Date()
    }));
  }, []);

  const removeUser = useCallback((userId: string) => {
    setCurrentSchema(prev => ({
      ...prev,
      users: prev.users.filter(u => u.id !== userId),
      permissions: prev.permissions.filter(p => p.userId !== userId),
      updatedAt: new Date()
    }));
  }, []);

  const grantPermission = useCallback((permission: Omit<Permission, 'id'>) => {
    const newPermission: Permission = {
      ...permission,
      id: uuidv4()
    };

    setCurrentSchema(prev => ({
      ...prev,
      permissions: [...prev.permissions, newPermission],
      updatedAt: new Date()
    }));
  }, []);

  const revokePermission = useCallback((permissionId: string) => {
    setCurrentSchema(prev => ({
      ...prev,
      permissions: prev.permissions.filter(p => p.id !== permissionId),
      updatedAt: new Date()
    }));
  }, []);

  const addIndex = useCallback((index: Omit<Index, 'id'>) => {
    const newIndex: Index = {
      ...index,
      id: uuidv4()
    };

    setCurrentSchema(prev => ({
      ...prev,
      indexes: [...prev.indexes, newIndex],
      updatedAt: new Date()
    }));
  }, []);

  const addConstraint = useCallback((constraint: Omit<Constraint, 'id'>) => {
    const newConstraint: Constraint = {
      ...constraint,
      id: uuidv4()
    };

    setCurrentSchema(prev => ({
      ...prev,
      constraints: [...prev.constraints, newConstraint],
      updatedAt: new Date()
    }));
  }, []);

  // Collaboration operations
  const inviteToWorkspace = useCallback(async (invitation: Omit<WorkspaceInvitation, 'id' | 'joinCode' | 'createdAt' | 'expiresAt' | 'status'>): Promise<string> => {
    const joinCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const newInvitation: WorkspaceInvitation = {
      ...invitation,
      id: uuidv4(),
      workspaceId: currentSchema.id,
      joinCode,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      status: 'pending'
    };

    setCurrentSchema(prev => ({
      ...prev,
      invitations: [...prev.invitations, newInvitation],
      updatedAt: new Date()
    }));

    return joinCode;
  }, [currentSchema.id]);

  const acceptWorkspaceInvitation = useCallback(async (joinCode: string): Promise<boolean> => {
    const invitation = currentSchema.invitations.find(
      inv => inv.joinCode === joinCode && inv.status === 'pending'
    );

    if (!invitation || new Date() > invitation.expiresAt) {
      return false;
    }

    const newMember: WorkspaceMember = {
      id: uuidv4(),
      username: invitation.inviteeUsername,
      role: invitation.role,
      joinedAt: new Date()
    };

    setCurrentSchema(prev => ({
      ...prev,
      invitations: prev.invitations.map(inv => 
        inv.id === invitation.id ? { ...inv, status: 'accepted' } : inv
      ),
      members: [...prev.members, newMember],
      isShared: true,
      updatedAt: new Date()
    }));

    return true;
  }, [currentSchema.invitations]);

  const removeWorkspaceMember = useCallback((memberId: string) => {
    setCurrentSchema(prev => ({
      ...prev,
      members: prev.members.filter(m => m.id !== memberId),
      updatedAt: new Date()
    }));
  }, []);

  const validateUsername = useCallback(async (username: string): Promise<boolean> => {
    // Mock validation - in real app, this would call the API
    return username.length > 0;
  }, []);

  const syncWorkspaceWithMongoDB = useCallback(async (): Promise<void> => {
    // Mock sync - in real app, this would sync with MongoDB
    console.log('Syncing workspace with MongoDB...');
  }, []);

  // SQL Editor operations
  const parseSQLStatement = useCallback((sql: string) => {
    try {
      const trimmed = sql.trim().toUpperCase();
      
      if (trimmed.startsWith('CREATE TABLE')) {
        importFromSQL(sql);
      } else if (trimmed.startsWith('ALTER TABLE')) {
        // Parse ALTER TABLE statements
        console.log('Parsing ALTER TABLE:', sql);
      }
    } catch (error) {
      console.error('Failed to parse SQL:', error);
    }
  }, [importFromSQL]);

  const getAvailableTables = useCallback((): Table[] => {
    return currentSchema.tables;
  }, [currentSchema.tables]);

  const getTableColumns = useCallback((tableId: string): Column[] => {
    const table = currentSchema.tables.find(t => t.id === tableId);
    return table?.columns || [];
  }, [currentSchema.tables]);

  const value: DatabaseContextType = {
    currentSchema,
    validationErrors,
    sqlDatabase,
    
    // Schema operations
    createNewSchema,
    saveSchema,
    importSchema,
    exportSchema,
    generateSQL,
    importFromSQL,
    
    // Table operations
    addTable,
    removeTable,
    updateTable,
    alterTable,
    duplicateTable,
    
    // Column operations
    addColumn,
    removeColumn,
    updateColumn,
    
    // Relationship operations
    addRelationship,
    removeRelationship,
    updateRelationship,
    
    // Data operations
    insertRow,
    updateRow,
    deleteRow,
    truncateTable,
    
    // Query operations
    executeSQL,
    executeVisualQuery,
    saveQuery,
    removeQuery,
    
    // Security operations
    addUser,
    removeUser,
    grantPermission,
    revokePermission,
    addIndex,
    addConstraint,
    
    // Collaboration operations
    inviteToWorkspace,
    acceptWorkspaceInvitation,
    removeWorkspaceMember,
    validateUsername,
    syncWorkspaceWithMongoDB,
    
    // Validation
    validateSchema,
    validateTable,
    validateRelationship,
    
    // SQL Editor
    parseSQLStatement,
    getAvailableTables,
    getTableColumns
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import { Play, Copy, RotateCcw, AlertTriangle, Check, FileText, Zap, Database, Save } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { useDatabase } from '../../../context/DatabaseContext';

interface SQLError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

interface ParsedStatement {
  type: 'CREATE_TABLE' | 'ALTER_TABLE' | 'DROP_TABLE' | 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';
  tableName?: string;
  columns?: any[];
  operation?: string;
  valid: boolean;
  error?: string;
}

const LiveSQLEditor: React.FC = () => {
  const { isDark } = useTheme();
  const { 
    executeSQL, 
    parseSQLStatement, 
    generateSQL, 
    currentSchema,
    validationErrors,
    exportSchema 
  } = useDatabase();
  
  const [query, setQuery] = useState(`-- Live SQL Editor for ${currentSchema.name}
-- Type CREATE TABLE or ALTER TABLE statements to update the schema in real-time
-- Changes are applied automatically when you complete a statement with semicolon

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);`);
  
  const [result, setResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [sqlErrors, setSqlErrors] = useState<SQLError[]>([]);
  const [lastExecutedStatement, setLastExecutedStatement] = useState('');
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(true);
  const [parsedStatements, setParsedStatements] = useState<ParsedStatement[]>([]);
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: 'on',
      folding: true,
      selectOnLineNumbers: true,
      roundedSelection: false,
      readOnly: false,
      cursorStyle: 'line',
      automaticLayout: true,
      suggestOnTriggerCharacters: true,
      quickSuggestions: true,
      parameterHints: { enabled: true },
    });

    // Add SQL language features with schema awareness
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          // Table names
          ...currentSchema.tables.map(table => ({
            label: table.name,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: table.name,
            detail: `Table (${table.columns.length} columns)`,
            documentation: `Columns: ${table.columns.map(c => c.name).join(', ')}`
          })),
          // Column names with table context
          ...currentSchema.tables.flatMap(table => 
            table.columns.map(column => ({
              label: `${table.name}.${column.name}`,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: `${table.name}.${column.name}`,
              detail: `${column.type} ${!column.nullable ? 'NOT NULL' : ''}`,
              documentation: `Column in ${table.name} table`
            }))
          ),
          // SQL keywords with snippets
          {
            label: 'CREATE TABLE',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              'CREATE TABLE ${1:table_name} (',
              '  ${2:id} INT PRIMARY KEY AUTO_INCREMENT,',
              '  ${3:name} VARCHAR(255) NOT NULL,',
              '  ${4:created_at} TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
              ');'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create a new table with common columns'
          },
          {
            label: 'ALTER TABLE ADD COLUMN',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'ALTER TABLE ${1:table_name} ADD COLUMN ${2:column_name} ${3:VARCHAR(255)};',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Add a new column to an existing table'
          },
          {
            label: 'ALTER TABLE ADD FOREIGN KEY',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: [
              'ALTER TABLE ${1:table_name}',
              'ADD CONSTRAINT ${2:fk_name}',
              'FOREIGN KEY (${3:column_name})',
              'REFERENCES ${4:referenced_table}(${5:referenced_column});'
            ].join('\n'),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Add a foreign key constraint'
          }
        ];
        
        return { suggestions };
      }
    });

    // Real-time validation and parsing
    editor.onDidChangeModelContent(() => {
      const value = editor.getValue();
      validateAndParseSQL(value);
    });

    // Auto-execute on semicolon
    editor.onKeyDown((e: any) => {
      if (e.keyCode === monaco.KeyCode.Semicolon && autoApplyEnabled) {
        setTimeout(() => {
          const value = editor.getValue();
          const cursorPosition = editor.getPosition();
          const statement = extractStatementAtCursor(value, cursorPosition);
          
          if (statement && (statement.trim().toUpperCase().startsWith('CREATE') || 
                           statement.trim().toUpperCase().startsWith('ALTER') ||
                           statement.trim().toUpperCase().startsWith('DROP'))) {
            handleAutoExecute(statement);
          }
        }, 100);
      }
    });
  };

  const validateAndParseSQL = useCallback((sql: string) => {
    const errors: SQLError[] = [];
    const statements: ParsedStatement[] = [];
    const sqlStatements = sql.split(';').filter(stmt => stmt.trim());
    
    sqlStatements.forEach((statement, index) => {
      const trimmed = statement.trim().toUpperCase();
      const parsed = parseStatement(statement.trim());
      statements.push(parsed);
      
      // Basic syntax validation
      if (trimmed.startsWith('CREATE TABLE')) {
        const tableMatch = statement.match(/CREATE TABLE\s+(\w+)/i);
        if (tableMatch) {
          const tableName = tableMatch[1];
          const existingTable = currentSchema.tables.find(t => 
            t.name.toLowerCase() === tableName.toLowerCase()
          );
          
          if (existingTable) {
            errors.push({
              line: index + 1,
              column: 1,
              message: `Table "${tableName}" already exists`,
              severity: 'warning'
            });
          }
        }
      }
      
      // Check for missing semicolons
      if (trimmed && !statement.trim().endsWith(';') && index < sqlStatements.length - 1) {
        errors.push({
          line: index + 1,
          column: statement.length,
          message: 'Missing semicolon',
          severity: 'error'
        });
      }

      // Validate foreign key references
      if (trimmed.includes('REFERENCES')) {
        const refMatch = statement.match(/REFERENCES\s+(\w+)\s*\(\s*(\w+)\s*\)/i);
        if (refMatch) {
          const [, refTable, refColumn] = refMatch;
          const referencedTable = currentSchema.tables.find(t => 
            t.name.toLowerCase() === refTable.toLowerCase()
          );
          
          if (!referencedTable) {
            errors.push({
              line: index + 1,
              column: 1,
              message: `Referenced table "${refTable}" does not exist`,
              severity: 'error'
            });
          } else {
            const referencedColumn = referencedTable.columns.find(c => 
              c.name.toLowerCase() === refColumn.toLowerCase()
            );
            if (!referencedColumn) {
              errors.push({
                line: index + 1,
                column: 1,
                message: `Referenced column "${refColumn}" does not exist in table "${refTable}"`,
                severity: 'error'
              });
            }
          }
        }
      }
    });
    
    setSqlErrors(errors);
    setParsedStatements(statements);
    
    // Update editor markers
    if (editorRef.current) {
      const monaco = (window as any).monaco;
      if (monaco) {
        const markers = errors.map(error => ({
          startLineNumber: error.line,
          startColumn: error.column,
          endLineNumber: error.line,
          endColumn: error.column + 10,
          message: error.message,
          severity: error.severity === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning
        }));
        
        monaco.editor.setModelMarkers(editorRef.current.getModel(), 'sql-validation', markers);
      }
    }
  }, [currentSchema.tables, autoApplyEnabled]);

  const parseStatement = (statement: string): ParsedStatement => {
    const trimmed = statement.trim().toUpperCase();
    
    try {
      if (trimmed.startsWith('CREATE TABLE')) {
        const tableMatch = statement.match(/CREATE TABLE\s+(\w+)/i);
        const tableName = tableMatch?.[1];
        
        // Parse columns
        const columnsMatch = statement.match(/\((.*)\)/s);
        const columns: any[] = [];
        
        if (columnsMatch) {
          const columnDefs = columnsMatch[1].split(',');
          columnDefs.forEach(colDef => {
            const parts = colDef.trim().split(/\s+/);
            if (parts.length >= 2) {
              columns.push({
                name: parts[0],
                type: parts[1],
                nullable: !colDef.toUpperCase().includes('NOT NULL'),
                isPrimaryKey: colDef.toUpperCase().includes('PRIMARY KEY'),
                isUnique: colDef.toUpperCase().includes('UNIQUE')
              });
            }
          });
        }
        
        return {
          type: 'CREATE_TABLE',
          tableName,
          columns,
          valid: true
        };
      } else if (trimmed.startsWith('ALTER TABLE')) {
        const tableMatch = statement.match(/ALTER TABLE\s+(\w+)/i);
        const tableName = tableMatch?.[1];
        
        let operation = 'UNKNOWN';
        if (trimmed.includes('ADD COLUMN')) operation = 'ADD_COLUMN';
        else if (trimmed.includes('DROP COLUMN')) operation = 'DROP_COLUMN';
        else if (trimmed.includes('ADD CONSTRAINT')) operation = 'ADD_CONSTRAINT';
        else if (trimmed.includes('DROP CONSTRAINT')) operation = 'DROP_CONSTRAINT';
        
        return {
          type: 'ALTER_TABLE',
          tableName,
          operation,
          valid: true
        };
      } else if (trimmed.startsWith('DROP TABLE')) {
        const tableMatch = statement.match(/DROP TABLE\s+(\w+)/i);
        const tableName = tableMatch?.[1];
        
        return {
          type: 'DROP_TABLE',
          tableName,
          valid: true
        };
      }
      
      return {
        type: 'SELECT',
        valid: true
      };
    } catch (error) {
      return {
        type: 'SELECT',
        valid: false,
        error: error instanceof Error ? error.message : 'Parse error'
      };
    }
  };

  const extractStatementAtCursor = (text: string, position: any): string => {
    const lines = text.split('\n');
    let statement = '';
    
    // Look backwards from cursor to find statement start
    for (let i = position.lineNumber - 1; i >= 0; i--) {
      const line = lines[i];
      if (i === position.lineNumber - 1) {
        statement = line.substring(0, position.column) + statement;
      } else {
        statement = line + '\n' + statement;
      }
      
      if (line.includes(';') && i < position.lineNumber - 1) {
        const semicolonIndex = line.lastIndexOf(';');
        statement = line.substring(semicolonIndex + 1) + '\n' + statement.substring(line.length + 1);
        break;
      }
    }
    
    return statement.trim();
  };

  const handleAutoExecute = async (statement: string) => {
    try {
      setLastExecutedStatement(statement);
      parseSQLStatement(statement);
      
      // Show success indicator
      setResult({
        type: 'schema_update',
        message: 'Schema updated successfully',
        statement: statement.trim()
      });
      
      // Clear after 3 seconds
      setTimeout(() => {
        if (result?.type === 'schema_update') {
          setResult(null);
        }
      }, 3000);
    } catch (error) {
      setResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        statement: statement.trim()
      });
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) return;
    
    setIsExecuting(true);
    const startTime = Date.now();
    
    try {
      const result = await executeSQL(query);
      const executionTime = Date.now() - startTime;
      
      setResult({
        type: 'query_result',
        columns: result.columns || [],
        values: result.values || [],
        executionTime,
      });
    } catch (error) {
      setResult({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        executionTime: Date.now() - startTime,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const copyQuery = () => {
    navigator.clipboard.writeText(query);
  };

  const clearQuery = () => {
    setQuery('');
    setResult(null);
    setSqlErrors([]);
    setParsedStatements([]);
  };

  const loadSchemaSQL = () => {
    const schemaSQL = generateSQL();
    setQuery(schemaSQL);
  };

  const exportCurrentSchema = () => {
    const sql = generateSQL();
    const blob = new Blob([sql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Use schema name for filename
    const sanitizedName = currentSchema.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    a.download = `${sanitizedName || 'database_schema'}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const insertSnippet = (snippet: string) => {
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      editorRef.current.executeEdits('', [{
        range: selection,
        text: snippet,
        forceMoveMarkers: true,
      }]);
      editorRef.current.focus();
    }
  };

  const snippets = [
    { 
      name: 'CREATE TABLE', 
      code: `CREATE TABLE table_name (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);` 
    },
    { 
      name: 'ALTER ADD COLUMN', 
      code: 'ALTER TABLE table_name ADD COLUMN column_name VARCHAR(255);' 
    },
    { 
      name: 'ALTER DROP COLUMN', 
      code: 'ALTER TABLE table_name DROP COLUMN column_name;' 
    },
    { 
      name: 'ADD FOREIGN KEY', 
      code: `ALTER TABLE table_name 
ADD CONSTRAINT fk_name 
FOREIGN KEY (column_name) 
REFERENCES other_table(id);` 
    },
    { 
      name: 'CREATE INDEX', 
      code: 'CREATE INDEX idx_name ON table_name (column_name);' 
    },
    { 
      name: 'ADD PRIMARY KEY', 
      code: 'ALTER TABLE table_name ADD PRIMARY KEY (column_name);' 
    },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-blue-100 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Live SQL Editor
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Type DDL statements to update schema in real-time
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoApplyEnabled}
                onChange={(e) => setAutoApplyEnabled(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700 dark:text-gray-300">Auto-apply DDL</span>
            </label>
            
            {sqlErrors.length > 0 && (
              <div className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span>{sqlErrors.length} issue{sqlErrors.length !== 1 ? 's' : ''}</span>
              </div>
            )}
            {validationErrors.length === 0 && sqlErrors.length === 0 && (
              <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <Check className="w-4 h-4" />
                <span>Valid</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Snippets */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {snippets.map((snippet) => (
            <button
              key={snippet.name}
              onClick={() => insertSnippet(snippet.code)}
              className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors duration-200 text-left truncate"
              title={snippet.code}
            >
              {snippet.name}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <div className="h-64 border-b border-gray-200 dark:border-gray-700">
          <Editor
            height="100%"
            language="sql"
            theme={isDark ? 'vs-dark' : 'vs-light'}
            value={query}
            onChange={(value) => setQuery(value || '')}
            onMount={handleEditorDidMount}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              lineNumbers: 'on',
              folding: true,
              automaticLayout: true,
            }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={executeQuery}
            disabled={isExecuting || !query.trim()}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
          >
            <Play className="w-4 h-4" />
            {isExecuting ? 'Executing...' : 'Execute Query'}
          </button>
          
          <button
            onClick={loadSchemaSQL}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors duration-200 text-sm"
          >
            <Database className="w-4 h-4" />
            Load Schema
          </button>
          
          <button
            onClick={exportCurrentSchema}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200 text-sm"
          >
            <Save className="w-4 h-4" />
            Export Schema
          </button>
          
          <button
            onClick={copyQuery}
            className="flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors duration-200 text-sm"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
          
          <button
            onClick={clearQuery}
            className="flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors duration-200 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Clear
          </button>

          <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
            {lastExecutedStatement && (
              <span>Last executed: {lastExecutedStatement.substring(0, 30)}...</span>
            )}
          </div>
        </div>

        {/* Parsed Statements Preview */}
        {parsedStatements.length > 0 && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Parsed Statements ({parsedStatements.length})
            </h4>
            <div className="space-y-1">
              {parsedStatements.map((stmt, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  {stmt.valid ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <X className="w-3 h-3 text-red-600" />
                  )}
                  <span className="text-blue-700 dark:text-blue-300">
                    {stmt.type} {stmt.tableName && `- ${stmt.tableName}`} {stmt.operation && `(${stmt.operation})`}
                  </span>
                  {stmt.error && (
                    <span className="text-red-600 dark:text-red-400">- {stmt.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-auto">
          {result && (
            <div className="p-4">
              {result.type === 'error' ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">SQL Error</span>
                  </div>
                  <p className="text-red-700 dark:text-red-300 text-sm font-mono">
                    {result.message}
                  </p>
                  {result.statement && (
                    <div className="mt-2 p-2 bg-red-100 dark:bg-red-800/20 rounded text-xs font-mono">
                      {result.statement}
                    </div>
                  )}
                </div>
              ) : result.type === 'schema_update' ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                    <Check className="w-4 h-4" />
                    <span className="font-medium">Schema Updated</span>
                  </div>
                  <p className="text-green-700 dark:text-green-300 text-sm">
                    {result.message}
                  </p>
                  <div className="mt-2 p-2 bg-green-100 dark:bg-green-800/20 rounded text-xs font-mono">
                    {result.statement}
                  </div>
                </div>
              ) : result.type === 'query_result' ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Query Results ({result.values.length} rows)
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Executed in {result.executionTime}ms
                    </span>
                  </div>
                  
                  {result.values.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            {result.columns.map((column: string, index: number) => (
                              <th
                                key={index}
                                className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700"
                              >
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.values.map((row: any[], rowIndex: number) => (
                            <tr
                              key={rowIndex}
                              className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
                            >
                              {row.map((cell: any, cellIndex: number) => (
                                <td
                                  key={cellIndex}
                                  className="px-4 py-2 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700"
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No results returned
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* SQL Errors */}
          {sqlErrors.length > 0 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                SQL Issues ({sqlErrors.length})
              </h4>
              <div className="space-y-2">
                {sqlErrors.map((error, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border flex items-start gap-2 ${
                      error.severity === 'error'
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                    }`}
                  >
                    <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      error.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                    }`} />
                    <div>
                      <div className={`text-sm font-medium ${
                        error.severity === 'error' ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'
                      }`}>
                        Line {error.line}, Column {error.column}
                      </div>
                      <div className={`text-sm ${
                        error.severity === 'error' ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'
                      }`}>
                        {error.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveSQLEditor;
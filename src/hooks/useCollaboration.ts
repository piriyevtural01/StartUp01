import { useEffect, useState, useCallback } from 'react';
import { collaborationService, SchemaChange, UserSelection, CollaborationUser } from '../services/collaborationService';
import { useDatabase } from '../context/DatabaseContext';

interface UseCollaborationOptions {
  workspaceId: string;
  user: { id: string; username: string };
  autoConnect?: boolean;
}

interface CollaborationState {
  isConnected: boolean;
  collaborators: CollaborationUser[];
  userSelections: Map<string, UserSelection>;
  cursorPositions: Map<string, { x: number; y: number; timestamp: number }>;
  pendingChanges: SchemaChange[];
  connectionError: string | null;
}

export const useCollaboration = ({ workspaceId, user, autoConnect = true }: UseCollaborationOptions) => {
  const { 
    addTable, 
    updateTable, 
    removeTable, 
    addRelationship, 
    removeRelationship,
    addColumn,
    removeColumn,
    updateColumn
  } = useDatabase();

  const [state, setState] = useState<CollaborationState>({
    isConnected: false,
    collaborators: [],
    userSelections: new Map(),
    cursorPositions: new Map(),
    pendingChanges: [],
    connectionError: null
  });

  // Connect to collaboration service
  const connect = useCallback(async () => {
    try {
      const connected = await collaborationService.connectToWorkspace(workspaceId, user);
      setState(prev => ({ 
        ...prev, 
        isConnected: connected, 
        connectionError: connected ? null : 'Failed to connect' 
      }));
      return connected;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        connectionError: error instanceof Error ? error.message : 'Connection failed' 
      }));
      return false;
    }
  }, [workspaceId, user]);

  // Disconnect from collaboration service
  const disconnect = useCallback(() => {
    collaborationService.disconnect();
    setState(prev => ({ 
      ...prev, 
      isConnected: false, 
      collaborators: [],
      userSelections: new Map(),
      cursorPositions: new Map()
    }));
  }, []);

  // Broadcast schema changes
  const broadcastSchemaChange = useCallback((type: SchemaChange['type'], data: any) => {
    collaborationService.broadcastSchemaChange({ type, data });
  }, []);

  // Broadcast user selection
  const broadcastSelection = useCallback((elementType: 'table' | 'column' | 'relationship', elementId: string, elementName: string) => {
    collaborationService.broadcastUserSelection({
      elementType,
      elementId,
      elementName
    });
  }, []);

  // Broadcast cursor movement
  const broadcastCursor = useCallback((position: { x: number; y: number }) => {
    collaborationService.broadcastCursorMove(position);
  }, []);

  // Handle incoming schema changes
  const handleSchemaChange = useCallback((change: SchemaChange) => {
    console.log('Applying schema change:', change);
    
    try {
      switch (change.type) {
        case 'table_created':
          addTable(change.data);
          break;
        case 'table_updated':
          updateTable(change.data.id, change.data.updates);
          break;
        case 'table_deleted':
          removeTable(change.data.tableId);
          break;
        case 'relationship_created':
          addRelationship(change.data);
          break;
        case 'relationship_deleted':
          removeRelationship(change.data.relationshipId);
          break;
        case 'column_added':
          addColumn(change.data.tableId, change.data.column);
          break;
        case 'column_updated':
          updateColumn(change.data.tableId, change.data.columnId, change.data.updates);
          break;
        case 'column_deleted':
          removeColumn(change.data.tableId, change.data.columnId);
          break;
        default:
          console.warn('Unknown schema change type:', change.type);
      }
    } catch (error) {
      console.error('Error applying schema change:', error);
    }
  }, [addTable, updateTable, removeTable, addRelationship, removeRelationship, addColumn, removeColumn, updateColumn]);

  // Handle user selections
  const handleUserSelection = useCallback((selection: UserSelection) => {
    setState(prev => ({
      ...prev,
      userSelections: new Map(prev.userSelections.set(selection.userId, selection))
    }));
  }, []);

  // Handle user joining
  const handleUserJoined = useCallback((user: CollaborationUser) => {
    setState(prev => ({
      ...prev,
      collaborators: [...prev.collaborators.filter(c => c.id !== user.id), user]
    }));
  }, []);

  // Handle user leaving
  const handleUserLeft = useCallback((user: { id: string; username: string }) => {
    setState(prev => ({
      ...prev,
      collaborators: prev.collaborators.filter(c => c.id !== user.id),
      userSelections: new Map([...prev.userSelections].filter(([key]) => key !== user.id)),
      cursorPositions: new Map([...prev.cursorPositions].filter(([key]) => key !== user.id))
    }));
  }, []);

  // Handle cursor movement
  const handleCursorMove = useCallback((data: { userId: string; username: string; position: { x: number; y: number }; timestamp: number }) => {
    setState(prev => ({
      ...prev,
      cursorPositions: new Map(prev.cursorPositions.set(data.userId, {
        x: data.position.x,
        y: data.position.y,
        timestamp: data.timestamp
      }))
    }));

    // Remove old cursor positions (older than 5 seconds)
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        cursorPositions: new Map([...prev.cursorPositions].filter(([, pos]) => 
          Date.now() - pos.timestamp < 5000
        ))
      }));
    }, 5000);
  }, []);

  // Handle connection events
  const handleConnected = useCallback(() => {
    setState(prev => ({ ...prev, isConnected: true, connectionError: null }));
  }, []);

  const handleDisconnected = useCallback(() => {
    setState(prev => ({ ...prev, isConnected: false }));
  }, []);

  const handleConnectionError = useCallback((error: any) => {
    setState(prev => ({ 
      ...prev, 
      isConnected: false, 
      connectionError: error.message || 'Connection error' 
    }));
  }, []);

  // Setup event listeners
  useEffect(() => {
    collaborationService.on('schema_change', handleSchemaChange);
    collaborationService.on('user_selection', handleUserSelection);
    collaborationService.on('user_joined', handleUserJoined);
    collaborationService.on('user_left', handleUserLeft);
    collaborationService.on('cursor_move', handleCursorMove);
    collaborationService.on('connected', handleConnected);
    collaborationService.on('disconnected', handleDisconnected);
    collaborationService.on('connection_error', handleConnectionError);

    return () => {
      collaborationService.off('schema_change', handleSchemaChange);
      collaborationService.off('user_selection', handleUserSelection);
      collaborationService.off('user_joined', handleUserJoined);
      collaborationService.off('user_left', handleUserLeft);
      collaborationService.off('cursor_move', handleCursorMove);
      collaborationService.off('connected', handleConnected);
      collaborationService.off('disconnected', handleDisconnected);
      collaborationService.off('connection_error', handleConnectionError);
    };
  }, [
    handleSchemaChange,
    handleUserSelection,
    handleUserJoined,
    handleUserLeft,
    handleCursorMove,
    handleConnected,
    handleDisconnected,
    handleConnectionError
  ]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && workspaceId && user.id) {
      connect();
    }

    return () => {
      if (autoConnect) {
        disconnect();
      }
    };
  }, [autoConnect, workspaceId, user.id, connect, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    broadcastSchemaChange,
    broadcastSelection,
    broadcastCursor,
    getUserColor: collaborationService.getUserColor.bind(collaborationService)
  };
};
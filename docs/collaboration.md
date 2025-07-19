# Real-time Collaboration Guide

This guide explains how to use and implement the real-time collaboration features in the Database Schema Designer.

## Overview

The collaboration system allows multiple users to work on the same database schema simultaneously with real-time synchronization of changes, visual indicators of user presence, and conflict resolution.

## Architecture

### WebSocket Communication
- **Socket.io** for real-time bidirectional communication
- **Room-based** collaboration (one room per workspace)
- **JWT authentication** for secure connections
- **Automatic reconnection** with exponential backoff

### State Synchronization
- **Operational Transformation** for conflict-free updates
- **Event sourcing** for change history
- **Optimistic updates** with rollback on conflicts
- **Persistent state** across page reloads

## User Roles and Permissions

### Owner
- Full access to all features
- Can invite/remove collaborators
- Can change workspace settings
- Can delete the workspace

### Editor
- Can modify schema structure
- Can add/edit/delete tables and relationships
- Can export schema
- Cannot manage team members

### Viewer
- Read-only access to schema
- Can view real-time changes
- Can export schema (if permitted)
- Cannot modify anything

## Collaboration Features

### Real-time Schema Updates
```typescript
// Example: Broadcasting a table creation
collaborationService.broadcastSchemaChange({
  type: 'table_created',
  data: {
    id: 'table_123',
    name: 'users',
    columns: [...],
    position: { x: 100, y: 100 }
  }
});
```

### Visual Presence Indicators
- **User cursors** with names and colors
- **Selection highlighting** when users edit elements
- **Activity indicators** showing what users are doing
- **Online/offline status** for all collaborators

### Conflict Resolution
```typescript
// Automatic conflict detection
if (change.timestamp < lastKnownTimestamp) {
  // Conflict detected - show resolution dialog
  showConflictResolution({
    localChange: currentChange,
    remoteChange: incomingChange,
    conflictType: 'concurrent_edit'
  });
}
```

## Implementation Guide

### Setting Up Collaboration

1. **Initialize the collaboration service**
```typescript
import { useCollaboration } from '../hooks/useCollaboration';

const MyComponent = () => {
  const {
    isConnected,
    collaborators,
    broadcastSchemaChange,
    broadcastSelection
  } = useCollaboration({
    workspaceId: 'workspace_123',
    user: { id: 'user_456', username: 'John Doe' }
  });
  
  // Component logic...
};
```

2. **Handle schema changes**
```typescript
const handleTableCreate = (tableData) => {
  // Update local state
  addTable(tableData);
  
  // Broadcast to collaborators
  broadcastSchemaChange('table_created', tableData);
};
```

3. **Show user selections**
```typescript
const handleElementSelect = (elementId, elementType) => {
  // Update local selection
  setSelectedElement(elementId);
  
  // Broadcast selection
  broadcastSelection(elementType, elementId, elementName);
};
```

### WebSocket Events

#### Schema Events
- `schema_change` - Table/relationship modifications
- `table_created` - New table added
- `table_updated` - Table structure changed
- `table_deleted` - Table removed
- `relationship_created` - New relationship added
- `relationship_deleted` - Relationship removed

#### User Events
- `user_joined` - User enters workspace
- `user_left` - User leaves workspace
- `user_selection` - User selects element
- `cursor_move` - User moves cursor
- `user_activity` - User performs action

#### System Events
- `conflict_detected` - Schema conflict found
- `workspace_updated` - Workspace settings changed
- `access_revoked` - User access removed
- `connection_lost` - Network disconnection

### Error Handling

```typescript
// Connection error handling
collaborationService.on('connection_error', (error) => {
  console.error('Collaboration error:', error);
  showNotification('Connection lost. Attempting to reconnect...', 'error');
});

// Conflict resolution
collaborationService.on('conflict_detected', (conflict) => {
  showConflictDialog({
    localChange: conflict.local,
    remoteChange: conflict.remote,
    onResolve: (resolution) => {
      collaborationService.resolveConflict(conflict.id, resolution);
    }
  });
});
```

## Best Practices

### Performance Optimization
- **Debounce** cursor movements (max 10 updates/second)
- **Batch** multiple changes when possible
- **Compress** large schema updates
- **Cache** user presence data locally

### User Experience
- **Visual feedback** for all collaborative actions
- **Clear indicators** of who is editing what
- **Smooth animations** for remote changes
- **Offline support** with sync on reconnection

### Security Considerations
- **Validate** all incoming changes
- **Authenticate** WebSocket connections
- **Rate limit** to prevent spam
- **Sanitize** user input before broadcasting

## Troubleshooting

### Common Issues

#### Connection Problems
```typescript
// Check connection status
if (!collaborationService.connected) {
  // Attempt manual reconnection
  await collaborationService.connect();
}
```

#### Sync Issues
```typescript
// Force full sync
collaborationService.requestFullSync();

// Reset local state
collaborationService.resetWorkspace();
```

#### Performance Issues
```typescript
// Reduce update frequency
collaborationService.setUpdateThrottle(500); // 500ms

// Disable animations for large schemas
if (schema.tables.length > 50) {
  setAnimationsEnabled(false);
}
```

### Debug Mode
Enable debug logging:
```typescript
localStorage.setItem('collaboration_debug', 'true');
```

This will log all WebSocket events and state changes to the console.

## Testing Collaboration

### Manual Testing
1. Open multiple browser windows
2. Login as different users
3. Join the same workspace
4. Make simultaneous changes
5. Verify real-time updates

### Automated Testing
```typescript
// Example integration test
describe('Real-time Collaboration', () => {
  it('should sync table creation across users', async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    
    await user1.joinWorkspace('test_workspace');
    await user2.joinWorkspace('test_workspace');
    
    await user1.createTable({ name: 'users', columns: [...] });
    
    // Verify user2 sees the new table
    await waitFor(() => {
      expect(user2.getSchema().tables).toHaveLength(1);
    });
  });
});
```

## Advanced Features

### Custom Event Types
```typescript
// Define custom collaboration events
interface CustomSchemaEvent {
  type: 'bulk_import' | 'schema_template_applied';
  data: any;
  metadata: {
    source: string;
    version: string;
  };
}

// Broadcast custom events
collaborationService.broadcastCustomEvent({
  type: 'bulk_import',
  data: importedSchema,
  metadata: { source: 'sql_file', version: '1.0' }
});
```

### Presence Awareness
```typescript
// Track detailed user activity
collaborationService.updateUserActivity({
  action: 'editing_column',
  target: { tableId: 'table_123', columnId: 'col_456' },
  details: { fieldName: 'data_type', oldValue: 'VARCHAR(50)', newValue: 'VARCHAR(100)' }
});
```

### Workspace Persistence
```typescript
// Save workspace state to MongoDB
await collaborationService.saveWorkspaceSnapshot({
  schema: currentSchema,
  collaborators: activeUsers,
  lastModified: new Date(),
  version: schemaVersion
});
```

## Migration Guide

### From Single-user to Collaborative
1. **Add collaboration hooks** to existing components
2. **Wrap schema operations** with broadcast calls
3. **Add user presence** indicators to UI
4. **Implement conflict resolution** dialogs
5. **Test with multiple users** thoroughly

### Database Schema Updates
```sql
-- Add collaboration tables
CREATE TABLE workspaces (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workspace_members (
  id VARCHAR(255) PRIMARY KEY,
  workspace_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  role ENUM('owner', 'editor', 'viewer') NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);
```

This collaboration system provides a robust foundation for real-time multi-user database schema editing with enterprise-grade features and reliability.
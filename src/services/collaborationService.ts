// Real-time collaboration service for database schema editing
import { io, Socket } from 'socket.io-client';

export interface SchemaChange {
  type: 'table_created' | 'table_updated' | 'table_deleted' | 'relationship_created' | 'relationship_deleted' | 'column_added' | 'column_updated' | 'column_deleted';
  data: any;
  userId: string;
  username: string;
  timestamp: number;
  workspaceId: string;
}

export interface UserSelection {
  userId: string;
  username: string;
  elementType: 'table' | 'column' | 'relationship';
  elementId: string;
  elementName: string;
  timestamp: number;
}

export interface CollaborationUser {
  id: string;
  username: string;
  role: 'owner' | 'editor' | 'viewer';
  isOnline: boolean;
  lastSeen: Date;
  currentSelection?: UserSelection;
  cursorPosition?: { x: number; y: number };
  color: string;
}

class CollaborationService {
  private socket: Socket | null = null;
  private workspaceId: string | null = null;
  private currentUser: { id: string; username: string } | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private pendingChanges: SchemaChange[] = [];

  // User colors for visual distinction
  private userColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
    '#F97316', '#6366F1', '#14B8A6', '#F59E0B'
  ];

  constructor() {
    this.setupEventHandlers();
  }

  // Connect to workspace for real-time collaboration
  async connectToWorkspace(workspaceId: string, user: { id: string; username: string }): Promise<boolean> {
    try {
      this.workspaceId = workspaceId;
      this.currentUser = user;
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      this.socket = io(import.meta.env.VITE_WS_URL || 'ws://localhost:5000', {
        auth: { token },
        query: { workspaceId, userId: user.id, username: user.username },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true
      });

      return new Promise((resolve, reject) => {
        this.socket!.on('connect', () => {
          console.log('Connected to workspace collaboration:', workspaceId);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.processPendingChanges();
          this.emit('connected', { workspaceId, user });
          resolve(true);
        });

        this.socket!.on('connect_error', (error) => {
          console.error('Collaboration connection error:', error);
          this.isConnected = false;
          this.emit('connection_error', error);
          reject(error);
        });

        this.socket!.on('disconnect', (reason) => {
          console.log('Disconnected from collaboration:', reason);
          this.isConnected = false;
          this.emit('disconnected', reason);
          this.handleReconnection();
        });

        // Schema change events
        this.socket!.on('schema_change', this.handleSchemaChange.bind(this));
        this.socket!.on('user_selection', this.handleUserSelection.bind(this));
        this.socket!.on('user_joined', this.handleUserJoined.bind(this));
        this.socket!.on('user_left', this.handleUserLeft.bind(this));
        this.socket!.on('cursor_move', this.handleCursorMove.bind(this));
        this.socket!.on('workspace_updated', this.handleWorkspaceUpdated.bind(this));
        this.socket!.on('access_revoked', this.handleAccessRevoked.bind(this));
        this.socket!.on('conflict_detected', this.handleConflictDetected.bind(this));
      });
    } catch (error) {
      console.error('Failed to connect to workspace collaboration:', error);
      return false;
    }
  }

  // Disconnect from workspace
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.workspaceId = null;
    this.currentUser = null;
    this.isConnected = false;
    this.pendingChanges = [];
    this.emit('disconnected', 'manual');
  }

  // Send schema change to other collaborators
  broadcastSchemaChange(change: Omit<SchemaChange, 'userId' | 'username' | 'timestamp' | 'workspaceId'>): void {
    if (!this.socket || !this.isConnected || !this.currentUser || !this.workspaceId) {
      // Queue for later if disconnected
      this.pendingChanges.push({
        ...change,
        userId: this.currentUser?.id || 'unknown',
        username: this.currentUser?.username || 'Unknown',
        timestamp: Date.now(),
        workspaceId: this.workspaceId || ''
      });
      return;
    }

    const fullChange: SchemaChange = {
      ...change,
      userId: this.currentUser.id,
      username: this.currentUser.username,
      timestamp: Date.now(),
      workspaceId: this.workspaceId
    };

    this.socket.emit('schema_change', fullChange);
    console.log('Broadcasting schema change:', fullChange);
  }

  // Send user selection to other collaborators
  broadcastUserSelection(selection: Omit<UserSelection, 'userId' | 'username' | 'timestamp'>): void {
    if (!this.socket || !this.isConnected || !this.currentUser) return;

    const fullSelection: UserSelection = {
      ...selection,
      userId: this.currentUser.id,
      username: this.currentUser.username,
      timestamp: Date.now()
    };

    this.socket.emit('user_selection', fullSelection);
  }

  // Send cursor position to other collaborators
  broadcastCursorMove(position: { x: number; y: number }): void {
    if (!this.socket || !this.isConnected || !this.currentUser) return;

    this.socket.emit('cursor_move', {
      userId: this.currentUser.id,
      username: this.currentUser.username,
      position,
      timestamp: Date.now()
    });
  }

  // Event subscription
  on(eventType: string, handler: Function): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  off(eventType: string, handler: Function): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Get user color based on user ID
  getUserColor(userId: string): string {
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return this.userColors[Math.abs(hash) % this.userColors.length];
  }

  // Private event handlers
  private setupEventHandlers(): void {
    // Setup default event handlers
  }

  private handleSchemaChange(change: SchemaChange): void {
    // Don't process our own changes
    if (change.userId === this.currentUser?.id) return;

    console.log('Received schema change from', change.username, ':', change);
    this.emit('schema_change', change);
  }

  private handleUserSelection(selection: UserSelection): void {
    // Don't process our own selections
    if (selection.userId === this.currentUser?.id) return;

    console.log('User selection from', selection.username, ':', selection);
    this.emit('user_selection', selection);
  }

  private handleUserJoined(user: CollaborationUser): void {
    console.log('User joined workspace:', user.username);
    this.emit('user_joined', user);
  }

  private handleUserLeft(user: { id: string; username: string }): void {
    console.log('User left workspace:', user.username);
    this.emit('user_left', user);
  }

  private handleCursorMove(data: { userId: string; username: string; position: { x: number; y: number }; timestamp: number }): void {
    // Don't process our own cursor
    if (data.userId === this.currentUser?.id) return;

    this.emit('cursor_move', data);
  }

  private handleWorkspaceUpdated(data: any): void {
    console.log('Workspace updated:', data);
    this.emit('workspace_updated', data);
  }

  private handleAccessRevoked(): void {
    console.log('Access to workspace revoked');
    this.emit('access_revoked');
    this.disconnect();
  }

  private handleConflictDetected(conflict: any): void {
    console.warn('Schema conflict detected:', conflict);
    this.emit('conflict_detected', conflict);
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('connection_failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.workspaceId && this.currentUser && !this.isConnected) {
        this.connectToWorkspace(this.workspaceId, this.currentUser);
      }
    }, delay);
  }

  private processPendingChanges(): void {
    if (this.pendingChanges.length === 0) return;

    console.log(`Processing ${this.pendingChanges.length} pending changes`);
    
    this.pendingChanges.forEach(change => {
      this.socket!.emit('schema_change', change);
    });
    
    this.pendingChanges = [];
  }

  private emit(eventType: string, data?: any): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in event handler:', error);
        }
      });
    }
  }

  // Public getters
  get connected(): boolean {
    return this.isConnected;
  }

  get currentWorkspace(): string | null {
    return this.workspaceId;
  }

  get user(): { id: string; username: string } | null {
    return this.currentUser;
  }
}

export const collaborationService = new CollaborationService();
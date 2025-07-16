// WebSocket Service for Real-time Collaboration
import { io, Socket } from 'socket.io-client';

export interface WorkspaceEvent {
  type: 'schema_change' | 'data_change' | 'user_joined' | 'user_left' | 'permission_changed' | 'workspace_revoked';
  payload: any;
  userId: string;
  timestamp: number;
}

export interface CollaborationUser {
  id: string;
  username: string;
  role: 'owner' | 'editor' | 'viewer';
  isOnline: boolean;
  lastSeen: Date;
  currentAction?: string; // "editing table users", "typing in column name", etc.
}

class WebSocketService {
  private socket: Socket | null = null;
  private workspaceId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventHandlers: Map<string, Function[]> = new Map();
  private pendingChanges: WorkspaceEvent[] = [];
  private isConnected = false;

  constructor() {
    this.setupEventHandlers();
  }

  // Initialize connection to workspace
  async connectToWorkspace(workspaceId: string, token: string): Promise<boolean> {
    try {
      this.workspaceId = workspaceId;
      
      this.socket = io(import.meta.env.VITE_WS_URL || 'ws://localhost:5000', {
        auth: { token },
        query: { workspaceId },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true
      });

      return new Promise((resolve, reject) => {
        this.socket!.on('connect', () => {
          console.log('Connected to workspace:', workspaceId);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.processPendingChanges();
          resolve(true);
        });

        this.socket!.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.isConnected = false;
          reject(error);
        });

        this.socket!.on('disconnect', (reason) => {
          console.log('Disconnected from workspace:', reason);
          this.isConnected = false;
          this.handleReconnection();
        });

        // Workspace-specific events
        this.socket!.on('workspace_event', this.handleWorkspaceEvent.bind(this));
        this.socket!.on('user_activity', this.handleUserActivity.bind(this));
        this.socket!.on('conflict_detected', this.handleConflict.bind(this));
        this.socket!.on('workspace_revoked', this.handleWorkspaceRevoked.bind(this));
        this.socket!.on('permission_updated', this.handlePermissionUpdate.bind(this));
      });
    } catch (error) {
      console.error('Failed to connect to workspace:', error);
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
    this.isConnected = false;
    this.pendingChanges = [];
  }

  // Send workspace event
  sendEvent(event: Omit<WorkspaceEvent, 'userId' | 'timestamp'>): void {
    if (!this.socket || !this.isConnected) {
      // Queue for later if disconnected
      this.pendingChanges.push({
        ...event,
        userId: this.getCurrentUserId(),
        timestamp: Date.now()
      });
      return;
    }

    const fullEvent: WorkspaceEvent = {
      ...event,
      userId: this.getCurrentUserId(),
      timestamp: Date.now()
    };

    this.socket.emit('workspace_event', fullEvent);
  }

  // Send user activity (typing, editing, etc.)
  sendUserActivity(action: string): void {
    if (!this.socket || !this.isConnected) return;

    this.socket.emit('user_activity', {
      userId: this.getCurrentUserId(),
      action,
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

  // Private methods
  private setupEventHandlers(): void {
    // Setup default event handlers
  }

  private handleWorkspaceEvent(event: WorkspaceEvent): void {
    // Don't process our own events
    if (event.userId === this.getCurrentUserId()) return;

    console.log('Received workspace event:', event);
    this.emit('workspace_event', event);
  }

  private handleUserActivity(activity: any): void {
    this.emit('user_activity', activity);
  }

  private handleConflict(conflict: any): void {
    console.warn('Conflict detected:', conflict);
    this.emit('conflict_detected', conflict);
  }

  private handleWorkspaceRevoked(): void {
    console.log('Workspace access revoked');
    this.emit('workspace_revoked');
    this.disconnect();
  }

  private handlePermissionUpdate(update: any): void {
    console.log('Permission updated:', update);
    this.emit('permission_updated', update);
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
      if (this.workspaceId && !this.isConnected) {
        const token = localStorage.getItem('token');
        if (token) {
          this.connectToWorkspace(this.workspaceId, token);
        }
      }
    }, delay);
  }

  private processPendingChanges(): void {
    if (this.pendingChanges.length === 0) return;

    console.log(`Processing ${this.pendingChanges.length} pending changes`);
    
    this.pendingChanges.forEach(change => {
      this.socket!.emit('workspace_event', change);
    });
    
    this.pendingChanges = [];
  }

  private emit(eventType: string, data?: any): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  private getCurrentUserId(): string {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user).id : 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  // Public getters
  get connected(): boolean {
    return this.isConnected;
  }

  get currentWorkspace(): string | null {
    return this.workspaceId;
  }
}

export const websocketService = new WebSocketService();
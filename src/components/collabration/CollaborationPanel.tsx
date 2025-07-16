import React, { useState, useEffect } from 'react';
import { 
  Users, Copy, Check, Shield, Wifi, WifiOff, UserPlus, 
    Crown,
  Edit,
  Eye,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { websocketService, CollaborationUser } from '../../services/websocketService';
import JoinWorkspaceDialog from './JoinWorkspaceDialog';
import ConflictResolutionDialog from './ConflictResolutionDialog';

interface CollaborationPanelProps {
  workspaceId: string;
  currentUser: {
    id: string;
    username: string;
    role: 'owner' | 'editor' | 'viewer';
  };
  joinCode?: string;
  onInviteUser: () => void;
  onRevokeAccess: (userId: string) => void;
  onJoinWorkspace: (joinCode: string) => Promise<boolean>;
}

const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  workspaceId,
  currentUser,
  joinCode,
  onInviteUser,
  onRevokeAccess,
  onJoinWorkspace
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaborationUser[]>([]);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [currentConflict, setCurrentConflict] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [userActivities, setUserActivities] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    // Initialize WebSocket connection
    const initializeConnection = async () => {
      const token = localStorage.getItem('token');
      if (token && workspaceId) {
        try {
          const connected = await websocketService.connectToWorkspace(workspaceId, token);
          setIsConnected(connected);
        } catch (error) {
          console.error('Failed to connect to workspace:', error);
          setIsConnected(false);
        }
      }
    };

    initializeConnection();

    // Setup event listeners
    const handleWorkspaceEvent = (event: any) => {
      console.log('Workspace event received:', event);
      // Handle different types of workspace events
      switch (event.type) {
        case 'user_joined':
          setCollaborators(prev => [...prev, event.payload.user]);
          break;
        case 'user_left':
          setCollaborators(prev => prev.filter(u => u.id !== event.payload.userId));
          break;
        case 'schema_change':
        case 'data_change':
          // These will be handled by the main database context
          break;
      }
    };

    const handleUserActivity = (activity: any) => {
      setUserActivities(prev => new Map(prev.set(activity.userId, activity.action)));
      
      // Clear activity after 3 seconds
      setTimeout(() => {
        setUserActivities(prev => {
          const newMap = new Map(prev);
          newMap.delete(activity.userId);
          return newMap;
        });
      }, 3000);
    };

    const handleConflictDetected = (conflict: any) => {
      setCurrentConflict(conflict);
      setShowConflictDialog(true);
    };

    const handleWorkspaceRevoked = () => {
      alert('Your access to this workspace has been revoked.');
      // Redirect to main page or clear workspace
      window.location.href = '/main';
    };

    websocketService.on('workspace_event', handleWorkspaceEvent);
    websocketService.on('user_activity', handleUserActivity);
    websocketService.on('conflict_detected', handleConflictDetected);
    websocketService.on('workspace_revoked', handleWorkspaceRevoked);

    return () => {
      websocketService.off('workspace_event', handleWorkspaceEvent);
      websocketService.off('user_activity', handleUserActivity);
      websocketService.off('conflict_detected', handleConflictDetected);
      websocketService.off('workspace_revoked', handleWorkspaceRevoked);
    };
  }, [workspaceId]);

  const copyJoinCode = async () => {
    if (joinCode) {
      try {
        await navigator.clipboard.writeText(joinCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } catch (error) {
        console.error('Failed to copy join code:', error);
      }
    }
  };

  const handleConflictResolution = (resolution: 'accept_local' | 'accept_remote' | 'merge') => {
    // Send resolution to server
    websocketService.sendEvent({
      type: 'schema_change',
      payload: {
        conflictId: (currentConflict as any)?.id,
        resolution
      }
    });
    
    setShowConflictDialog(false);
    setCurrentConflict(null);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700';
      case 'editor':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700';
      case 'viewer':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-3 h-3" />;
      case 'editor':
        return <Edit className="w-3 h-3" />;
      case 'viewer':
        return <Eye className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Team Collaboration
            </h3>
          </div>
          
          {/* Connection Status */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            isConnected 
              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
          }`}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>

        {/* Join Code Section */}
        {joinCode && currentUser.role === 'owner' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Join Code</p>
                <code className="text-lg font-mono font-bold text-blue-900 dark:text-blue-100">
                  {joinCode}
                </code>
              </div>
              <button
                onClick={copyJoinCode}
                className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800/20 rounded-lg transition-colors"
                title="Copy join code"
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Share this code with team members to invite them
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          {currentUser.role === 'owner' && (
            <button
              onClick={onInviteUser}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Invite User
            </button>
          )}
          
          <button
            onClick={() => setShowJoinDialog(true)}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
          >
            <Users className="w-4 h-4" />
            Join Workspace
          </button>
        </div>
      </div>

      {/* Collaborators List */}
      <div className="flex-1 overflow-y-auto p-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Active Collaborators ({collaborators.length + 1})
        </h4>
        
        <div className="space-y-2">
          {/* Current User */}
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {currentUser.username} (You)
                </p>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(currentUser.role)}`}>
                    {getRoleIcon(currentUser.role)}
                    <span className="ml-1">{currentUser.role}</span>
                  </span>
                  <div className="w-2 h-2 bg-green-500 rounded-full" title="Online" />
                </div>
              </div>
            </div>
          </div>

          {/* Other Collaborators */}
          {collaborators.map(user => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {user.username}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {getRoleIcon(user.role)}
                      <span className="ml-1">{user.role}</span>
                    </span>
                    <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} 
                         title={user.isOnline ? 'Online' : 'Offline'} />
                  </div>
                  {userActivities.has(user.id) && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 italic">
                      {userActivities.get(user.id)}
                    </p>
                  )}
                </div>
              </div>
              
              {currentUser.role === 'owner' && user.role !== 'owner' && (
                <button
                  onClick={() => onRevokeAccess(user.id)}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Revoke access"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <Shield className="w-4 h-4" />
            Permission Matrix
            <AlertCircle className="w-4 h-4 text-gray-400" />
          </summary>
          
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs">
            <div className="grid grid-cols-4 gap-2 mb-2 font-medium">
              <div>Action</div>
              <div className="text-center">Viewer</div>
              <div className="text-center">Editor</div>
              <div className="text-center">Owner</div>
            </div>
            
            {[
              { action: 'View Schema', viewer: true, editor: true, owner: true },
              { action: 'Edit Tables', viewer: false, editor: true, owner: true },
              { action: 'Export Data', viewer: false, editor: true, owner: true },
              { action: 'Invite Users', viewer: false, editor: false, owner: true },
              { action: 'Revoke Access', viewer: false, editor: false, owner: true },
            ].map((row, index) => (
              <div key={index} className="grid grid-cols-4 gap-2 py-1 text-gray-600 dark:text-gray-400">
                <div>{row.action}</div>
                <div className="text-center">{row.viewer ? '✅' : '❌'}</div>
                <div className="text-center">{row.editor ? '✅' : '❌'}</div>
                <div className="text-center">{row.owner ? '✅' : '❌'}</div>
              </div>
            ))}
          </div>
        </details>
      </div>

      {/* Dialogs */}
      <JoinWorkspaceDialog
        isOpen={showJoinDialog}
        onClose={() => setShowJoinDialog(false)}
        onJoin={onJoinWorkspace}
      />

      <ConflictResolutionDialog
        isOpen={showConflictDialog}
        conflict={currentConflict}
        onResolve={handleConflictResolution}
        onCancel={() => setShowConflictDialog(false)}
      />
    </div>
  );
};

export default CollaborationPanel;
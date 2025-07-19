import React, { useState, useEffect, useCallback } from 'react';
import { Users, Wifi, WifiOff, Eye, Edit, TextCursor as Cursor, MessageSquare, UserPlus, UserMinus, Crown, Shield } from 'lucide-react';
import { useDatabase } from '../../context/DatabaseContext';

interface CollaboratorCursor {
  userId: string;
  username: string;
  position: { x: number; y: number };
  selectedElement?: {
    type: 'table' | 'column' | 'relationship';
    id: string;
    tableId?: string;
  };
  color: string;
  lastSeen: Date;
}

interface CollaboratorActivity {
  userId: string;
  username: string;
  action: string;
  timestamp: Date;
  elementId?: string;
  elementType?: 'table' | 'column' | 'relationship';
}

const RealTimeCollaboration: React.FC = () => {
  const { currentSchema, syncWorkspaceWithMongoDB } = useDatabase();
  const [isConnected, setIsConnected] = useState(true);
  const [collaborators, setCollaborators] = useState<CollaboratorCursor[]>([]);
  const [activities, setActivities] = useState<CollaboratorActivity[]>([]);
  const [showActivities, setShowActivities] = useState(false);

  // Mock collaborator colors
  const collaboratorColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
  ];

  // Simulate real-time collaboration
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate collaborator activities
      if (Math.random() > 0.7 && currentSchema.tables.length > 0) {
        const randomTable = currentSchema.tables[Math.floor(Math.random() * currentSchema.tables.length)];
        const randomUser = `user_${Math.floor(Math.random() * 3) + 1}`;
        const actions = [
          'editing table structure',
          'adding new column',
          'modifying constraints',
          'reviewing relationships',
          'updating data types'
        ];
        
        const newActivity: CollaboratorActivity = {
          userId: randomUser,
          username: `Collaborator ${randomUser.split('_')[1]}`,
          action: actions[Math.floor(Math.random() * actions.length)],
          timestamp: new Date(),
          elementId: randomTable.id,
          elementType: 'table'
        };

        setActivities(prev => [newActivity, ...prev.slice(0, 9)]);

        // Update collaborator cursor
        setCollaborators(prev => {
          const existing = prev.find(c => c.userId === randomUser);
          const collaborator: CollaboratorCursor = {
            userId: randomUser,
            username: `Collaborator ${randomUser.split('_')[1]}`,
            position: { 
              x: Math.random() * 800 + 100, 
              y: Math.random() * 600 + 100 
            },
            selectedElement: {
              type: 'table',
              id: randomTable.id
            },
            color: collaboratorColors[parseInt(randomUser.split('_')[1]) - 1],
            lastSeen: new Date()
          };

          if (existing) {
            return prev.map(c => c.userId === randomUser ? collaborator : c);
          } else {
            return [...prev, collaborator];
          }
        });
      }

      // Remove inactive collaborators
      setCollaborators(prev => 
        prev.filter(c => Date.now() - c.lastSeen.getTime() < 30000)
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [currentSchema.tables]);

  // Sync with MongoDB periodically
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      try {
        await syncWorkspaceWithMongoDB();
        setIsConnected(true);
      } catch (error) {
        setIsConnected(false);
      }
    }, 5000);

    return () => clearInterval(syncInterval);
  }, [syncWorkspaceWithMongoDB]);

  const handleAddCollaborator = () => {
    // This would open the invitation modal
    console.log('Add collaborator');
  };

  const handleRemoveCollaborator = (userId: string) => {
    setCollaborators(prev => prev.filter(c => c.userId !== userId));
    // In real implementation, this would revoke access
  };

  const getElementName = (activity: CollaboratorActivity) => {
    if (activity.elementType === 'table' && activity.elementId) {
      const table = currentSchema.tables.find(t => t.id === activity.elementId);
      return table?.name || 'Unknown Table';
    }
    return 'Unknown Element';
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-3 h-3 text-yellow-500" />;
      case 'editor':
        return <Edit className="w-3 h-3 text-blue-500" />;
      case 'viewer':
        return <Eye className="w-3 h-3 text-gray-500" />;
      default:
        return <Users className="w-3 h-3 text-gray-500" />;
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
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Live Collaboration
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {currentSchema.members.length} member{currentSchema.members.length !== 1 ? 's' : ''} • {collaborators.length} active
              </p>
            </div>
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

        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleAddCollaborator}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Invite
          </button>
          
          <button
            onClick={() => setShowActivities(!showActivities)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Activity
          </button>
        </div>
      </div>

      {/* Active Collaborators */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Active Now ({collaborators.length + 1})
        </h4>
        
        <div className="space-y-2">
          {/* Current User */}
          <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                style={{ backgroundColor: '#3B82F6' }}
              >
                You
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  You (Owner)
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Currently active
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {getRoleIcon('owner')}
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            </div>
          </div>

          {/* Other Collaborators */}
          {collaborators.map(collaborator => (
            <div key={collaborator.userId} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: collaborator.color }}
                >
                  {collaborator.username.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {collaborator.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {collaborator.selectedElement ? (
                      <>
                        Editing {collaborator.selectedElement.type}: {
                          collaborator.selectedElement.type === 'table' 
                            ? currentSchema.tables.find(t => t.id === collaborator.selectedElement!.id)?.name
                            : 'Unknown'
                        }
                      </>
                    ) : (
                      'Viewing workspace'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getRoleIcon('editor')}
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <button
                  onClick={() => handleRemoveCollaborator(collaborator.userId)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove collaborator"
                >
                  <UserMinus className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      {showActivities && (
        <div className="flex-1 overflow-y-auto p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Recent Activity
          </h4>
          
          {activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                    style={{ backgroundColor: collaboratorColors[parseInt(activity.userId.split('_')[1]) - 1] }}
                  >
                    {activity.username.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">{activity.username}</span> is {activity.action}
                      {activity.elementId && (
                        <span className="text-blue-600 dark:text-blue-400">
                          {' '}{getElementName(activity)}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Workspace Members */}
      {!showActivities && (
        <div className="flex-1 overflow-y-auto p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Workspace Members ({currentSchema.members.length})
          </h4>
          
          <div className="space-y-2">
            {currentSchema.members.map(member => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {member.username}
                      {member.username === 'current_user' && ' (You)'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Joined {member.joinedAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    member.role === 'owner' 
                      ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                      : member.role === 'editor'
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}>
                    {getRoleIcon(member.role)}
                    <span className="ml-1">{member.role}</span>
                  </span>
                  {collaborators.find(c => c.username.includes(member.username.split('_')[1])) && (
                    <div className="w-2 h-2 bg-green-500 rounded-full" title="Currently active" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collaboration Status */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            Last sync: {new Date().toLocaleTimeString()}
          </span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{isConnected ? 'Real-time sync active' : 'Sync disconnected'}</span>
          </div>
        </div>
      </div>

      {/* Floating Cursors (would be positioned absolutely over the canvas) */}
      {collaborators.map(collaborator => (
        <div
          key={`cursor-${collaborator.userId}`}
          className="fixed pointer-events-none z-50"
          style={{
            left: collaborator.position.x,
            top: collaborator.position.y,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="flex items-center gap-2">
            <Cursor 
              className="w-4 h-4" 
              style={{ color: collaborator.color }}
            />
            <div 
              className="px-2 py-1 rounded text-white text-xs font-medium whitespace-nowrap"
              style={{ backgroundColor: collaborator.color }}
            >
              {collaborator.username}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RealTimeCollaboration;
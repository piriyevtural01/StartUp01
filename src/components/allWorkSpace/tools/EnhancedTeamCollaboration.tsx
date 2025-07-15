import React, { useState, useEffect } from 'react';
import { 
  Users, Send, UserPlus, Copy, Check, X, Clock, Shield, Globe, Lock, Crown, 
  AlertCircle, Eye, Edit, Trash2, RefreshCw, Wifi, WifiOff, Settings 
} from 'lucide-react';
import { useSubscription } from '../../../context/SubscriptionContext';
import { useDatabase, WorkspaceInvitation, WorkspaceMember } from '../../../context/DatabaseContext';

interface CollaborationStatus {
  isConnected: boolean;
  lastSync: Date | null;
  activeUsers: number;
}

const EnhancedTeamCollaboration: React.FC = () => {
  const { currentPlan } = useSubscription();
  const { 
    currentSchema, 
    inviteToWorkspace, 
    acceptWorkspaceInvitation, 
    removeWorkspaceMember,
    syncWorkspaceWithMongoDB
  } = useDatabase();
  
  // Enhanced state management
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  
  const [activeTab, setActiveTab] = useState<'invite' | 'accept' | 'members' | 'permissions'>('invite');
  const [copiedCode, setCopiedCode] = useState('');
  
  // Real-time collaboration status
  const [collaborationStatus, setCollaborationStatus] = useState<CollaborationStatus>({
    isConnected: true,
    lastSync: new Date(),
    activeUsers: currentSchema.members.length
  });

  // Auto-sync and real-time updates
  useEffect(() => {
    if (currentSchema.isShared && currentPlan === 'ultimate') {
      const syncInterval = setInterval(async () => {
        try {
          await syncWorkspaceWithMongoDB();
          setCollaborationStatus(prev => ({
            ...prev,
            isConnected: true,
            lastSync: new Date()
          }));
        } catch (error) {
          setCollaborationStatus(prev => ({
            ...prev,
            isConnected: false
          }));
        }
      }, 5000); // Sync every 5 seconds for real-time feel

      return () => clearInterval(syncInterval);
    }
  }, [currentSchema.isShared, currentPlan, syncWorkspaceWithMongoDB]);

  // Enhanced invitation with proper join code generation
  const handleSendInvitation = async () => {
    if (!inviteUsername.trim()) {
      setInviteError('Please enter a username');
      return;
    }

    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      setInviteError('You must be logged in to send invitations');
      return;
    }

    setIsInviting(true);
    setInviteError('');
    setInviteSuccess('');
    setGeneratedCode('');

    try {
      console.log('Starting invitation process for:', inviteUsername);
      
      // Validate username first
      const response = await fetch('/api/users/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: inviteUsername })
      });

      if (!response.ok) {
        if (response.status === 401) {
          setInviteError('Authentication failed. Please log in again.');
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const validationData = await response.json();
      console.log('Username validation result:', validationData);

      if (!validationData.exists) {
        setInviteError('User not found in our database.');
        return;
      }

      // Check existing invitations and members
      const existingInvite = currentSchema.invitations.find(
        inv => inv.inviteeUsername.toLowerCase() === inviteUsername.toLowerCase() && inv.status === 'pending'
      );
      const existingMember = currentSchema.members.find(
        member => member.username.toLowerCase() === inviteUsername.toLowerCase()
      );

      if (existingInvite) {
        setInviteError('User already has a pending invitation.');
        return;
      }

      if (existingMember) {
        setInviteError('User is already a team member.');
        return;
      }

      // Create invitation using database context
      console.log('Creating invitation...');
      const joinCode = await inviteToWorkspace({
        inviterUsername: 'current_user', // In real app, get from auth context
        inviteeUsername: inviteUsername,
        role: inviteRole
      });

      console.log('Generated join code:', joinCode);

      // Set success state with generated code
      setGeneratedCode(joinCode);
      setInviteSuccess(`Invitation sent successfully! Share this join code with ${inviteUsername}:`);
      
      // Reset form
      setInviteUsername('');
      setInviteRole('editor');
      
      // Update collaboration status
      setCollaborationStatus(prev => ({
        ...prev,
        activeUsers: prev.activeUsers + 1,
        lastSync: new Date()
      }));
      
    } catch (e) {
      const error = e as Error
      console.error('Invitation error:', error);
      if (error.message?.includes('401')) {
        setInviteError('Authentication failed. Please log in again.');
      } else {
        setInviteError('Failed to send invitation. Please try again.');
      }
    } finally {
      setIsInviting(false);
    }
  };

  // Enhanced invitation acceptance with proper MongoDB validation
  const handleAcceptInvitation = async () => {
    if (!joinCode.trim()) {
      setJoinError('Please enter a join code');
      return;
    }

    if (joinCode.length !== 8) {
      setJoinError('Join code must be exactly 8 characters');
      return;
    }

    setIsJoining(true);
    setJoinError('');
    setJoinSuccess('');

    try {
      console.log('Attempting to join with code:', joinCode);
      
      // Accept the invitation using database context
      const success = await acceptWorkspaceInvitation(joinCode.toUpperCase());
      
      if (!success) {
        setJoinError('Invalid join code or invitation has expired. Please check the code and try again.');
        return;
      }

      // Find the accepted invitation to get role info
      const acceptedInvitation = currentSchema.invitations.find(
        inv => inv.joinCode === joinCode.toUpperCase() && inv.status === 'accepted'
      );

      setJoinSuccess(`Successfully joined the workspace! You now have ${acceptedInvitation?.role || 'member'} access.`);
      setJoinCode('');
      
      // Enable real-time sync
      setCollaborationStatus({
        isConnected: true,
        lastSync: new Date(),
        activeUsers: currentSchema.members.length
      });
      
      setTimeout(() => setActiveTab('members'), 2000);
      
    } catch (error) {
      console.error('Join error:', error);
      setJoinError('Failed to accept invitation. Please check your connection and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  // Enhanced member removal with real-time updates
  const removeMember = async (memberId: string) => {
    const member = currentSchema.members.find(m => m.id === memberId);
    if (!member) return;

    if (confirm(`Are you sure you want to revoke access for ${member.username}? This will immediately disconnect them and remove their local copy.`)) {
      removeWorkspaceMember(memberId);
      
      // Update collaboration status
      setCollaborationStatus(prev => ({
        ...prev,
        activeUsers: Math.max(1, prev.activeUsers - 1),
        lastSync: new Date()
      }));

      try {
        await syncWorkspaceWithMongoDB();
      } catch (error) {
        console.error('Failed to sync after member removal:', error);
      }
    }
  };

  // Enhanced copy function with feedback
  const copyJoinCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  // Permission matrix data
  const permissionMatrix = [
    { action: 'View Database', viewer: true, editor: true, owner: true },
    { action: 'Create Tables', viewer: false, editor: true, owner: true },
    { action: 'Edit Tables', viewer: false, editor: true, owner: true },
    { action: 'Delete Tables', viewer: false, editor: true, owner: true },
    { action: 'Export SQL', viewer: false, editor: true, owner: true },
    { action: 'Save Changes', viewer: false, editor: true, owner: true },
    { action: 'Invite Members', viewer: false, editor: false, owner: true },
    { action: 'Remove Members', viewer: false, editor: false, owner: true },
    { action: 'Revoke Access', viewer: false, editor: false, owner: true },
  ];

  // Role badge styling
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700';
      case 'editor':
        return 'bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700';
      case 'viewer':
        return 'bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-700 dark:to-slate-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
  };

  // Only show for Ultimate plan users
  if (currentPlan !== 'ultimate') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
            Enhanced Team Collaboration
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            Real-time collaboration, advanced permissions, and secure workspace sharing. Available exclusively in the Ultimate plan.
          </p>
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 border border-purple-200 dark:border-purple-800 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 text-sm">
              <Crown className="w-4 h-4" />
              <span className="font-medium">Ultimate Features:</span>
            </div>
            <ul className="mt-2 text-sm text-purple-600 dark:text-purple-400 space-y-1">
              <li>• Real-time workspace synchronization</li>
              <li>• Advanced role-based permissions</li>
              <li>• Secure invitation system with join codes</li>
              <li>• Live collaboration status</li>
              <li>• Instant access revocation</li>
            </ul>
          </div>
          <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105 shadow-lg">
            Upgrade to Ultimate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Enhanced Header with Real-time Status */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Enhanced Team Collaboration
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Workspace: "{currentSchema.name}"
              </p>
            </div>
          </div>

          {/* Real-time Status Indicator */}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              collaborationStatus.isConnected 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
            }`}>
              {collaborationStatus.isConnected ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {collaborationStatus.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4" />
              <span>{collaborationStatus.activeUsers} active</span>
            </div>
          </div>
        </div>
        
        {/* Workspace Status */}
        <div className="flex items-center gap-4 text-sm">
          {currentSchema.isShared ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Globe className="w-4 h-4" />
              <span>Shared workspace</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Lock className="w-4 h-4" />
              <span>Private workspace</span>
            </div>
          )}
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <span className="text-gray-600 dark:text-gray-400">
            {currentSchema.members.length} member{currentSchema.members.length !== 1 ? 's' : ''}
          </span>
          {collaborationStatus.lastSync && (
            <>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className="text-gray-600 dark:text-gray-400">
                Last sync: {collaborationStatus.lastSync.toLocaleTimeString()}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Enhanced Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
        <nav className="flex space-x-8">
          {[
            { id: 'invite', name: 'Send Invitation', icon: UserPlus, color: 'text-blue-600 dark:text-blue-400' },
            { id: 'accept', name: 'Accept Invitation', icon: Send, color: 'text-green-600 dark:text-green-400' },
            { id: 'members', name: 'Team Members', icon: Users, color: 'text-purple-600 dark:text-purple-400' },
            { id: 'permissions', name: 'Permissions', icon: Shield, color: 'text-orange-600 dark:text-orange-400' }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200
                  ${activeTab === tab.id
                    ? `border-purple-500 ${tab.color} bg-purple-50 dark:bg-purple-900/10 px-3 rounded-t-lg`
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 px-3 rounded-t-lg'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Send Invitation Tab */}
      {activeTab === 'invite' && (
        <div className="space-y-6 flex-1 overflow-y-auto">
          <div className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/10 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Invite New Team Member
              </h4>
            </div>
            
            <div className="space-y-5">
              {/* Username Input with Real-time Validation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    placeholder="Enter username to invite"
                    disabled={isInviting}
                  />
                  {isInviting && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  We'll validate this username in real-time against our user database
                </p>
              </div>

              {/* Enhanced Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role & Permissions
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { 
                      value: 'editor', 
                      label: 'Editor', 
                      desc: 'Can modify tables, data, relationships, and save changes in real-time', 
                      icon: '✏️',
                      permissions: ['View', 'Create', 'Edit', 'Delete', 'Save', 'Export']
                    },
                    { 
                      value: 'viewer', 
                      label: 'Viewer', 
                      desc: 'Can only view the workspace with real-time updates, no editing permissions', 
                      icon: '👁️',
                      permissions: ['View only']
                    }
                  ].map(role => (
                    <label key={role.value} className="relative">
                      <input
                        type="radio"
                        name="role"
                        value={role.value}
                        checked={inviteRole === role.value}
                        onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                        className="sr-only"
                        disabled={isInviting}
                      />
                      <div className={`
                        p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                        ${inviteRole === role.value
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}>
                        <div className="flex items-start gap-3">
                          <span className="text-lg">{role.icon}</span>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">{role.label}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">{role.desc}</div>
                            <div className="flex flex-wrap gap-1">
                              {role.permissions.map(perm => (
                                <span key={perm} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                                  {perm}
                                </span>
                              ))}
                            </div>
                          </div>
                          {inviteRole === role.value && (
                            <Check className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendInvitation}
                disabled={isInviting || !inviteUsername.trim()}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:shadow-none hover:scale-[1.02] disabled:scale-100"
              >
                {isInviting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Validating & Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Invitation
                  </>
                )}
              </button>

              {/* Error Message */}
              {inviteError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <p className="text-red-800 dark:text-red-200 text-sm font-medium">Error</p>
                  </div>
                  <p className="text-red-700 dark:text-red-300 text-sm mt-1">{inviteError}</p>
                </div>
              )}

              {/* Success Message with Join Code */}
              {inviteSuccess && generatedCode && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <p className="text-green-800 dark:text-green-200 text-sm font-medium">Success!</p>
                  </div>
                  <p className="text-green-700 dark:text-green-300 text-sm mb-3">{inviteSuccess}</p>
                  <div className="bg-green-100 dark:bg-green-800/20 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <code className="text-lg font-mono font-bold text-green-800 dark:text-green-200">
                        {generatedCode}
                      </code>
                      <button
                        onClick={() => copyJoinCode(generatedCode)}
                        className="p-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 hover:bg-green-200 dark:hover:bg-green-700/20 rounded-lg transition-colors duration-200"
                        title="Copy join code"
                      >
                        {copiedCode === generatedCode ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Code expires in 24 hours • Real-time access enabled
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pending Invitations */}
          {currentSchema.invitations.filter(inv => inv.status === 'pending').length > 0 && (
            <div className="bg-gradient-to-br from-white to-yellow-50 dark:from-gray-800 dark:to-yellow-900/10 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Pending Invitations
                </h4>
              </div>
              <div className="space-y-3">
                {currentSchema.invitations.filter(inv => inv.status === 'pending').map(invitation => (
                  <div key={invitation.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {invitation.inviteeUsername}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <span className={`px-2 py-1 rounded-full text-xs ${getRoleBadgeColor(invitation.role)}`}>
                            {invitation.role}
                          </span>
                          <span>•</span>
                          <span>Expires: {invitation.expiresAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-2">
                        <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
                          {invitation.joinCode}
                        </code>
                      </div>
                      <button
                        onClick={() => copyJoinCode(invitation.joinCode)}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                        title="Copy join code"
                      >
                        {copiedCode === invitation.joinCode ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Accept Invitation Tab */}
      {activeTab === 'accept' && (
        <div className="space-y-6 flex-1 overflow-y-auto">
          <div className="bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-900/10 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Send className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Join a Workspace
              </h4>
            </div>
            
            <div className="space-y-5">
              {/* Join Code Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Join Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-lg tracking-wider text-center transition-all duration-200"
                    placeholder="XXXXXXXX"
                    maxLength={8}
                    disabled={isJoining}
                  />
                  {isJoining && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Enter the 8-character join code provided by the workspace owner
                </p>
                
                {/* Real-time validation feedback */}
                {joinCode.length > 0 && joinCode.length < 8 && (
                  <div className="mt-2 flex items-center gap-2 text-orange-600 dark:text-orange-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Code must be 8 characters ({joinCode.length}/8)</span>
                  </div>
                )}
                
                {joinCode.length === 8 && (
                  <div className="mt-2 flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Ready to join workspace</span>
                  </div>
                )}
              </div>

              {/* Join Button */}
              <button
                onClick={handleAcceptInvitation}
                disabled={isJoining || !joinCode.trim() || joinCode.length !== 8}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:shadow-none hover:scale-[1.02] disabled:scale-100"
              >
                {isJoining ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Joining Workspace...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Join Workspace
                  </>
                )}
              </button>

              {/* Error Message */}
              {joinError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <p className="text-red-800 dark:text-red-200 text-sm font-medium">Error</p>
                  </div>
                  <p className="text-red-700 dark:text-red-300 text-sm mt-1">{joinError}</p>
                </div>
              )}

              {/* Success Message */}
              {joinSuccess && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <p className="text-green-800 dark:text-green-200 text-sm font-medium">Welcome!</p>
                  </div>
                  <p className="text-green-700 dark:text-green-300 text-sm mt-1">{joinSuccess}</p>
                  <div className="mt-3 p-3 bg-green-100 dark:bg-green-800/20 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm">
                      <Wifi className="w-4 h-4" />
                      <span>Real-time synchronization enabled</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-6 flex-1 overflow-y-auto">
          <div className="bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-900/10 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Team Members ({currentSchema.members.length})
                </h4>
              </div>
              
              {/* Sync Status */}
              <button
                onClick={syncWorkspaceWithMongoDB}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200"
              >
                <RefreshCw className="w-4 h-4" />
                Sync Now
              </button>
            </div>
            
            <div className="space-y-3">
              {currentSchema.members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {member.username}
                        </p>
                        {member.username === 'current_user' && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                            You
                          </span>
                        )}
                        {collaborationStatus.isConnected && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" title="Online" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Joined {member.joinedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(member.role)}`}>
                      {member.role}
                      {member.role === 'owner' && <Crown className="w-3 h-3 inline ml-1" />}
                    </span>
                    {member.role !== 'owner' && member.username !== 'current_user' && (
                      <button
                        onClick={() => removeMember(member.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                        title="Revoke access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="space-y-6 flex-1 overflow-y-auto">
          <div className="bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-orange-900/10 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                Permission Matrix
              </h4>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Action</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-600 dark:text-gray-300">
                      <div className="flex items-center justify-center gap-2">
                        <Eye className="w-4 h-4" />
                        Viewer
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-blue-600 dark:text-blue-400">
                      <div className="flex items-center justify-center gap-2">
                        <Edit className="w-4 h-4" />
                        Editor
                      </div>
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-purple-600 dark:text-purple-400">
                      <div className="flex items-center justify-center gap-2">
                        <Crown className="w-4 h-4" />
                        Owner
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {permissionMatrix.map((row, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200">
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{row.action}</td>
                      <td className="text-center py-3 px-4">
                        {row.viewer ? (
                          <Check className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-red-500 mx-auto" />
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {row.editor ? (
                          <Check className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-red-500 mx-auto" />
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {row.owner ? (
                          <Check className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-red-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Security Notice */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-800 dark:text-blue-200">Security Features</span>
              </div>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• All data transfers use TLS encryption</li>
                <li>• Real-time synchronization with MongoDB</li>
                <li>• Instant access revocation</li>
                <li>• Secure join code generation</li>
                <li>• Role-based permission enforcement</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTeamCollaboration;
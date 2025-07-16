import React, { useState } from 'react';
import { Users, Wifi, AlertCircle, Check, X, Shield } from 'lucide-react';

interface JoinWorkspaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (joinCode: string) => Promise<boolean>;
}

const JoinWorkspaceDialog: React.FC<JoinWorkspaceDialogProps> = ({
  isOpen,
  onClose,
  onJoin
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleJoin = async () => {
    if (!joinCode.trim() || joinCode.length !== 8) {
      setError('Please enter a valid 8-character join code');
      return;
    }

    setIsJoining(true);
    setError('');
    setSuccess('');

    try {
      const result = await onJoin(joinCode.toUpperCase());
      
      if (result) {
        setSuccess('Successfully joined workspace! Loading...');
        setTimeout(() => {
          onClose();
          setJoinCode('');
          setSuccess('');
        }, 2000);
      } else {
        setError('Invalid or expired join code. Please check and try again.');
      }
    } catch (error) {
      setError('Failed to join workspace. Please check your connection and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleClose = () => {
    if (!isJoining) {
      onClose();
      setJoinCode('');
      setError('');
      setSuccess('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Join Workspace</h2>
                <p className="text-blue-100 text-sm">Enter the join code to collaborate</p>
              </div>
            </div>
            {!isJoining && (
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Join Code
            </label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg tracking-wider text-center transition-all duration-200"
              placeholder="XXXXXXXX"
              maxLength={8}
              disabled={isJoining}
            />
            
            {/* Real-time validation feedback */}
            {joinCode.length > 0 && joinCode.length < 8 && (
              <div className="mt-2 flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Code must be 8 characters ({joinCode.length}/8)</span>
              </div>
            )}
            
            {joinCode.length === 8 && !error && (
              <div className="mt-2 flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check className="w-4 h-4" />
                <span className="text-sm">Ready to join workspace</span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <p className="text-red-800 dark:text-red-200 text-sm font-medium">Error</p>
              </div>
              <p className="text-red-700 dark:text-red-300 text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                <p className="text-green-800 dark:text-green-200 text-sm font-medium">Success!</p>
              </div>
              <p className="text-green-700 dark:text-green-300 text-sm mt-1">{success}</p>
              <div className="mt-3 flex items-center gap-2 text-green-700 dark:text-green-300 text-sm">
                <Wifi className="w-4 h-4" />
                <span>Real-time synchronization enabled</span>
              </div>
            </div>
          )}

          {/* Join Button */}
          <button
            onClick={handleJoin}
            disabled={isJoining || !joinCode.trim() || joinCode.length !== 8}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:shadow-none hover:scale-[1.02] disabled:scale-100"
          >
            {isJoining ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Joining Workspace...
              </>
            ) : (
              <>
                <Users className="w-5 h-5" />
                Join Workspace
              </>
            )}
          </button>

          {/* Info Section */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-blue-800 dark:text-blue-200 text-sm">How it Works</span>
            </div>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Enter the 8-character code shared by the workspace owner</li>
              <li>• You'll be added to their workspace with assigned permissions</li>
              <li>• All changes will sync in real-time across all participants</li>
              <li>• Your role determines what actions you can perform</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinWorkspaceDialog;
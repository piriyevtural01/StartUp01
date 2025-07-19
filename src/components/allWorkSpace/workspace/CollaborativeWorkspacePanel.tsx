import React, { useState, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Code, Eye, AlertTriangle, CheckCircle, Users, Wifi, WifiOff } from 'lucide-react';
import RealTimeCollaborationCanvas from './RealTimeCollaborationCanvas';
import SQLPreviewModal from './SQLPreviewModal';
import { useDatabase } from '../../../context/DatabaseContext';
import { useCollaboration } from '../../../hooks/useCollaboration';

const CollaborativeWorkspacePanel: React.FC = () => {
  const { validationErrors, currentSchema } = useDatabase();
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showSQLModal, setShowSQLModal] = useState(false);
  const [showCollaborationPanel, setShowCollaborationPanel] = useState(false);

  // Mock current user - in real app, get from auth context
  const currentUser = { id: 'current_user', username: 'You' };
  
  const {
    isConnected,
    collaborators,
    userSelections,
    cursorPositions,
    connectionError,
    connect,
    disconnect,
    broadcastSchemaChange,
    broadcastSelection,
    broadcastCursor,
    getUserColor
  } = useCollaboration({
    workspaceId: currentSchema.id,
    user: currentUser,
    autoConnect: true
  });

  const errorCount = validationErrors.filter(e => e.type === 'error').length;
  const warningCount = validationErrors.filter(e => e.type === 'warning').length;

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 25, 200));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 25, 25));
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(Math.round(newZoom));
  }, []);

  // Broadcast cursor movement
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (isConnected) {
      broadcastCursor({ x: event.clientX, y: event.clientY });
    }
  }, [isConnected, broadcastCursor]);

  // Handle element selection
  const handleElementSelect = useCallback((elementType: 'table' | 'column' | 'relationship', elementId: string, elementName: string) => {
    if (isConnected) {
      broadcastSelection(elementType, elementId, elementName);
    }
  }, [isConnected, broadcastSelection]);

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 relative overflow-hidden" onMouseMove={handleMouseMove}>
      {/* Enhanced Controls */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        {/* Collaboration Status */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border text-sm ${
          isConnected 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
        }`}>
          {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          <Users className="w-4 h-4" />
          <span>{collaborators.length + 1}</span>
        </div>

        {/* Validation Status */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border text-sm ${
          errorCount > 0 
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
            : warningCount > 0
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300'
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
        }`}>
          {errorCount > 0 ? (
            <>
              <AlertTriangle className="w-4 h-4" />
              <span>{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
            </>
          ) : warningCount > 0 ? (
            <>
              <AlertTriangle className="w-4 h-4" />
              <span>{warningCount} warning{warningCount !== 1 ? 's' : ''}</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Valid</span>
            </>
          )}
        </div>

        {/* Collaboration Toggle */}
        <button
          onClick={() => setShowCollaborationPanel(!showCollaborationPanel)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border transition-colors duration-200 text-sm ${
            showCollaborationPanel
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Collaboration</span>
          {collaborators.length > 0 && (
            <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {collaborators.length}
            </span>
          )}
        </button>

        {/* SQL Preview Button */}
        <button
          onClick={() => setShowSQLModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg transition-colors duration-200 text-sm"
        >
          <Code className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-gray-700 dark:text-gray-300">Show SQL</span>
        </button>

        {/* Zoom Controls */}
        <div className="flex gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-2">
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
            aria-label="Zoom out"
            disabled={zoom <= 25}
          >
            <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          
          <span className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 min-w-16 text-center">
            {zoom}%
          </span>
          
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
            aria-label="Zoom in"
            disabled={zoom >= 200}
          >
            <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          
          <div className="w-px bg-gray-200 dark:bg-gray-600 mx-1" />
          
          <button
            onClick={handleResetView}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
            aria-label="Reset view"
          >
            <RotateCcw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Collaboration Panel */}
      {showCollaborationPanel && (
        <div className="absolute top-4 left-4 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900 dark:text-white">Live Collaboration</h3>
              <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
            {connectionError && (
              <div className="text-xs text-red-600 dark:text-red-400 mb-2">
                {connectionError}
              </div>
            )}
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {collaborators.length + 1} active user{collaborators.length !== 0 ? 's' : ''}
            </div>
          </div>
          
          <div className="p-4 max-h-64 overflow-y-auto">
            {/* Current User */}
            <div className="flex items-center gap-3 mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {currentUser.username.charAt(0)}
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  {currentUser.username} (You)
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Owner</div>
              </div>
              <div className="ml-auto w-2 h-2 bg-green-500 rounded-full" />
            </div>

            {/* Other Collaborators */}
            {collaborators.map(collaborator => {
              const selection = userSelections.get(collaborator.id);
              const cursor = cursorPositions.get(collaborator.id);
              
              return (
                <div key={collaborator.id} className="flex items-center gap-3 mb-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: getUserColor(collaborator.id) }}
                  >
                    {collaborator.username.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {collaborator.username}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {selection ? (
                        `Editing ${selection.elementType}: ${selection.elementName}`
                      ) : (
                        'Viewing workspace'
                      )}
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    collaborator.isOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>
              );
            })}

            {collaborators.length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                No other collaborators online
              </div>
            )}
          </div>

          {/* Connection Controls */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              {!isConnected ? (
                <button
                  onClick={connect}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  Reconnect
                </button>
              ) : (
                <button
                  onClick={disconnect}
                  className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Canvas with Real-time Collaboration */}
      <RealTimeCollaborationCanvas 
        zoom={zoom} 
        pan={pan} 
        onPanChange={setPan}
        onZoomChange={handleZoomChange}
      />

      {/* Floating Cursors for Remote Users */}
      {Array.from(cursorPositions.entries()).map(([userId, position]) => {
        const collaborator = collaborators.find(c => c.id === userId);
        if (!collaborator) return null;

        return (
          <div
            key={`cursor-${userId}`}
            className="fixed pointer-events-none z-50 transition-all duration-200"
            style={{
              left: position.x,
              top: position.y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
                style={{ backgroundColor: getUserColor(userId) }}
              />
              <div 
                className="px-2 py-1 rounded text-white text-xs font-medium whitespace-nowrap shadow-lg"
                style={{ backgroundColor: getUserColor(userId) }}
              >
                {collaborator.username}
              </div>
            </div>
          </div>
        );
      })}

      {/* SQL Preview Modal */}
      <SQLPreviewModal 
        isOpen={showSQLModal} 
        onClose={() => setShowSQLModal(false)} 
      />
    </div>
  );
};

export default CollaborativeWorkspacePanel;
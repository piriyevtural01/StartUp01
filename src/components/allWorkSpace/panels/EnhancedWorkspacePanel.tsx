import React, { useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Code, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import DatabaseCanvas from '../workspace/DatabaseCanvas';
import SQLPreviewModal from '../workspace/SQLPreviewModal';
import RealTimeCollaboration from '../../collabration/RealTimeCollaboration';
import { useDatabase } from '../../../context/DatabaseContext';

const EnhancedWorkspacePanel: React.FC = () => {
  const { validationErrors } = useDatabase();
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showSQLModal, setShowSQLModal] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);

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

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      {/* Enhanced Controls */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
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
          onClick={() => setShowCollaboration(!showCollaboration)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border transition-colors duration-200 text-sm ${
            showCollaboration
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Collaboration</span>
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
      {showCollaboration && (
        <div className="absolute top-4 left-4 w-80 h-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-20 overflow-hidden">
          <RealTimeCollaboration />
        </div>
      )}

      {/* Canvas */}
      <DatabaseCanvas 
        zoom={zoom} 
        pan={pan} 
        onPanChange={setPan}
        onZoomChange={handleZoomChange}
      />

      {/* SQL Preview Modal */}
      <SQLPreviewModal 
        isOpen={showSQLModal} 
        onClose={() => setShowSQLModal(false)} 
      />
    </div>
  );
};

export default EnhancedWorkspacePanel;
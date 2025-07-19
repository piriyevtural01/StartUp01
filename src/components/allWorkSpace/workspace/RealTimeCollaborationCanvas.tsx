import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  useReactFlow,
  NodeProps,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useDatabase } from '../../../context/DatabaseContext';
import EnhancedTableNode from './EnhancedTableNode';
import { Users, Eye, Edit, Cursor } from 'lucide-react';

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
  isActive: boolean;
}

interface RealTimeCollaborationCanvasProps {
  zoom: number;
  pan: { x: number; y: number };
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
}

const nodeTypes = {
  table: EnhancedTableNode as React.ComponentType<NodeProps>,
};

const RealTimeCollaborationCanvasInner: React.FC<RealTimeCollaborationCanvasProps> = ({ 
  zoom, 
  pan, 
  onPanChange, 
  onZoomChange 
}) => {
  const { currentSchema, updateTable, addRelationship, validationErrors } = useDatabase();
  const { setViewport, getViewport } = useReactFlow();
  
  const [collaborators, setCollaborators] = useState<CollaboratorCursor[]>([]);
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(true);

  // Mock collaborator colors
  const collaboratorColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
  ];

  // Convert database tables to React Flow nodes with collaboration awareness
  const initialNodes: Node[] = useMemo(() => {
    return currentSchema.tables.map(table => {
      const tableErrors = validationErrors.filter(error => error.tableId === table.id);
      const hasErrors = tableErrors.some(error => error.type === 'error');
      const hasWarnings = tableErrors.some(error => error.type === 'warning');
      
      // Check if any collaborator is editing this table
      const editingCollaborator = collaborators.find(c => 
        c.selectedElement?.type === 'table' && c.selectedElement.id === table.id
      );
      
      return {
        id: table.id,
        type: 'table',
        position: table.position,
        data: {
          ...table,
          hasErrors,
          hasWarnings,
          validationErrors: tableErrors,
          editingCollaborator,
          isSelected: selectedElements.has(table.id)
        },
        draggable: true,
        className: `${hasErrors ? 'error-node' : hasWarnings ? 'warning-node' : ''} ${
          editingCollaborator ? 'collaborator-editing' : ''
        }`,
      };
    });
  }, [currentSchema.tables, validationErrors, collaborators, selectedElements]);

  // Convert database relationships to React Flow edges with collaboration awareness
  const initialEdges: Edge[] = useMemo(() => {
    return currentSchema.relationships.map(relationship => {
      const sourceTable = currentSchema.tables.find(t => t.id === relationship.sourceTableId);
      const targetTable = currentSchema.tables.find(t => t.id === relationship.targetTableId);
      
      const getEdgeColor = (cardinality: string) => {
        switch (cardinality) {
          case '1:1': return '#10B981';
          case '1:N': return '#3B82F6';
          case 'N:M': return '#8B5CF6';
          default: return '#3B82F6';
        }
      };

      const edgeColor = getEdgeColor(relationship.cardinality);
      
      // Check if any collaborator is editing this relationship
      const editingCollaborator = collaborators.find(c => 
        c.selectedElement?.type === 'relationship' && c.selectedElement.id === relationship.id
      );

      return {
        id: relationship.id,
        source: relationship.sourceTableId,
        target: relationship.targetTableId,
        sourceHandle: relationship.sourceColumnId,
        targetHandle: relationship.targetColumnId,
        type: 'smoothstep',
        animated: true,
        style: { 
          stroke: editingCollaborator ? editingCollaborator.color : edgeColor, 
          strokeWidth: editingCollaborator ? 3 : 2,
          strokeDasharray: relationship.cardinality === 'N:M' ? '5,5' : undefined,
          filter: editingCollaborator ? 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))' : undefined
        },
        label: relationship.cardinality,
        labelBgStyle: { 
          fill: editingCollaborator ? editingCollaborator.color + '20' : '#ffffff', 
          fillOpacity: 0.9,
          rx: 4,
          ry: 4
        },
        labelStyle: { 
          fontSize: 11, 
          fontWeight: 600,
          color: editingCollaborator ? editingCollaborator.color : edgeColor
        },
        markerEnd: {
          type: 'arrowclosed',
          color: editingCollaborator ? editingCollaborator.color : edgeColor,
          width: 20,
          height: 20
        },
        data: {
          relationship,
          sourceTable: sourceTable?.name,
          targetTable: targetTable?.name,
          constraintName: relationship.constraintName,
          editingCollaborator
        }
      };
    });
  }, [currentSchema.relationships, currentSchema.tables, collaborators]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Simulate real-time collaboration
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate collaborator activities
      if (Math.random() > 0.8 && currentSchema.tables.length > 0) {
        const randomTable = currentSchema.tables[Math.floor(Math.random() * currentSchema.tables.length)];
        const randomUser = `user_${Math.floor(Math.random() * 3) + 1}`;
        
        const collaborator: CollaboratorCursor = {
          userId: randomUser,
          username: `Collaborator ${randomUser.split('_')[1]}`,
          position: { 
            x: randomTable.position.x + Math.random() * 100 - 50, 
            y: randomTable.position.y + Math.random() * 100 - 50 
          },
          selectedElement: {
            type: 'table',
            id: randomTable.id
          },
          color: collaboratorColors[parseInt(randomUser.split('_')[1]) - 1],
          lastSeen: new Date(),
          isActive: true
        };

        setCollaborators(prev => {
          const existing = prev.find(c => c.userId === randomUser);
          if (existing) {
            return prev.map(c => c.userId === randomUser ? collaborator : c);
          } else {
            return [...prev, collaborator];
          }
        });
      }

      // Remove inactive collaborators
      setCollaborators(prev => 
        prev.filter(c => Date.now() - c.lastSeen.getTime() < 15000)
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [currentSchema.tables, collaboratorColors]);

  // Update nodes when schema or collaborators change
  useEffect(() => {
    const newNodes = currentSchema.tables.map(table => {
      const tableErrors = validationErrors.filter(error => error.tableId === table.id);
      const hasErrors = tableErrors.some(error => error.type === 'error');
      const hasWarnings = tableErrors.some(error => error.type === 'warning');
      
      const editingCollaborator = collaborators.find(c => 
        c.selectedElement?.type === 'table' && c.selectedElement.id === table.id
      );
      
      return {
        id: table.id,
        type: 'table',
        position: table.position,
        data: {
          ...table,
          hasErrors,
          hasWarnings,
          validationErrors: tableErrors,
          editingCollaborator,
          isSelected: selectedElements.has(table.id)
        },
        draggable: true,
        className: `${hasErrors ? 'error-node' : hasWarnings ? 'warning-node' : ''} ${
          editingCollaborator ? 'collaborator-editing' : ''
        }`,
      };
    });
    setNodes(newNodes);
  }, [currentSchema.tables, validationErrors, collaborators, selectedElements, setNodes]);

  // Update edges when relationships or collaborators change
  useEffect(() => {
    const newEdges = currentSchema.relationships.map(relationship => {
      const sourceTable = currentSchema.tables.find(t => t.id === relationship.sourceTableId);
      const targetTable = currentSchema.tables.find(t => t.id === relationship.targetTableId);
      
      const getEdgeColor = (cardinality: string) => {
        switch (cardinality) {
          case '1:1': return '#10B981';
          case '1:N': return '#3B82F6';
          case 'N:M': return '#8B5CF6';
          default: return '#3B82F6';
        }
      };

      const edgeColor = getEdgeColor(relationship.cardinality);
      
      const editingCollaborator = collaborators.find(c => 
        c.selectedElement?.type === 'relationship' && c.selectedElement.id === relationship.id
      );

      return {
        id: relationship.id,
        source: relationship.sourceTableId,
        target: relationship.targetTableId,
        sourceHandle: relationship.sourceColumnId,
        targetHandle: relationship.targetColumnId,
        type: 'smoothstep',
        animated: true,
        style: { 
          stroke: editingCollaborator ? editingCollaborator.color : edgeColor, 
          strokeWidth: editingCollaborator ? 3 : 2,
          strokeDasharray: relationship.cardinality === 'N:M' ? '5,5' : undefined,
          filter: editingCollaborator ? 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))' : undefined
        },
        label: relationship.cardinality,
        labelBgStyle: { 
          fill: editingCollaborator ? editingCollaborator.color + '20' : '#ffffff', 
          fillOpacity: 0.9,
          rx: 4,
          ry: 4
        },
        labelStyle: { 
          fontSize: 11, 
          fontWeight: 600,
          color: editingCollaborator ? editingCollaborator.color : edgeColor
        },
        markerEnd: {
          type: 'arrowclosed',
          color: editingCollaborator ? editingCollaborator.color : edgeColor,
          width: 20,
          height: 20
        },
        data: {
          relationship,
          sourceTable: sourceTable?.name,
          targetTable: targetTable?.name,
          constraintName: relationship.constraintName,
          editingCollaborator
        }
      };
    });
    setEdges(newEdges);
  }, [currentSchema.relationships, currentSchema.tables, collaborators, setEdges]);

  // Zoom change tracking
  useEffect(() => {
    const currentViewport = getViewport();
    const newZoomPercentage = Math.round(currentViewport.zoom * 100);
    if (newZoomPercentage !== zoom) {
      onZoomChange(newZoomPercentage);
    }
  }, [getViewport, onZoomChange, zoom]);

  // External zoom changes
  useEffect(() => {
    const currentViewport = getViewport();
    const targetZoom = zoom / 100;
    if (Math.abs(currentViewport.zoom - targetZoom) > 0.01) {
      setViewport({
        x: currentViewport.x,
        y: currentViewport.y,
        zoom: targetZoom,
      });
    }
  }, [zoom, setViewport, getViewport]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target && params.sourceHandle && params.targetHandle) {
        // Validate connection before creating
        const sourceTable = currentSchema.tables.find(t => t.id === params.source);
        const targetTable = currentSchema.tables.find(t => t.id === params.target);
        const sourceColumn = sourceTable?.columns.find(c => c.id === params.sourceHandle);
        const targetColumn = targetTable?.columns.find(c => c.id === params.targetHandle);

        if (sourceTable && targetTable && sourceColumn && targetColumn) {
          // Check if relationship already exists
          const existingRelationship = currentSchema.relationships.find(rel =>
            rel.sourceTableId === params.source &&
            rel.sourceColumnId === params.sourceHandle &&
            rel.targetTableId === params.target &&
            rel.targetColumnId === params.targetHandle
          );

          if (!existingRelationship) {
            addRelationship({
              sourceTableId: params.source,
              sourceColumnId: params.sourceHandle,
              targetTableId: params.target,
              targetColumnId: params.targetHandle,
              cardinality: '1:N',
              constraintName: `FK_${sourceTable.name}_${sourceColumn.name}_${targetTable.name}_${targetColumn.name}`
            });
            
            // Broadcast relationship creation to collaborators
            broadcastChange('relationship_created', {
              sourceTable: sourceTable.name,
              targetTable: targetTable.name,
              sourceColumn: sourceColumn.name,
              targetColumn: targetColumn.name
            });
          }
        }
      }
    },
    [addRelationship, currentSchema.tables, currentSchema.relationships]
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      updateTable(node.id, { position: node.position });
      
      // Broadcast table move to collaborators
      broadcastChange('table_moved', {
        tableId: node.id,
        tableName: node.data.name,
        position: node.position
      });
    },
    [updateTable]
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      const newSelection = new Set(selectedNodes.map(node => node.id));
      setSelectedElements(newSelection);
      
      // Broadcast selection to collaborators
      if (selectedNodes.length > 0) {
        broadcastChange('element_selected', {
          elementType: 'table',
          elementId: selectedNodes[0].id,
          elementName: selectedNodes[0].data.name
        });
      }
    },
    []
  );

  const onMove = useCallback(
    (_event: any, viewport: any) => {
      const newZoomPercentage = Math.round(viewport.zoom * 100);
      onZoomChange(newZoomPercentage);
      onPanChange({ x: viewport.x, y: viewport.y });
    },
    [onZoomChange, onPanChange]
  );

  // Mock function to broadcast changes to collaborators
  const broadcastChange = (type: string, data: any) => {
    console.log('Broadcasting change:', type, data);
    // In a real implementation, this would send the change via WebSocket
  };

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onSelectionChange={onSelectionChange}
        onMove={onMove}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultViewport={{ x: pan.x, y: pan.y, zoom: zoom / 100 }}
        minZoom={0.25}
        maxZoom={2}
        connectionLineStyle={{ stroke: '#3B82F6', strokeWidth: 2 }}
        connectionLineType="smoothstep"
        snapToGrid={true}
        snapGrid={[15, 15]}
        multiSelectionKeyCode="Shift"
        deleteKeyCode="Delete"
      >
        <Controls 
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg [&>button]:border-0 [&>button]:bg-transparent [&>button]:text-gray-600 [&>button]:dark:text-gray-400 [&>button:hover]:bg-gray-100 [&>button:hover]:dark:bg-gray-700"
          position="bottom-right"
          showZoom={false}
          showFitView={true}
          showInteractive={false}
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          className="bg-gray-50 dark:bg-gray-900"
          color="#e5e7eb"
        />
      </ReactFlow>

      {/* Collaboration Status Indicator */}
      <div className="absolute top-4 left-4 z-20">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border text-sm ${
          isConnected 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
        }`}>
          <Users className="w-4 h-4" />
          <span>{collaborators.length + 1} active</span>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
      </div>

      {/* Active Collaborators List */}
      {collaborators.length > 0 && (
        <div className="absolute top-4 right-4 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 max-w-xs">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Active Collaborators
          </h4>
          <div className="space-y-2">
            {collaborators.map(collaborator => (
              <div key={collaborator.userId} className="flex items-center gap-2 text-xs">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: collaborator.color }}
                />
                <span className="text-gray-700 dark:text-gray-300">
                  {collaborator.username}
                </span>
                {collaborator.selectedElement && (
                  <span className="text-gray-500 dark:text-gray-400">
                    editing {collaborator.selectedElement.type}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Cursors */}
      {collaborators.map(collaborator => (
        <div
          key={`cursor-${collaborator.userId}`}
          className="fixed pointer-events-none z-50 transition-all duration-200"
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
              className="px-2 py-1 rounded text-white text-xs font-medium whitespace-nowrap shadow-lg"
              style={{ backgroundColor: collaborator.color }}
            >
              {collaborator.username}
              {collaborator.selectedElement && (
                <span className="opacity-80">
                  {' '}• {collaborator.selectedElement.type === 'table' ? 'editing table' : 
                       collaborator.selectedElement.type === 'column' ? 'editing column' : 
                       'editing relationship'}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Custom styles for enhanced visualization */}
      <style>{`
        .error-node {
          filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.3));
        }
        .warning-node {
          filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.3));
        }
        .collaborator-editing {
          filter: drop-shadow(0 0 12px rgba(59, 130, 246, 0.5));
          animation: pulse-glow 2s ease-in-out infinite;
        }
        .react-flow__edge-path {
          stroke-linecap: round;
        }
        .react-flow__connection-line {
          stroke-dasharray: 5;
          animation: dash 1s linear infinite;
        }
        @keyframes dash {
          to {
            stroke-dashoffset: -10;
          }
        }
        @keyframes pulse-glow {
          0%, 100% {
            filter: drop-shadow(0 0 12px rgba(59, 130, 246, 0.5));
          }
          50% {
            filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.8));
          }
        }
      `}</style>
    </div>
  );
};

const RealTimeCollaborationCanvas: React.FC<RealTimeCollaborationCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <RealTimeCollaborationCanvasInner {...props} />
    </ReactFlowProvider>
  );
};

export default RealTimeCollaborationCanvas;
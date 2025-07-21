import React, { useCallback, useMemo, useEffect } from 'react';
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
  addEdge,
  NodeProps,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useDatabase } from '../../../context/DatabaseContext';
import EnhancedTableNode from './EnhancedTableNode';

interface EnhancedDatabaseCanvasProps {
  zoom: number;
  pan: { x: number; y: number };
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
}

const nodeTypes = {
  table: EnhancedTableNode as React.ComponentType<NodeProps>,
};

const EnhancedDatabaseCanvasInner: React.FC<EnhancedDatabaseCanvasProps> = ({ 
  zoom, 
  pan, 
  onPanChange, 
  onZoomChange 
}) => {
  const { currentSchema, updateTable, addRelationship, validationErrors } = useDatabase();
  const { setViewport, getViewport } = useReactFlow();

  // Convert database tables to React Flow nodes with validation status
  const initialNodes: Node[] = useMemo(() => {
    return currentSchema.tables.map(table => {
      const tableErrors = validationErrors.filter(error => error.tableId === table.id);
      const hasErrors = tableErrors.some(error => error.type === 'error');
      const hasWarnings = tableErrors.some(error => error.type === 'warning');
      
      return {
        id: table.id,
        type: 'table',
        position: table.position,
        data: {
          ...table,
          hasErrors,
          hasWarnings,
          validationErrors: tableErrors
        },
        draggable: true,
        className: hasErrors ? 'error-node' : hasWarnings ? 'warning-node' : '',
      };
    });
  }, [currentSchema.tables, validationErrors]);

  // Convert database relationships to React Flow edges with enhanced styling
  const initialEdges: Edge[] = useMemo(() => {
    return currentSchema.relationships.map(relationship => {
      const sourceTable = currentSchema.tables.find(t => t.id === relationship.sourceTableId);
      const targetTable = currentSchema.tables.find(t => t.id === relationship.targetTableId);
      
      // Determine edge color based on cardinality
      const getEdgeColor = (cardinality: string) => {
        switch (cardinality) {
          case '1:1': return '#10B981'; // green
          case '1:N': return '#3B82F6'; // blue
          case 'N:M': return '#8B5CF6'; // purple
          default: return '#3B82F6';
        }
      };

      const edgeColor = getEdgeColor(relationship.cardinality);
      
      // Check if relationship has validation errors
      const hasErrors = validationErrors.some(e => e.relationshipId === relationship.id && e.type === 'error');
      const hasWarnings = validationErrors.some(e => e.relationshipId === relationship.id && e.type === 'warning');
      
      const finalColor = hasErrors ? '#EF4444' : hasWarnings ? '#F59E0B' : edgeColor;

      return {
        id: relationship.id,
        source: relationship.sourceTableId,
        target: relationship.targetTableId,
        sourceHandle: relationship.sourceColumnId,
        targetHandle: relationship.targetColumnId,
        type: 'smoothstep',
        animated: !hasErrors, // Stop animation if there are errors
        style: { 
          stroke: finalColor, 
          strokeWidth: hasErrors ? 3 : 2,
          strokeDasharray: hasErrors ? '10,5' : relationship.cardinality === 'N:M' ? '5,5' : undefined
        },
        label: hasErrors ? '⚠️ ' + relationship.cardinality : relationship.cardinality,
        labelBgStyle: { 
          fill: hasErrors ? '#FEF2F2' : hasWarnings ? '#FFFBEB' : '#ffffff', 
          fillOpacity: 0.9,
          rx: 4,
          ry: 4
        },
        labelStyle: { 
          fontSize: 11, 
          fontWeight: 600,
          color: finalColor
        },
        markerEnd: {
          type: 'arrowclosed',
          color: finalColor,
          width: 20,
          height: 20
        },
        data: {
          relationship,
          sourceTable: sourceTable?.name,
          targetTable: targetTable?.name,
          constraintName: relationship.constraintName,
          hasErrors,
          hasWarnings
        }
      };
    });
  }, [currentSchema.relationships, currentSchema.tables]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when schema changes
  useEffect(() => {
    const newNodes = currentSchema.tables.map(table => {
      const tableErrors = validationErrors.filter(error => error.tableId === table.id);
      const hasErrors = tableErrors.some(error => error.type === 'error');
      const hasWarnings = tableErrors.some(error => error.type === 'warning');
      
      return {
        id: table.id,
        type: 'table',
        position: table.position,
        data: {
          ...table,
          hasErrors,
          hasWarnings,
          validationErrors: tableErrors
        },
        draggable: true,
        className: hasErrors ? 'error-node' : hasWarnings ? 'warning-node' : '',
      };
    });
    setNodes(newNodes);
  }, [currentSchema.tables, validationErrors, setNodes]);

  // Update edges when relationships change
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

      return {
        id: relationship.id,
        source: relationship.sourceTableId,
        target: relationship.targetTableId,
        sourceHandle: relationship.sourceColumnId,
        targetHandle: relationship.targetColumnId,
        type: 'smoothstep',
        animated: true,
        style: { 
          stroke: edgeColor, 
          strokeWidth: 2,
          strokeDasharray: relationship.cardinality === 'N:M' ? '5,5' : undefined
        },
        label: relationship.cardinality,
        labelBgStyle: { 
          fill: '#ffffff', 
          fillOpacity: 0.9,
          rx: 4,
          ry: 4
        },
        labelStyle: { 
          fontSize: 11, 
          fontWeight: 600,
          color: edgeColor
        },
        markerEnd: {
          type: 'arrowclosed',
          color: edgeColor,
          width: 20,
          height: 20
        },
        data: {
          relationship,
          sourceTable: sourceTable?.name,
          targetTable: targetTable?.name,
          constraintName: relationship.constraintName
        }
      };
    });
    setEdges(newEdges);
  }, [currentSchema.relationships, currentSchema.tables, setEdges]);

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
          // Check if target column is a primary key
          if (!targetColumn.isPrimaryKey) {
            console.warn('Target column must be a primary key for foreign key relationship');
            return;
          }
          
          // Check if relationship already exists
          const existingRelationship = currentSchema.relationships.find(rel =>
            rel.sourceTableId === params.source &&
            rel.sourceColumnId === params.sourceHandle &&
            rel.targetTableId === params.target &&
            rel.targetColumnId === params.targetHandle
          );

          if (!existingRelationship) {
            // Create the relationship
            addRelationship({
              sourceTableId: params.source,
              sourceColumnId: params.sourceHandle,
              targetTableId: params.target,
              targetColumnId: params.targetHandle,
              cardinality: '1:N',
              constraintName: `FK_${sourceTable.name}_${sourceColumn.name}_${targetTable.name}_${targetColumn.name}`
            });
            
            // Update the source column to mark it as foreign key
            updateTable(params.source, {
              columns: sourceTable.columns.map(col => 
                col.id === params.sourceHandle 
                  ? { 
                      ...col, 
                      isForeignKey: true, 
                      referencedTable: targetTable.name,
                      referencedColumn: targetColumn.name 
                    }
                  : col
              )
            });
          }
        }
      }
    },
    [addRelationship, currentSchema.tables, currentSchema.relationships, updateTable]
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      updateTable(node.id, { position: node.position });
    },
    [updateTable]
  );

  const onMove = useCallback(
    (_event: any, viewport: any) => {
      const newZoomPercentage = Math.round(viewport.zoom * 100);
      onZoomChange(newZoomPercentage);
      onPanChange({ x: viewport.x, y: viewport.y });
    },
    [onZoomChange, onPanChange]
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
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

      {/* Custom styles for enhanced visualization */}
      <style>{`
        .error-node {
          filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.3));
        }
        .warning-node {
          filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.3));
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
      `}</style>
    </div>
  );
};

const EnhancedDatabaseCanvas: React.FC<EnhancedDatabaseCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <EnhancedDatabaseCanvasInner {...props} />
    </ReactFlowProvider>
  );
};

export default EnhancedDatabaseCanvas;
import React, { useState } from 'react';
import { 
  Plus, 
  Code, 
  Link, 
  Download, 
  Database, 
  Shield, 
  Search, 
  Settings, 
  Users,
  Zap,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useSubscription } from '../../../context/SubscriptionContext';
import { useDatabase } from '../../../context/DatabaseContext';
import AdvancedTableBuilder from '../tools/AdvancedTableBuilder';
import ZeroCodeCRUDBuilder from '../tools/ZeroCodeCRUDBuilder';
import VisualQueryBuilder from '../tools/VisualQueryBuilder';
import RelationshipVisualizer from '../tools/RelationshipVisualizer';
import SecurityManager from '../tools/SecurityManager';
import EnhancedTeamCollaboration from '../tools/EnhancedTeamCollaboration';
import SmartExportManager from '../tools/SmartExportManager';
import SQLEditor from '../tools/SQLEditor';
import ValidationPanel from '../workspace/ValidationPanel';

type ActiveTool = 'tables' | 'crud' | 'query' | 'relationships' | 'security' | 'team' | 'export' | 'sql' | 'validation' | null;

const EnhancedToolsPanel: React.FC = () => {
  const { currentPlan } = useSubscription();
  const { validationErrors } = useDatabase();
  const [activeTool, setActiveTool] = useState<ActiveTool>('tables');

  const errorCount = validationErrors.filter(e => e.type === 'error').length;
  const warningCount = validationErrors.filter(e => e.type === 'warning').length;

  const tools = [
    {
      id: 'tables' as const,
      name: 'Tables',
      icon: Database,
      description: 'Create and manage table structures',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      id: 'crud' as const,
      name: 'Data',
      icon: Plus,
      description: 'Insert, update, and delete data',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      id: 'relationships' as const,
      name: 'Relations',
      icon: Link,
      description: 'Manage table relationships',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20'
    },
    {
      id: 'query' as const,
      name: 'Query',
      icon: Search,
      description: 'Build visual queries',
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20'
    },
    {
      id: 'sql' as const,
      name: 'SQL Editor',
      icon: Code,
      description: 'Live SQL editor with real-time updates',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20'
    },
    {
      id: 'validation' as const,
      name: 'Validation',
      icon: errorCount > 0 ? AlertTriangle : CheckCircle,
      description: 'Schema validation and error checking',
      color: errorCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400',
      bgColor: errorCount > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20',
      badge: errorCount > 0 ? errorCount : warningCount > 0 ? warningCount : null,
      badgeColor: errorCount > 0 ? 'bg-red-500' : 'bg-yellow-500'
    },
    {
      id: 'export' as const,
      name: 'Export',
      icon: Download,
      description: 'Smart export with auto-naming',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20'
    },
    // Conditionally show Security or Team Collaboration based on plan
    ...(currentPlan === 'ultimate' ? [
      {
        id: 'team' as const,
        name: 'Team',
        icon: Users,
        description: 'Real-time collaboration',
        color: 'text-pink-600 dark:text-pink-400',
        bgColor: 'bg-pink-50 dark:bg-pink-900/20'
      }
    ] : [
      {
        id: 'security' as const,
        name: 'Security',
        icon: Shield,
        description: 'Manage users and permissions',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20'
      }
    ]),
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 pt-16 lg:pt-0">
      {/* Tool Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex overflow-x-auto scrollbar-hide" aria-label="Tool tabs">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
                className={`
                  relative flex flex-col items-center gap-1 py-3 px-3 text-xs font-medium border-b-2 transition-all duration-200 min-w-0 flex-shrink-0 group
                  ${activeTool === tool.id
                    ? `border-sky-500 ${tool.color} ${tool.bgColor}`
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }
                `}
                aria-pressed={activeTool === tool.id}
                title={tool.description}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {tool.badge && (
                    <div className={`absolute -top-1 -right-1 w-3 h-3 ${tool.badgeColor} text-white text-xs rounded-full flex items-center justify-center`}>
                      {tool.badge > 9 ? '9+' : tool.badge}
                    </div>
                  )}
                </div>
                <span className="hidden sm:block text-center leading-tight">{tool.name}</span>
                
                {/* Tooltip for mobile */}
                <div className="sm:hidden absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {tool.name}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Tool Content */}
      <div className="flex-1 overflow-hidden">
        {activeTool === 'tables' && <AdvancedTableBuilder />}
        {activeTool === 'crud' && <ZeroCodeCRUDBuilder />}
        {activeTool === 'query' && <VisualQueryBuilder />}
        {activeTool === 'relationships' && <RelationshipVisualizer />}
        {activeTool === 'security' && <SecurityManager />}
        {activeTool === 'team' && <EnhancedTeamCollaboration />}
        {activeTool === 'export' && <SmartExportManager />}
        {activeTool === 'sql' && <SQLEditor />}
        {activeTool === 'validation' && <ValidationPanel />}
        
        {!activeTool && (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                Enterprise Database Designer
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                Select a tool from the tabs above to start designing your database schema with advanced features and real-time collaboration.
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <Database className="w-5 h-5 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <div className="font-medium text-green-800 dark:text-green-200">Advanced Tables</div>
                  <div className="text-green-600 dark:text-green-400 text-xs">With validation</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                  <Link className="w-5 h-5 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                  <div className="font-medium text-purple-800 dark:text-purple-200">Smart Relations</div>
                  <div className="text-purple-600 dark:text-purple-400 text-xs">Visual mapping</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
                  <Code className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                  <div className="font-medium text-emerald-800 dark:text-emerald-200">Live SQL</div>
                  <div className="text-emerald-600 dark:text-emerald-400 text-xs">Real-time updates</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                  <Download className="w-5 h-5 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                  <div className="font-medium text-orange-800 dark:text-orange-200">Smart Export</div>
                  <div className="text-orange-600 dark:text-orange-400 text-xs">Auto-naming</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedToolsPanel;
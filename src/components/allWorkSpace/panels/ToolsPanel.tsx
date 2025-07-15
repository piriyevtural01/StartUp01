import React, { useState } from 'react';
import { Plus, Code, Link, Download, ChevronDown, Play, Database, Shield, Search, Settings, Users } from 'lucide-react';
import { useSubscription } from '../../../context/SubscriptionContext'; // Added subscription context
import ZeroCodeDDLBuilder from '../tools/ZeroCodeDDLBuilder';
import ZeroCodeCRUDBuilder from '../tools/ZeroCodeCRUDBuilder';
import VisualQueryBuilder from '../tools/VisualQueryBuilder';
import RelationshipBuilder from '../tools/RelationshipBuilder';
import SecurityManager from '../tools/SecurityManager';
import EnhancedTeamCollaboration from '../tools/EnhancedTeamCollaboration'; // Enhanced team collaboration
import ExportDropdown from '../tools/ExportDropdown';

type ActiveTool = 'ddl' | 'crud' | 'query' | 'relationship' | 'security' | 'team' | null;

const ToolsPanel: React.FC = () => {
  const { currentPlan } = useSubscription(); // Added subscription hook
  const [activeTool, setActiveTool] = useState<ActiveTool>('ddl');

  // Define tools with plan requirements
  const tools = [
    {
      id: 'ddl' as const,
      name: 'DDL Builder',
      icon: Database,
      description: 'Create, alter, and drop tables',
    },
    {
      id: 'crud' as const,
      name: 'Data Manager',
      icon: Plus,
      description: 'Insert, update, and delete data',
    },
    {
      id: 'query' as const,
      name: 'Query Builder',
      icon: Search,
      description: 'Build visual queries',
    },
    {
      id: 'relationship' as const,
      name: 'Relationships',
      icon: Link,
      description: 'Define table relationships',
    },
    // Conditionally show Security or Team Collaboration based on plan
    ...(currentPlan === 'ultimate' ? [
      {
        id: 'team' as const,
        name: 'Team Collaboration',
        icon: Users,
        description: 'Invite team members and manage workspace access',
      }
    ] : [
      {
        id: 'security' as const,
        name: 'Security',
        icon: Shield,
        description: 'Manage users and permissions',
      }
    ]),
  ];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 pt-16 lg:pt-0">
      {/* Tool Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex overflow-x-auto" aria-label="Tool tabs">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
                className={`
                  flex flex-col items-center gap-1 py-3 px-3 text-xs font-medium border-b-2 transition-colors duration-200 min-w-0 flex-shrink-0
                  ${activeTool === tool.id
                    ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }
                `}
                aria-pressed={activeTool === tool.id}
                title={tool.description}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:block text-center leading-tight">{tool.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Tool Content */}
      <div className="flex-1 overflow-hidden">
        {activeTool === 'ddl' && <ZeroCodeDDLBuilder />}
        {activeTool === 'crud' && <ZeroCodeCRUDBuilder />}
        {activeTool === 'query' && <VisualQueryBuilder />}
        {activeTool === 'relationship' && <RelationshipBuilder />}
        {activeTool === 'security' && <SecurityManager />}
        {activeTool === 'team' && <EnhancedTeamCollaboration />} {/* Enhanced team collaboration */}
        {!activeTool && (
          <div className="h-full flex items-center justify-center p-6">
            <div className="text-center">
              <Settings className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Select a tool to get started
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <ExportDropdown />
      </div>
    </div>
  );
};

export default ToolsPanel;
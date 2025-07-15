import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Lightbulb, Lock } from 'lucide-react';
import { useSubscription } from '../../../context/SubscriptionContext'; // Added subscription context
import FeatureGate from '../../subscription/FeatureGate'; // Added feature gate

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const ChatInterface: React.FC = () => {
  const { canUseFeature, setShowUpgradeModal, setUpgradeReason } = useSubscription(); // Added subscription hooks
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: canUseFeature('canUseAI') 
        ? "Hi! I'm your database design assistant. I can help you with schema design questions, relationship modeling, and best practices. What would you like to know?"
        : "AI Assistant is available in Pro and Ultimate plans. Upgrade to get personalized help with your database design!",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const suggestions = [
    "Which column should be the primary key?",
    "How do I design a many-to-many relationship?",
    "What's the best way to handle user authentication?",
    "Should I normalize this table structure?",
  ];

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Check if user can use AI features
    if (!canUseFeature('canUseAI')) {
      setUpgradeReason('AI Assistant is available in Pro and Ultimate plans. Upgrade to get personalized help with your database design!');
      setShowUpgradeModal(true);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: generateAIResponse(inputValue),
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes('primary key')) {
      return "For primary keys, choose a column that:\n\n• Has unique values for each row\n• Never changes\n• Is not null\n• Preferably short and simple\n\nConsider using an auto-incrementing integer (ID) or UUID if no natural primary key exists.";
    }
    
    if (lowerInput.includes('many-to-many') || lowerInput.includes('m:m')) {
      return "For many-to-many relationships:\n\n1. Create a junction/bridge table\n2. Include foreign keys from both related tables\n3. The combination of these foreign keys becomes the primary key\n4. Add any additional attributes specific to the relationship\n\nExample: Users ↔ Roles requires a UserRoles table with user_id and role_id.";
    }
    
    if (lowerInput.includes('normalize') || lowerInput.includes('normalization')) {
      return "Database normalization guidelines:\n\n• 1NF: Eliminate repeating groups\n• 2NF: Remove partial dependencies\n• 3NF: Eliminate transitive dependencies\n\nBenefits: Reduces redundancy, improves data integrity\nDrawbacks: May require more complex queries\n\nBalance normalization with performance needs.";
    }
    
    if (lowerInput.includes('authentication') || lowerInput.includes('user')) {
      return "For user authentication tables:\n\n• Store passwords as hashes (never plain text)\n• Include email, username, created_at, updated_at\n• Consider separate profile table for additional info\n• Add fields for email verification, password reset tokens\n• Include role/permission system if needed\n\nAlways follow security best practices!";
    }
    
    return "That's a great question! For database design, consider:\n\n• Data relationships and cardinality\n• Normalization vs. denormalization trade-offs\n• Indexing strategies for performance\n• Data types and constraints\n• Future scalability needs\n\nCould you provide more specific details about your schema challenge?";
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (!canUseFeature('canUseAI')) {
      setUpgradeReason('AI Assistant is available in Pro and Ultimate plans. Upgrade to get personalized help with your database design!');
      setShowUpgradeModal(true);
      return;
    }
    setInputValue(suggestion);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            canUseFeature('canUseAI') 
              ? 'bg-blue-100 dark:bg-blue-900' 
              : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            {canUseFeature('canUseAI') ? (
              <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            ) : (
              <Lock className="w-5 h-5 text-gray-500" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white">
              AI Database Assistant
              {/* Added Pro badge for non-pro users */}
              {!canUseFeature('canUseAI') && (
                <span className="ml-2 text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                  Pro Feature
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {canUseFeature('canUseAI') 
                ? 'Get help with schema design'
                : 'Upgrade to Pro for AI assistance'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.sender === 'ai' && (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                canUseFeature('canUseAI') 
                  ? 'bg-blue-100 dark:bg-blue-900' 
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                {canUseFeature('canUseAI') ? (
                  <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Lock className="w-5 h-5 text-gray-500" />
                )}
              </div>
            )}
            
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg whitespace-pre-line ${
                message.sender === 'user'
                  ? 'bg-sky-600 text-white rounded-br-none'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none'
              }`}
            >
              {message.content}
            </div>
            
            {message.sender === 'user' && (
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
            )}
          </div>
        ))}
        
        {isTyping && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg rounded-bl-none">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Try asking:
            </span>
          </div>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={!canUseFeature('canUseAI')}
                className={`block w-full text-left text-sm px-3 py-2 rounded-lg transition-colors duration-200 ${
                  canUseFeature('canUseAI')
                    ? 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                {suggestion}
                {/* Added lock icon for disabled suggestions */}
                {!canUseFeature('canUseAI') && (
                  <Lock className="w-3 h-3 inline ml-2 opacity-50" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={canUseFeature('canUseAI') ? "Ask about schema design..." : "Upgrade to Pro for AI assistance"}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
            disabled={isTyping || !canUseFeature('canUseAI')}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping || !canUseFeature('canUseAI')}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
import { Database, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const HeroSection = () => {
  const { isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  
  const handleGetStarted = () => {
    if (isAuthenticated) {
      // Navigate to workspace if authenticated
      window.location.href = '/workspace';
    } else {
      // Navigate to auth page if not authenticated
      window.location.href = '/';
    }
  };

  return (
    <section id="home" className={`pt-28 pb-16 md:pt-32 md:pb-24 ${
      isDark 
        ? 'bg-gradient-to-b from-gray-900 to-gray-800' 
        : 'bg-gradient-to-b from-[#E6F7FF] to-white'
    }`}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <h1 className={`text-4xl md:text-5xl lg:text-6xl font-bold ${isDark ? 'text-white' : 'text-gray-800'} leading-tight mb-6`}>
              Create and Manage Your Databases{' '}
              <span className="text-[#3AAFF0]">Easily</span>
            </h1>
            <p className={`text-lg md:text-xl ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-8 max-w-lg`}>
              Build, visualize, and manage your database tables without writing a single line of SQL. Perfect for developers, startups, and teams.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <button
                onClick={handleGetStarted}
                className="bg-[#3AAFF0] hover:bg-[#007ACC] text-white px-8 py-3 rounded-full font-medium text-lg flex items-center justify-center transition-all transform hover:scale-105 shadow-lg"
              >
                {isAuthenticated ? 'Go to Workspace' : 'Get Started Now'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>
              <a
                href="#how-to-use"
                className={`border-2 border-[#3AAFF0] text-[#3AAFF0] ${
                  isDark ? 'hover:bg-gray-800' : 'hover:bg-[#E6F7FF]'
                } px-8 py-3 rounded-full font-medium text-lg flex items-center justify-center transition-all`}
              >
                Watch Demo
              </a>
            </div>
          </div>
          <div className="md:w-1/2 relative">
            <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-2xl p-6 transform rotate-3 animate-pulse-slow`}>
              <div className="flex items-center mb-4">
                <Database className="h-6 w-6 text-[#3AAFF0] mr-2" />
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Users Table</h3>
              </div>
              <div className="space-y-3">
                <div className={`${isDark ? 'bg-gray-700' : 'bg-[#E6F7FF]'} h-8 w-full rounded-lg flex items-center px-3`}>
                  <div className="w-4 h-4 rounded-full bg-[#3AAFF0] mr-2"></div>
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>id</span>
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} ml-auto`}>primary key</span>
                </div>
                <div className={`${isDark ? 'bg-gray-700' : 'bg-[#E6F7FF]'} h-8 w-full rounded-lg flex items-center px-3`}>
                  <div className="w-4 h-4 rounded-full bg-green-400 mr-2"></div>
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>name</span>
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} ml-auto`}>string</span>
                </div>
                <div className={`${isDark ? 'bg-gray-700' : 'bg-[#E6F7FF]'} h-8 w-full rounded-lg flex items-center px-3`}>
                  <div className="w-4 h-4 rounded-full bg-purple-400 mr-2"></div>
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>email</span>
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} ml-auto`}>string</span>
                </div>
                <div className={`${isDark ? 'bg-gray-700' : 'bg-[#E6F7FF]'} h-8 w-full rounded-lg flex items-center px-3`}>
                  <div className="w-4 h-4 rounded-full bg-yellow-400 mr-2"></div>
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>created_at</span>
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} ml-auto`}>timestamp</span>
                </div>
              </div>
            </div>
            <div className={`absolute -bottom-6 -left-6 ${isDark ? 'bg-gray-800' : 'bg-white'} rounded-3xl shadow-2xl p-6 transform -rotate-3 z-10 animate-pulse-slower`}>
              <div className="flex items-center mb-4">
                <Database className="h-6 w-6 text-[#007ACC] mr-2" />
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Products Table</h3>
              </div>
              <div className="space-y-3">
                <div className={`${isDark ? 'bg-gray-700' : 'bg-[#E6F7FF]'} h-8 w-full rounded-lg flex items-center px-3`}>
                  <div className="w-4 h-4 rounded-full bg-[#3AAFF0] mr-2"></div>
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>id</span>
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} ml-auto`}>primary key</span>
                </div>
                <div className={`${isDark ? 'bg-gray-700' : 'bg-[#E6F7FF]'} h-8 w-full rounded-lg flex items-center px-3`}>
                  <div className="w-4 h-4 rounded-full bg-green-400 mr-2"></div>
                  <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>title</span>
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} ml-auto`}>string</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
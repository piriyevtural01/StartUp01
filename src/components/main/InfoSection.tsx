import { Database, Table, Link2, Settings } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const InfoSection = () => {
  const { isDark } = useTheme();
  
  return (
    <section className={`py-16 md:py-24 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <h2 className={`text-3xl md:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-800'} mb-6`}>
              Visual Database Creation <span className="text-[#3AAFF0]">Made Simple</span>
            </h2>
            <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-8 leading-relaxed`}>
              Database Creator is a powerful visual tool that simplifies database design and management. Create tables, define relationships, and export your schema without writing complex SQL queries.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start">
                <div className={`${isDark ? 'bg-blue-900/20' : 'bg-[#E6F7FF]'} p-3 rounded-2xl mr-4`}>
                  <Table className="h-6 w-6 text-[#007ACC]" />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'} mb-1`}>Visual Table Builder</h3>
                  <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Create tables with an intuitive drag-and-drop interface</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className={`${isDark ? 'bg-blue-900/20' : 'bg-[#E6F7FF]'} p-3 rounded-2xl mr-4`}>
                  <Link2 className="h-6 w-6 text-[#007ACC]" />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'} mb-1`}>Relationship Mapping</h3>
                  <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Define connections between tables visually</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className={`${isDark ? 'bg-blue-900/20' : 'bg-[#E6F7FF]'} p-3 rounded-2xl mr-4`}>
                  <Settings className="h-6 w-6 text-[#007ACC]" />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'} mb-1`}>Schema Export</h3>
                  <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Export to SQL, MongoDB, or other formats</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className={`${isDark ? 'bg-blue-900/20' : 'bg-[#E6F7FF]'} p-3 rounded-2xl mr-4`}>
                  <Database className="h-6 w-6 text-[#007ACC]" />
                </div>
                <div>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'} mb-1`}>Database Templates</h3>
                  <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Start with pre-built templates for common use cases</p>
                </div>
              </div>
            </div>
          </div>

          <div className="md:w-1/2 flex justify-center">
            <div className="relative w-full max-w-md">
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-[#3AAFF0] opacity-10 rounded-full"></div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#007ACC] opacity-10 rounded-full"></div>
              <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} shadow-xl rounded-3xl overflow-hidden border transform transition-transform hover:scale-105`}>
                <div className="bg-gradient-to-r from-[#007ACC] to-[#3AAFF0] p-4">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                </div>
                <div className={`p-4 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`col-span-2 ${isDark ? 'bg-gray-700' : 'bg-gray-100'} p-3 rounded-xl`}>
                      <div className="flex items-center mb-2">
                        <Database className="h-4 w-4 text-[#3AAFF0] mr-2" />
                        <h4 className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Database Schema</h4>
                      </div>
                      <div className={`${isDark ? 'bg-gray-600' : 'bg-white'} p-2 rounded-lg mb-2`}>
                        <div className={`text-xs font-mono ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>users</div>
                      </div>
                      <div className={`${isDark ? 'bg-gray-600' : 'bg-white'} p-2 rounded-lg mb-2`}>
                        <div className={`text-xs font-mono ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>products</div>
                      </div>
                      <div className={`${isDark ? 'bg-gray-600' : 'bg-white'} p-2 rounded-lg`}>
                        <div className={`text-xs font-mono ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>orders</div>
                      </div>
                    </div>
                    
                    <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-100'} p-3 rounded-xl`}>
                      <div className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Table Structure</div>
                      <div className="space-y-1">
                        <div className={`${isDark ? 'bg-gray-600 text-gray-200' : 'bg-white text-gray-900'} px-2 py-1 rounded-md text-xs`}>id</div>
                        <div className={`${isDark ? 'bg-gray-600 text-gray-200' : 'bg-white text-gray-900'} px-2 py-1 rounded-md text-xs`}>username</div>
                        <div className={`${isDark ? 'bg-gray-600 text-gray-200' : 'bg-white text-gray-900'} px-2 py-1 rounded-md text-xs`}>email</div>
                      </div>
                    </div>
                    
                    <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-100'} p-3 rounded-xl`}>
                      <div className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-200' : 'text-gray-900'}`}>Properties</div>
                      <div className={`${isDark ? 'bg-blue-900/20' : 'bg-[#E6F7FF]'} p-2 rounded-lg`}>
                        <div className="text-xs">
                          <span className="font-mono text-[#007ACC]">type: </span>
                          <span className={isDark ? 'text-gray-200' : 'text-gray-900'}>string</span>
                        </div>
                        <div className="text-xs">
                          <span className="font-mono text-[#007ACC]">unique: </span>
                          <span className={isDark ? 'text-gray-200' : 'text-gray-900'}>true</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InfoSection;
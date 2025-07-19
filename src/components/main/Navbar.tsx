import { useState, useEffect } from 'react';
import { Database, Menu, X, Settings, Moon, Sun } from 'lucide-react';
import SettingsModal from './SettingsModal';
import { useTheme } from '../../context/ThemeContext';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled
        ? `${isDark ? 'bg-gray-900' : 'bg-white'} shadow-md py-3`
        : 'bg-transparent py-5'
    }`}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          <a
            href="#"
            className={`flex items-center space-x-2 text-2xl font-bold ${isDark ? 'text-[#3AAFF0]' : 'text-[#007ACC]'}`}
          >
            <Database className="h-8 w-8" />
            <span>Database Creator</span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a
              href="#home"
              className={`${isDark ? 'text-gray-300 hover:text-[#3AAFF0]' : 'text-gray-700 hover:text-[#3AAFF0]'} transition-colors font-medium`}
            >
              Home
            </a>
            <a
              href="#benefits"
              className={`${isDark ? 'text-gray-300 hover:text-[#3AAFF0]' : 'text-gray-700 hover:text-[#3AAFF0]'} transition-colors font-medium`}
            >
              Benefits
            </a>
            <a
              href="#subscription"
              className={`${isDark ? 'text-gray-300 hover:text-[#3AAFF0]' : 'text-gray-700 hover:text-[#3AAFF0]'} transition-colors font-medium`}
            >
              Subscription
            </a>
            <a
              href="#how-to-use"
              className={`${isDark ? 'text-gray-300 hover:text-[#3AAFF0]' : 'text-gray-700 hover:text-[#3AAFF0]'} transition-colors font-medium`}
            >
              How to Use
            </a>
            <a
              href="#contact"
              className={`${isDark ? 'text-gray-300 hover:text-[#3AAFF0]' : 'text-gray-700 hover:text-[#3AAFF0]'} transition-colors font-medium`}
            >
              Contact
            </a>
            
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-2 ${isDark ? 'text-gray-300 hover:text-[#3AAFF0]' : 'text-gray-700 hover:text-[#3AAFF0]'} transition-colors font-medium`}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
              {isDark ? 'Light' : 'Dark'}
            </button>
            
            <button
              onClick={() => setShowSettingsModal(true)}
              className={`flex items-center gap-2 ${isDark ? 'text-gray-300 hover:text-[#3AAFF0]' : 'text-gray-700 hover:text-[#3AAFF0]'} transition-colors font-medium`}
            >
              <Settings size={18} />
              Settings
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className={`md:hidden ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className={`md:hidden ${isDark ? 'bg-gray-900' : 'bg-white'} border-t mt-2 py-4`}>
          <div className="container mx-auto px-4 flex flex-col space-y-4">
            <a
              href="#home"
              className={`${isDark ? 'text-gray-300 hover:text-[#3AAFF0]' : 'text-gray-700 hover:text-[#3AAFF0]'} transition-colors font-medium px-4 py-2`}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </a>
            <a
              href="#benefits"
              className={`${isDark ? 'text-gray-300 hover:text-[#3AAFF0]' : 'text-gray-700 hover:text-[#3AAFF0]'} transition-colors font-medium px-4 py-2`}
              onClick={() => setIsMenuOpen(false)}
            >
              Benefits
            </a>
            <a
              href="#subscription"
              className={`${isDark ? 'text-gray-300 hover:text-[#3AAFF0]' : 'text-gray-700 hover:text-[#3AAFF0]'} transition-colors font-medium px-4 py-2`}
              onClick={() => setIsMenuOpen(false)}
            >
              Subscription
            </a>
            <a
              href="#how-to-use"
              className={`${isDark ? 'text-gray-300 hover:text-[#3AAFF0]' : 'text-gray-700 hover:text-[#3AAFF0]'} transition-colors font-medium px-4 py-2`}
              onClick={() => setIsMenuOpen(false)}
            >
              How to Use
            </a>
            <a
              href="#contact"
              className={`${isDark ? 'text-gray-300 hover:text-[#3AAFF0]' : 'text-gray-700 hover:text-[#3AAFF0]'} transition-colors font-medium px-4 py-2`}
              onClick={() => setIsMenuOpen(false)}
            >
              Contact
            </a>
            
            {/* Mobile Dark Mode Toggle */}
            <button
              onClick={() => {
                toggleTheme();
                setIsMenuOpen(false);
              }}
              className={`flex items-center gap-2 ${isDark ? 'text-gray-300 hover:text-[#3AAFF0]' : 'text-gray-700 hover:text-[#3AAFF0]'} transition-colors font-medium px-4 py-2`}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </button>
            
            <button
              onClick={() => {
                setShowSettingsModal(true);
                setIsMenuOpen(false);
              }}
              className={`flex items-center gap-2 ${isDark ? 'text-gray-300 hover:text-[#3AAFF0]' : 'text-gray-700 hover:text-[#3AAFF0]'} transition-colors font-medium px-4 py-2`}
            >
              <Settings size={18} />
              Settings
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)} 
      />
    </header>
  );
};

export default Navbar;
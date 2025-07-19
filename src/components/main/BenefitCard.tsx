import { DivideIcon as LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { useTheme } from '../../context/ThemeContext';

interface BenefitCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

const BenefitCard = ({ icon, title, description }: BenefitCardProps) => {
  const { isDark } = useTheme();
  
  return (
    <div className={`${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'} rounded-3xl shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:transform hover:translate-y-[-5px]`}>
      <div className={`${isDark ? 'bg-blue-900/20' : 'bg-[#E6F7FF]'} p-4 rounded-2xl inline-block mb-4`}>
        {icon}
      </div>
      <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-800'} mb-3`}>{title}</h3>
      <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>{description}</p>
    </div>
  );
};

export default BenefitCard;
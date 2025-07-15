import React from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import { DatabaseProvider } from '../context/DatabaseContext';
import MainLayout from '../components/allWorkSpace/layout/MainLayout';

export const WorkspacePage: React.FC = () => {
   return (
    <div className="min-h-screen font-sans">
     <ThemeProvider>
      <DatabaseProvider>
        <MainLayout />
      </DatabaseProvider>
    </ThemeProvider>
    </div>
  );
};


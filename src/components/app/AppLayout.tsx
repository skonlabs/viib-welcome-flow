import { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { AppFooter } from './AppFooter';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-ocean">
      <AppHeader />
      
      {/* Main content with padding for fixed header/footer */}
      <main className="pt-16 pb-24 min-h-screen">
        {children}
      </main>

      <AppFooter />
    </div>
  );
};

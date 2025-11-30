import { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { AppFooter } from './AppFooter';
import { FloatingParticles } from '@/components/onboarding/FloatingParticles';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-ocean relative overflow-x-hidden w-full max-w-[100vw]">
      {/* Background effects matching onboarding screens */}
      <FloatingParticles count={50} />
      
      {/* Animated gradient orbs with parallax scrolling */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/40 rounded-full blur-[80px] animate-float" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-cyan-500/30 rounded-full blur-[80px] animate-float-delayed" />
      </div>

      <AppHeader />
      
      {/* Main content with padding for fixed header/footer */}
      <main className="relative z-10 pt-14 sm:pt-16 pb-20 sm:pb-24 min-h-screen w-full overflow-x-hidden">
        {children}
      </main>

      <AppFooter />
    </div>
  );
};

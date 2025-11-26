import { useState } from 'react';
import { Menu, Bell, Home, User, Settings, MessageSquare, Shield, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export const AppHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAdmin, signOut } = useAuth();

  const menuItems = [
    { icon: Home, label: 'Home', href: '/', showWhenLoggedOut: true },
    { icon: User, label: 'Profile', href: '/profile', showWhenLoggedOut: false },
    { icon: Settings, label: 'Settings', href: '/settings', showWhenLoggedOut: false },
    { icon: MessageSquare, label: 'Send Feedback', href: '/feedback', showWhenLoggedOut: true },
    { icon: Shield, label: 'Admin Console', href: '/admin', showWhenLoggedOut: false, adminOnly: true },
  ];

  const visibleMenuItems = menuItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    if (!item.showWhenLoggedOut && !user) return false;
    return true;
  });

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
  };

  const getUserInitials = () => {
    if (!user) return 'G';
    const email = user.email || '';
    return email.charAt(0).toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Hamburger Menu */}
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground hover:bg-white/5"
            >
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-background/95 backdrop-blur-xl border-white/10">
            <div className="flex flex-col gap-2 mt-8">
              {visibleMenuItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5 text-primary" />
                  <span className="text-foreground">{item.label}</span>
                </a>
              ))}
              
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-left mt-2 border-t border-white/10 pt-4"
              >
                <LogOut className="w-5 h-5 text-primary" />
                <span className="text-foreground">Sign Out</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Center: Logo */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-cyan-400 to-primary bg-clip-text text-transparent">
            ViiB
          </h1>
        </div>

        {/* Right: Notifications & Profile */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground hover:bg-white/5 relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          </Button>

          {user && (
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8 border border-white/20">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-sm text-foreground">
                {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

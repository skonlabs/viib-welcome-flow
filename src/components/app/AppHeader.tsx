import { useState } from 'react';
import { Bell, Home, User, Settings, MessageSquare, Shield, LogOut, ChevronDown } from '@/icons';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FeedbackModal } from './FeedbackModal';
import { ProfileModal } from './ProfileModal';
import { SettingsModal } from './SettingsModal';

export const AppHeader = () => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  
  // Track unread messages count (would connect to real notifications in production)
  const [unreadCount] = useState(0);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const menuItems = [
    { icon: Home, label: 'Home', href: '/app/home', showWhenLoggedOut: true, onClick: null },
    { icon: User, label: 'Profile', href: null, showWhenLoggedOut: false, onClick: () => setProfileModalOpen(true) },
    { icon: Settings, label: 'Settings', href: null, showWhenLoggedOut: false, onClick: () => setSettingsModalOpen(true) },
    { icon: MessageSquare, label: 'Send Feedback', href: null, showWhenLoggedOut: true, onClick: () => setFeedbackModalOpen(true) },
    { icon: Shield, label: 'Admin Console', href: '/app/admin', showWhenLoggedOut: false, adminOnly: true, onClick: null },
  ];

  const visibleMenuItems = menuItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    if (!item.showWhenLoggedOut && !user) return false;
    return true;
  });

  const handleSignOut = async () => {
    await signOut();
  };

  const getUserInitials = () => {
    if (!profile) return 'G';
    const name = profile.full_name || profile.email || profile.phone_number || '';
    return name.charAt(0).toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3">
        {/* Left: Empty space for symmetry */}
        <div className="w-10" />

        {/* Center: Logo */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary via-cyan-400 to-primary bg-clip-text text-transparent">
            ViiB
          </h1>
        </div>

        {/* Right: Notifications & Profile Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-white/5 relative h-8 w-8 sm:h-10 sm:w-10"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-icon-secondary" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </Button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 sm:gap-2 hover:bg-white/10 rounded-xl px-1.5 sm:px-2 py-1 transition-all duration-200 border border-transparent hover:border-white/20">
                  <Avatar className="w-7 h-7 sm:w-8 sm:h-8 border-2 border-icon-secondary/30">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-icon-secondary/20 text-icon-secondary text-xs sm:text-sm font-semibold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-xs sm:text-sm text-foreground font-medium max-w-[100px] truncate">
                    {profile?.full_name || profile?.email?.split('@')[0] || profile?.phone_number || 'User'}
                  </span>
                  <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-icon-secondary" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                sideOffset={8}
                className="w-56 bg-background/98 backdrop-blur-xl border border-white/20 shadow-lg rounded-2xl z-[100]"
              >
                {visibleMenuItems.map((item) => (
              <DropdownMenuItem
                key={item.label}
                onClick={() => item.onClick ? item.onClick() : navigate(item.href)}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 focus:bg-muted/50 rounded-lg transition-colors"
              >
                    <item.icon className="w-5 h-5 text-icon-secondary" />
                    <span className="text-foreground font-medium">{item.label}</span>
                  </DropdownMenuItem>
                ))}
                
                <DropdownMenuSeparator className="bg-white/20 my-1" />
                
              <DropdownMenuItem
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 focus:bg-muted/50 rounded-lg transition-colors"
              >
                  <LogOut className="w-5 h-5 text-icon-secondary" />
                  <span className="text-foreground font-medium">Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <FeedbackModal open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen} />
      <ProfileModal open={profileModalOpen} onOpenChange={setProfileModalOpen} />
      <SettingsModal open={settingsModalOpen} onOpenChange={setSettingsModalOpen} />
    </header>
  );
};

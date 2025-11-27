import { Bell, Home, User, Settings, MessageSquare, Shield, LogOut, ChevronDown } from 'lucide-react';
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

export const AppHeader = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { icon: Home, label: 'Home', href: '/app/home', showWhenLoggedOut: true },
    { icon: User, label: 'Profile', href: '/app/profile', showWhenLoggedOut: false },
    { icon: Settings, label: 'Settings', href: '/app/settings', showWhenLoggedOut: false },
    { icon: MessageSquare, label: 'Send Feedback', href: '/app/feedback', showWhenLoggedOut: true },
    { icon: Shield, label: 'Admin Console', href: '/app/admin', showWhenLoggedOut: false, adminOnly: true },
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
    if (!user) return 'G';
    const name = user.full_name || user.email || user.phone_number || '';
    return name.charAt(0).toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Empty space for symmetry */}
        <div className="w-10" />

        {/* Center: Logo */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-cyan-400 to-primary bg-clip-text text-transparent">
            ViiB
          </h1>
        </div>

        {/* Right: Notifications & Profile Dropdown */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-cyan-400 hover:bg-white/5 relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full" />
          </Button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:bg-white/5 rounded-xl px-2 py-1 transition-colors">
                  <Avatar className="w-8 h-8 border border-white/20">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm text-foreground">
                    {user.full_name || user.email?.split('@')[0] || user.phone_number || 'User'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-foreground/60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-56 bg-background/95 backdrop-blur-xl border-white/10 z-[100]"
              >
                {visibleMenuItems.map((item) => (
                  <DropdownMenuItem
                    key={item.label}
                    onClick={() => navigate(item.href)}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-white/5"
                  >
                    <item.icon className="w-5 h-5 text-cyan-400" />
                    <span className="text-foreground">{item.label}</span>
                  </DropdownMenuItem>
                ))}
                
                <DropdownMenuSeparator className="bg-white/10" />
                
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-white/5"
                >
                  <LogOut className="w-5 h-5 text-cyan-400" />
                  <span className="text-foreground">Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
};

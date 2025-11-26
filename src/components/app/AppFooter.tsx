import { Home, Heart, Search, Bookmark, Users, Clock, List } from 'lucide-react';
import { motion } from 'framer-motion';

export const AppFooter = () => {
  const navItems = [
    { icon: Home, label: 'Home', href: '/app/home' },
    { icon: Heart, label: 'Mood', href: '/app/mood' },
    { icon: Search, label: 'Search', href: '/app/search' },
    { icon: Bookmark, label: 'WatchList', href: '/app/watchlist' },
    { icon: Users, label: 'Social', href: '/app/social' },
    { icon: Clock, label: 'Together', href: '/app/together' },
    { icon: List, label: 'ViiBList', href: '/app/viiblist' },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-background/80 backdrop-blur-xl">
      <nav className="flex items-center justify-around px-2 py-3 max-w-4xl mx-auto">
        {navItems.map((item, index) => (
          <motion.a
            key={item.label}
            href={item.href}
            className="flex flex-col items-center gap-1 px-2 py-1 rounded-xl hover:bg-white/5 transition-colors min-w-[60px]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <item.icon className="w-5 h-5 text-primary" />
            <span className="text-[10px] text-foreground/80">{item.label}</span>
          </motion.a>
        ))}
      </nav>
    </footer>
  );
};

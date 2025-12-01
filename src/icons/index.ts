// ============================================
// CENTRALIZED ICON SYSTEM
// ============================================
// All icons used across the application are exported from this file.
// This ensures consistent icon usage and makes it easy to update icons site-wide.
//
// ============================================
// ICON COLOR GUIDELINES (Design System)
// ============================================
// All icon colors are defined in src/index.css as HSL values.
// Use these semantic color classes for consistent visual design:
//
// 1. text-icon-default (gray, neutral - hsl(0 0% 60%))
//    Use for: Standard icons, neutral UI elements, general-purpose icons
//    Examples: View icons, navigation icons in inactive states
//
// 2. text-icon-muted (subtle gray - hsl(0 0% 45%))
//    Use for: Less prominent icons, secondary information, disabled states
//    Examples: Placeholder icons, inactive features
//
// 3. text-icon-primary (purple/magenta - hsl(280 100% 70%))
//    Use for: Primary brand actions, important interactive elements
//    Examples: Send invitations, primary action buttons
//
// 4. text-icon-secondary (cyan/blue - hsl(200 100% 60%))
//    Use for: Navigation, informational elements, active states
//    Examples: Active navigation items, info indicators, menu icons
//
// 5. text-icon-accent (purple accent - hsl(260 100% 65%))
//    Use for: Highlighted/selected items, special emphasis
//    Examples: Selected navigation items, featured content
//
// 6. text-icon-success (green - hsl(142 76% 36%))
//    Use for: Success states, positive actions, confirmations
//    Examples: Activate user, mark as resolved, completion indicators
//
// 7. text-icon-warning (yellow/orange - hsl(38 92% 50%))
//    Use for: Warnings, alerts, caution indicators
//    Examples: Warning severity logs, pending actions
//
// 8. text-icon-danger (red - hsl(0 70% 60%))
//    Use for: Destructive actions, errors, critical alerts
//    Examples: Delete, deactivate, error severity logs
//
// ============================================
// USAGE EXAMPLES
// ============================================
// Standard icon with default color:
//   <Eye className="h-4 w-4 text-icon-default" />
//
// Destructive action icon:
//   <Trash2 className="h-4 w-4 text-icon-danger" />
//
// Active navigation item:
//   <Home className={`h-5 w-5 ${isActive ? 'text-icon-accent' : 'text-icon-secondary'}`} />
//
// ============================================

export {
  // Navigation & UI
  Home,
  Bell,
  User,
  Settings,
  MessageSquare,
  Shield,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  Filter,
  X,
  Menu,
  PanelLeft,
  MoreHorizontal,
  GripVertical,
  Dot,
  Circle,
  
  // User Management
  Users,
  UserCheck,
  UserX,
  UsersRound,
  UserPlus,
  
  // Actions & Navigation
  Search,
  Plus,
  Edit,
  Trash2,
  Save,
  Copy,
  Mail,
  Phone,
  Send,
  ArrowLeft,
  ArrowRight,
  Share2,
  Pencil,
  
  // Status & Feedback
  CheckCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Clock,
  RefreshCw,
  Check,
  ThumbsUp,
  ThumbsDown,
  Meh,
  
  // Content & Data
  Heart,
  Bookmark,
  List,
  Bug,
  Lightbulb,
  Database,
  Key,
  FileText,
  Link as LinkIcon,
  Film,
  MoreVertical,
  TrendingUp,
  ArrowUpDown,
  CheckCheck,
  Gift,
  SlidersHorizontal,
  
  // Analytics & Admin
  BarChart3,
  Activity,
  Zap,
  HeadphonesIcon,
  Layers,
  
  // Branding & Features
  Sparkles,
  Brain,
  Fingerprint,
  Lock,
  Target,
  Compass,
  Waves,
  Apple,
  PlayCircle,
  Play,
  Pause,
  Star,
  Moon,
  Globe,
  Calendar,
  
  // Loading
  Loader2,
} from 'lucide-react';

import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from '@/components/ui/sidebar';
import { BarChart3, Users, UserCheck, Clock, Heart, Eye, Send, Activity, UsersRound, HeadphonesIcon, Bug, Lightbulb, Mail, Settings, Shield, Database, Key, FileText, Zap } from '@/icons';
import ActiveUsers from '@/components/admin/ActiveUsers';
import UserRetention from '@/components/admin/UserRetention';
import Sessions from '@/components/admin/Sessions';
import MoodUsage from '@/components/admin/MoodUsage';
import TitleWatch from '@/components/admin/TitleWatch';
import PassRate from '@/components/admin/PassRate';
import Recommendations from '@/components/admin/Recommendations';
import SocialActivity from '@/components/admin/SocialActivity';
import AdminUsers from '@/components/admin/Users';
import SupportRequests from '@/components/admin/SupportRequests';
import Bugs from '@/components/admin/Bugs';
import FeatureRequests from '@/components/admin/FeatureRequests';
import { EmailTemplates } from '@/components/admin/EmailTemplates';
import { EmailSetup } from '@/components/admin/EmailSetup';
import RateLimiting from '@/components/admin/RateLimiting';
import { ContentEngine } from '@/components/admin/ContentEngine';
import ActivationCodes from '@/components/admin/ActivationCodes';
import { Jobs } from '@/components/admin/Jobs';
import SystemLogs from '@/components/admin/SystemLogs';
import ViibScoreCalculator from '@/components/admin/ViibScoreCalculator';

const metrics = [
  { id: 'active-users', title: 'Active Users', icon: Users, component: ActiveUsers, section: 'metrics' },
  { id: 'user-retention', title: 'User Retention', icon: UserCheck, component: UserRetention, section: 'metrics' },
  { id: 'sessions', title: 'Sessions', icon: Clock, component: Sessions, section: 'metrics' },
  { id: 'mood-usage', title: 'Mood Usage', icon: Heart, component: MoodUsage, section: 'metrics' },
  { id: 'title-watch', title: 'Title Watch', icon: Eye, component: TitleWatch, section: 'metrics' },
  { id: 'pass-rate', title: 'Pass Rate', icon: BarChart3, component: PassRate, section: 'metrics' },
  { id: 'recommendations', title: 'Recommendations', icon: Send, component: Recommendations, section: 'metrics' },
  { id: 'social-activity', title: 'Social Activity', icon: Activity, component: SocialActivity, section: 'metrics' },
  { id: 'users', title: 'Users', icon: UsersRound, component: AdminUsers, section: 'management' },
  { id: 'activation-codes', title: 'Activation Codes', icon: Key, component: ActivationCodes, section: 'management' },
  { id: 'support-requests', title: 'Support Requests', icon: HeadphonesIcon, component: SupportRequests, section: 'support' },
  { id: 'bugs', title: 'Bugs', icon: Bug, component: Bugs, section: 'support' },
  { id: 'feature-requests', title: 'Feature Requests', icon: Lightbulb, component: FeatureRequests, section: 'support' },
  { id: 'system-logs', title: 'System Logs', icon: FileText, component: SystemLogs, section: 'support' },
  { id: 'email-setup', title: 'Email Setup', icon: Settings, component: EmailSetup, section: 'configurations' },
  { id: 'emails', title: 'Email Templates', icon: Mail, component: EmailTemplates, section: 'configurations' },
  { id: 'rate-limiting', title: 'Rate Limiting', icon: Shield, component: RateLimiting, section: 'configurations' },
  { id: 'content-engine', title: 'Content Engine', icon: Database, component: ContentEngine, section: 'configurations' },
  { id: 'viib-calculator', title: 'ViiB Score Calculator', icon: Zap, component: ViibScoreCalculator, section: 'configurations' },
  { id: 'jobs', title: 'Jobs', icon: Clock, component: Jobs, section: 'configurations' },
];

const Admin = () => {
  const { isAdmin, loading } = useAdmin();
  const [selectedMetric, setSelectedMetric] = useState('users');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/app/home" replace />;
  }

  const SelectedComponent = metrics.find(m => m.id === selectedMetric)?.component || ActiveUsers;

  return (
    <div className="flex min-h-screen">
      <SidebarProvider>
        <div className="flex flex-1 w-full bg-background">
          <Sidebar className="border-r h-screen overflow-y-auto z-40 bg-background w-72">
            <div className="px-6 border-b sticky top-0 bg-background z-50">
              <h2 className="text-2xl font-bold text-foreground py-3">Admin Dashboard</h2>
            </div>
            <SidebarContent className="pb-20 bg-background p-4">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-2">Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {metrics.filter(m => m.section === 'management').map((metric) => (
                    <SidebarMenuItem key={metric.id}>
                      <SidebarMenuButton asChild>
                        <button
                          onClick={() => setSelectedMetric(metric.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                            selectedMetric === metric.id
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'hover:bg-accent text-foreground hover:text-accent-foreground'
                          }`}
                        >
                          <metric.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm font-medium">{metric.title}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-2">Metrics</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {metrics.filter(m => m.section === 'metrics').map((metric) => (
                    <SidebarMenuItem key={metric.id}>
                      <SidebarMenuButton asChild>
                        <button
                          onClick={() => setSelectedMetric(metric.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                            selectedMetric === metric.id
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'hover:bg-accent text-foreground hover:text-accent-foreground'
                          }`}
                        >
                          <metric.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm font-medium">{metric.title}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-2">Support</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {metrics.filter(m => m.section === 'support').map((metric) => (
                    <SidebarMenuItem key={metric.id}>
                      <SidebarMenuButton asChild>
                        <button
                          onClick={() => setSelectedMetric(metric.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                            selectedMetric === metric.id
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'hover:bg-accent text-foreground hover:text-accent-foreground'
                          }`}
                        >
                          <metric.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm font-medium">{metric.title}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-2">Configurations</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {metrics.filter(m => m.section === 'configurations').map((metric) => (
                    <SidebarMenuItem key={metric.id}>
                      <SidebarMenuButton asChild>
                        <button
                          onClick={() => setSelectedMetric(metric.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                            selectedMetric === metric.id
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'hover:bg-accent text-foreground hover:text-accent-foreground'
                          }`}
                        >
                          <metric.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm font-medium">{metric.title}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>
        </Sidebar>

        <main className="flex-1 overflow-auto bg-background pl-[50px]">
          <div className="px-8 py-6">
            <SelectedComponent />
          </div>
        </main>
      </div>
      </SidebarProvider>
    </div>
  );
};

export default Admin;

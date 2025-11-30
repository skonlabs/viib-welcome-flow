import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save } from '@/icons';

interface EmailConfig {
  id?: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
  use_ssl: boolean;
  is_active: boolean;
}

export const EmailSetup = () => {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<EmailConfig>({
    smtp_host: '',
    smtp_port: 465,
    smtp_user: '',
    smtp_password: '',
    from_email: '',
    from_name: '',
    use_ssl: true,
    is_active: true,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('email_config')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (data) setConfig(data);
    } catch (error: any) {
      console.error('Error fetching email config:', error);
      toast.error('Failed to load email configuration');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (config.id) {
        const { error } = await supabase
          .from('email_config')
          .update({
            smtp_host: config.smtp_host,
            smtp_port: config.smtp_port,
            smtp_user: config.smtp_user,
            smtp_password: config.smtp_password,
            from_email: config.from_email,
            from_name: config.from_name,
            use_ssl: config.use_ssl,
            is_active: config.is_active,
          })
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_config')
          .insert([config]);

        if (error) throw error;
      }

      toast.success('Email configuration saved successfully');
      fetchConfig();
    } catch (error: any) {
      console.error('Error saving email config:', error);
      toast.error('Failed to save email configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Email Setup</h1>
        <p className="text-muted-foreground">Configure SMTP settings for sending emails</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SMTP Configuration</CardTitle>
          <CardDescription>Email server settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_host">SMTP Host</Label>
              <Input
                id="smtp_host"
                value={config.smtp_host}
                onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })}
                placeholder="smtp.gmail.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_port">SMTP Port</Label>
              <Input
                id="smtp_port"
                type="number"
                value={config.smtp_port}
                onChange={(e) => setConfig({ ...config, smtp_port: parseInt(e.target.value) })}
                placeholder="465"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp_user">SMTP Username</Label>
            <Input
              id="smtp_user"
              value={config.smtp_user}
              onChange={(e) => setConfig({ ...config, smtp_user: e.target.value })}
              placeholder="your-email@gmail.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="smtp_password">SMTP Password</Label>
            <Input
              id="smtp_password"
              type="password"
              value={config.smtp_password}
              onChange={(e) => setConfig({ ...config, smtp_password: e.target.value })}
              placeholder="Your app password"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from_email">From Email</Label>
              <Input
                id="from_email"
                type="email"
                value={config.from_email}
                onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
                placeholder="noreply@yourdomain.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="from_name">From Name</Label>
              <Input
                id="from_name"
                value={config.from_name}
                onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
                placeholder="ViiB Team"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="use_ssl"
                checked={config.use_ssl}
                onCheckedChange={(checked) => setConfig({ ...config, use_ssl: checked })}
              />
              <Label htmlFor="use_ssl">Use SSL/TLS</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={config.is_active}
                onCheckedChange={(checked) => setConfig({ ...config, is_active: checked })}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2 text-icon-primary" /> : <Save className="h-4 w-4 mr-2 text-icon-success" />}
            Save Configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus, Edit, Trash2 } from '@/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RateLimit {
  id?: string;
  endpoint: string;
  max_requests: number;
  window_seconds: number;
  is_active: boolean;
  description?: string;
}

const RateLimiting = () => {
  const [loading, setLoading] = useState(false);
  const [rateLimits, setRateLimits] = useState<RateLimit[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLimit, setEditingLimit] = useState<RateLimit | null>(null);
  const [formData, setFormData] = useState<RateLimit>({
    endpoint: '',
    max_requests: 100,
    window_seconds: 60,
    is_active: true,
    description: '',
  });

  useEffect(() => {
    fetchRateLimits();
  }, []);

  const fetchRateLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('rate_limit_config')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRateLimits(data || []);
    } catch (error: any) {
      console.error('Error fetching rate limits:', error);
      toast.error('Failed to load rate limits');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editingLimit?.id) {
        const { error } = await supabase
          .from('rate_limit_config')
          .update(formData)
          .eq('id', editingLimit.id);

        if (error) throw error;
        toast.success('Rate limit updated successfully');
      } else {
        const { error } = await supabase
          .from('rate_limit_config')
          .insert([formData]);

        if (error) throw error;
        toast.success('Rate limit created successfully');
      }

      setIsDialogOpen(false);
      setEditingLimit(null);
      setFormData({
        endpoint: '',
        max_requests: 100,
        window_seconds: 60,
        is_active: true,
        description: '',
      });
      fetchRateLimits();
    } catch (error: any) {
      console.error('Error saving rate limit:', error);
      toast.error('Failed to save rate limit');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (limit: RateLimit) => {
    setEditingLimit(limit);
    setFormData(limit);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rate limit?')) return;

    try {
      const { error } = await supabase
        .from('rate_limit_config')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Rate limit deleted successfully');
      fetchRateLimits();
    } catch (error: any) {
      console.error('Error deleting rate limit:', error);
      toast.error('Failed to delete rate limit');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Rate Limiting</h1>
          <p className="text-muted-foreground">Configure API rate limits and throttling</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingLimit(null);
              setFormData({
                endpoint: '',
                max_requests: 100,
                window_seconds: 60,
                is_active: true,
                description: '',
              });
            }}>
              <Plus className="h-4 w-4 mr-2 text-icon-primary" />
              Add Rate Limit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLimit ? 'Edit Rate Limit' : 'Add Rate Limit'}</DialogTitle>
              <DialogDescription>
                {editingLimit ? 'Update the rate limit configuration' : 'Create a new rate limit rule'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="endpoint">Endpoint</Label>
                <Input
                  id="endpoint"
                  value={formData.endpoint}
                  onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                  placeholder="/api/users"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_requests">Max Requests</Label>
                  <Input
                    id="max_requests"
                    type="number"
                    value={formData.max_requests}
                    onChange={(e) => setFormData({ ...formData, max_requests: parseInt(e.target.value) })}
                    placeholder="100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="window_seconds">Window (seconds)</Label>
                  <Input
                    id="window_seconds"
                    type="number"
                    value={formData.window_seconds}
                    onChange={(e) => setFormData({ ...formData, window_seconds: parseInt(e.target.value) })}
                    placeholder="60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="User registration endpoint"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2 text-icon-primary" />}
            {editingLimit ? 'Update Rate Limit' : 'Create Rate Limit'}
          </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rate Limit Rules</CardTitle>
          <CardDescription>Active rate limiting configurations</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Endpoint</TableHead>
                <TableHead>Max Requests</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rateLimits.map((limit) => (
                <TableRow key={limit.id}>
                  <TableCell className="font-medium">{limit.endpoint}</TableCell>
                  <TableCell>{limit.max_requests}</TableCell>
                  <TableCell>{limit.window_seconds}s</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${limit.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {limit.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(limit)}
                            >
                              <Edit className="h-4 w-4 text-icon-default" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => limit.id && handleDelete(limit.id)}
                            >
                              <Trash2 className="h-4 w-4 text-icon-danger" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RateLimiting;

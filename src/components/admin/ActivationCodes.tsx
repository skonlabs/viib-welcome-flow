import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Loader2, Copy, Trash2, Mail } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function ActivationCodes() {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [maxUses, setMaxUses] = useState(1);
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedCodeForInvite, setSelectedCodeForInvite] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activation_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error('Error fetching activation codes:', error);
      toast.error('Failed to load activation codes');
    } finally {
      setLoading(false);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(code);
  };

  const createCode = async () => {
    if (!newCode.trim()) {
      toast.error('Please enter or generate a code');
      return;
    }

    try {
      setGenerating(true);
      const { error } = await supabase
        .from('activation_codes')
        .insert({
          code: newCode.trim(),
          max_uses: maxUses,
          expires_at: expiresAt || null,
          notes: notes.trim() || null,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('This code already exists');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Activation code created successfully');
      setCreateDialogOpen(false);
      resetForm();
      fetchCodes();
    } catch (error) {
      console.error('Error creating activation code:', error);
      toast.error('Failed to create activation code');
    } finally {
      setGenerating(false);
    }
  };

  const deleteCode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this activation code?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('activation_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Activation code deleted successfully');
      fetchCodes();
    } catch (error) {
      console.error('Error deleting activation code:', error);
      toast.error('Failed to delete activation code');
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard');
  };

  const resetForm = () => {
    setNewCode('');
    setMaxUses(1);
    setExpiresAt('');
    setNotes('');
  };

  const openInviteDialog = (code: any) => {
    setSelectedCodeForInvite(code);
    setInviteEmail('');
    setInviteDialogOpen(true);
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (!selectedCodeForInvite) {
      toast.error('No activation code selected');
      return;
    }

    try {
      setSending(true);
      
      const { data, error } = await supabase.functions.invoke('send-activation-invite', {
        body: {
          email: inviteEmail.trim(),
          code: selectedCodeForInvite.code,
          senderName: 'ViiB Team',
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Invitation sent to ${inviteEmail}`);
        setInviteDialogOpen(false);
        setInviteEmail('');
        setSelectedCodeForInvite(null);
      } else {
        throw new Error(data?.error || 'Failed to send invitation');
      }
    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast.error(error.message || 'Failed to send invitation email');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6 text-left pl-6">
        <h1 className="text-3xl font-bold">Activation Codes</h1>
        <p className="text-muted-foreground">Generate and manage app activation codes</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Activation Codes ({codes.length})</CardTitle>
              <CardDescription>Create unique codes for user activation</CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Code
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Activation Code</DialogTitle>
                  <DialogDescription>Generate a new activation code for users</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="code"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value)}
                        placeholder="Enter code or generate"
                      />
                      <Button type="button" variant="outline" onClick={generateRandomCode}>
                        Generate
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxUses">Max Uses</Label>
                    <Input
                      id="maxUses"
                      type="number"
                      min="1"
                      value={maxUses}
                      onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiresAt">Expires At (optional)</Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any notes about this code..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createCode} disabled={generating}>
                    {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Code
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Used By</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="max-w-xs">Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No activation codes found
                  </TableCell>
                </TableRow>
              ) : (
                codes.map((code) => {
                  const isExpired = code.expires_at && new Date(code.expires_at) < new Date();
                  const isFullyUsed = code.current_uses >= code.max_uses;
                  const isActive = !isExpired && !isFullyUsed;

                  return (
                    <TableRow key={code.id}>
                      <TableCell className="font-mono font-medium">{code.code}</TableCell>
                      <TableCell>
                        <Badge variant={isActive ? 'default' : 'secondary'}>
                          {isExpired ? 'Expired' : isFullyUsed ? 'Fully Used' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {code.current_uses} / {code.max_uses}
                      </TableCell>
                      <TableCell>{code.used_by ? 'Yes' : '-'}</TableCell>
                      <TableCell>
                        {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>{new Date(code.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="max-w-xs truncate">{code.notes || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openInviteDialog(code)}
                            disabled={!isActive}
                            title={!isActive ? 'Code is expired or fully used' : 'Send invitation email'}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(code.code)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteCode(code.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Activation Invite</DialogTitle>
            <DialogDescription>
              Send this activation code to a user via email
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Activation Code</Label>
              <div className="font-mono font-bold text-lg p-3 bg-muted rounded-md">
                {selectedCodeForInvite?.code}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Recipient Email</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendInvite} disabled={sending}>
              {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

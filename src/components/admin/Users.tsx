import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Loader2, UserCheck, UserX, Eye } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const Users = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(user => 
        user.full_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone_number?.includes(query) ||
        user.username?.toLowerCase().includes(query)
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const viewUserDetails = (user: any) => {
    setSelectedUser(user);
    setDetailsDialogOpen(true);
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
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground">Manage user accounts and permissions</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Users ({filteredUsers.length})</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Onboarding</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || '-'}</TableCell>
                    <TableCell>{user.email || '-'}</TableCell>
                    <TableCell>{user.phone_number || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'default' : 'destructive'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.onboarding_completed ? 'default' : 'secondary'}>
                        {user.onboarding_completed ? 'Complete' : 'Incomplete'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <div className="flex justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => viewUserDetails(user)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                <span className="text-xs">View</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View user details</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant={user.is_active ? 'destructive' : 'default'}
                                onClick={() => toggleUserStatus(user.id, user.is_active)}
                              >
                                {user.is_active ? <UserX className="h-4 w-4 mr-1" /> : <UserCheck className="h-4 w-4 mr-1" />}
                                <span className="text-xs">{user.is_active ? 'Deactivate' : 'Activate'}</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{user.is_active ? 'Deactivate user account' : 'Activate user account'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Complete information about this user</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                <p className="text-sm">{selectedUser.full_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Username</p>
                <p className="text-sm">{selectedUser.username || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-sm">{selectedUser.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
                <p className="text-sm">{selectedUser.phone_number || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Signup Method</p>
                <p className="text-sm">{selectedUser.signup_method || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Country</p>
                <p className="text-sm">{selectedUser.country || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Language</p>
                <p className="text-sm">{selectedUser.language_preference || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Timezone</p>
                <p className="text-sm">{selectedUser.timezone || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Account Status</p>
                <Badge variant={selectedUser.is_active ? 'default' : 'destructive'}>
                  {selectedUser.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email Verified</p>
                <Badge variant={selectedUser.is_email_verified ? 'default' : 'secondary'}>
                  {selectedUser.is_email_verified ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone Verified</p>
                <Badge variant={selectedUser.is_phone_verified ? 'default' : 'secondary'}>
                  {selectedUser.is_phone_verified ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Age Over 18</p>
                <Badge variant={selectedUser.is_age_over_18 ? 'default' : 'secondary'}>
                  {selectedUser.is_age_over_18 ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Onboarding Status</p>
                <Badge variant={selectedUser.onboarding_completed ? 'default' : 'secondary'}>
                  {selectedUser.onboarding_completed ? 'Complete' : 'Incomplete'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Onboarding Step</p>
                <p className="text-sm">{selectedUser.last_onboarding_step || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created At</p>
                <p className="text-sm">{new Date(selectedUser.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">User ID</p>
                <p className="text-sm font-mono text-xs">{selectedUser.id}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, Loader2, UserCheck, UserX, Eye, Filter, X, Trash2 } from '@/icons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const Users = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [onboardingFilter, setOnboardingFilter] = useState<string>('all');
  const [signupMethodFilter, setSignupMethodFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState<{ id: string; currentStatus: boolean } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = [...users];

    // Search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.full_name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.phone_number?.includes(query) ||
        user.username?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => 
        statusFilter === 'active' ? user.is_active : !user.is_active
      );
    }

    // Onboarding filter
    if (onboardingFilter !== 'all') {
      filtered = filtered.filter(user => 
        onboardingFilter === 'complete' ? user.onboarding_completed : !user.onboarding_completed
      );
    }

    // Signup method filter
    if (signupMethodFilter !== 'all') {
      filtered = filtered.filter(user => 
        user.signup_method === signupMethodFilter
      );
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(user => 
        new Date(user.created_at) >= dateFrom
      );
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter(user => 
        new Date(user.created_at) <= endOfDay
      );
    }

    setFilteredUsers(filtered);
  }, [searchQuery, users, statusFilter, onboardingFilter, signupMethodFilter, dateFrom, dateTo]);

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

  const toggleUserStatus = async () => {
    if (!userToToggle) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !userToToggle.currentStatus })
        .eq('id', userToToggle.id);

      if (error) throw error;
      
      toast.success(`User ${!userToToggle.currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    } finally {
      setConfirmDialogOpen(false);
      setUserToToggle(null);
    }
  };

  const openConfirmDialog = (userId: string, currentStatus: boolean) => {
    setUserToToggle({ id: userId, currentStatus });
    setConfirmDialogOpen(true);
  };

  const openDeleteDialog = (userId: string, userName: string) => {
    setUserToDelete({ id: userId, name: userName });
    setDeleteDialogOpen(true);
  };

  const deleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userToDelete.id);

      if (error) throw error;
      
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const viewUserDetails = (user: any) => {
    setSelectedUser(user);
    setDetailsDialogOpen(true);
  };

  const clearAllFilters = () => {
    setStatusFilter('all');
    setOnboardingFilter('all');
    setSignupMethodFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchQuery('');
  };

  const hasActiveFilters = statusFilter !== 'all' || 
    onboardingFilter !== 'all' || 
    signupMethodFilter !== 'all' || 
    dateFrom !== undefined || 
    dateTo !== undefined;

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
          <div className="flex flex-col gap-4">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                      {[statusFilter, onboardingFilter, signupMethodFilter, dateFrom, dateTo].filter(f => f && f !== 'all').length}
                    </Badge>
                  )}
                </Button>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Onboarding</label>
                  <Select value={onboardingFilter} onValueChange={setOnboardingFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                      <SelectItem value="incomplete">Incomplete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Signup Method</label>
                  <Select value={signupMethodFilter} onValueChange={setSignupMethodFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Date From</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {dateFrom ? format(dateFrom, 'MMM dd, yyyy') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Date To</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        {dateTo ? format(dateTo, 'MMM dd, yyyy') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Name</TableHead>
                <TableHead className="w-[180px]">Email</TableHead>
                <TableHead className="w-[130px]">Phone</TableHead>
                <TableHead className="w-[90px]">Status</TableHead>
                <TableHead className="w-[110px]">Onboarding</TableHead>
                <TableHead className="w-[100px]">Created</TableHead>
                <TableHead className="w-[150px] text-right">Actions</TableHead>
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
                filteredUsers
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || '-'}</TableCell>
                    <TableCell>{user.email || '-'}</TableCell>
                    <TableCell>{user.phone_number || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'success' : 'destructive'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.onboarding_completed ? 'success' : 'warning'}>
                        {user.onboarding_completed ? 'Complete' : 'Incomplete'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => viewUserDetails(user)}
                            >
                              <Eye className="h-4 w-4 text-icon-default" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View user details</p>
                          </TooltipContent>
                        </Tooltip>
                        {user.is_active ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => openConfirmDialog(user.id, user.is_active)}
                              >
                                <UserX className="h-4 w-4 text-icon-danger" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Deactivate user</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => openConfirmDialog(user.id, user.is_active)}
                              >
                                <UserCheck className="h-4 w-4 text-icon-success" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Activate user</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => openDeleteDialog(user.id, user.full_name || user.email || 'User')}
                            >
                              <Trash2 className="h-4 w-4 text-icon-danger" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete user</p>
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
          
          {filteredUsers.length > itemsPerPage && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredUsers.length / itemsPerPage), p + 1))}
                  disabled={currentPage >= Math.ceil(filteredUsers.length / itemsPerPage)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {userToToggle?.currentStatus 
                ? 'This will deactivate the user account. The user will not be able to log in until reactivated.'
                : 'This will activate the user account. The user will be able to log in.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToToggle(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={toggleUserStatus} className={userToToggle?.currentStatus ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}>
              {userToToggle?.currentStatus ? 'Deactivate' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {userToDelete?.name}? This action cannot be undone and will remove all user data from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                <p className="text-sm font-medium text-muted-foreground">IP Address</p>
                <p className="text-sm font-mono">{selectedUser.ip_address || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Country (from IP)</p>
                <p className="text-sm">{selectedUser.ip_country || '-'}</p>
              </div>
              <div className="col-span-2">
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

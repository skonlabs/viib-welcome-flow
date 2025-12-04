import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Users, Link2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface User {
  id: string;
  full_name: string | null;
  email: string | null;
  username: string | null;
}

interface Connection {
  id: string;
  user_id: string;
  friend_user_id: string;
  relationship_type: string | null;
  trust_score: number;
  is_muted: boolean;
}

interface GraphNode {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  connections: number;
  depth: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string | null;
  trust: number;
}

const SAMPLE_USERS = [
  { full_name: 'Alex Rivera', email: 'alex@example.com', username: 'alexr' },
  { full_name: 'Jordan Chen', email: 'jordan@example.com', username: 'jordanc' },
  { full_name: 'Sam Williams', email: 'sam@example.com', username: 'samw' },
  { full_name: 'Taylor Kim', email: 'taylor@example.com', username: 'taylork' },
  { full_name: 'Morgan Lee', email: 'morgan@example.com', username: 'morganl' },
  { full_name: 'Casey Brown', email: 'casey@example.com', username: 'caseyb' },
  { full_name: 'Riley Garcia', email: 'riley@example.com', username: 'rileyg' },
  { full_name: 'Avery Martinez', email: 'avery@example.com', username: 'averym' },
  { full_name: 'Quinn Johnson', email: 'quinn@example.com', username: 'quinnj' },
  { full_name: 'Drew Anderson', email: 'drew@example.com', username: 'drewa' },
  { full_name: 'Reese Thomas', email: 'reese@example.com', username: 'reeset' },
  { full_name: 'Skyler White', email: 'skyler@example.com', username: 'skylerw' },
];

const RELATIONSHIP_TYPES = ['friend', 'family', 'colleague', 'acquaintance'];

const SocialGraph = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, connectionsRes] = await Promise.all([
        supabase.from('users').select('id, full_name, email, username'),
        supabase.from('friend_connections').select('*'),
      ]);

      if (usersRes.data) setUsers(usersRes.data);
      if (connectionsRes.data) setConnections(connectionsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load social graph data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const generateSampleData = async () => {
    setGenerating(true);
    try {
      // Insert sample users
      const { data: insertedUsers, error: usersError } = await supabase
        .from('users')
        .insert(
          SAMPLE_USERS.map((u) => ({
            ...u,
            is_age_over_18: true,
            is_active: true,
            onboarding_completed: true,
          }))
        )
        .select('id');

      if (usersError) throw usersError;

      if (insertedUsers && insertedUsers.length > 0) {
        // Create connections between users (random network)
        const connectionsList: Omit<Connection, 'id'>[] = [];
        const userIds = insertedUsers.map((u) => u.id);

        // Create a connected network
        for (let i = 0; i < userIds.length; i++) {
          // Connect each user to 2-4 random others
          const numConnections = Math.floor(Math.random() * 3) + 2;
          const possibleTargets = userIds.filter((id) => id !== userIds[i]);

          for (let j = 0; j < numConnections && possibleTargets.length > 0; j++) {
            const randomIndex = Math.floor(Math.random() * possibleTargets.length);
            const targetId = possibleTargets.splice(randomIndex, 1)[0];

            // Check if connection already exists (in either direction)
            const exists = connectionsList.some(
              (c) =>
                (c.user_id === userIds[i] && c.friend_user_id === targetId) ||
                (c.user_id === targetId && c.friend_user_id === userIds[i])
            );

            if (!exists) {
              connectionsList.push({
                user_id: userIds[i],
                friend_user_id: targetId,
                relationship_type: RELATIONSHIP_TYPES[Math.floor(Math.random() * RELATIONSHIP_TYPES.length)],
                trust_score: Math.random() * 0.5 + 0.5,
                is_muted: false,
              });
            }
          }
        }

        const { error: connectionsError } = await supabase
          .from('friend_connections')
          .insert(connectionsList);

        if (connectionsError) throw connectionsError;
      }

      toast.success('Sample data generated successfully!');
      await loadData();
    } catch (error) {
      console.error('Error generating sample data:', error);
      toast.error('Failed to generate sample data');
    } finally {
      setGenerating(false);
    }
  };

  const deleteSampleData = async () => {
    setDeleting(true);
    try {
      // Find sample users by email pattern
      const sampleEmails = SAMPLE_USERS.map((u) => u.email);

      const { data: sampleUsers } = await supabase
        .from('users')
        .select('id')
        .in('email', sampleEmails);

      if (sampleUsers && sampleUsers.length > 0) {
        const sampleUserIds = sampleUsers.map((u) => u.id);

        // Delete connections first
        await supabase
          .from('friend_connections')
          .delete()
          .or(`user_id.in.(${sampleUserIds.join(',')}),friend_user_id.in.(${sampleUserIds.join(',')})`);

        // Delete users
        await supabase.from('users').delete().in('id', sampleUserIds);
      }

      toast.success('Sample data deleted successfully!');
      setShowDeleteDialog(false);
      await loadData();
    } catch (error) {
      console.error('Error deleting sample data:', error);
      toast.error('Failed to delete sample data');
    } finally {
      setDeleting(false);
    }
  };

  // Build graph data with force simulation
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const edgeList: GraphEdge[] = [];

    // Create nodes from users
    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    users.forEach((user, index) => {
      const angle = (2 * Math.PI * index) / users.length;
      const connectionCount = connections.filter(
        (c) => c.user_id === user.id || c.friend_user_id === user.id
      ).length;

      nodeMap.set(user.id, {
        id: user.id,
        name: user.full_name || user.username || user.email || 'Unknown',
        x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 50,
        y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 50,
        vx: 0,
        vy: 0,
        connections: connectionCount,
        depth: 0,
      });
    });

    // Create edges from connections
    connections.forEach((conn) => {
      edgeList.push({
        source: conn.user_id,
        target: conn.friend_user_id,
        type: conn.relationship_type,
        trust: conn.trust_score,
      });
    });

    // Calculate depth for highlighting
    if (selectedNode) {
      const directFriends = new Set<string>();
      const friendsOfFriends = new Set<string>();

      connections.forEach((conn) => {
        if (conn.user_id === selectedNode) directFriends.add(conn.friend_user_id);
        if (conn.friend_user_id === selectedNode) directFriends.add(conn.user_id);
      });

      connections.forEach((conn) => {
        if (directFriends.has(conn.user_id) && conn.friend_user_id !== selectedNode) {
          friendsOfFriends.add(conn.friend_user_id);
        }
        if (directFriends.has(conn.friend_user_id) && conn.user_id !== selectedNode) {
          friendsOfFriends.add(conn.user_id);
        }
      });

      nodeMap.forEach((node) => {
        if (node.id === selectedNode) node.depth = 0;
        else if (directFriends.has(node.id)) node.depth = 1;
        else if (friendsOfFriends.has(node.id)) node.depth = 2;
        else node.depth = 3;
      });
    }

    return { nodes: Array.from(nodeMap.values()), edges: edgeList };
  }, [users, connections, selectedNode]);

  const getNodeColor = useCallback(
    (node: GraphNode) => {
      if (selectedNode === node.id) return 'hsl(var(--primary))';
      if (hoveredNode === node.id) return 'hsl(var(--primary) / 0.8)';
      if (selectedNode) {
        if (node.depth === 1) return 'hsl(173, 80%, 50%)'; // Cyan for direct friends
        if (node.depth === 2) return 'hsl(45, 90%, 60%)'; // Gold for friends of friends
        return 'hsl(var(--muted-foreground) / 0.3)';
      }
      return 'hsl(var(--primary) / 0.7)';
    },
    [selectedNode, hoveredNode]
  );

  const getEdgeColor = useCallback(
    (edge: GraphEdge) => {
      if (!selectedNode) return 'hsl(var(--primary) / 0.3)';
      if (edge.source === selectedNode || edge.target === selectedNode) {
        return 'hsl(173, 80%, 50%)';
      }
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      if (sourceNode?.depth === 1 || targetNode?.depth === 1) {
        return 'hsl(45, 90%, 60% / 0.5)';
      }
      return 'hsl(var(--muted-foreground) / 0.1)';
    },
    [selectedNode, nodes]
  );

  const getNodeSize = useCallback(
    (node: GraphNode) => {
      const baseSize = 8 + node.connections * 3;
      if (selectedNode === node.id) return baseSize * 1.5;
      if (hoveredNode === node.id) return baseSize * 1.3;
      return baseSize;
    },
    [selectedNode, hoveredNode]
  );

  const stats = useMemo(() => {
    const totalConnections = connections.length;
    const avgConnections = users.length > 0 ? (totalConnections * 2) / users.length : 0;
    const relationshipTypes = connections.reduce(
      (acc, conn) => {
        const type = conn.relationship_type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return { totalConnections, avgConnections, relationshipTypes };
  }, [users, connections]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 text-left pl-6">
        <h1 className="text-3xl font-bold">Social Graph</h1>
        <p className="text-muted-foreground">Visualize user connections and relationships</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-6">
        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-cyan-500/20">
                <Link2 className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalConnections}</p>
                <p className="text-sm text-muted-foreground">Connections</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/20">
                <Users className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgConnections.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Avg per User</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-1">
              {Object.entries(stats.relationshipTypes).map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {type}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex gap-3 px-6">
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <Button onClick={generateSampleData} disabled={generating} size="sm">
          {generating ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Users className="h-4 w-4 mr-2" />
          )}
          Generate Sample Data
        </Button>
        <Button onClick={() => setShowDeleteDialog(true)} variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Sample Data
        </Button>
        {selectedNode && (
          <Button onClick={() => setSelectedNode(null)} variant="ghost" size="sm">
            Clear Selection
          </Button>
        )}
      </div>

      {/* Graph Visualization */}
      <Card className="mx-6 bg-card/30 backdrop-blur border-primary/20">
        <CardHeader>
          <CardTitle>Network Visualization</CardTitle>
          <CardDescription>
            Click on a node to highlight their connections. Direct friends appear in cyan, friends of friends in gold.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
              <Users className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg">No users to display</p>
              <p className="text-sm">Generate sample data to see the social graph</p>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-background to-muted/20">
              <svg width="100%" height="600" viewBox="0 0 800 600">
                {/* Background glow effect */}
                <defs>
                  <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </radialGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Edges */}
                <g>
                  <AnimatePresence>
                    {edges.map((edge, index) => {
                      const sourceNode = nodes.find((n) => n.id === edge.source);
                      const targetNode = nodes.find((n) => n.id === edge.target);
                      if (!sourceNode || !targetNode) return null;

                      const isHighlighted =
                        selectedNode &&
                        (edge.source === selectedNode || edge.target === selectedNode);

                      return (
                        <motion.line
                          key={`${edge.source}-${edge.target}`}
                          initial={{ opacity: 0 }}
                          animate={{
                            opacity: 1,
                            x1: sourceNode.x,
                            y1: sourceNode.y,
                            x2: targetNode.x,
                            y2: targetNode.y,
                          }}
                          transition={{ duration: 0.5, delay: index * 0.02 }}
                          stroke={getEdgeColor(edge)}
                          strokeWidth={isHighlighted ? 3 : 1.5}
                          strokeOpacity={isHighlighted ? 1 : 0.6}
                        />
                      );
                    })}
                  </AnimatePresence>
                </g>

                {/* Nodes */}
                <g>
                  <AnimatePresence>
                    {nodes.map((node, index) => (
                      <motion.g
                        key={node.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                          scale: 1,
                          opacity: 1,
                          x: node.x,
                          y: node.y,
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 100,
                          damping: 15,
                          delay: index * 0.03,
                        }}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setSelectedNode(node.id === selectedNode ? null : node.id)}
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                      >
                        {/* Glow effect for selected/hovered */}
                        {(selectedNode === node.id || hoveredNode === node.id) && (
                          <motion.circle
                            r={getNodeSize(node) * 2}
                            fill="url(#nodeGlow)"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          />
                        )}

                        {/* Main node circle */}
                        <motion.circle
                          r={getNodeSize(node)}
                          fill={getNodeColor(node)}
                          filter={selectedNode === node.id ? 'url(#glow)' : undefined}
                          animate={{
                            r: getNodeSize(node),
                            fill: getNodeColor(node),
                          }}
                          transition={{ duration: 0.2 }}
                        />

                        {/* Connection count indicator */}
                        {node.connections > 2 && (
                          <text
                            textAnchor="middle"
                            dy="0.35em"
                            fill="white"
                            fontSize="10"
                            fontWeight="bold"
                          >
                            {node.connections}
                          </text>
                        )}

                        {/* Name label */}
                        {(hoveredNode === node.id || selectedNode === node.id) && (
                          <motion.text
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: getNodeSize(node) + 15 }}
                            textAnchor="middle"
                            fill="hsl(var(--foreground))"
                            fontSize="12"
                            fontWeight="500"
                          >
                            {node.name}
                          </motion.text>
                        )}
                      </motion.g>
                    ))}
                  </AnimatePresence>
                </g>
              </svg>

              {/* Legend */}
              <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur rounded-lg p-3 text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span>Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(173, 80%, 50%)' }} />
                    <span>Direct Friend</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: 'hsl(45, 90%, 60%)' }} />
                    <span>Friend of Friend</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected User Details */}
      {selectedNode && (
        <Card className="mx-6 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle>
              {nodes.find((n) => n.id === selectedNode)?.name || 'Unknown User'}
            </CardTitle>
            <CardDescription>Connection details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2 text-cyan-400">Direct Friends ({nodes.filter((n) => n.depth === 1).length})</h4>
                <div className="flex flex-wrap gap-2">
                  {nodes
                    .filter((n) => n.depth === 1)
                    .map((friend) => (
                      <Badge key={friend.id} variant="secondary">
                        {friend.name}
                      </Badge>
                    ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-amber-400">Friends of Friends ({nodes.filter((n) => n.depth === 2).length})</h4>
                <div className="flex flex-wrap gap-2">
                  {nodes
                    .filter((n) => n.depth === 2)
                    .map((friend) => (
                      <Badge key={friend.id} variant="outline">
                        {friend.name}
                      </Badge>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sample Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all sample users and their connections. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteSampleData}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SocialGraph;

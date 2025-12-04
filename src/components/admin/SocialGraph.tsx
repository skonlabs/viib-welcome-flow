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
  isOverflow?: boolean; // Node represents overflow count
  overflowCount?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string | null;
  trust: number;
  sourceDepth?: number;
  targetDepth?: number;
}

// 5-level hierarchical sample users
const SAMPLE_USERS = [
  // Level 0 - Center (1 user)
  { full_name: 'Alex Rivera', email: 'alex@example.com', username: 'alexr', level: 0 },
  // Level 1 - Direct friends (3 users)
  { full_name: 'Jordan Chen', email: 'jordan@example.com', username: 'jordanc', level: 1 },
  { full_name: 'Sam Williams', email: 'sam@example.com', username: 'samw', level: 1 },
  { full_name: 'Taylor Kim', email: 'taylor@example.com', username: 'taylork', level: 1 },
  // Level 2 - Friends of friends (6 users)
  { full_name: 'Morgan Lee', email: 'morgan@example.com', username: 'morganl', level: 2 },
  { full_name: 'Casey Brown', email: 'casey@example.com', username: 'caseyb', level: 2 },
  { full_name: 'Riley Garcia', email: 'riley@example.com', username: 'rileyg', level: 2 },
  { full_name: 'Avery Martinez', email: 'avery@example.com', username: 'averym', level: 2 },
  { full_name: 'Quinn Johnson', email: 'quinn@example.com', username: 'quinnj', level: 2 },
  { full_name: 'Drew Anderson', email: 'drew@example.com', username: 'drewa', level: 2 },
  // Level 3 - 3rd degree (9 users)
  { full_name: 'Reese Thomas', email: 'reese@example.com', username: 'reeset', level: 3 },
  { full_name: 'Skyler White', email: 'skyler@example.com', username: 'skylerw', level: 3 },
  { full_name: 'Dakota Jones', email: 'dakota@example.com', username: 'dakotaj', level: 3 },
  { full_name: 'Phoenix Clark', email: 'phoenix@example.com', username: 'phoenixc', level: 3 },
  { full_name: 'River Hall', email: 'river@example.com', username: 'riverh', level: 3 },
  { full_name: 'Sage Wright', email: 'sage@example.com', username: 'sagew', level: 3 },
  { full_name: 'Finley Scott', email: 'finley@example.com', username: 'finleys', level: 3 },
  { full_name: 'Harper Young', email: 'harper@example.com', username: 'harpery', level: 3 },
  { full_name: 'Emery King', email: 'emery@example.com', username: 'emeryk', level: 3 },
  // Level 4 - 4th degree (12 users)
  { full_name: 'Blake Adams', email: 'blake@example.com', username: 'blakea', level: 4 },
  { full_name: 'Charlie Baker', email: 'charlie@example.com', username: 'charlieb', level: 4 },
  { full_name: 'Devon Carter', email: 'devon@example.com', username: 'devonc', level: 4 },
  { full_name: 'Ellis Davis', email: 'ellis@example.com', username: 'ellisd', level: 4 },
  { full_name: 'Frankie Evans', email: 'frankie@example.com', username: 'frankiee', level: 4 },
  { full_name: 'Gray Foster', email: 'gray@example.com', username: 'grayf', level: 4 },
  { full_name: 'Hayden Green', email: 'hayden@example.com', username: 'haydeng', level: 4 },
  { full_name: 'Indigo Hill', email: 'indigo@example.com', username: 'indigoh', level: 4 },
  { full_name: 'Jamie Irving', email: 'jamie@example.com', username: 'jamiei', level: 4 },
  { full_name: 'Kerry James', email: 'kerry@example.com', username: 'kerryj', level: 4 },
  { full_name: 'Logan Kelly', email: 'logan@example.com', username: 'logank', level: 4 },
  { full_name: 'Marley Lane', email: 'marley@example.com', username: 'marleyl', level: 4 },
  // Level 5 - 5th degree (15 users)
  { full_name: 'Nico Moore', email: 'nico@example.com', username: 'nicom', level: 5 },
  { full_name: 'Oakley Nash', email: 'oakley@example.com', username: 'oakleyn', level: 5 },
  { full_name: 'Parker Owen', email: 'parker@example.com', username: 'parkero', level: 5 },
  { full_name: 'Remy Price', email: 'remy@example.com', username: 'remyp', level: 5 },
  { full_name: 'Shiloh Quinn', email: 'shiloh@example.com', username: 'shilohq', level: 5 },
  { full_name: 'Teagan Reid', email: 'teagan@example.com', username: 'teaganr', level: 5 },
  { full_name: 'Unity Stone', email: 'unity@example.com', username: 'unitys', level: 5 },
  { full_name: 'Vale Turner', email: 'vale@example.com', username: 'valet', level: 5 },
  { full_name: 'Winter Vale', email: 'winter@example.com', username: 'winterv', level: 5 },
  { full_name: 'Xen Walker', email: 'xen@example.com', username: 'xenw', level: 5 },
  { full_name: 'Yuki West', email: 'yuki@example.com', username: 'yukiw', level: 5 },
  { full_name: 'Zion York', email: 'zion@example.com', username: 'ziony', level: 5 },
  { full_name: 'Ari Zane', email: 'ari@example.com', username: 'ariz', level: 5 },
  { full_name: 'Bay Storm', email: 'bay@example.com', username: 'bays', level: 5 },
  { full_name: 'Cypress Moon', email: 'cypress@example.com', username: 'cypressm', level: 5 },
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
            full_name: u.full_name,
            email: u.email,
            username: u.username,
            is_age_over_18: true,
            is_active: true,
            onboarding_completed: true,
          }))
        )
        .select('id, email');

      if (usersError) throw usersError;

      if (insertedUsers && insertedUsers.length > 0) {
        // Map emails to IDs for building connections
        const emailToId = new Map<string, string>();
        insertedUsers.forEach((u) => {
          if (u.email) emailToId.set(u.email, u.id);
        });

        // Build hierarchical connections based on levels
        const connectionsList: Omit<Connection, 'id'>[] = [];

        // Group users by level
        const levels: string[][] = [[], [], [], [], [], []];
        SAMPLE_USERS.forEach((u) => {
          const id = emailToId.get(u.email);
          if (id) levels[u.level].push(id);
        });

        // Level 0 -> Level 1 (center connects to all direct friends)
        levels[0].forEach((centerId) => {
          levels[1].forEach((friendId) => {
            connectionsList.push({
              user_id: centerId,
              friend_user_id: friendId,
              relationship_type: 'friend',
              trust_score: 0.9 + Math.random() * 0.1,
              is_muted: false,
            });
          });
        });

        // Level 1 -> Level 2 (each L1 connects to 2 L2 users)
        levels[1].forEach((l1Id, idx) => {
          const l2Start = idx * 2;
          for (let i = 0; i < 2 && l2Start + i < levels[2].length; i++) {
            connectionsList.push({
              user_id: l1Id,
              friend_user_id: levels[2][l2Start + i],
              relationship_type: RELATIONSHIP_TYPES[Math.floor(Math.random() * RELATIONSHIP_TYPES.length)],
              trust_score: 0.7 + Math.random() * 0.2,
              is_muted: false,
            });
          }
        });

        // Level 2 -> Level 3 (each L2 connects to 1-2 L3 users)
        levels[2].forEach((l2Id, idx) => {
          const l3Start = Math.floor(idx * 1.5);
          for (let i = 0; i < 2 && l3Start + i < levels[3].length; i++) {
            connectionsList.push({
              user_id: l2Id,
              friend_user_id: levels[3][l3Start + i],
              relationship_type: RELATIONSHIP_TYPES[Math.floor(Math.random() * RELATIONSHIP_TYPES.length)],
              trust_score: 0.6 + Math.random() * 0.2,
              is_muted: false,
            });
          }
        });

        // Level 3 -> Level 4 (each L3 connects to 1-2 L4 users)
        levels[3].forEach((l3Id, idx) => {
          const l4Start = Math.floor(idx * 1.3);
          for (let i = 0; i < 2 && l4Start + i < levels[4].length; i++) {
            connectionsList.push({
              user_id: l3Id,
              friend_user_id: levels[4][l4Start + i],
              relationship_type: RELATIONSHIP_TYPES[Math.floor(Math.random() * RELATIONSHIP_TYPES.length)],
              trust_score: 0.5 + Math.random() * 0.2,
              is_muted: false,
            });
          }
        });

        // Level 4 -> Level 5 (each L4 connects to 1-2 L5 users)
        levels[4].forEach((l4Id, idx) => {
          const l5Start = Math.floor(idx * 1.25);
          for (let i = 0; i < 2 && l5Start + i < levels[5].length; i++) {
            connectionsList.push({
              user_id: l4Id,
              friend_user_id: levels[5][l5Start + i],
              relationship_type: RELATIONSHIP_TYPES[Math.floor(Math.random() * RELATIONSHIP_TYPES.length)],
              trust_score: 0.4 + Math.random() * 0.2,
              is_muted: false,
            });
          }
        });

        // Add some cross-connections within same levels for realism
        [1, 2, 3, 4, 5].forEach((level) => {
          const levelUsers = levels[level];
          for (let i = 0; i < levelUsers.length - 1; i += 2) {
            if (Math.random() > 0.5 && levelUsers[i + 1]) {
              connectionsList.push({
                user_id: levelUsers[i],
                friend_user_id: levelUsers[i + 1],
                relationship_type: 'colleague',
                trust_score: 0.5 + Math.random() * 0.3,
                is_muted: false,
              });
            }
          }
        });

        const { error: connectionsError } = await supabase
          .from('friend_connections')
          .insert(connectionsList);

        if (connectionsError) throw connectionsError;
      }

      toast.success('5-level sample data generated successfully!');
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

  // Build graph data with 5-level concentric circle layout
  const { nodes, edges, ringCounts } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const edgeList: GraphEdge[] = [];
    const centerX = 400;
    const centerY = 300;

    // Max nodes per ring for readability
    const MAX_NODES_PER_RING = 12;

    // Calculate depths using BFS from selected node
    const depths = new Map<string, number>();
    
    if (selectedNode) {
      const queue: { id: string; depth: number }[] = [{ id: selectedNode, depth: 0 }];
      depths.set(selectedNode, 0);

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current.depth >= 5) continue;

        connections.forEach((conn) => {
          let neighborId: string | null = null;
          if (conn.user_id === current.id) neighborId = conn.friend_user_id;
          else if (conn.friend_user_id === current.id) neighborId = conn.user_id;

          if (neighborId && !depths.has(neighborId)) {
            depths.set(neighborId, current.depth + 1);
            queue.push({ id: neighborId, depth: current.depth + 1 });
          }
        });
      }
    }

    // Group users by depth
    const rings: User[][] = [[], [], [], [], [], [], []];
    const counts = { total: users.length, byLevel: [0, 0, 0, 0, 0, 0, 0] };

    users.forEach((user) => {
      if (selectedNode) {
        const depth = depths.get(user.id) ?? 6;
        rings[Math.min(depth, 6)].push(user);
        counts.byLevel[Math.min(depth, 6)]++;
      } else {
        rings[1].push(user);
        counts.byLevel[1]++;
      }
    });

    // Ring radii - wider spacing for more rings
    const ringRadii = [0, 90, 155, 210, 260, 300];

    // Track visible node IDs for edge filtering
    const visibleNodeIds = new Set<string>();

    // Position nodes in concentric circles with overflow handling
    rings.forEach((ringUsers, depth) => {
      if (depth === 0) {
        ringUsers.forEach((user) => {
          const connectionCount = connections.filter(
            (c) => c.user_id === user.id || c.friend_user_id === user.id
          ).length;
          nodeMap.set(user.id, {
            id: user.id,
            name: user.full_name || user.username || user.email || 'Unknown',
            x: centerX,
            y: centerY,
            vx: 0,
            vy: 0,
            connections: connectionCount,
            depth: 0,
          });
          visibleNodeIds.add(user.id);
        });
      } else if (depth <= 5) {
        const radius = selectedNode ? ringRadii[depth] : 200;
        const maxToShow = selectedNode ? MAX_NODES_PER_RING : Math.min(ringUsers.length, 24);
        const overflow = ringUsers.length - maxToShow;

        // Show limited nodes
        const usersToShow = ringUsers.slice(0, maxToShow);
        const angleStep = (2 * Math.PI) / (usersToShow.length + (overflow > 0 ? 1 : 0));

        usersToShow.forEach((user, index) => {
          const angle = angleStep * index - Math.PI / 2;
          const connectionCount = connections.filter(
            (c) => c.user_id === user.id || c.friend_user_id === user.id
          ).length;
          nodeMap.set(user.id, {
            id: user.id,
            name: user.full_name || user.username || user.email || 'Unknown',
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            vx: 0,
            vy: 0,
            connections: connectionCount,
            depth: selectedNode ? depth : 0,
          });
          visibleNodeIds.add(user.id);
        });

        // Add overflow indicator node
        if (overflow > 0) {
          const overflowAngle = angleStep * usersToShow.length - Math.PI / 2;
          nodeMap.set(`overflow-${depth}`, {
            id: `overflow-${depth}`,
            name: `+${overflow} more`,
            x: centerX + Math.cos(overflowAngle) * radius,
            y: centerY + Math.sin(overflowAngle) * radius,
            vx: 0,
            vy: 0,
            connections: 0,
            depth,
            isOverflow: true,
            overflowCount: overflow,
          });
        }
      } else {
        // Unconnected users
        const maxToShow = MAX_NODES_PER_RING;
        const overflow = ringUsers.length - maxToShow;
        const usersToShow = ringUsers.slice(0, maxToShow);
        const angleStep = (2 * Math.PI) / (usersToShow.length + (overflow > 0 ? 1 : 0));

        usersToShow.forEach((user, index) => {
          const angle = angleStep * index - Math.PI / 2;
          const connectionCount = connections.filter(
            (c) => c.user_id === user.id || c.friend_user_id === user.id
          ).length;
          nodeMap.set(user.id, {
            id: user.id,
            name: user.full_name || user.username || user.email || 'Unknown',
            x: centerX + Math.cos(angle) * 340,
            y: centerY + Math.sin(angle) * 340,
            vx: 0,
            vy: 0,
            connections: connectionCount,
            depth: 6,
          });
          visibleNodeIds.add(user.id);
        });

        if (overflow > 0) {
          const overflowAngle = angleStep * usersToShow.length - Math.PI / 2;
          nodeMap.set('overflow-6', {
            id: 'overflow-6',
            name: `+${overflow} more`,
            x: centerX + Math.cos(overflowAngle) * 340,
            y: centerY + Math.sin(overflowAngle) * 340,
            vx: 0,
            vy: 0,
            connections: 0,
            depth: 6,
            isOverflow: true,
            overflowCount: overflow,
          });
        }
      }
    });

    // Create edges with depth info (only for visible nodes)
    connections.forEach((conn) => {
      const sourceVisible = visibleNodeIds.has(conn.user_id);
      const targetVisible = visibleNodeIds.has(conn.friend_user_id);
      
      if (sourceVisible && targetVisible) {
        const sourceDepth = depths.get(conn.user_id) ?? 6;
        const targetDepth = depths.get(conn.friend_user_id) ?? 6;
        edgeList.push({
          source: conn.user_id,
          target: conn.friend_user_id,
          type: conn.relationship_type,
          trust: conn.trust_score,
          sourceDepth,
          targetDepth,
        });
      }
    });

    return { nodes: Array.from(nodeMap.values()), edges: edgeList, ringCounts: counts };
  }, [users, connections, selectedNode]);

  // Level colors: 1=cyan, 2=gold, 3=rose, 4=violet, 5=emerald
  const LEVEL_COLORS = [
    'hsl(var(--primary))',      // 0: Center (primary)
    'hsl(173, 80%, 50%)',       // 1: Cyan
    'hsl(45, 90%, 60%)',        // 2: Gold
    'hsl(350, 80%, 60%)',       // 3: Rose
    'hsl(270, 70%, 60%)',       // 4: Violet
    'hsl(160, 70%, 45%)',       // 5: Emerald
  ];

  const getNodeColor = useCallback(
    (node: GraphNode) => {
      if (selectedNode === node.id) return 'hsl(var(--primary))';
      if (hoveredNode === node.id) return 'hsl(var(--primary) / 0.8)';
      if (selectedNode) {
        if (node.depth >= 1 && node.depth <= 5) return LEVEL_COLORS[node.depth];
        return 'hsl(var(--muted-foreground) / 0.3)';
      }
      return 'hsl(var(--primary) / 0.7)';
    },
    [selectedNode, hoveredNode]
  );

  const getEdgeColor = useCallback(
    (edge: GraphEdge) => {
      if (!selectedNode) return 'hsl(var(--primary) / 0.4)';
      
      // Edge connects to center
      if (edge.source === selectedNode || edge.target === selectedNode) {
        return LEVEL_COLORS[1];
      }
      
      // Get depths from edge data
      const sourceDepth = edge.sourceDepth ?? 6;
      const targetDepth = edge.targetDepth ?? 6;
      
      // Cross-level connection (shows hierarchy)
      if (sourceDepth !== targetDepth) {
        const minDepth = Math.min(sourceDepth, targetDepth);
        if (minDepth >= 1 && minDepth <= 5) {
          return LEVEL_COLORS[minDepth];
        }
      }
      
      // Same-level connection
      const depth = Math.min(sourceDepth, targetDepth);
      if (depth >= 1 && depth <= 5) {
        return LEVEL_COLORS[depth].replace(')', ' / 0.6)');
      }
      
      return 'hsl(var(--muted-foreground) / 0.15)';
    },
    [selectedNode]
  );

  const getEdgeWidth = useCallback(
    (edge: GraphEdge) => {
      if (!selectedNode) return 1;
      
      // Edge connects to center - thickest
      if (edge.source === selectedNode || edge.target === selectedNode) {
        return 2.5;
      }
      
      const sourceDepth = edge.sourceDepth ?? 6;
      const targetDepth = edge.targetDepth ?? 6;
      
      // Cross-level connections - more visible
      if (sourceDepth !== targetDepth) {
        return 2;
      }
      
      // Same-level connections - thinner
      return 1;
    },
    [selectedNode]
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
          <CardTitle>Circle of Friends</CardTitle>
          <CardDescription>
            Click on a user to see their 5-level social circle. Colors: Cyan (1°), Gold (2°), Rose (3°), Violet (4°), Emerald (5°)
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
                  <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
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

                {/* 5-level concentric circle guides */}
                {selectedNode && (
                  <g>
                    <circle cx="400" cy="300" r="90" fill="none" stroke="hsl(173, 80%, 50%)" strokeOpacity="0.12" strokeWidth="20" />
                    <circle cx="400" cy="300" r="155" fill="none" stroke="hsl(45, 90%, 60%)" strokeOpacity="0.1" strokeWidth="20" />
                    <circle cx="400" cy="300" r="210" fill="none" stroke="hsl(350, 80%, 60%)" strokeOpacity="0.08" strokeWidth="18" />
                    <circle cx="400" cy="300" r="260" fill="none" stroke="hsl(270, 70%, 60%)" strokeOpacity="0.06" strokeWidth="16" />
                    <circle cx="400" cy="300" r="300" fill="none" stroke="hsl(160, 70%, 45%)" strokeOpacity="0.05" strokeWidth="14" />
                    {/* Center glow */}
                    <circle cx="400" cy="300" r="35" fill="url(#centerGlow)" />
                  </g>
                )}
                {!selectedNode && (
                  <circle cx="400" cy="300" r="200" fill="none" stroke="hsl(var(--primary))" strokeOpacity="0.1" strokeWidth="2" strokeDasharray="8 4" />
                )}

                {/* Edges - render cross-level first for proper layering */}
                <g>
                  <AnimatePresence>
                    {edges
                      .sort((a, b) => {
                        // Render same-level edges first, cross-level edges on top
                        const aCross = a.sourceDepth !== a.targetDepth ? 1 : 0;
                        const bCross = b.sourceDepth !== b.targetDepth ? 1 : 0;
                        return aCross - bCross;
                      })
                      .map((edge, index) => {
                        const sourceNode = nodes.find((n) => n.id === edge.source);
                        const targetNode = nodes.find((n) => n.id === edge.target);
                        if (!sourceNode || !targetNode) return null;

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
                            transition={{ duration: 0.5, delay: index * 0.01 }}
                            stroke={getEdgeColor(edge)}
                            strokeWidth={getEdgeWidth(edge)}
                            strokeOpacity={0.8}
                          />
                        );
                      })}
                  </AnimatePresence>
                </g>

                {/* Nodes */}
                <g>
                  <AnimatePresence>
                    {nodes.map((node, index) => {
                      // Overflow indicator node
                      if (node.isOverflow) {
                        return (
                          <motion.g
                            key={node.id}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 0.8, x: node.x, y: node.y }}
                            transition={{ type: 'spring', stiffness: 100, damping: 15, delay: index * 0.03 }}
                          >
                            <rect
                              x="-24"
                              y="-12"
                              width="48"
                              height="24"
                              rx="12"
                              fill={LEVEL_COLORS[node.depth] || 'hsl(var(--muted))'}
                              fillOpacity="0.3"
                              stroke={LEVEL_COLORS[node.depth] || 'hsl(var(--muted-foreground))'}
                              strokeWidth="1"
                              strokeOpacity="0.5"
                            />
                            <text
                              textAnchor="middle"
                              dy="0.35em"
                              fill={LEVEL_COLORS[node.depth] || 'hsl(var(--muted-foreground))'}
                              fontSize="11"
                              fontWeight="600"
                            >
                              {node.name}
                            </text>
                          </motion.g>
                        );
                      }

                      // Regular node
                      return (
                        <motion.g
                          key={node.id}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1, x: node.x, y: node.y }}
                          transition={{ type: 'spring', stiffness: 100, damping: 15, delay: index * 0.03 }}
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
                            animate={{ r: getNodeSize(node), fill: getNodeColor(node) }}
                            transition={{ duration: 0.2 }}
                          />

                          {/* Connection count indicator */}
                          {node.connections > 2 && (
                            <text textAnchor="middle" dy="0.35em" fill="white" fontSize="10" fontWeight="bold">
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
                      );
                    })}
                  </AnimatePresence>
                </g>
              </svg>

              {/* Legend with counts */}
              <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur rounded-lg p-3 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  {selectedNode ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                        <span>Center</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'hsl(173, 80%, 50%)' }} />
                        <span>1° ({ringCounts.byLevel[1]})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'hsl(45, 90%, 60%)' }} />
                        <span>2° ({ringCounts.byLevel[2]})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'hsl(350, 80%, 60%)' }} />
                        <span>3° ({ringCounts.byLevel[3]})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'hsl(270, 70%, 60%)' }} />
                        <span>4° ({ringCounts.byLevel[4]})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'hsl(160, 70%, 45%)' }} />
                        <span>5° ({ringCounts.byLevel[5]})</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Click a user to see their circle of friends</span>
                  )}
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

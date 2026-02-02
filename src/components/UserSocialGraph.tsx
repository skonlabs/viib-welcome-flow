import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ZoomIn, ZoomOut, Maximize2, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface User {
  id: string;
  full_name: string | null;
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
  connections: number;
  depth: number;
  isOverflow?: boolean;
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

const UserSocialGraph = () => {
  const { profile: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Hovered edge for connection details
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge | null>(null);
  const [edgeTooltipPos, setEdgeTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      // Get all connections where current user is involved
      const { data: connectionsData } = await supabase
        .from('friend_connections')
        .select('*');

      if (connectionsData) {
        setConnections(connectionsData);
        
        // Collect all user IDs from connections
        const userIds = new Set<string>();
        userIds.add(currentUser.id);
        connectionsData.forEach(conn => {
          userIds.add(conn.user_id);
          userIds.add(conn.friend_user_id);
        });
        
        // Fetch user details
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name, username')
          .in('id', Array.from(userIds));
          
        if (usersData) setUsers(usersData);
      }
    } catch {
      // Social graph data load failed - UI shows empty state
    } finally {
      setLoading(false);
    }
  };

  // Build graph data with current user at center
  const { nodes, edges, ringCounts } = useMemo(() => {
    if (!currentUser) return { nodes: [], edges: [], ringCounts: { total: 0, byLevel: [0, 0, 0, 0, 0, 0] } };
    
    const nodeMap = new Map<string, GraphNode>();
    const edgeList: GraphEdge[] = [];
    const centerX = 300;
    const centerY = 250;
    const MAX_NODES_PER_RING = 20;

    // Calculate depths using BFS from current user
    const depths = new Map<string, number>();
    const queue: { id: string; depth: number }[] = [{ id: currentUser.id, depth: 0 }];
    depths.set(currentUser.id, 0);

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

    // Group users by depth
    const rings: User[][] = [[], [], [], [], [], [], []];
    const counts = { total: users.length, byLevel: [0, 0, 0, 0, 0, 0, 0] };

    users.forEach((user) => {
      const depth = depths.get(user.id) ?? 6;
      rings[Math.min(depth, 6)].push(user);
      counts.byLevel[Math.min(depth, 6)]++;
    });

    const ringRadii = [0, 80, 140, 190, 230, 260];
    const visibleNodeIds = new Set<string>();

    // Position nodes
    rings.forEach((ringUsers, depth) => {
      if (depth === 0) {
        ringUsers.forEach((user) => {
          const connectionCount = connections.filter(
            (c) => c.user_id === user.id || c.friend_user_id === user.id
          ).length;
          nodeMap.set(user.id, {
            id: user.id,
            name: user.full_name || user.username || 'You',
            x: centerX,
            y: centerY,
            connections: connectionCount,
            depth: 0,
          });
          visibleNodeIds.add(user.id);
        });
      } else if (depth <= 5) {
        const radius = ringRadii[depth];
        const maxToShow = MAX_NODES_PER_RING;
        const overflow = ringUsers.length - maxToShow;
        const usersToShow = ringUsers.slice(0, maxToShow);
        const angleStep = (2 * Math.PI) / (usersToShow.length + (overflow > 0 ? 1 : 0));

        usersToShow.forEach((user, index) => {
          const angle = angleStep * index - Math.PI / 2;
          const connectionCount = connections.filter(
            (c) => c.user_id === user.id || c.friend_user_id === user.id
          ).length;
          
          // Only show name for direct friends (depth 1)
          const displayName = depth === 1 
            ? (user.full_name || user.username || 'Friend')
            : '•'; // Anonymous for friends of friends
            
          nodeMap.set(user.id, {
            id: user.id,
            name: displayName,
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
            connections: connectionCount,
            depth,
          });
          visibleNodeIds.add(user.id);
        });

        if (overflow > 0) {
          const overflowAngle = angleStep * usersToShow.length - Math.PI / 2;
          nodeMap.set(`overflow-${depth}`, {
            id: `overflow-${depth}`,
            name: `+${overflow}`,
            x: centerX + Math.cos(overflowAngle) * radius,
            y: centerY + Math.sin(overflowAngle) * radius,
            connections: 0,
            depth,
            isOverflow: true,
            overflowCount: overflow,
          });
        }
      }
    });

    // Create edges
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
  }, [users, connections, currentUser]);

  // Level colors
  const LEVEL_COLORS = [
    'hsl(var(--primary))',
    'hsl(173, 80%, 50%)',
    'hsl(45, 90%, 60%)',
    'hsl(350, 80%, 60%)',
    'hsl(270, 70%, 60%)',
    'hsl(160, 70%, 45%)',
  ];

  const getNodeColor = useCallback(
    (node: GraphNode) => {
      if (node.id === currentUser?.id) return 'hsl(var(--primary))';
      if (hoveredNode === node.id) return 'hsl(var(--primary) / 0.8)';
      if (node.depth >= 1 && node.depth <= 5) return LEVEL_COLORS[node.depth];
      return 'hsl(var(--muted-foreground) / 0.3)';
    },
    [currentUser, hoveredNode]
  );

  const getEdgeColor = useCallback((edge: GraphEdge) => {
    const sourceDepth = edge.sourceDepth ?? 6;
    const targetDepth = edge.targetDepth ?? 6;
    if (sourceDepth !== targetDepth) return null;
    if (sourceDepth >= 1 && sourceDepth <= 5) return LEVEL_COLORS[sourceDepth];
    return 'hsl(var(--muted-foreground))';
  }, []);

  const getNodeSize = useCallback(
    (node: GraphNode) => {
      const baseSize = 6 + node.connections * 2;
      if (node.id === currentUser?.id) return baseSize * 1.5;
      if (hoveredNode === node.id) return baseSize * 1.3;
      return baseSize;
    },
    [currentUser, hoveredNode]
  );

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => Math.max(0.5, Math.min(3, prev + delta)));
  };

  // Edge hover handler
  const handleEdgeHover = (edge: GraphEdge | null, e?: React.MouseEvent) => {
    // Only show edge details for direct friends (depth 1)
    if (edge && (edge.sourceDepth === 0 || edge.targetDepth === 0)) {
      setHoveredEdge(edge);
      if (e && svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setEdgeTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top - 40 });
      }
    } else {
      setHoveredEdge(null);
    }
  };

  // Get connection details for tooltip (only for direct friends)
  const getConnectionDetails = useCallback((edge: GraphEdge) => {
    const connection = connections.find(
      c => (c.user_id === edge.source && c.friend_user_id === edge.target) ||
           (c.user_id === edge.target && c.friend_user_id === edge.source)
    );
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    // Only show names if it's a direct friend connection
    const sourceName = sourceNode?.depth === 0 ? 'You' : 
      (sourceNode?.depth === 1 ? sourceNode?.name : 'Friend of friend');
    const targetName = targetNode?.depth === 0 ? 'You' : 
      (targetNode?.depth === 1 ? targetNode?.name : 'Friend of friend');
      
    return {
      sourceName,
      targetName,
      type: connection?.relationship_type || 'friend',
      trust: connection?.trust_score || 0,
    };
  }, [connections, nodes]);

  // Generate gradients for cross-level edges
  const edgeGradients = useMemo(() => {
    const gradients: { id: string; color1: string; color2: string }[] = [];
    for (let i = 0; i <= 4; i++) {
      for (let j = i + 1; j <= 5; j++) {
        gradients.push({
          id: `user-gradient-${i}-${j}`,
          color1: LEVEL_COLORS[i],
          color2: LEVEL_COLORS[j],
        });
      }
    }
    return gradients;
  }, []);

  if (loading) {
    return (
      <Card className="bg-card/30 backdrop-blur border-primary/20">
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (nodes.length <= 1) {
    return (
      <Card className="bg-card/30 backdrop-blur border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Circle
          </CardTitle>
          <CardDescription>Visualize your friend network</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <Users className="h-12 w-12 mb-3 opacity-50" />
          <p>Connect with friends to see your social circle</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/30 backdrop-blur border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Your Circle
        </CardTitle>
        <CardDescription className="text-xs">
          You at center. Friends shown by name, extended network shown anonymously.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2">
        <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-background to-muted/20">
          {/* Zoom controls */}
          <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 bg-background/90 backdrop-blur rounded-lg p-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleResetView}>
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Edge tooltip - only for direct connections */}
          {hoveredEdge && (
            <div 
              className="absolute z-20 bg-background/95 backdrop-blur border border-border rounded-lg p-2 shadow-lg text-xs pointer-events-none"
              style={{ left: edgeTooltipPos.x, top: edgeTooltipPos.y, transform: 'translateX(-50%)' }}
            >
              {(() => {
                const details = getConnectionDetails(hoveredEdge);
                return (
                  <div className="space-y-1">
                    <div className="font-medium">{details.sourceName} ↔ {details.targetName}</div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="capitalize">{details.type}</span>
                      <span>•</span>
                      <span>Trust: {(details.trust * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <svg 
            ref={svgRef}
            width="100%" 
            height="400" 
            viewBox="0 0 600 500"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { handleMouseUp(); setHoveredEdge(null); }}
            onWheel={handleWheel}
            style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} style={{ transformOrigin: '300px 250px' }}>
              <defs>
                <radialGradient id="userNodeGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="userCenterGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </radialGradient>
                {edgeGradients.map((grad) => (
                  <linearGradient key={grad.id} id={grad.id} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={grad.color1} stopOpacity="0.2" />
                    <stop offset="50%" stopColor={grad.color1} stopOpacity="0.15" />
                    <stop offset="50%" stopColor={grad.color2} stopOpacity="0.15" />
                    <stop offset="100%" stopColor={grad.color2} stopOpacity="0.2" />
                  </linearGradient>
                ))}
              </defs>

              {/* Concentric circle guides */}
              <g>
                <circle cx="300" cy="250" r="80" fill="none" stroke="hsl(173, 80%, 50%)" strokeOpacity="0.1" strokeWidth="15" />
                <circle cx="300" cy="250" r="140" fill="none" stroke="hsl(45, 90%, 60%)" strokeOpacity="0.08" strokeWidth="12" />
                <circle cx="300" cy="250" r="190" fill="none" stroke="hsl(350, 80%, 60%)" strokeOpacity="0.06" strokeWidth="10" />
                <circle cx="300" cy="250" r="230" fill="none" stroke="hsl(270, 70%, 60%)" strokeOpacity="0.05" strokeWidth="8" />
                <circle cx="300" cy="250" r="260" fill="none" stroke="hsl(160, 70%, 45%)" strokeOpacity="0.04" strokeWidth="6" />
                <circle cx="300" cy="250" r="30" fill="url(#userCenterGlow)" />
              </g>

              {/* Edges */}
              <g>
                <AnimatePresence>
                  {edges.map((edge, index) => {
                    const sourceNode = nodes.find((n) => n.id === edge.source);
                    const targetNode = nodes.find((n) => n.id === edge.target);
                    if (!sourceNode || !targetNode) return null;

                    const isCrossLevel = (edge.sourceDepth ?? 6) !== (edge.targetDepth ?? 6);
                    const edgeColor = getEdgeColor(edge);
                    const gradientId = isCrossLevel 
                      ? `user-gradient-${Math.min(edge.sourceDepth ?? 0, edge.targetDepth ?? 0)}-${Math.max(edge.sourceDepth ?? 0, edge.targetDepth ?? 0)}`
                      : null;

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
                        stroke={isCrossLevel && gradientId ? `url(#${gradientId})` : edgeColor || 'hsl(var(--muted-foreground))'}
                        strokeWidth={hoveredEdge === edge ? 2 : 1}
                        strokeOpacity={hoveredEdge === edge ? 0.7 : (isCrossLevel ? 1 : 0.15)}
                        onMouseEnter={(e) => handleEdgeHover(edge, e)}
                        onMouseMove={(e) => handleEdgeHover(edge, e)}
                        onMouseLeave={() => handleEdgeHover(null)}
                        style={{ cursor: (edge.sourceDepth === 0 || edge.targetDepth === 0) ? 'pointer' : 'default' }}
                      />
                    );
                  })}
                </AnimatePresence>
              </g>

              {/* Nodes */}
              <g>
                <AnimatePresence>
                  {nodes.map((node, index) => {
                    if (node.isOverflow) {
                      return (
                        <motion.g
                          key={node.id}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 0.7, x: node.x, y: node.y }}
                          transition={{ type: 'spring', stiffness: 100, damping: 15, delay: index * 0.03 }}
                        >
                          <rect
                            x="-18"
                            y="-10"
                            width="36"
                            height="20"
                            rx="10"
                            fill={LEVEL_COLORS[node.depth] || 'hsl(var(--muted))'}
                            fillOpacity="0.3"
                            stroke={LEVEL_COLORS[node.depth] || 'hsl(var(--muted-foreground))'}
                            strokeWidth="1"
                            strokeOpacity="0.4"
                          />
                          <text
                            textAnchor="middle"
                            dy="0.35em"
                            fill={LEVEL_COLORS[node.depth] || 'hsl(var(--muted-foreground))'}
                            fontSize="10"
                            fontWeight="600"
                          >
                            {node.name}
                          </text>
                        </motion.g>
                      );
                    }

                    return (
                      <motion.g
                        key={node.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1, x: node.x, y: node.y }}
                        transition={{ type: 'spring', stiffness: 100, damping: 15, delay: index * 0.03 }}
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                      >
                        {(node.id === currentUser?.id || hoveredNode === node.id) && (
                          <motion.circle
                            r={getNodeSize(node) * 2}
                            fill="url(#userNodeGlow)"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          />
                        )}
                        <motion.circle
                          r={getNodeSize(node)}
                          fill={getNodeColor(node)}
                          animate={{ r: getNodeSize(node), fill: getNodeColor(node) }}
                          transition={{ duration: 0.2 }}
                        />
                        {/* Show name label for center (you) and direct friends only */}
                        {(node.id === currentUser?.id || (node.depth === 1 && (hoveredNode === node.id || nodes.filter(n => n.depth === 1).length <= 8))) && (
                          <motion.text
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1, y: getNodeSize(node) + 12 }}
                            textAnchor="middle"
                            fill="hsl(var(--foreground))"
                            fontSize="10"
                            fontWeight="500"
                          >
                            {node.id === currentUser?.id ? 'You' : node.name}
                          </motion.text>
                        )}
                      </motion.g>
                    );
                  })}
                </AnimatePresence>
              </g>
            </g>
          </svg>

          {/* Legend */}
          <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur rounded-lg p-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>You</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(173, 80%, 50%)' }} />
                <span>Friends ({ringCounts.byLevel[1]})</span>
              </div>
              {ringCounts.byLevel[2] > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(45, 90%, 60%)' }} />
                  <span>2° ({ringCounts.byLevel[2]})</span>
                </div>
              )}
              {ringCounts.byLevel[3] > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(350, 80%, 60%)' }} />
                  <span>3° ({ringCounts.byLevel[3]})</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserSocialGraph;

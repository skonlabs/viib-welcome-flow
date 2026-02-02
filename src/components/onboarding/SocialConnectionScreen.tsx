import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Users, UserPlus, Mail, Phone, LinkIcon, X, Copy, Check } from "@/icons";
import { BackButton } from "./BackButton";
import { FloatingParticles } from "./FloatingParticles";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { errorLogger } from "@/lib/services/LoggerService";

interface SocialConnectionScreenProps {
  onInvite: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export const SocialConnectionScreen = ({ onInvite, onSkip, onBack }: SocialConnectionScreenProps) => {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<'email' | 'phone' | 'link'>('email');
  const [inviteInput, setInviteInput] = useState('');
  const [inviteList, setInviteList] = useState<string[]>([]);
  const [inviteNote, setInviteNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const { toast } = useToast();
  
  const userId = localStorage.getItem('viib_user_id');

  useEffect(() => {
    if (!userId) {
      toast({
        title: "Session Error",
        description: "User session not found. Please sign in again.",
        variant: "destructive"
      });
    }
  }, [userId, toast]);

  if (!userId) {
    return null;
  }

  const inviteLink = `${window.location.origin}?invited_by=${userId}`;

  const handleAddInvite = () => {
    if (!inviteInput.trim()) return;
    
    // Basic validation
    if (inviteMethod === 'email' && !inviteInput.includes('@')) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }
    
    if (inviteMethod === 'phone' && inviteInput.length < 10) {
      toast({
        title: "Invalid Phone",
        description: "Please enter a valid phone number",
        variant: "destructive"
      });
      return;
    }

    if (inviteList.includes(inviteInput)) {
      toast({
        title: "Duplicate Entry",
        description: "This contact has already been added",
        variant: "destructive"
      });
      return;
    }

    setInviteList([...inviteList, inviteInput]);
    setInviteInput('');
  };

  const handleRemoveInvite = (item: string) => {
    setInviteList(inviteList.filter(i => i !== item));
  };

  const handleSendInvites = async () => {
    if (inviteList.length === 0) {
      toast({
        title: "No Invites",
        description: "Please add at least one contact to invite",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-invites', {
        body: {
          userId,
          method: inviteMethod,
          contacts: inviteList,
          note: inviteNote.trim()
        }
      });

      if (error) throw error;

      toast({
        title: "Invites Sent! 🎉",
        description: `Successfully sent ${inviteList.length} invite${inviteList.length > 1 ? 's' : ''}`,
      });
      
      setShowInviteDialog(false);
      setInviteList([]);
      onInvite();
    } catch (error: any) {
      await errorLogger.log(error, {
        operation: 'send_onboarding_invites',
        userId,
        method: inviteMethod,
        count: inviteList.length
      });
      toast({
        title: "Error",
        description: "Unable to send invites. Please try again.",
        variant: "destructive"
      });
    } finally{
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      toast({
        title: "Link Copied! 🔗",
        description: "Share this link with your friends",
      });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      await errorLogger.log(error, {
        operation: 'copy_invite_link',
        userId
      });
      toast({
        title: "Error",
        description: "Unable to copy link. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
      <BackButton onClick={onBack} />
      
      {/* Background container - fixed positioning */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 gradient-ocean opacity-40" />
          <motion.div 
            className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[80px] opacity-40"
            style={{
              background: "radial-gradient(circle, #a855f7 0%, transparent 70%)"
            }}
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0]
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[80px] opacity-30"
            style={{
              background: "radial-gradient(circle, #0ea5e9 0%, transparent 70%)"
            }}
            animate={{
              x: [0, -80, 0],
              y: [0, 40, 0]
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      </div>

      {/* Floating Particles */}
      <FloatingParticles />

      {/* Connecting Lines Animation */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        {[...Array(6)].map((_, i) => (
          <motion.line
            key={i}
            x1={`${20 + i * 15}%`}
            y1="30%"
            x2="50%"
            y2="50%"
            stroke="url(#gradient)"
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.5, delay: i * 0.2 }}
          />
        ))}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>

      {/* Content */}
      <motion.div
        className="relative z-10 w-full max-w-2xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="space-y-12">
          {/* Icon */}
          <motion.div
            className="flex justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <motion.div
              className="relative"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <div className="absolute inset-0 rounded-full blur-3xl bg-gradient-to-r from-primary to-secondary opacity-60" />
              <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Users className="w-16 h-16 text-white" />
              </div>
            </motion.div>
          </motion.div>

          {/* Text */}
          <motion.div
            className="text-center space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-4xl font-bold">
              <span className="text-gradient">Better together</span>
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto">
              Great recommendations come from people who know you. 
              Invite friends to share and discover amazing content together.
            </p>
          </motion.div>

          {/* Benefits */}
          <motion.div
            className="grid md:grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {[
              { emoji: "💡", title: "Smart Sharing", desc: "See what friends love" },
              { emoji: "🎯", title: "Better Recs", desc: "Taste-based matches" },
              { emoji: "🎉", title: "Watch Parties", desc: "Enjoy together" },
            ].map((benefit, index) => (
              <motion.div
                key={index}
                className="glass-card rounded-2xl p-6 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -4 }}
              >
                <div className="text-4xl mb-3">{benefit.emoji}</div>
                <h3 className="font-semibold text-foreground mb-1">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Actions */}
          <motion.div
            className="flex flex-col items-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <Button
              onClick={() => setShowInviteDialog(true)}
              size="2xl"
              variant="gradient"
              className="shadow-[0_20px_50px_-15px_rgba(168,85,247,0.4)]"
            >
              <UserPlus className="mr-2 w-5 h-5" />
              Invite Friends
            </Button>
            <button
              onClick={onSkip}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              I'll do this later
            </button>
          </motion.div>
        </div>
      </motion.div>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-[500px] bg-background/95 backdrop-blur-xl border-white/10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-gradient">Invite Friends</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Method Selection */}
            <div className="flex gap-2">
              <Button
                variant={inviteMethod === 'email' ? 'default' : 'outline'}
                onClick={() => setInviteMethod('email')}
                className="flex-1"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
              <Button
                variant={inviteMethod === 'phone' ? 'default' : 'outline'}
                onClick={() => setInviteMethod('phone')}
                className="flex-1"
              >
                <Phone className="w-4 h-4 mr-2" />
                Phone
              </Button>
              <Button
                variant={inviteMethod === 'link' ? 'default' : 'outline'}
                onClick={() => setInviteMethod('link')}
                className="flex-1"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Link
              </Button>
            </div>

            {inviteMethod === 'link' ? (
              /* Shareable Link */
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Share this link with your friends to invite them to ViiB
                </p>
                <div className="flex gap-2">
                  <Input
                    value={inviteLink}
                    readOnly
                    className="flex-1 bg-white/5"
                  />
                  <Button onClick={handleCopyLink} variant="outline">
                    {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            ) : (
              /* Email/Phone Input */
              <>
                <div className="flex gap-2">
                  <Input
                    placeholder={inviteMethod === 'email' ? 'friend@example.com' : '+1 (555) 123-4567'}
                    value={inviteInput}
                    onChange={(e) => setInviteInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddInvite()}
                    className="flex-1 bg-white/5"
                  />
                  <Button onClick={handleAddInvite} variant="outline">
                    Add
                  </Button>
                </div>

                {/* Personal Note */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    Add a personal note (optional)
                  </label>
                  <textarea
                    placeholder="Hey! I think you'll love ViiB - it helps me find amazing content based on my mood..."
                    value={inviteNote}
                    onChange={(e) => setInviteNote(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {inviteNote.length}/500
                  </div>
                </div>

                {/* Invite List */}
                {inviteList.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {inviteList.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                      >
                        <span className="text-sm text-foreground">{item}</span>
                        <button
                          onClick={() => handleRemoveInvite(item)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Send Button */}
                <Button
                  onClick={handleSendInvites}
                  disabled={isLoading || inviteList.length === 0}
                  className="w-full"
                  variant="gradient"
                >
                  {isLoading ? 'Sending...' : `Send ${inviteList.length} Invite${inviteList.length !== 1 ? 's' : ''}`}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

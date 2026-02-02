import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { errorLogger } from '@/lib/services/LoggerService';
import { MessageSquare, Bug, Lightbulb, CheckCircle } from '@/icons';
import { z } from 'zod';

const feedbackSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200, "Title must be less than 200 characters"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000, "Message must be less than 2000 characters"),
});

type FeedbackType = 'support' | 'bug' | 'feature';

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FeedbackModal = ({ open, onOpenChange }: FeedbackModalProps) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<FeedbackType>('support');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; message?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = feedbackSchema.safeParse({ title, message });
    if (!validation.success) {
      const fieldErrors: { title?: string; message?: string } = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0] === 'title') fieldErrors.title = err.message;
        if (err.path[0] === 'message') fieldErrors.message = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('feedback')
        .insert({
          user_id: profile?.id || null,
          type: activeTab,
          title: title.trim(),
          message: message.trim(),
          status: 'pending'
        });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Feedback submitted successfully!');
      
      setTimeout(() => {
        setTitle('');
        setMessage('');
        setSubmitted(false);
        setActiveTab('support');
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      await errorLogger.log(error, { operation: 'submit_feedback' });
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSubmitting) {
      setTitle('');
      setMessage('');
      setSubmitted(false);
      setActiveTab('support');
      setErrors({});
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {submitted ? (
          <div className="py-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold">Thank You!</h2>
              <p className="text-muted-foreground">
                Your feedback has been submitted successfully. We'll review it and get back to you if needed.
              </p>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Send Feedback</DialogTitle>
              <p className="text-muted-foreground text-sm">
                Help us improve ViiB by sharing your thoughts, reporting issues, or suggesting new features.
              </p>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as FeedbackType)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="support" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span className="hidden sm:inline">Support</span>
                </TabsTrigger>
                <TabsTrigger value="bug" className="flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  <span className="hidden sm:inline">Bug</span>
                </TabsTrigger>
                <TabsTrigger value="feature" className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  <span className="hidden sm:inline">Feature</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="support">
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="support-title">Title</Label>
                    <Input
                      id="support-title"
                      placeholder="Brief description of your issue"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={200}
                      disabled={isSubmitting}
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive">{errors.title}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support-message">Details</Label>
                    <Textarea
                      id="support-message"
                      placeholder="Provide more details about your request..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      maxLength={2000}
                      disabled={isSubmitting}
                    />
                    {errors.message && (
                      <p className="text-sm text-destructive">{errors.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {message.length}/2000 characters
                    </p>
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? 'Submitting...' : 'Submit Support Request'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="bug">
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="bug-title">Bug Title</Label>
                    <Input
                      id="bug-title"
                      placeholder="What's the bug?"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={200}
                      disabled={isSubmitting}
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive">{errors.title}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bug-message">Description</Label>
                    <Textarea
                      id="bug-message"
                      placeholder="What happened? What did you expect to happen? Steps to reproduce..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      maxLength={2000}
                      disabled={isSubmitting}
                    />
                    {errors.message && (
                      <p className="text-sm text-destructive">{errors.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {message.length}/2000 characters
                    </p>
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? 'Submitting...' : 'Submit Bug Report'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="feature">
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="feature-title">Feature Title</Label>
                    <Input
                      id="feature-title"
                      placeholder="What feature would you like?"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={200}
                      disabled={isSubmitting}
                    />
                    {errors.title && (
                      <p className="text-sm text-destructive">{errors.title}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="feature-message">Description</Label>
                    <Textarea
                      id="feature-message"
                      placeholder="Describe the feature and how it would help you..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={5}
                      maxLength={2000}
                      disabled={isSubmitting}
                    />
                    {errors.message && (
                      <p className="text-sm text-destructive">{errors.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {message.length}/2000 characters
                    </p>
                  </div>
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? 'Submitting...' : 'Submit Feature Request'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

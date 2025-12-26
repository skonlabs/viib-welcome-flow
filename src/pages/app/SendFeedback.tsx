import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { MessageSquare, Bug, Lightbulb, CheckCircle } from '@/icons';
import { z } from 'zod';

const feedbackSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200, "Title must be less than 200 characters"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000, "Message must be less than 2000 characters"),
});

type FeedbackType = 'support' | 'bug' | 'feature';

export default function SendFeedback() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FeedbackType>('support');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; message?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate input
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
      // Use authenticated user ID - more secure than localStorage
      const userId = user?.id;
      if (!userId) {
        toast.error('Please log in to submit feedback');
        return;
      }

      const { error } = await supabase
        .from('feedback')
        .insert({
          user_id: userId,
          type: activeTab,
          title: title.trim(),
          message: message.trim(),
          status: 'pending'
        });

      if (error) throw error;

      setSubmitted(true);
      toast.success('Feedback submitted successfully!');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAnother = () => {
    setTitle('');
    setMessage('');
    setSubmitted(false);
    setActiveTab('support');
  };

  if (submitted) {
    return (
      <div className="container max-w-2xl mx-auto py-4 sm:py-8 px-4 sm:px-6">
        <Card>
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold">Thank You!</h2>
              <p className="text-muted-foreground">
                Your feedback has been submitted successfully. We'll review it and get back to you if needed.
              </p>
              <Button onClick={handleSubmitAnother} variant="outline" className="mt-4">
                Submit Another Feedback
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-4 sm:py-8 px-4 sm:px-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Send Feedback</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          Help us improve ViiB by sharing your thoughts, reporting issues, or suggesting new features.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as FeedbackType)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="support" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Support
          </TabsTrigger>
          <TabsTrigger value="bug" className="flex items-center gap-2">
            <Bug className="w-4 h-4" />
            Bug Report
          </TabsTrigger>
          <TabsTrigger value="feature" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Feature Request
          </TabsTrigger>
        </TabsList>

        <TabsContent value="support">
          <Card>
            <CardHeader>
              <CardTitle>Support Request</CardTitle>
              <CardDescription>
                Need help with something? Let us know and we'll assist you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    rows={6}
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bug">
          <Card>
            <CardHeader>
              <CardTitle>Report a Bug</CardTitle>
              <CardDescription>
                Found something that's not working? Help us fix it by reporting the issue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    rows={6}
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feature">
          <Card>
            <CardHeader>
              <CardTitle>Feature Request</CardTitle>
              <CardDescription>
                Have an idea for a new feature? We'd love to hear it!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    rows={6}
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

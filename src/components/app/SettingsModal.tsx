import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bell, Moon, Globe, Shield, Trash2, Tv, Check, ChevronRight, Sparkles, Palette } from 'lucide-react';
import { DeleteAccountDialog } from '@/components/DeleteAccountDialog';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Language {
  code: string;
  name: string;
  flag: string;
}

interface Platform {
  id: string;
  name: string;
  color: string;
}

// Default colors for known services
const SERVICE_COLORS: Record<string, string> = {
  'Netflix': '#E50914',
  'Prime Video': '#00A8E1',
  'HBO Max': '#B300F6',
  'Disney+': '#0063E5',
  'Hulu': '#1CE783',
  'Apple TV+': '#000000',
};

export const SettingsModal = ({ open, onOpenChange }: SettingsModalProps) => {
  const { profile } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Language & Platform states
  const [languages, setLanguages] = useState<Language[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [showLanguageEditor, setShowLanguageEditor] = useState(false);
  const [showPlatformEditor, setShowPlatformEditor] = useState(false);
  const [showVibeEditor, setShowVibeEditor] = useState(false);
  const [showVisualTasteEditor, setShowVisualTasteEditor] = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  // Vibe states
  const [vibes, setVibes] = useState<{ id: string; label: string; description: string; canonical_key: string }[]>([]);
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);

  // Visual Taste (Genre) states
  const [genres, setGenres] = useState<{ id: string; name: string }[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchLanguages();
      fetchStreamingServices();
      fetchVibes();
      fetchGenres();
      if (profile?.id) {
        fetchUserPreferences();
      } else {
        setLoadingPrefs(false);
      }
    }
  }, [open, profile?.id]);

  const fetchGenres = async () => {
    const { data, error } = await supabase
      .from('genres')
      .select('id, genre_name')
      .order('genre_name');

    if (!error && data) {
      setGenres(data.map(g => ({ id: g.id, name: g.genre_name })));
    }
  };

  const fetchVibes = async () => {
    const { data, error } = await supabase
      .from('vibes')
      .select('id, label, description, canonical_key')
      .order('label');

    if (!error && data) {
      setVibes(data.map(v => ({ ...v, canonical_key: v.canonical_key || v.id })));
    }
  };

  const fetchStreamingServices = async () => {
    const { data, error } = await supabase
      .from('streaming_services')
      .select('id, service_name, logo_url')
      .eq('is_active', true)
      .order('service_name');

    if (!error && data) {
      setPlatforms(data.map(s => ({
        id: s.id,
        name: s.service_name,
        color: SERVICE_COLORS[s.service_name] || '#6B7280'
      })));
    }
  };

  const fetchLanguages = async () => {
    const { data, error } = await supabase
      .from('spoken_languages')
      .select('iso_639_1, language_name, flag_emoji')
      .order('language_name');

    if (!error && data) {
      setLanguages(data.map(l => ({
        code: l.iso_639_1,
        name: l.language_name,
        flag: l.flag_emoji || '🌐'
      })));
    }
  };

  const fetchUserPreferences = async () => {
    if (!profile?.id) {
      setLoadingPrefs(false);
      return;
    }

    // Fetch language preferences
    const { data: langData } = await supabase
      .from('user_language_preferences')
      .select('language_code')
      .eq('user_id', profile.id)
      .order('priority_order');

    if (langData) {
      setSelectedLanguages(langData.map(l => l.language_code));
    }

    // Fetch streaming subscriptions - use service IDs directly
    const { data: streamData } = await supabase
      .from('user_streaming_subscriptions')
      .select('streaming_service_id')
      .eq('user_id', profile.id)
      .eq('is_active', true);

    if (streamData) {
      setSelectedPlatforms(streamData.map(s => s.streaming_service_id));
    }

    // Fetch vibe preference
    const { data: vibeData } = await supabase
      .from('user_vibe_preferences')
      .select('vibe_type')
      .eq('user_id', profile.id)
      .single();

    if (vibeData) {
      setSelectedVibe(vibeData.vibe_type);
    }

    // Fetch genre preferences (visual taste)
    const { data: genreData } = await supabase
      .from('user_genre_preferences')
      .select('genre_id')
      .eq('user_id', profile.id);

    if (genreData) {
      setSelectedGenres(genreData.map(g => g.genre_id));
    }

    setLoadingPrefs(false);
  };

  const toggleLanguage = (code: string) => {
    setSelectedLanguages(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const toggleGenre = (id: string) => {
    setSelectedGenres(prev =>
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  const saveLanguagePreferences = async () => {
    if (!profile?.id) return;

    setIsSaving(true);

    // Delete existing preferences
    await supabase
      .from('user_language_preferences')
      .delete()
      .eq('user_id', profile.id);

    // Insert new preferences with priority order
    if (selectedLanguages.length > 0) {
      const inserts = selectedLanguages.map((code, index) => ({
        user_id: profile.id,
        language_code: code,
        priority_order: index + 1
      }));

      const { error } = await supabase
        .from('user_language_preferences')
        .insert(inserts);

      if (error) {
        toast.error('Failed to save language preferences');
      } else {
        toast.success('Language preferences saved');
        setShowLanguageEditor(false);
      }
    } else {
      toast.success('Language preferences cleared');
      setShowLanguageEditor(false);
    }

    setIsSaving(false);
  };

  const savePlatformPreferences = async () => {
    if (!profile?.id) return;

    setIsSaving(true);

    // Delete existing subscriptions
    await supabase
      .from('user_streaming_subscriptions')
      .delete()
      .eq('user_id', profile.id);

    // Insert new subscriptions
    if (selectedPlatforms.length > 0) {
      const subscriptions = selectedPlatforms.map(serviceId => ({
        user_id: profile.id,
        streaming_service_id: serviceId,
        is_active: true
      }));

      const { error } = await supabase
        .from('user_streaming_subscriptions')
        .insert(subscriptions);

      if (error) {
        toast.error('Failed to save platform preferences');
      } else {
        toast.success('Platform preferences saved');
        setShowPlatformEditor(false);
      }
    } else {
      toast.success('Platform preferences cleared');
      setShowPlatformEditor(false);
    }

    setIsSaving(false);
  };

  const getSelectedLanguageNames = () => {
    return selectedLanguages
      .map(code => languages.find(l => l.code === code))
      .filter(Boolean)
      .map(l => l!.name)
      .slice(0, 3)
      .join(', ') + (selectedLanguages.length > 3 ? ` +${selectedLanguages.length - 3}` : '');
  };

  const getSelectedPlatformNames = () => {
    return selectedPlatforms
      .map(id => platforms.find(p => p.id === id)?.name)
      .filter(Boolean)
      .slice(0, 3)
      .join(', ') + (selectedPlatforms.length > 3 ? ` +${selectedPlatforms.length - 3}` : '');
  };

  const getSelectedVibeName = () => {
    const vibe = vibes.find(v => v.canonical_key === selectedVibe);
    return vibe?.label || 'Select your vibe';
  };

  const getSelectedGenreNames = () => {
    return selectedGenres
      .map(id => genres.find(g => g.id === id)?.name)
      .filter(Boolean)
      .slice(0, 3)
      .join(', ') + (selectedGenres.length > 3 ? ` +${selectedGenres.length - 3}` : '');
  };

  const saveGenrePreferences = async () => {
    if (!profile?.id) return;

    setIsSaving(true);

    // Delete existing preferences
    await supabase
      .from('user_genre_preferences')
      .delete()
      .eq('user_id', profile.id);

    // Insert new preferences
    if (selectedGenres.length > 0) {
      const preferences = selectedGenres.map(genreId => ({
        user_id: profile.id,
        genre_id: genreId
      }));

      const { error } = await supabase
        .from('user_genre_preferences')
        .insert(preferences);

      if (error) {
        toast.error('Failed to save visual taste preferences');
      } else {
        toast.success('Visual taste preferences saved');
        setShowVisualTasteEditor(false);
      }
    } else {
      toast.success('Visual taste preferences cleared');
      setShowVisualTasteEditor(false);
    }

    setIsSaving(false);
  };

  const saveVibePreference = async (canonicalKey: string) => {
    if (!profile?.id) {
      toast.error('User not found');
      return;
    }

    setIsSaving(true);

    // First try to update existing preference
    const { data: existingData, error: selectError } = await supabase
      .from('user_vibe_preferences')
      .select('id')
      .eq('user_id', profile.id)
      .maybeSingle();

    let error;
    
    if (existingData) {
      // Update existing record
      const result = await supabase
        .from('user_vibe_preferences')
        .update({
          vibe_type: canonicalKey,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', profile.id);
      error = result.error;
    } else {
      // Insert new record
      const result = await supabase
        .from('user_vibe_preferences')
        .insert({
          user_id: profile.id,
          vibe_type: canonicalKey
        });
      error = result.error;
    }

    if (error) {
      toast.error('Failed to save vibe preference');
    } else {
      setSelectedVibe(canonicalKey);
      toast.success('Vibe updated successfully');
      setShowVibeEditor(false);
    }

    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Settings</DialogTitle>
          <p className="text-muted-foreground text-sm">
            Manage your preferences and account settings
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Notifications Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Notifications</h3>
            </div>
            <div className="space-y-4 pl-7">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications" className="text-base">
                    Email Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates about your account
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications" className="text-base">
                    Push Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about important updates
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Appearance Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Appearance</h3>
            </div>
            <div className="space-y-4 pl-7">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dark-mode" className="text-base">
                    Dark Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Switch to dark theme
                  </p>
                </div>
                <Switch
                  id="dark-mode"
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Vibe Preference Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Your Vibe</h3>
            </div>
            <div className="space-y-4 pl-7">
              {!showVibeEditor ? (
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setShowVibeEditor(true)}
                >
                  <span className="text-left">
                    {loadingPrefs ? 'Loading...' : getSelectedVibeName()}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <Label className="text-base font-medium">Choose Your Vibe</Label>
                  <p className="text-sm text-muted-foreground">
                    This affects the type of content recommendations you receive
                  </p>
                  <div className="space-y-2">
                    {vibes.map(vibe => {
                      const isSelected = selectedVibe === vibe.canonical_key;
                      return (
                        <button
                          key={vibe.id}
                          onClick={() => saveVibePreference(vibe.canonical_key)}
                          disabled={isSaving}
                          className={`w-full p-3 rounded-lg text-left transition-all border ${
                            isSelected
                              ? 'border-primary bg-primary/10 ring-1 ring-primary'
                              : 'border-border bg-muted/50 hover:bg-muted hover:border-primary/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium">{vibe.label}</span>
                              {vibe.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {vibe.description}
                                </p>
                              )}
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-primary" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVibeEditor(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Visual Taste Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Visual Taste</h3>
            </div>
            <div className="space-y-4 pl-7">
              {!showVisualTasteEditor ? (
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setShowVisualTasteEditor(true)}
                >
                  <span className="text-left">
                    {loadingPrefs ? 'Loading...' : 
                      selectedGenres.length > 0 
                        ? getSelectedGenreNames() 
                        : 'Select your preferred genres'}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Select Genres</Label>
                    <span className="text-xs text-muted-foreground">
                      {selectedGenres.length} selected
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Choose genres that match your visual taste preferences
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {genres.map(genre => {
                      const isSelected = selectedGenres.includes(genre.id);
                      return (
                        <button
                          key={genre.id}
                          onClick={() => toggleGenre(genre.id)}
                          className={`relative p-3 rounded-lg text-center transition-all border ${
                            isSelected
                              ? 'border-primary bg-primary/10 ring-1 ring-primary'
                              : 'border-border bg-muted/50 hover:bg-muted hover:border-primary/50'
                          }`}
                        >
                          {isSelected && (
                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-primary-foreground" />
                            </span>
                          )}
                          <span className="text-sm font-medium">{genre.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowVisualTasteEditor(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveGenrePreferences}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Genres'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Language Preferences Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Language Preferences</h3>
            </div>
            <div className="space-y-4 pl-7">
              {!showLanguageEditor ? (
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setShowLanguageEditor(true)}
                >
                  <span className="text-left">
                    {loadingPrefs ? 'Loading...' : 
                      selectedLanguages.length > 0 
                        ? getSelectedLanguageNames() 
                        : 'Select preferred languages'}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Select Languages</Label>
                    <span className="text-xs text-muted-foreground">
                      {selectedLanguages.length} selected
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {languages.map(lang => {
                      const isSelected = selectedLanguages.includes(lang.code);
                      const priority = selectedLanguages.indexOf(lang.code) + 1;
                      return (
                        <button
                          key={lang.code}
                          onClick={() => toggleLanguage(lang.code)}
                          className={`relative p-2 rounded-lg text-left transition-all ${
                            isSelected
                              ? 'bg-primary/20 ring-1 ring-primary'
                              : 'bg-muted/50 hover:bg-muted'
                          }`}
                        >
                          {isSelected && (
                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                              {priority}
                            </span>
                          )}
                          <span className="text-lg">{lang.flag}</span>
                          <span className="text-xs block truncate">{lang.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLanguageEditor(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveLanguagePreferences}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Languages'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Streaming Platforms Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Tv className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Streaming Platforms</h3>
            </div>
            <div className="space-y-4 pl-7">
              {!showPlatformEditor ? (
                <Button
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setShowPlatformEditor(true)}
                >
                  <span className="text-left">
                    {loadingPrefs ? 'Loading...' : 
                      selectedPlatforms.length > 0 
                        ? getSelectedPlatformNames() 
                        : 'Select your streaming services'}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Select Platforms</Label>
                    <span className="text-xs text-muted-foreground">
                      {selectedPlatforms.length} selected
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {platforms.map(platform => {
                      const isSelected = selectedPlatforms.includes(platform.id);
                      return (
                        <button
                          key={platform.id}
                          onClick={() => togglePlatform(platform.id)}
                          className={`relative p-3 rounded-lg text-center transition-all border ${
                            isSelected
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-muted/50 hover:bg-muted'
                          }`}
                          style={{
                            boxShadow: isSelected ? `0 0 20px ${platform.color}40` : 'none'
                          }}
                        >
                          {isSelected && (
                            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-primary-foreground" />
                            </span>
                          )}
                          <span className="text-sm font-medium">{platform.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPlatformEditor(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={savePlatformPreferences}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save Platforms'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Privacy & Security Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Privacy & Security</h3>
            </div>
            <div className="space-y-4 pl-7">
              <Button variant="outline" className="w-full justify-start">
                Change Password
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Privacy Settings
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Download My Data
              </Button>
            </div>
          </div>

          <Separator />

          {/* Danger Zone */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              <h3 className="font-semibold text-lg text-destructive">Danger Zone</h3>
            </div>
            <div className="space-y-4 pl-7">
              <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
                <p className="text-sm text-muted-foreground mb-3">
                  Once you delete your account, there is no going back. Please be certain.
                </p>
                <DeleteAccountDialog onDeleted={() => onOpenChange(false)} />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

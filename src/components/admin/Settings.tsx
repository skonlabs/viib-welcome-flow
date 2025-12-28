import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, RefreshCw, Globe, Shield, Zap } from '@/icons';

interface OtpRateLimit {
  max_requests: number;
  window_minutes: number;
}

interface ViibWeights {
  id?: string;
  emotional_weight: number;
  social_weight: number;
  historical_weight: number;
  context_weight: number;
  novelty_weight: number;
  vibe_weight: number;
  is_active?: boolean;
  notes?: string;
}

const ALL_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'PT', name: 'Portugal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'AT', name: 'Austria' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'FI', name: 'Finland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'PL', name: 'Poland' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'HU', name: 'Hungary' },
  { code: 'RO', name: 'Romania' },
  { code: 'GR', name: 'Greece' },
  { code: 'TR', name: 'Turkey' },
  { code: 'IN', name: 'India' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'CN', name: 'China' },
  { code: 'SG', name: 'Singapore' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'PH', name: 'Philippines' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'PE', name: 'Peru' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IL', name: 'Israel' },
];

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('rate-limits');

  // OTP Rate Limit State
  const [otpRateLimit, setOtpRateLimit] = useState<OtpRateLimit>({
    max_requests: 5,
    window_minutes: 1,
  });

  // Supported Countries State
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [countrySearch, setCountrySearch] = useState('');

  // ViiB Weights State
  // Note: Social is now a multiplier in the formula, not a base weight
  // Formula: base = 0.35E + 0.30H + 0.15C + 0.10V + 0.10N
  // Final = base × (1 + min(0.35, 0.25 × S))
  const [viibWeights, setViibWeights] = useState<ViibWeights>({
    emotional_weight: 0.35,
    social_weight: 0.00, // Social is a multiplier, not additive weight
    historical_weight: 0.30,
    context_weight: 0.15,
    novelty_weight: 0.10,
    vibe_weight: 0.10,
  });

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return ALL_COUNTRIES;
    const search = countrySearch.toLowerCase();
    return ALL_COUNTRIES.filter(
      c => c.name.toLowerCase().includes(search) || c.code.toLowerCase().includes(search)
    );
  }, [countrySearch]);

  // Total weight calculation - Social is excluded (it's a multiplier in the formula)
  const totalWeight = useMemo(() => {
    return (
      viibWeights.emotional_weight +
      viibWeights.historical_weight +
      viibWeights.context_weight +
      viibWeights.novelty_weight +
      viibWeights.vibe_weight
    );
  }, [viibWeights]);

  const isWeightValid = Math.abs(totalWeight - 1) < 0.001;

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Load OTP rate limit from app_settings using type assertion
      const { data: otpData } = await (supabase
        .from('app_settings' as any)
        .select('setting_value')
        .eq('setting_key', 'otp_rate_limit')
        .single() as any);

      if (otpData?.setting_value) {
        setOtpRateLimit(otpData.setting_value as OtpRateLimit);
      }

      // Load supported countries from app_settings using type assertion
      const { data: countriesData } = await (supabase
        .from('app_settings' as any)
        .select('setting_value')
        .eq('setting_key', 'supported_countries')
        .single() as any);

      if (countriesData?.setting_value) {
        setSelectedCountries(countriesData.setting_value as string[]);
      }

      // Load ViiB weights from viib_weight_config
      const { data: weightsData } = await supabase
        .from('viib_weight_config')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (weightsData) {
        setViibWeights({
          id: weightsData.id,
          emotional_weight: weightsData.emotional_weight,
          social_weight: weightsData.social_weight,
          historical_weight: weightsData.historical_weight,
          context_weight: weightsData.context_weight,
          novelty_weight: weightsData.novelty_weight,
          vibe_weight: weightsData.vibe_weight ?? 0,
          is_active: weightsData.is_active,
          notes: weightsData.notes,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveOtpRateLimit = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase
        .from('app_settings' as any)
        .upsert({
          setting_key: 'otp_rate_limit',
          setting_value: otpRateLimit,
          description: 'Rate limit for OTP requests per minute',
        }, {
          onConflict: 'setting_key',
        }) as any);

      if (error) throw error;
      toast.success('OTP rate limit saved successfully');
    } catch (error) {
      console.error('Error saving OTP rate limit:', error);
      toast.error('Failed to save OTP rate limit');
    } finally {
      setSaving(false);
    }
  };

  const saveCountries = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase
        .from('app_settings' as any)
        .upsert({
          setting_key: 'supported_countries',
          setting_value: selectedCountries,
          description: 'List of supported country codes for the app',
        }, {
          onConflict: 'setting_key',
        }) as any);

      if (error) throw error;
      toast.success('Supported countries saved successfully');
    } catch (error) {
      console.error('Error saving countries:', error);
      toast.error('Failed to save countries');
    } finally {
      setSaving(false);
    }
  };

  const saveViibWeights = async () => {
    if (!isWeightValid) {
      toast.error('Weights must sum to 100%');
      return;
    }

    setSaving(true);
    try {
      // Deactivate current active config
      await supabase
        .from('viib_weight_config')
        .update({ is_active: false })
        .eq('is_active', true);

      // Insert or update the weights
      const { error } = await supabase
        .from('viib_weight_config')
        .upsert({
          id: viibWeights.id,
          emotional_weight: viibWeights.emotional_weight,
          social_weight: viibWeights.social_weight,
          historical_weight: viibWeights.historical_weight,
          context_weight: viibWeights.context_weight,
          novelty_weight: viibWeights.novelty_weight,
          vibe_weight: viibWeights.vibe_weight,
          is_active: true,
          notes: 'Updated via Admin Settings',
        });

      if (error) throw error;
      toast.success('ViiB weights saved successfully');
      loadSettings(); // Reload to get the updated ID
    } catch (error) {
      console.error('Error saving ViiB weights:', error);
      toast.error('Failed to save ViiB weights');
    } finally {
      setSaving(false);
    }
  };

  const toggleCountry = (code: string) => {
    setSelectedCountries(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  };

  const selectAllCountries = () => {
    setSelectedCountries(ALL_COUNTRIES.map(c => c.code));
  };

  const clearAllCountries = () => {
    setSelectedCountries([]);
  };

  const updateWeight = (key: keyof ViibWeights, value: number) => {
    setViibWeights(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure application settings and ViiB score weights</p>
        </div>
        <Button variant="outline" onClick={loadSettings}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rate-limits" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Rate Limits
          </TabsTrigger>
          <TabsTrigger value="countries" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Countries
          </TabsTrigger>
          <TabsTrigger value="viib-weights" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            ViiB Weights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rate-limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>OTP Rate Limiting</CardTitle>
              <CardDescription>
                Configure rate limits for OTP (One-Time Password) requests to prevent abuse
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_requests">Max Requests</Label>
                  <Input
                    id="max_requests"
                    type="number"
                    min={1}
                    max={100}
                    value={otpRateLimit.max_requests}
                    onChange={(e) => setOtpRateLimit(prev => ({
                      ...prev,
                      max_requests: parseInt(e.target.value) || 1,
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of OTP requests allowed
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="window_minutes">Time Window (minutes)</Label>
                  <Input
                    id="window_minutes"
                    type="number"
                    min={1}
                    max={60}
                    value={otpRateLimit.window_minutes}
                    onChange={(e) => setOtpRateLimit(prev => ({
                      ...prev,
                      window_minutes: parseInt(e.target.value) || 1,
                    }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Time window for rate limiting
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-4">
                  Current configuration: <strong>{otpRateLimit.max_requests}</strong> requests per <strong>{otpRateLimit.window_minutes}</strong> minute(s)
                </p>
                <Button onClick={saveOtpRateLimit} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <Save className="h-4 w-4 mr-2" />
                  Save Rate Limit
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="countries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Supported Countries</CardTitle>
              <CardDescription>
                Select which countries are supported for the application ({selectedCountries.length} selected)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Search countries..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="max-w-sm"
                />
                <Button variant="outline" size="sm" onClick={selectAllCountries}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearAllCountries}>
                  Clear All
                </Button>
              </div>

              <ScrollArea className="h-[300px] border rounded-md p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredCountries.map((country) => (
                    <div
                      key={country.code}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`country-${country.code}`}
                        checked={selectedCountries.includes(country.code)}
                        onCheckedChange={() => toggleCountry(country.code)}
                      />
                      <Label
                        htmlFor={`country-${country.code}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {country.code} - {country.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="pt-4 border-t">
                <Button onClick={saveCountries} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <Save className="h-4 w-4 mr-2" />
                  Save Countries
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="viib-weights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ViiB Score Weights</CardTitle>
              <CardDescription>
                Configure the weight distribution for ViiB recommendation scoring.
                Total must equal 100%.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={`p-4 rounded-lg ${isWeightValid ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                <p className={`text-sm font-medium ${isWeightValid ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  Total: {(totalWeight * 100).toFixed(1)}% {isWeightValid ? '✓' : '(must equal 100%)'}
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Emotional Weight</Label>
                    <span className="text-sm font-medium">{(viibWeights.emotional_weight * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[viibWeights.emotional_weight * 100]}
                    onValueChange={([v]) => updateWeight('emotional_weight', v / 100)}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    How well content matches user's emotional state (PAD model)
                  </p>
                </div>

                {/* Social is now a multiplier, shown as info only */}
                <div className="space-y-3 opacity-60">
                  <div className="flex justify-between items-center">
                    <Label>Social (Multiplier)</Label>
                    <span className="text-sm font-medium text-muted-foreground">×(1 + min(35%, 25%×S))</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Social is now a score multiplier, not an additive weight. Friend recommendations can boost final score by up to 35%.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Historical Weight</Label>
                    <span className="text-sm font-medium">{(viibWeights.historical_weight * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[viibWeights.historical_weight * 100]}
                    onValueChange={([v]) => updateWeight('historical_weight', v / 100)}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Based on user's past viewing history and preferences
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Context Weight</Label>
                    <span className="text-sm font-medium">{(viibWeights.context_weight * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[viibWeights.context_weight * 100]}
                    onValueChange={([v]) => updateWeight('context_weight', v / 100)}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Time of day, day of week, and seasonal factors
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Novelty Weight</Label>
                    <span className="text-sm font-medium">{(viibWeights.novelty_weight * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[viibWeights.novelty_weight * 100]}
                    onValueChange={([v]) => updateWeight('novelty_weight', v / 100)}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Discovery of new content outside typical preferences
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Vibe Weight</Label>
                    <span className="text-sm font-medium">{(viibWeights.vibe_weight * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[viibWeights.vibe_weight * 100]}
                    onValueChange={([v]) => updateWeight('vibe_weight', v / 100)}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    User's vibe preference alignment (calm, energetic, curious, adventurous)
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={saveViibWeights} disabled={saving || !isWeightValid}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  <Save className="h-4 w-4 mr-2" />
                  Save Weights
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

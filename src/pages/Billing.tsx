import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';

const Billing = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans', isAnnual],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('cadence', isAnnual ? 'annual' : 'monthly')
        .eq('is_active', true)
        .order('price_amount', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: currentSubscription } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const handleSubscribe = async (planCode: string) => {
    try {
      setLoadingPlan(planCode);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const plan = plans?.find(p => p.code === planCode);
      if (!plan) throw new Error('Plan not found');

      const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
        body: {
          priceId: plan.stripe_price_id,
          planName: plan.name,
          billingPeriod: plan.cadence,
        },
      });

      if (error) throw error;
      if (data.url) window.location.href = data.url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('billing.checkoutError'),
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-create-portal');
      if (error) throw error;
      if (data.url) window.location.href = data.url;
    } catch (error) {
      console.error('Error opening portal:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('billing.portalError'),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">{t('billing.title')}</h1>
        <p className="text-muted-foreground text-lg mb-6">
          {t('billing.subtitle')}
        </p>

        <div className="flex items-center justify-center gap-4">
          <Label htmlFor="billing-toggle" className="text-base">
            {t('billing.monthly')}
          </Label>
          <Switch
            id="billing-toggle"
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
          />
          <Label htmlFor="billing-toggle" className="text-base">
            {t('billing.annual')}
            <Badge variant="secondary" className="ml-2">-17%</Badge>
          </Label>
        </div>
      </div>

      {currentSubscription && (
        <Card className="mb-8 border-primary">
          <CardHeader>
            <CardTitle>{t('billing.currentSubscription')}</CardTitle>
            <CardDescription>
              {t('billing.plan')} {currentSubscription.plan_name} - {currentSubscription.billing_period === 'annual' ? t('billing.annual') : t('billing.monthly')}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={handleManageBilling}>
              {t('billing.manageBilling')}
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans?.map((plan) => {
          const isPopular = plan.code === 'standard';
          const isCurrentPlan = currentSubscription?.plan_code === plan.code;
          const features = Array.isArray(plan.features_enabled) 
            ? plan.features_enabled 
            : [];

          return (
            <Card 
              key={plan.id} 
              className={`relative ${isPopular ? 'border-primary shadow-glow' : ''}`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-primary">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {t('billing.mostPopular')}
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    €{plan.price_amount.toFixed(0)}
                  </span>
                  <span className="text-muted-foreground">
                    /{isAnnual ? t('billing.perYear') : t('billing.perMonth')}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">{plan.store_limit} {plan.store_limit === 999 ? t('billing.unlimitedStores') : t('billing.stores')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">{plan.campaign_limit} {plan.campaign_limit === 999 ? t('billing.unlimitedCampaigns') : t('billing.campaigns')}</span>
                  </div>
                  {features.map((feature: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      <span className="text-sm capitalize">
                        {feature.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={isPopular ? 'default' : 'outline'}
                  disabled={isCurrentPlan || loadingPlan === plan.code}
                  onClick={() => handleSubscribe(plan.code)}
                >
                  {loadingPlan === plan.code && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {isCurrentPlan ? t('billing.currentPlan') : t('billing.choosePlan')}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Billing;

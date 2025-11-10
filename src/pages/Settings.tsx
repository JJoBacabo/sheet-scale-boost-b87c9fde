import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LoadingOverlay } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import { User as UserIcon, Building2, CreditCard, Facebook, ShoppingBag, Check, ExternalLink, Sparkles, X, RefreshCw, Calendar } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card3D } from "@/components/ui/Card3D";
import { motion } from "framer-motion";
import { profileSchema, shopifyIntegrationSchema } from "@/lib/validation";
import { SubscriptionHistoryModal } from "@/components/SubscriptionHistoryModal";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  company_name: string | null;
  subscription_plan: string;
  subscription_status: string;
  trial_ends_at: string | null;
}

interface Integration {
  id: string;
  integration_type: 'facebook_ads' | 'shopify';
  connected_at: string;
  metadata: any;
}

interface Subscription {
  id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string;
  plan_name: string;
  billing_period: 'monthly' | 'annual';
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [showShopifyDialog, setShowShopifyDialog] = useState(false);
  const [shopifyStoreName, setShopifyStoreName] = useState("");
  const [shopifyAccessToken, setShopifyAccessToken] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [stripePrices, setStripePrices] = useState<Record<string, { monthly: string; annual: string }>>({});
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [subscriptionHistory, setSubscriptionHistory] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    full_name: "",
    company_name: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    // Check for OAuth callback status
    const params = new URLSearchParams(window.location.search);
    if (params.get('facebook_connected') === 'true') {
      toast({
        title: t('common.success'),
        description: t('settings.integrationsPage.connectSuccess'),
      });
      window.history.replaceState({}, '', '/settings');
      if (user) fetchProfile(user.id, true);
    } else if (params.get('facebook_error')) {
      toast({
        title: t('common.error'),
        description: params.get('facebook_error') || t('settings.facebookConnectionError'),
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/settings');
    }

    // Fetch Stripe prices
    fetchStripePrices();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchStripePrices = async () => {
    try {
      const response = await fetch('https://cygvvrtsdatdczswcrqj.supabase.co/functions/v1/stripe-get-prices');
      const data = await response.json();
      
      if (data.priceConfig) {
        setStripePrices(data.priceConfig);
        console.log('💳 Stripe prices loaded:', data.priceConfig);
      }
    } catch (error) {
      console.error('❌ Error fetching Stripe prices:', error);
    }
  };

  // Real-time updates for integrations
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('integrations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'integrations',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 Integration real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setIntegrations((prev) => [...prev, payload.new as Integration]);
            toast({
              title: t('common.success'),
              description: t('settings.integrationsPage.connectSuccess'),
            });
          } else if (payload.eventType === 'UPDATE') {
            setIntegrations((prev) =>
              prev.map((int) => (int.id === payload.new.id ? payload.new as Integration : int))
            );
          } else if (payload.eventType === 'DELETE') {
            setIntegrations((prev) => prev.filter((int) => int.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const fetchProfile = async (userId: string, forceRefresh = false) => {
    // Clear cache if force refresh
    if (forceRefresh) {
      setIntegrations([]);
      setProfile(null);
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
    } else if (data) {
      setProfile(data);
      setFormData({
        full_name: data.full_name || "",
        company_name: data.company_name || "",
      });
    }

    // Fetch integrations with force refresh
    const { data: integrationsData } = await supabase
      .from("integrations")
      .select("*")
      .eq("user_id", userId);

    // Always update integrations state, even if empty
    setIntegrations((integrationsData as Integration[]) || []);
    
    console.log('🔄 Integrations loaded:', integrationsData?.length || 0);

    // Fetch subscription
    const { data: subscriptionData } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (subscriptionData) {
      setSubscription(subscriptionData as Subscription);
      console.log('💳 Subscription loaded:', subscriptionData.plan_name);
    }
  };

  const fetchSubscriptionHistory = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("subscription_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching subscription history:", error);
      toast({
        title: t('common.error'),
        description: t('settings.errorLoadingData'),
        variant: "destructive",
      });
    } else {
      setSubscriptionHistory(data || []);
      setShowHistoryModal(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    // Validate input
    const validation = profileSchema.safeParse({
      full_name: formData.full_name,
      company_name: formData.company_name
    });
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({
        title: "Erro de validação",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: validation.data.full_name,
        company_name: validation.data.company_name || null,
      })
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t('common.success'),
        description: t('settings.profileUpdated'),
      });
      if (user) await fetchProfile(user.id, false);
    }
    setSaving(false);
  };

  const isIntegrationConnected = (type: 'facebook_ads' | 'shopify') => {
    return integrations.some(int => int.integration_type === type);
  };

  const handleConnectFacebookAds = () => {
    if (!user) {
      toast({
        title: t('settings.error'),
        description: t('settings.userNotAuthenticated'),
        variant: "destructive",
      });
      return;
    }
    
    try {
      const appId = '1525902928789947';
      const redirectUri = 'https://cygvvrtsdatdczswcrqj.supabase.co/functions/v1/facebook-oauth-callback';
      const state = user.id;
      const scope = 'ads_management,ads_read,business_management';
      
      const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
        `client_id=${appId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${state}&` +
        `scope=${scope}&` +
        `response_type=code`;
      
      console.log('🔗 Opening Facebook OAuth popup');
      console.log('📍 Redirect URI:', redirectUri);
      
      // Open OAuth in a popup window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        oauthUrl,
        'Facebook Login',
        `width=${width},height=${height},left=${left},top=${top},toolbar=0,location=0,menubar=0`
      );
      
      // Listen for messages from the OAuth callback
      const handleMessage = (event: MessageEvent) => {
        // Accept messages from any origin but validate the message structure
        if (!event.data || typeof event.data.type !== 'string') return;
        
        console.log('📨 Received message:', event.data);
        
        if (event.data.type === 'facebook-oauth-success') {
          console.log('✅ Facebook OAuth success received');
          
          // Close popup if still open
          if (popup && !popup.closed) {
            try {
              popup.close();
            } catch (e) {
              console.log('Could not close popup:', e);
            }
          }
          
          toast({
            title: t('settings.facebookAds'),
            description: 'Connected successfully! Refreshing data...',
          });
          
          // Refresh profile and integrations
          if (user) {
            setTimeout(() => {
              fetchProfile(user.id, true);
            }, 500);
          }
          
          window.removeEventListener('message', handleMessage);
        } else if (event.data.type === 'facebook-oauth-error') {
          console.error('❌ Facebook OAuth error received:', event.data.error);
          
          // Close popup if still open
          if (popup && !popup.closed) {
            try {
              popup.close();
            } catch (e) {
              console.log('Could not close popup:', e);
            }
          }
          
          toast({
            title: t('settings.error'),
            description: event.data.error || 'Failed to connect Facebook Ads',
            variant: "destructive",
          });
          
          window.removeEventListener('message', handleMessage);
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Timeout to clean up listener if no response
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
      }, 120000); // 2 minutes
      
      // Check if popup was blocked
      if (!popup || popup.closed) {
        toast({
          title: t('settings.error'),
          description: 'Please allow popups for this site',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('❌ Error initiating Facebook OAuth:', error);
      toast({
        title: t('settings.error'),
        description: t('settings.facebookConnectionError'),
        variant: "destructive",
      });
    }
  };

  const handleConnectShopify = () => {
    setShowShopifyDialog(true);
  };

  const handleSaveShopify = async () => {
    if (!user || !shopifyStoreName || !shopifyAccessToken) {
      toast({
        title: t("common.error"),
        description: t("settings.fillAllFields"),
        variant: "destructive",
      });
      return;
    }

    // Extract store name from URL if full URL was provided
    let cleanStoreName = shopifyStoreName.trim();
    
    try {
      // Remove protocol if present
      cleanStoreName = cleanStoreName.replace(/^https?:\/\//, '');
      
      // Remove trailing slashes
      cleanStoreName = cleanStoreName.replace(/\/+$/, '');
      
      // Extract store name from various URL formats
      if (cleanStoreName.includes('.myshopify.com')) {
        // Extract from xxx.myshopify.com
        cleanStoreName = cleanStoreName.split('.myshopify.com')[0];
      } else if (cleanStoreName.includes('.')) {
        // For custom domains, try to extract subdomain or use as-is
        // We'll let the backend validate this
        const parts = cleanStoreName.split('.');
        if (parts.length > 2) {
          // It's a subdomain, use the first part
          cleanStoreName = parts[0];
        }
      }
      
      // Remove any remaining path or query params
      cleanStoreName = cleanStoreName.split('/')[0].split('?')[0];
      
    } catch (e) {
      toast({
        title: "Erro",
        description: "URL da loja inválido",
        variant: "destructive",
      });
      return;
    }

    // Validate input
    const validation = shopifyIntegrationSchema.safeParse({
      store_name: cleanStoreName,
      access_token: shopifyAccessToken
    });
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast({
        title: "Erro de validação",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    
    // Call edge function shopify-connect
    const { data, error } = await supabase.functions.invoke('shopify-connect', {
      body: {
        store_name: validation.data.store_name,
        access_token: validation.data.access_token
      }
    });

    if (error || data?.error) {
      toast({
        title: t("settings.errorConnecting"),
        description: error?.message || data?.error || t("settings.checkCredentials"),
        variant: "destructive",
      });
    } else {
      // Check if store changed and show appropriate message
      const storeChanged = data?.store_changed || false;
      
      toast({
        title: t("settings.shopifyConnected"),
        description: storeChanged 
          ? t("settings.newStoreConnected").replace('{{storeName}}', data.shop.name)
          : t("settings.storeConnectedSuccess").replace('{{storeName}}', data.shop.name),
        duration: storeChanged ? 8000 : 4000,
      });
      setShowShopifyDialog(false);
      setShopifyStoreName("");
      setShopifyAccessToken("");
      if (user) await fetchProfile(user.id, true); // Force refresh
    }
    setSaving(false);
  };

  const handleSyncShopifyProducts = async () => {
    setSyncing(true);
    
    const { data, error } = await supabase.functions.invoke('shopify-sync-products');
    
    if (error || data?.error) {
      toast({
        title: t("settings.errorSyncing"),
        description: error?.message || data?.error || t("settings.tryAgain"),
        variant: "destructive",
      });
    } else {
      toast({
        title: t("settings.productsSynced"),
        description: t("settings.syncStats")
          .replace('{{created}}', String(data.stats.created))
          .replace('{{updated}}', String(data.stats.updated))
          .replace('{{total}}', String(data.stats.total)),
      });
      setLastSync(new Date().toISOString());
    }
    
    setSyncing(false);
  };

  const handleDisconnectIntegration = async (type: 'facebook_ads' | 'shopify') => {
    if (!user) return;

    // First remove from local state immediately
    setIntegrations(prev => prev.filter(int => int.integration_type !== type));

    // For Shopify, delete ALL products (not just Shopify-linked ones)
    if (type === 'shopify') {
      console.log('🗑️ Removing all products...');
      
      const { error: productsError } = await supabase
        .from("products")
        .delete()
        .eq("user_id", user.id);

      if (productsError) {
        console.error('❌ Error deleting products:', productsError);
        toast({
          title: "Aviso",
          description: "Integração removida mas alguns produtos podem não ter sido apagados.",
          variant: "destructive",
        });
      } else {
        console.log('✅ All products removed successfully');
      }
    }

    const { error } = await supabase
      .from("integrations")
      .delete()
      .eq("user_id", user.id)
      .eq("integration_type", type);

    if (error) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
      // Rollback on error
      if (user) await fetchProfile(user.id, true);
    } else {
      toast({
        title: t("settings.integrationRemoved"),
        description: type === 'shopify' 
          ? t("settings.shopifyDisconnected")
          : t("settings.facebookDisconnected"),
      });
      // Force refresh to ensure clean state
      if (user) await fetchProfile(user.id, true);
    }
  };

  const handleSubscribe = async (planName: string, priceId: string) => {
    if (!user) {
      toast({
        title: t('common.error'),
        description: t('settings.userNotAuthenticated'),
        variant: "destructive",
      });
      return;
    }

    setSubscribing(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
        body: {
          priceId,
          planName: planName.toLowerCase(),
          billingPeriod,
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('❌ Error creating checkout session:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('settings.errorConnecting'),
        variant: "destructive",
      });
    } finally {
      setSubscribing(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) {
      toast({
        title: t('common.error'),
        description: t('settings.userNotAuthenticated'),
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('stripe-create-portal', {});

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('❌ Error creating portal session:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('billing.portalError'),
        variant: "destructive",
      });
    }
  };

  const plans = [
    { 
      name: "Basic", 
      price: t('settings.plans.basic.price'), 
      annualOriginal: t('settings.plans.basic.annualOriginal'),
      annualPrice: t('settings.plans.basic.annualPrice'),
      annualSavings: t('settings.plans.basic.annualSavings'),
      features: t('settings.plans.basic.features') as unknown as string[], 
      current: profile?.subscription_plan === "basic",
      popular: false
    },
    { 
      name: "Standard", 
      price: t('settings.plans.standard.price'), 
      annualOriginal: t('settings.plans.standard.annualOriginal'),
      annualPrice: t('settings.plans.standard.annualPrice'),
      annualSavings: t('settings.plans.standard.annualSavings'),
      features: t('settings.plans.standard.features') as unknown as string[], 
      current: profile?.subscription_plan === "standard",
      popular: true
    },
    { 
      name: "Expert", 
      price: t('settings.plans.expert.price'), 
      annualOriginal: t('settings.plans.expert.annualOriginal'),
      annualPrice: t('settings.plans.expert.annualPrice'),
      annualSavings: t('settings.plans.expert.annualSavings'),
      features: t('settings.plans.expert.features') as unknown as string[], 
      current: profile?.subscription_plan === "expert",
      popular: false
    },
    { 
      name: "Business", 
      price: t('settings.plans.business.price'), 
      features: t('settings.plans.business.features') as unknown as string[], 
      current: profile?.subscription_plan === "business",
      popular: false,
      isCustom: true
    },
  ];

  if (loading) {
    return <LoadingOverlay message={t('settings.loading')} />;
  }

  return (
    <PageLayout
      title={t('settings.title')}
      subtitle={t('settings.integrationsPage.subtitle')}
    >
      <div className="space-y-6">
              {/* Profile Section */}
              <Card3D intensity="low" className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
                    <UserIcon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold">{t('settings.profile')}</h2>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="email">{t('settings.email')}</Label>
                    <Input id="email" value={user?.email || ""} disabled className="opacity-60" />
                    <p className="text-sm text-muted-foreground">{t('settings.emailNote')}</p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="fullname">{t('settings.fullName')}</Label>
                    <Input
                      id="fullname"
                      placeholder={t('settings.fullNamePlaceholder')}
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="company">{t('settings.company')}</Label>
                    <Input
                      id="company"
                      placeholder={t('settings.companyPlaceholder')}
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    />
                  </div>

                  <Button
                    className="btn-gradient"
                    onClick={handleSaveProfile}
                    disabled={saving}
                  >
                    {saving ? t('settings.saving') : t('settings.save')}
                  </Button>
                </div>
              </Card3D>

              {/* Subscription Section */}
              <div id="plans-section">
                <Card3D intensity="low" className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
                    <CreditCard className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold">{t('settings.plan')}</h2>
                  </div>
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-base px-4 py-2">
                    {(() => {
                      if (profile?.subscription_plan === 'trial') {
                        // Check if trial is expired
                        const isExpired = profile.trial_ends_at && new Date(profile.trial_ends_at) < new Date();
                        const isInactive = profile.subscription_status === 'inactive';
                        
                        if (isExpired || isInactive) {
                          return 'FREE';
                        }
                        return 'TRIAL';
                      }
                      return profile?.subscription_plan.toUpperCase();
                    })()}
                  </Badge>
                </div>

                {/* Billing Toggle */}
                <div className="flex items-center justify-center gap-4 mb-8">
                  <button
                    onClick={() => setBillingPeriod('monthly')}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                      billingPeriod === 'monthly'
                        ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {t('settings.billing.monthly')}
                  </button>
                  <button
                    onClick={() => setBillingPeriod('annual')}
                    className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                      billingPeriod === 'annual'
                        ? 'bg-gradient-primary text-primary-foreground shadow-glow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {t('settings.billing.annual')}
                    <span className="text-xs bg-primary/20 px-2 py-1 rounded">
                      {t('settings.billing.save3Months')}
                    </span>
                  </button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {plans.map((plan) => (
                    <Card3D
                      key={plan.name}
                      intensity={plan.current ? "medium" : "low"}
                      glow={plan.current}
                      className={`p-6 transition-all duration-300 flex flex-col relative ${
                        plan.current
                          ? "border-primary/40"
                          : plan.popular
                          ? "border-primary shadow-glow"
                          : "border-border/50 hover:border-primary/30"
                      }`}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-primary rounded-full text-xs font-bold text-primary-foreground whitespace-nowrap">
                          Popular
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold">{plan.name}</h3>
                        {plan.current && (
                          <Badge className="bg-success/20 text-success border-success/30">
                            <Check className="w-3 h-3 mr-1" />
                            {t('settings.current')}
                          </Badge>
                        )}
                      </div>
                      
                      {plan.isCustom ? (
                        <p className="text-2xl font-bold mb-6">{plan.price}</p>
                      ) : billingPeriod === 'monthly' ? (
                        <>
                          <p className="text-2xl font-bold mb-6">{plan.price}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-lg text-gray-500 line-through mb-1">{plan.annualOriginal}</p>
                          <p className="text-2xl font-bold mb-2">{plan.annualPrice}</p>
                          <p className="text-primary text-xs mb-4 font-semibold">{plan.annualSavings}</p>
                        </>
                      )}
                      
                      <ul className="space-y-2 mb-6 flex-1">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      {!plan.current && (
                        plan.isCustom ? (
                          <Button 
                            className="w-full btn-gradient mt-auto" 
                            size="sm"
                            onClick={() => window.location.href = 'mailto:info@sheet-tools.com?subject=Business Plan Inquiry'}
                          >
                            {t('landing.pricing.business.contactUs')}
                          </Button>
                        ) : (
                          <Button 
                            className="w-full btn-gradient mt-auto" 
                            size="sm"
                            onClick={() => {
                              const planKey = plan.name.toLowerCase();
                              const priceId = stripePrices[planKey]?.[billingPeriod];
                              
                              if (!priceId) {
                                toast({
                                  title: "Erro",
                                  description: "Preços ainda não carregados. Tente novamente.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              
                              handleSubscribe(plan.name, priceId);
                            }}
                            disabled={subscribing || Object.keys(stripePrices).length === 0}
                          >
                            <Sparkles className="w-4 h-4 mr-2" />
                            {subscribing ? t('settings.processing') : t('settings.upgrade')}
                          </Button>
                        )
                      )}
                    </Card3D>
                  ))}
                </div>

                {subscription && subscription.status === 'active' && (
                  <div className="flex flex-col gap-4">
                    <div className="p-4 rounded-lg glass-card border border-success/30 bg-success/5">
                      <p className="text-sm">
                        <strong>{t('settings.subscriptionActive')}:</strong> {subscription.plan_name.charAt(0).toUpperCase() + subscription.plan_name.slice(1)} ({subscription.billing_period === 'monthly' ? t('settings.billing.monthly') : t('settings.billing.annual')})
                        {subscription.current_period_end && (
                          <span className="block mt-1 text-muted-foreground">
                            {t('settings.renewsOn')} {new Date(subscription.current_period_end).toLocaleDateString("pt-PT")}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {subscription.stripe_customer_id && (
                        <Button 
                          variant="outline" 
                          onClick={handleManageSubscription}
                          className="flex-1"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          {t('settings.manageSubscription')}
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        onClick={fetchSubscriptionHistory}
                        className="flex-1"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Ver Histórico
                      </Button>
                    </div>
                  </div>
                )}

                {profile?.trial_ends_at && profile.subscription_plan === "trial" && !subscription && (() => {
                  const trialEnd = new Date(profile.trial_ends_at);
                  const now = new Date();
                  const isTrialActive = trialEnd > now && profile.subscription_status === "active";
                  
                  if (isTrialActive) {
                    return (
                      <div className="p-4 rounded-lg glass-card border border-success/30 bg-success/5">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold text-success mb-1">
                              🎉 TRIAL ATIVO - Acesso ao Plano Standard
                            </p>
                            <p className="text-sm">
                              <strong>{t('settings.trialActive')}:</strong> {t('settings.endsOn')}{" "}
                              {new Date(profile.trial_ends_at).toLocaleDateString("pt-PT")}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Você tem acesso completo aos recursos do plano Standard durante o período de trial.
                              Após o término, seu plano será alterado para FREE automaticamente.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="p-4 rounded-lg glass-card border border-warning/30 bg-warning/5">
                        <p className="text-sm">
                          <strong>{t('settings.trialExpiredTitle')}:</strong> {t('settings.trialExpiredMessage').replace('{{date}}', new Date(profile.trial_ends_at).toLocaleDateString())}
                        </p>
                      </div>
                    );
                  }
                })()}
                </Card3D>
              </div>

              {/* Danger Zone */}
              <Card3D intensity="low" className="p-6 border-destructive/20">
                <h2 className="text-2xl font-bold mb-4 text-destructive">{t('settings.dangerZone.title')}</h2>
                <p className="text-muted-foreground mb-6">
                  {t('settings.dangerZone.description')}
                </p>
                <Separator className="my-6" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold mb-1">{t('settings.dangerZone.deleteAccount')}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.dangerZone.deleteDescription')}
                      </p>
                    </div>
                    <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10">
                      {t('settings.dangerZone.deleteAccount')}
                    </Button>
                  </div>
                </div>
                </Card3D>
              </div>

            {/* Shopify Dialog */}
          <Dialog open={showShopifyDialog} onOpenChange={setShowShopifyDialog}>
            <DialogContent className="glass-card max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                      <DialogTitle className="text-2xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#96bf48] flex items-center justify-center">
                          <ShoppingBag className="w-5 h-5 text-white" />
                        </div>
                        {t('settings.shopifyDialog.title')}
                      </DialogTitle>
                      <DialogDescription className="space-y-4 text-left">
                        <p>{t('settings.shopifyDialog.instructions')}</p>
                        <ol className="list-decimal list-inside space-y-2 text-sm">
                          <li>{t('settings.shopifyDialog.step1')}</li>
                          <li>{t('settings.shopifyDialog.step2')}</li>
                          <li>{t('settings.shopifyDialog.step3')}</li>
                          <li>
                            {t('settings.shopifyDialog.step4')}
                            <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                              <li><code className="bg-muted px-1 py-0.5 rounded text-xs">read_products</code> ({t('settings.shopifyDialog.required')})</li>
                              <li><code className="bg-muted px-1 py-0.5 rounded text-xs">read_inventory</code> ({t('settings.shopifyDialog.recommended')})</li>
                              <li><code className="bg-muted px-1 py-0.5 rounded text-xs">read_orders</code> ({t('settings.shopifyDialog.recommended')})</li>
                            </ul>
                          </li>
                          <li>{t('settings.shopifyDialog.step5')}</li>
                        </ol>
                        <Button 
                          type="button"
                          variant="link" 
                          className="p-0 h-auto text-primary" 
                          onClick={(e) => {
                            e.preventDefault();
                            window.open('https://admin.shopify.com/settings/apps/development', '_blank');
                          }}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          {t('settings.shopifyDialog.openAdmin')}
                        </Button>
                      </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="storeName">{t('settings.shopifyDialog.storeName')}</Label>
                  <Input
                    id="storeName"
                    placeholder={t('settings.shopifyDialog.storeNamePlaceholder')}
                    value={shopifyStoreName}
                    onChange={(e) => setShopifyStoreName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('settings.shopifyDialog.storeNameHelp')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shopifyToken">{t('settings.shopifyDialog.accessToken')}</Label>
                  <Input
                    id="shopifyToken"
                    type="password"
                    placeholder={t('settings.shopifyDialog.accessTokenPlaceholder')}
                    value={shopifyAccessToken}
                    onChange={(e) => setShopifyAccessToken(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('settings.shopifyDialog.accessTokenHelp')}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowShopifyDialog(false)}>
                  {t('settings.shopifyDialog.cancel')}
                </Button>
                <Button 
                  className="btn-gradient" 
                  onClick={handleSaveShopify}
                  disabled={saving}
                >
                  {saving ? t('settings.shopifyDialog.connecting') : t('settings.shopifyDialog.connect')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <SubscriptionHistoryModal 
            open={showHistoryModal}
            onOpenChange={setShowHistoryModal}
            history={subscriptionHistory}
          />
    </PageLayout>
  );
};

export default Settings;

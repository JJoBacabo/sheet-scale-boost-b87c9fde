import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Button3D } from "@/components/ui/Button3D";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, AlertCircle, CheckCircle2, Plus, Trash2, RefreshCw, ShoppingBag, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLayout } from "@/components/PageLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card3D } from "@/components/ui/Card3D";
import { motion } from "framer-motion";
import { useFeatureGate } from "@/hooks/useFeatureGate";
import { UpsellModal } from "@/components/UpsellModal";
import { LoadingOverlay } from "@/components/ui/loading-spinner";

interface Integration {
  id: string;
  integration_type: string;
  connected_at: string;
  metadata: any;
  expires_at: string | null;
}

export default function Integrations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { checkStoreLimit, usageData } = useFeatureGate();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingFacebook, setConnectingFacebook] = useState(false);
  const [showShopifyDialog, setShowShopifyDialog] = useState(false);
  const [shopifyStoreName, setShopifyStoreName] = useState("");
  const [shopifyAccessToken, setShopifyAccessToken] = useState("");
  const [connectingShopify, setConnectingShopify] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [disconnectDialog, setDisconnectDialog] = useState<{type: 'facebook' | 'shopify', id?: string} | null>(null);
  const [showUpsellModal, setShowUpsellModal] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchIntegrations();

    const channel = supabase
      .channel('integrations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'integrations'
        },
        () => {
          fetchIntegrations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchIntegrations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectFacebook = async () => {
    setConnectingFacebook(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const state = btoa(JSON.stringify({ userId: session.user.id }));
      const facebookAppId = "1525902928789947";
      const supabaseUrl = "https://cygvvrtsdatdczswcrqj.supabase.co";
      const redirectUri = `${supabaseUrl}/functions/v1/facebook-oauth-callback`;
      
      const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${facebookAppId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=ads_management,ads_read,business_management`;
      
      // Open in popup window
      const width = 600;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      const popup = window.open(
        authUrl,
        'Facebook Login',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );

      // Listen for messages from the popup
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'facebook-oauth-success') {
          popup?.close();
          toast({
            title: t('settings.success'),
            description: t('settings.integrationsPage.facebookConnected')
          });
          fetchIntegrations();
          setConnectingFacebook(false);
          window.removeEventListener('message', handleMessage);
        } else if (event.data.type === 'facebook-oauth-error') {
          popup?.close();
          toast({
            title: t('settings.error'),
            description: event.data.error || t('settings.integrationsPage.facebookError'),
            variant: "destructive"
          });
          setConnectingFacebook(false);
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);

      // Fallback: check if popup was closed without message
      const checkPopupClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopupClosed);
          window.removeEventListener('message', handleMessage);
          setConnectingFacebook(false);
          fetchIntegrations();
        }
      }, 1000);
    } catch (error) {
      console.error('Error connecting Facebook:', error);
      toast({
        title: t('settings.error'),
        description: t('settings.integrationsPage.shopifyConnectError'),
        variant: "destructive"
      });
      setConnectingFacebook(false);
    }
  };

  const handleDisconnectFacebook = async (integrationId: string) => {
    setDisconnectDialog(null);
    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;

      toast({
        title: t('settings.success'),
        description: t('settings.integrationsPage.facebookDisconnected')
      });
      fetchIntegrations();
    } catch (error) {
      console.error('Error disconnecting Facebook:', error);
      toast({
        title: t('settings.error'),
        description: t('settings.integrationsPage.facebookError'),
        variant: "destructive"
      });
    }
  };

  const handleConnectShopify = () => {
    const storeCheck = checkStoreLimit();
    
    if (!storeCheck.canAccess) {
      setShowUpsellModal(true);
      return;
    }

    setShowShopifyDialog(true);
    setShopifyStoreName("");
    setShopifyAccessToken("");
  };

  const handleShopifySubmit = async () => {
    if (!shopifyStoreName || !shopifyAccessToken) {
      toast({
        title: t('settings.error'),
        description: t('settings.integrationsPage.fillAllFields'),
        variant: "destructive"
      });
      return;
    }

    setConnectingShopify(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: t('settings.error'),
          description: t('settings.integrationsPage.loginRequired'),
          variant: "destructive"
        });
        setConnectingShopify(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('shopify-connect', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: {
          store_name: shopifyStoreName,
          access_token: shopifyAccessToken
        }
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message);
      }

      toast({
        title: t('settings.success'),
        description: `${t('settings.integrationsPage.store')} ${data.shop.name} ${t('settings.integrationsPage.connectSuccess')}`
      });
      
      setShowShopifyDialog(false);
      fetchIntegrations();
      
      // Automatically sync products in background after connecting
      setTimeout(async () => {
        try {
          const { data: integrations } = await supabase
            .from('integrations')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('integration_type', 'shopify')
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (integrations && integrations.length > 0) {
            await supabase.functions.invoke('shopify-sync-products', {
              headers: {
                Authorization: `Bearer ${session.access_token}`
              },
              body: { integration_id: integrations[0].id }
            });
            console.log('✅ Auto-sync started for new store');
          }
        } catch (err) {
          console.error('Auto-sync error:', err);
        }
      }, 1000);
    } catch (error: any) {
      console.error('Error connecting Shopify:', error);
      toast({
        title: t('settings.error'),
        description: error.message || t('settings.integrationsPage.shopifyConnectError'),
        variant: "destructive"
      });
    } finally {
      setConnectingShopify(false);
    }
  };

  const handleDisconnectShopify = async (integrationId: string) => {
    setDisconnectDialog(null);
    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;

      toast({
        title: t('settings.success'),
        description: t('settings.integrationsPage.shopifyDisconnected')
      });
      fetchIntegrations();
    } catch (error) {
      console.error('Error disconnecting Shopify:', error);
      toast({
        title: t('settings.error'),
        description: t('settings.integrationsPage.shopifyError'),
        variant: "destructive"
      });
    }
  };

  const handleSyncShopify = async (integrationId: string) => {
    setSyncing(integrationId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: t('settings.error'),
          description: t('settings.integrationsPage.loginRequired'),
          variant: "destructive"
        });
        setSyncing(null);
        return;
      }

      const { data, error } = await supabase.functions.invoke('shopify-sync-products', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: { integration_id: integrationId }
      });
      
      if (error || data?.error) {
        throw new Error(data?.error || error?.message);
      }

      toast({
        title: `✅ ${t('settings.integrationsPage.syncStarted')}`,
        description: t('settings.integrationsPage.syncStartedDesc')
      });
    } catch (error: any) {
      toast({
        title: t('settings.error'),
        description: error.message || t('settings.integrationsPage.syncError'),
        variant: "destructive"
      });
    } finally {
      setSyncing(null);
    }
  };

  const facebookIntegrations = integrations.filter(i => i.integration_type === 'facebook_ads');
  const shopifyIntegrations = integrations.filter(i => i.integration_type === 'shopify');
  const activeIntegrations = integrations.length;

  const getStatus = (integration: Integration | undefined) => {
    if (!integration) return 'disconnected';
    if (integration.expires_at && new Date(integration.expires_at) < new Date()) {
      return 'expired';
    }
    return 'connected';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 px-2 py-1">
            <CheckCircle2 className="w-3 h-3 mr-1.5" />
            <span className="text-xs sm:text-sm">{t('settings.integrationsPage.connected')}</span>
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="destructive" className="px-2 py-1">
            <AlertCircle className="w-3 h-3 mr-1.5" />
            <span className="text-xs sm:text-sm">{t('settings.integrationsPage.expired')}</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="px-2 py-1">
            <span className="text-xs sm:text-sm">{t('settings.integrationsPage.disconnected')}</span>
          </Badge>
        );
    }
  };

  if (loading) {
    return <LoadingOverlay message={t('settings.loading')} />;
  }

  return (
    <PageLayout
      title={t('settings.integrationsPage.title')}
      subtitle={t('settings.integrationsPage.subtitle')}
    >
            {/* Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card3D intensity="high" glow className="p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-primary opacity-10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <h2 className="text-xl sm:text-2xl font-bold mb-3">{t('settings.integrationsPage.summary')}</h2>
                  <p className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text">
                    {activeIntegrations} {activeIntegrations === 1 ? t('settings.integrationsPage.activeIntegrations') : t('settings.integrationsPage.activeIntegrationsPlural')}
                  </p>
                </div>
              </Card3D>
            </motion.div>

            {/* Integration Cards */}
            <div className="space-y-4 sm:space-y-6">
              {/* Facebook Ads */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card3D intensity="medium" glow className="p-5 sm:p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#1877F2]/10 rounded-full blur-3xl" />
                  <div className="relative z-10">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-4 flex-1">
                        <motion.div 
                          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-[#1877F2] flex items-center justify-center shadow-lg flex-shrink-0"
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                        </motion.div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold">{t('settings.integrationsPage.facebookAdsTitle')}</h3>
                          <p className="text-sm text-muted-foreground">{t('settings.integrationsPage.facebookAdsDesc')}</p>
                        </div>
                      </div>
                      <Button3D
                        variant="gradient"
                        size="sm"
                        onClick={handleConnectFacebook}
                        disabled={connectingFacebook}
                        glow
                        className="w-full sm:w-auto"
                      >
                        {connectingFacebook ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t('settings.integrationsPage.connecting')}
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            {t('settings.integrationsPage.connectFacebook')}
                          </>
                        )}
                      </Button3D>
                    </div>

                  {facebookIntegrations.length === 0 ? null : (
                    <div className="space-y-3 sm:space-y-4">
                      {facebookIntegrations.map((fb, index) => (
                        <motion.div
                          key={fb.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card3D intensity="low" className="p-4 sm:p-5">
                            <div className="space-y-3 sm:space-y-4">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-base sm:text-lg mb-1">
                                    {fb.metadata?.primary_account_name || 'Facebook Ads Account'}
                                  </h4>
                                  {fb.metadata?.ad_accounts && (
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                      {fb.metadata.ad_accounts.length} {fb.metadata.ad_accounts.length === 1 ? 'conta' : 'contas'} de anúncios
                                    </p>
                                  )}
                                </div>
                                <div className="flex-shrink-0">
                                  {getStatusBadge(getStatus(fb))}
                                </div>
                              </div>
                              
                              <div className="flex justify-between text-xs sm:text-sm py-2 border-t border-border/30">
                                <span className="text-muted-foreground">{t('settings.integrationsPage.connectedOn')}</span>
                                <span>{new Date(fb.connected_at).toLocaleDateString('pt-PT')}</span>
                              </div>
                              
                              {fb.expires_at && (
                                <div className="flex justify-between text-xs sm:text-sm py-2 border-t border-border/30">
                                  <span className="text-muted-foreground">{t('settings.integrationsPage.expiresOn')}</span>
                                  <span>{new Date(fb.expires_at).toLocaleDateString('pt-PT')}</span>
                                </div>
                              )}

                              <Button3D
                                variant="glass"
                                size="sm"
                                className="w-full"
                                onClick={() => setDisconnectDialog({type: 'facebook', id: fb.id})}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t('settings.integrationsPage.disconnect')}
                              </Button3D>
                            </div>
                          </Card3D>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </Card3D>
              </motion.div>

              {/* Shopify Stores */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="space-y-4 sm:space-y-6"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <motion.div 
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#96BF48] flex items-center justify-center shadow-lg flex-shrink-0"
                      whileHover={{ scale: 1.1, rotate: -5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </motion.div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold">{t('settings.integrationsPage.shopifyTitle')}</h2>
                      {usageData && (
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {usageData.storesUsed}/{usageData.storesLimit} {t('settings.integrationsPage.storesUsage')}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button3D
                    variant="gradient"
                    size="sm"
                    onClick={handleConnectShopify}
                    disabled={usageData && usageData.storesUsed >= usageData.storesLimit}
                    glow
                    className="w-full sm:w-auto"
                  >
                    {usageData && usageData.storesUsed >= usageData.storesLimit ? (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        {t('subscription.storeLimitReached')}
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        {t('settings.integrationsPage.addStore')}
                      </>
                    )}
                  </Button3D>
                </div>

                {shopifyIntegrations.length === 0 ? (
                  <Card3D intensity="low" className="p-6 sm:p-8 border-dashed text-center">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <ShoppingBag className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-sm sm:text-base text-muted-foreground mb-4">{t('settings.integrationsPage.noStores')}</p>
                      <Button3D 
                        variant="gradient" 
                        size="md"
                        onClick={handleConnectShopify}
                        disabled={usageData && usageData.storesUsed >= usageData.storesLimit}
                        glow
                        className="w-full sm:w-auto"
                      >
                        {usageData && usageData.storesUsed >= usageData.storesLimit ? (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            {t('subscription.upgradeRequired')}
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            {t('settings.integrationsPage.connectFirstStore')}
                          </>
                        )}
                      </Button3D>
                    </motion.div>
                  </Card3D>
                ) : (
                  <div className="grid gap-4 sm:gap-5">
                    {shopifyIntegrations.map((shop, index) => (
                      <motion.div
                        key={shop.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card3D intensity="medium" glow className="p-5 sm:p-6 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-[#96BF48]/10 rounded-full blur-3xl" />
                          <div className="relative z-10">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <motion.div 
                                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-[#96BF48] flex items-center justify-center shadow-lg flex-shrink-0"
                                  whileHover={{ scale: 1.1, rotate: -5 }}
                                  transition={{ type: "spring", stiffness: 300 }}
                                >
                                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.73c-.018-.116-.114-.192-.211-.192s-1.332-.134-1.332-.134-1.057-1.027-1.17-1.139c-.114-.112-.251-.078-.327-.058-.077.019-1.407.515-1.407.515s-.58-.618-1.314-1.293c-.734-.675-1.369-1.104-2.125-1.104-.756 0-1.59.755-2.267 1.521-.678.766-1.332 1.639-1.332 1.639l-2.125.666s-.619.172-.766.461c-.147.288-.251.634-.251.634L.745 22.374l14.592 1.605zm-4.653-19.086c-.154.019-.308.038-.462.058 0-.134-.019-.327-.077-.538-.231-.866-.848-1.293-1.467-1.293-.077 0-.154.019-.231.038-.058-1.122-.676-1.679-1.254-1.679-.733 0-1.428.692-1.948 1.755-.366.751-.636 1.697-.733 2.41-.827.25-1.409.423-1.467.442-.462.135-.481.154-.539.577-.038.327-1.061 8.166-1.061 8.166l7.423 1.447c0-.019 1.909-9.783 1.816-9.383zm-2.392-1.368c-.058 1.465-.463 2.872-.925 3.816-.385-.789-.656-1.735-.656-2.756 0-.27.019-.52.058-.789.231-.058.463-.096.694-.135.193-.039.387-.077.58-.096.154-.019.308-.019.444-.019.019.25.019.5-.195.979zm-.827-2.314c.077 0 .154.019.231.058-.077.116-.154.25-.231.404-.385.616-.733 1.485-.79 2.545-.251.058-.5.116-.752.173 0-.019.019-.019.019-.038.232-1.332.925-2.872 1.523-3.142z"/>
                                  </svg>
                                </motion.div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-base sm:text-lg font-bold truncate">{shop.metadata?.shop_name || shop.metadata?.shop_domain || `Loja ${shop.id.slice(0, 8)}`}</h3>
                                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{shop.metadata?.shop_domain}</p>
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                {getStatusBadge(getStatus(shop))}
                              </div>
                            </div>

                            <div className="space-y-3 text-xs sm:text-sm mb-4">
                              <div className="flex justify-between py-2 border-b border-border/50">
                                <span className="text-muted-foreground">{t('settings.integrationsPage.connectedOn')}</span>
                                <span>{new Date(shop.connected_at).toLocaleDateString('pt-PT')}</span>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button3D
                                variant="glass"
                                size="sm"
                                className="flex-1"
                                onClick={() => handleSyncShopify(shop.id)}
                                disabled={syncing === shop.id}
                              >
                                <RefreshCw className={`w-4 h-4 mr-2 ${syncing === shop.id ? 'animate-spin' : ''}`} />
                                {syncing === shop.id ? t('settings.integrationsPage.syncing') : t('settings.integrationsPage.sync')}
                              </Button3D>
                              <Button3D
                                variant="glass"
                                size="sm"
                                className="sm:w-auto"
                                onClick={() => setDisconnectDialog({type: 'shopify', id: shop.id})}
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="sm:hidden ml-2">{t('settings.integrationsPage.disconnect')}</span>
                              </Button3D>
                            </div>
                          </div>
                        </Card3D>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

      {/* Shopify Connection Dialog */}
      <Dialog open={showShopifyDialog} onOpenChange={setShowShopifyDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-md border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#96BF48] flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              {t('settings.shopifyDialog.title')}
            </DialogTitle>
            <DialogDescription>
              {t('settings.shopifyDialog.instructions')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Step-by-step instructions */}
            <Card3D intensity="low" className="p-4 sm:p-5 md:p-6">
              <h3 className="font-semibold text-primary flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {t('settings.shopifyDialog.instructions')}
              </h3>
              
              <ol className="space-y-3 text-sm">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">1</span>
                  <span>{t('settings.shopifyDialog.step1')}</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">2</span>
                  <span>{t('settings.shopifyDialog.step2')}</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">3</span>
                  <span>{t('settings.shopifyDialog.step3')}</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">4</span>
                  <span>{t('settings.shopifyDialog.step4')}</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">5</span>
                  <div className="flex-1">
                    <div className="mb-2">{t('settings.shopifyDialog.step5')}</div>
                    <ul className="space-y-2 ml-4">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">read_products</code>
                          <Badge className="ml-2 bg-green-500/20 text-green-500 border-green-500/30 text-xs">{t('settings.shopifyDialog.required')}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">{t('settings.shopifyDialog.scope1')}</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">read_inventory</code>
                          <Badge className="ml-2 bg-green-500/20 text-green-500 border-green-500/30 text-xs">{t('settings.shopifyDialog.required')}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">{t('settings.shopifyDialog.scope2')}</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">read_orders</code>
                          <Badge className="ml-2 bg-green-500/20 text-green-500 border-green-500/30 text-xs">{t('settings.shopifyDialog.required')}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">{t('settings.shopifyDialog.scope3')}</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">write_products</code>
                          <Badge variant="secondary" className="ml-2 text-xs">{t('settings.shopifyDialog.optional')}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">{t('settings.shopifyDialog.scope4')}</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">6</span>
                  <span>{t('settings.shopifyDialog.step6')}</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">7</span>
                  <span>{t('settings.shopifyDialog.step7')}</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">8</span>
                  <span className="font-semibold text-primary">{t('settings.shopifyDialog.step8')}</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">9</span>
                  <span>{t('settings.shopifyDialog.step9')}</span>
                </li>
              </ol>

              <div className="flex gap-2 mt-4">
                <Button3D 
                  variant="glass"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open('https://admin.shopify.com/settings/apps/development', '_blank');
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t('settings.shopifyDialog.openAdmin')}
                </Button3D>
              </div>
            </Card3D>

            {/* Important notes */}
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-semibold text-yellow-500">{t('settings.shopifyDialog.importantNote')}</span>
                    <p className="text-muted-foreground mt-1">{t('settings.shopifyDialog.noteText')}</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-semibold text-destructive">{t('settings.shopifyDialog.securityNote')}</span>
                    <p className="text-muted-foreground mt-1">{t('settings.shopifyDialog.securityText')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form inputs */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              <div>
                <Label htmlFor="store-name" className="text-base">{t('settings.shopifyDialog.storeName')}</Label>
                <Input
                  id="store-name"
                  placeholder={t('settings.shopifyDialog.storeNamePlaceholder')}
                  value={shopifyStoreName}
                  onChange={(e) => setShopifyStoreName(e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {t('settings.shopifyDialog.storeNameHelp')}
                </p>
              </div>

              <div>
                <Label htmlFor="access-token" className="text-base">{t('settings.shopifyDialog.accessToken')}</Label>
                <Input
                  id="access-token"
                  type="password"
                  placeholder={t('settings.shopifyDialog.accessTokenPlaceholder')}
                  value={shopifyAccessToken}
                  onChange={(e) => setShopifyAccessToken(e.target.value)}
                  className="mt-2 font-mono"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {t('settings.shopifyDialog.accessTokenHelp')}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button3D variant="glass" onClick={() => setShowShopifyDialog(false)}>
              {t('settings.shopifyDialog.cancel')}
            </Button3D>
            <Button3D 
              variant="gradient" 
              onClick={handleShopifySubmit} 
              disabled={connectingShopify}
              glow
            >
              {connectingShopify ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('settings.shopifyDialog.connecting')}
                </>
              ) : (
                t('settings.shopifyDialog.connect')
              )}
            </Button3D>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={!!disconnectDialog} onOpenChange={(open) => !open && setDisconnectDialog(null)}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.integrationsPage.disconnectConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {disconnectDialog?.type === 'facebook' 
                ? t('settings.integrationsPage.disconnectFacebookConfirm')
                : t('settings.integrationsPage.disconnectShopifyConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('settings.shopifyDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (disconnectDialog?.type === 'facebook' && disconnectDialog?.id) {
                  handleDisconnectFacebook(disconnectDialog.id);
                } else if (disconnectDialog?.type === 'shopify' && disconnectDialog?.id) {
                  handleDisconnectShopify(disconnectDialog.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('settings.integrationsPage.disconnect')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Upsell Modal */}
      <UpsellModal
        open={showUpsellModal}
        onOpenChange={setShowUpsellModal}
        type="store"
        current={usageData?.storesUsed}
        limit={usageData?.storesLimit}
      />
    </PageLayout>
  );
}

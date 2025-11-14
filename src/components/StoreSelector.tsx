import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Store } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface StoreSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

interface Integration {
  id: string;
  integration_type: string;
  metadata: any;
}

export function StoreSelector({ value, onChange }: StoreSelectorProps) {
  const { t } = useLanguage();
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  useEffect(() => {
    fetchIntegrations();
    
    // Subscribe to changes in integrations table
    const channel = supabase
      .channel('store-selector-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'integrations',
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

  const fetchIntegrations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('integration_type', 'shopify');

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    }
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[250px] h-10 bg-card border-primary/20">
        <Store className="w-4 h-4 mr-2" />
        <SelectValue placeholder={t('storeSelector.selectStore')} />
      </SelectTrigger>
      <SelectContent className="z-50 bg-card border-border">
        <SelectItem value="all">{t('storeSelector.allStores')}</SelectItem>
        {integrations.map((integration) => (
          <SelectItem key={integration.id} value={integration.id}>
            {integration.metadata?.shop_name || integration.metadata?.shop_domain || `Loja ${integration.id.slice(0, 8)}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

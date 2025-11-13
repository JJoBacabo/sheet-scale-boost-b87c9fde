import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currencies } from "@/contexts/CurrencyContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface StoreCurrencySelectorProps {
  integrationId: string;
  currentCurrency?: string;
  onUpdate?: () => void;
}

export function StoreCurrencySelector({ 
  integrationId, 
  currentCurrency = 'EUR',
  onUpdate 
}: StoreCurrencySelectorProps) {
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);

  const handleCurrencyChange = async (currencyCode: string) => {
    setUpdating(true);
    try {
      // Fetch current integration
      const { data: integration, error: fetchError } = await supabase
        .from('integrations')
        .select('metadata')
        .eq('id', integrationId)
        .single();

      if (fetchError) throw fetchError;

      // Update metadata with new currency
      const currentMetadata = (integration?.metadata || {}) as Record<string, any>;
      const updatedMetadata = {
        ...currentMetadata,
        store_currency: currencyCode
      };

      const { error: updateError } = await supabase
        .from('integrations')
        .update({ metadata: updatedMetadata })
        .eq('id', integrationId);

      if (updateError) throw updateError;

      toast({
        title: 'Moeda atualizada',
        description: `Moeda da loja atualizada para ${currencyCode}`,
      });

      onUpdate?.();
    } catch (error: any) {
      console.error('Error updating store currency:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a moeda da loja',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
        Moeda:
      </span>
      <Select 
        value={currentCurrency} 
        onValueChange={handleCurrencyChange}
        disabled={updating}
      >
        <SelectTrigger className="w-[100px] h-8 text-xs sm:text-sm bg-card border-primary/20">
          {updating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <SelectValue />
          )}
        </SelectTrigger>
        <SelectContent className="z-50 bg-card border-border max-h-[200px]">
          {currencies.map((currency) => (
            <SelectItem key={currency.code} value={currency.code} className="text-xs sm:text-sm">
              {currency.code} ({currency.symbol})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sheet, RefreshCw, ExternalLink, Plus, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface GoogleSheetSyncProps {
  userId: string;
}

interface SyncLog {
  id: string;
  sheet_id: string;
  sheet_name: string;
  sync_status: string;
  products_updated: number;
  products_created: number;
  last_sync_at: string;
  error_message: string | null;
}

export const GoogleSheetSync = ({ userId }: GoogleSheetSyncProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [sheetId, setSheetId] = useState("");
  const [sheetName, setSheetName] = useState("Cotação");
  const [syncing, setSyncing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);

  useEffect(() => {
    loadLastSync();
  }, [userId]);

  const loadLastSync = async () => {
    const { data } = await supabase
      .from("sheets_sync_log")
      .select("*")
      .eq("user_id", userId)
      .order("last_sync_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setLastSync(data);
      setSheetId(data.sheet_id || "");
      setSheetName(data.sheet_name || "Cotação");
    }
  };

  const handleCreateSheet = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-google-sheet-products", {
        body: {
          action: "create",
          sheetName: sheetName || "Cotação",
        },
      });

      if (error) throw error;

      if (data.success) {
        setSheetId(data.sheetId);
        toast({
          title: "✅ Google Sheet criada",
          description: `Sheet criada com ${data.productsExported} produtos. Pode agora partilhar com outras pessoas.`,
          duration: 8000,
        });

        // Refresh sync log
        await loadLastSync();

        // Open sheet in new tab
        window.open(data.sheetUrl, "_blank");
      }
    } catch (error: any) {
      toast({
        title: "Erro ao criar Sheet",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSyncFromSheet = async () => {
    if (!sheetId.trim()) {
      toast({
        title: "ID da Sheet necessário",
        description: "Por favor, cole o ID ou URL da Google Sheet",
        variant: "destructive",
      });
      return;
    }

    setSyncing(true);
    try {
      // Extract sheet ID from URL if full URL was provided
      let cleanSheetId = sheetId.trim();
      if (cleanSheetId.includes("spreadsheets/d/")) {
        const match = cleanSheetId.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
          cleanSheetId = match[1];
        }
      }

      const { data, error } = await supabase.functions.invoke("sync-google-sheet-products", {
        body: {
          action: "sync",
          sheetId: cleanSheetId,
          sheetName: sheetName || "Cotação",
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "✅ Sincronização completa",
          description: `${data.productsUpdated} produtos atualizados de ${data.totalRows} linhas.`,
          duration: 5000,
        });

        // Refresh sync log
        await loadLastSync();
      }
    } catch (error: any) {
      toast({
        title: "Erro na sincronização",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const openSheet = () => {
    if (sheetId) {
      window.open(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`, "_blank");
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Sheet className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Sincronização Google Sheets</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Crie ou conecte uma Google Sheet para permitir que outras pessoas editem as cotações dos
        produtos. As alterações serão sincronizadas automaticamente com o site.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-2 block">Nome da Sheet</label>
          <Input
            value={sheetName}
            onChange={(e) => setSheetName(e.target.value)}
            placeholder="Cotação"
            disabled={syncing || creating}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">ID ou URL da Google Sheet</label>
          <Input
            value={sheetId}
            onChange={(e) => setSheetId(e.target.value)}
            placeholder="Cole o ID ou URL da Google Sheet aqui"
            disabled={syncing || creating}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Exemplo: https://docs.google.com/spreadsheets/d/
            <span className="text-primary font-mono">1ABC...</span>/edit
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleCreateSheet} disabled={creating || syncing} className="gap-2">
          <Plus className="w-4 h-4" />
          {creating ? "Criando..." : "Criar Nova Sheet"}
        </Button>

        <Button
          onClick={handleSyncFromSheet}
          disabled={!sheetId || syncing || creating}
          variant="secondary"
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando..." : "Sincronizar Cotações"}
        </Button>

        {sheetId && (
          <Button onClick={openSheet} variant="outline" className="gap-2">
            <ExternalLink className="w-4 h-4" />
            Abrir Sheet
          </Button>
        )}
      </div>

      {lastSync && (
        <div className="pt-4 border-t space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Última sincronização:</span>
            <span className="font-medium">
              {format(new Date(lastSync.last_sync_at), "dd/MM/yyyy HH:mm")}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estado:</span>
            <Badge
              variant={
                lastSync.sync_status === "success"
                  ? "default"
                  : lastSync.sync_status === "partial_success"
                  ? "secondary"
                  : "destructive"
              }
            >
              {lastSync.sync_status === "success" && <Check className="w-3 h-3 mr-1" />}
              {lastSync.sync_status === "partial_success" && "⚠️"}
              {lastSync.sync_status === "error" && <X className="w-3 h-3 mr-1" />}
              {lastSync.sync_status === "success"
                ? "Sucesso"
                : lastSync.sync_status === "partial_success"
                ? "Sucesso parcial"
                : "Erro"}
            </Badge>
          </div>

          {lastSync.products_updated > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Produtos atualizados:</span>
              <span className="font-medium">{lastSync.products_updated}</span>
            </div>
          )}

          {lastSync.products_created > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Produtos criados:</span>
              <span className="font-medium">{lastSync.products_created}</span>
            </div>
          )}

          {lastSync.error_message && (
            <div className="text-sm">
              <span className="text-destructive font-medium">Erro: </span>
              <span className="text-muted-foreground">{lastSync.error_message}</span>
            </div>
          )}
        </div>
      )}

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground">
          <strong>Como funciona:</strong>
          <br />
          1. Crie uma nova Sheet ou conecte uma existente
          <br />
          2. A Sheet terá duas colunas: Nome do Produto e Cotação
          <br />
          3. Partilhe a Sheet com outras pessoas (permissões de edição)
          <br />
          4. Quando alguém alterar a cotação, clique em "Sincronizar" para atualizar os preços
          <br />
          5. As alterações serão aplicadas aos produtos correspondentes
        </p>
      </div>
    </Card>
  );
};

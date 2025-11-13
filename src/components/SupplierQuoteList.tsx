import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Trash2, Loader2 } from "lucide-react";
import { QuoteStatusBadge } from "./QuoteStatusBadge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Session {
  id: string;
  token: string;
  supplier_name: string;
  supplier_email: string | null;
  is_active: boolean;
  created_at: string;
}

interface Quote {
  product_id: string;
  quoted_price: number | null;
  product_name: string;
}

interface SupplierQuoteListProps {
  userId: string;
  refreshTrigger: number;
}

export const SupplierQuoteList = ({ userId, refreshTrigger }: SupplierQuoteListProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [quotesMap, setQuotesMap] = useState<Record<string, Quote[]>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, [userId, refreshTrigger]);

  const loadSessions = async () => {
    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("supplier_quote_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (sessionsError) throw sessionsError;

      setSessions(sessionsData || []);

      // Load quotes for each session
      if (sessionsData && sessionsData.length > 0) {
        const sessionIds = sessionsData.map((s) => s.id);
        
        const { data: quotesData, error: quotesError } = await supabase
          .from("supplier_quotes")
          .select(`
            session_id,
            product_id,
            quoted_price,
            products!inner(product_name)
          `)
          .in("session_id", sessionIds);

        if (quotesError) throw quotesError;

        // Group quotes by session
        const grouped: Record<string, Quote[]> = {};
        quotesData?.forEach((quote: any) => {
          if (!grouped[quote.session_id]) {
            grouped[quote.session_id] = [];
          }
          grouped[quote.session_id].push({
            product_id: quote.product_id,
            quoted_price: quote.quoted_price,
            product_name: quote.products.product_name,
          });
        });

        setQuotesMap(grouped);
      }
    } catch (error: any) {
      console.error("Error loading sessions:", error);
      toast({
        title: t("common.error"),
        description: "Failed to load quotation sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getQuoteStatus = (sessionId: string) => {
    const quotes = quotesMap[sessionId] || [];
    const totalQuotes = quotes.length;
    const completedQuotes = quotes.filter((q) => q.quoted_price !== null).length;

    return {
      total: totalQuotes,
      completed: completedQuotes,
      percentage: totalQuotes > 0 ? Math.round((completedQuotes / totalQuotes) * 100) : 0,
    };
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;

    try {
      const { error } = await supabase
        .from("supplier_quote_sessions")
        .delete()
        .eq("id", sessionToDelete);

      if (error) throw error;

      toast({
        title: t("common.success"),
        description: "Session deleted successfully",
      });

      loadSessions();
    } catch (error: any) {
      console.error("Error deleting session:", error);
      toast({
        title: t("common.error"),
        description: "Failed to delete session",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    }
  };

  const confirmDelete = (sessionId: string) => {
    setSessionToDelete(sessionId);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">{t("supplierQuotes.noSessions")}</p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {sessions.map((session) => {
          const status = getQuoteStatus(session.id);
          const link = `${window.location.origin}/supplier-quote/${session.token}`;

          return (
            <Card key={session.id} className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">
                      {session.supplier_name}
                    </h3>
                    {!session.is_active && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  
                  {session.supplier_email && (
                    <p className="text-sm text-muted-foreground">
                      {session.supplier_email}
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <QuoteStatusBadge
                      completed={status.completed}
                      total={status.total}
                      percentage={status.percentage}
                    />
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Created: {new Date(session.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(link, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t("supplierQuotes.openLink")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => confirmDelete(session.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("supplierQuotes.deleteSessionConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSession}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

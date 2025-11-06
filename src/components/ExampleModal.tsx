import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog-custom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, AlertTriangle } from "lucide-react";

export function ExampleModal() {
  const [campaignName, setCampaignName] = useState("");

  return (
    <div className="flex gap-4 flex-wrap">
      {/* Dialog Example */}
      <Dialog>
        <DialogTrigger asChild>
          <button className="btn-gradient px-6 py-3 rounded-xl font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Nova Campanha
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              Criar Nova Campanha
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Configure os detalhes da sua campanha de Facebook Ads. Todos os campos são obrigatórios.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-3">
              <Label htmlFor="name" className="text-base font-semibold">
                Nome da Campanha
              </Label>
              <Input
                id="name"
                placeholder="Ex: Summer Sale 2025"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="glass-card border-primary/20 focus:border-primary h-12"
              />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="budget" className="text-base font-semibold">
                Budget Diário
              </Label>
              <Input
                id="budget"
                type="number"
                placeholder="€50.00"
                className="glass-card border-primary/20 focus:border-primary h-12"
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <button className="btn-glass px-6 py-3 rounded-lg font-semibold">
              Cancelar
            </button>
            <button className="btn-gradient px-6 py-3 rounded-lg font-semibold">
              Criar Campanha
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Example */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="btn-glass px-6 py-3 rounded-xl font-semibold flex items-center gap-2 border-destructive/30 hover:border-destructive/50">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Deletar Campanha
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center border border-destructive/30">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              Tem certeza?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A campanha "Summer Sale 2025" será permanentemente deletada do
              sistema, incluindo todas as métricas e histórico associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

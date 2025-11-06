import { LoadingSpinner, LoadingOverlay } from "@/components/ui/loading-spinner";
import { Skeleton, SkeletonCard, SkeletonTable, SkeletonText } from "@/components/ui/skeleton-loader";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LoadingStatesDemo() {
  const [showOverlay, setShowOverlay] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Loading States</h2>
        <p className="text-muted-foreground mb-6">
          Exemplos de spinners, skeleton loaders e overlays
        </p>
      </div>

      {/* Spinners */}
      <Card className="p-6 glass-card">
        <h3 className="text-xl font-semibold mb-4">Spinners</h3>
        <div className="flex items-center gap-8 flex-wrap">
          <div className="flex flex-col items-center gap-2">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-muted-foreground">Small</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <LoadingSpinner size="md" />
            <span className="text-sm text-muted-foreground">Medium</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <LoadingSpinner size="lg" />
            <span className="text-sm text-muted-foreground">Large</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <LoadingSpinner size="xl" />
            <span className="text-sm text-muted-foreground">Extra Large</span>
          </div>
        </div>
      </Card>

      {/* Skeleton Loaders */}
      <Card className="p-6 glass-card">
        <h3 className="text-xl font-semibold mb-6">Skeleton Loaders</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-semibold mb-3 text-muted-foreground">Card Skeleton</p>
            <SkeletonCard />
          </div>
          <div>
            <p className="text-sm font-semibold mb-3 text-muted-foreground">Text Skeleton</p>
            <div className="glass-card p-6 rounded-xl border border-border/50">
              <Skeleton className="h-6 w-48 mb-4" />
              <SkeletonText lines={4} />
            </div>
          </div>
        </div>
        <div className="mt-6">
          <p className="text-sm font-semibold mb-3 text-muted-foreground">Table Skeleton</p>
          <SkeletonTable />
        </div>
      </Card>

      {/* Loading Overlay */}
      <Card className="p-6 glass-card">
        <h3 className="text-xl font-semibold mb-4">Loading Overlay</h3>
        <Button 
          onClick={() => {
            setShowOverlay(true);
            setTimeout(() => setShowOverlay(false), 3000);
          }}
          className="btn-gradient"
        >
          Mostrar Overlay (3 segundos)
        </Button>
        
        {showOverlay && <LoadingOverlay message="Processando dados..." />}
      </Card>
    </div>
  );
}

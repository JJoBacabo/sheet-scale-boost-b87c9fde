/**
 * Exemplo de uso dos componentes 3D
 * 
 * Para usar componentes 3D completos (React Three Fiber):
 * npm install @react-three/fiber @react-three/drei three framer-motion
 * 
 * Para usar apenas efeitos 3D leves (CSS + Framer Motion):
 * npm install framer-motion
 */

import { Card3D } from '@/components/ui/Card3D';
import { Button3D } from '@/components/ui/Button3D';
import { Background3D } from '@/components/ui/Background3D';
import { TrendingUp, DollarSign, Users, Zap } from 'lucide-react';

export const Example3DUsage = () => {
  return (
    <div className="min-h-screen p-8 relative">
      {/* Background 3D animado */}
      <Background3D />
      
      <div className="relative z-10 space-y-8">
        <h1 className="text-4xl font-bold gradient-text mb-8">
          Exemplo de Design Futurista 3D
        </h1>

        {/* Cards 3D com diferentes intensidades */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card3D intensity="low" glow>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">$12,345</p>
              </div>
            </div>
          </Card3D>

          <Card3D intensity="medium" glow>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Growth</p>
                <p className="text-2xl font-bold">+23.5%</p>
              </div>
            </div>
          </Card3D>

          <Card3D intensity="high" glow>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Users</p>
                <p className="text-2xl font-bold">1,234</p>
              </div>
            </div>
          </Card3D>

          <Card3D intensity="medium" glow>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Performance</p>
                <p className="text-2xl font-bold">98%</p>
              </div>
            </div>
          </Card3D>
        </div>

        {/* Botões 3D */}
        <div className="flex gap-4 flex-wrap">
          <Button3D variant="gradient" size="lg" glow>
            Primary Action
          </Button3D>
          
          <Button3D variant="glass" size="lg" glow>
            Secondary Action
          </Button3D>
          
          <Button3D variant="default" size="md" glow>
            Default Button
          </Button3D>
        </div>

        {/* Card de conteúdo 3D */}
        <Card3D intensity="medium" glow className="p-8">
          <h2 className="text-2xl font-bold mb-4 gradient-text">
            Card com Efeito 3D
          </h2>
          <p className="text-muted-foreground mb-6">
            Este card tem efeito 3D ao passar o mouse. O efeito é suave e 
            adiciona profundidade visual sem ser intrusivo.
          </p>
          <Button3D variant="gradient">
            Explorar
          </Button3D>
        </Card3D>
      </div>
    </div>
  );
};


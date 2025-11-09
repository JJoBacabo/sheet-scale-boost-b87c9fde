import { useEffect } from 'react';

/**
 * Hook para implementar efeito de scroll cinematográfico usando GSAP + ScrollTrigger
 * 
 * Funcionalidade:
 * - Fixa a seção durante o scroll (sticky/pin)
 * - Mostra apenas uma feature por vez
 * - Transições suaves com fade (opacity) e translateY
 * - Detecta automaticamente quantos elementos .feature-item existem
 * - Calcula altura da animação baseado no número de features
 * - Não altera o layout ou HTML existente, apenas adiciona comportamento JS
 */
export const useCinematicScroll = (sectionId: string) => {
  useEffect(() => {
    // Verificar se GSAP e ScrollTrigger estão disponíveis (carregados via CDN)
    if (typeof window === 'undefined' || !(window as any).gsap || !(window as any).ScrollTrigger) {
      // Aguardar um pouco caso os scripts ainda estejam carregando
      const checkGSAP = setInterval(() => {
        if ((window as any).gsap && (window as any).ScrollTrigger) {
          clearInterval(checkGSAP);
          initCinematicScroll(sectionId);
        }
      }, 100);

      // Timeout após 5 segundos
      setTimeout(() => {
        clearInterval(checkGSAP);
        if (!(window as any).gsap || !(window as any).ScrollTrigger) {
          console.warn('GSAP or ScrollTrigger not loaded. Cinematic scroll effect disabled.');
        }
      }, 5000);

      return () => clearInterval(checkGSAP);
    } else {
      // GSAP já está disponível, inicializar imediatamente
      return initCinematicScroll(sectionId);
    }
  }, [sectionId]);
};

/**
 * Função que inicializa o efeito cinematográfico
 */
function initCinematicScroll(sectionId: string) {
  const gsap = (window as any).gsap;
  const ScrollTrigger = (window as any).ScrollTrigger;

  // Registrar o plugin ScrollTrigger
  gsap.registerPlugin(ScrollTrigger);

  // Aguardar DOM estar pronto
  const init = () => {
    // Encontrar a seção
    const section = document.getElementById(sectionId);
    if (!section) {
      console.warn(`Section with id "${sectionId}" not found.`);
      return;
    }

    // Encontrar o container de features
    const featuresContainer = section.querySelector('.features-container');
    if (!featuresContainer) {
      console.warn('Features container not found.');
      return;
    }

    // Encontrar todos os elementos de feature
    const featureElements = Array.from(
      featuresContainer.querySelectorAll('.feature-item')
    ) as HTMLElement[];

    if (featureElements.length === 0) {
      console.warn('No feature elements found.');
      return;
    }

    const featureCount = featureElements.length;
    const viewportHeight = window.innerHeight;

    // Calcular altura total da animação
    // Cada feature precisa de espaço suficiente para aparecer, ficar visível e desaparecer
    // Aumentamos para 3x para dar muito mais espaço entre transições e evitar sobreposição
    const scrollHeight = viewportHeight * featureCount * 3;

    // Configurar estado inicial: apenas primeira feature visível, outras completamente invisíveis
    featureElements.forEach((feature, index) => {
      if (index === 0) {
        // Primeira feature totalmente visível no centro
        gsap.set(feature, {
          opacity: 1,
          y: 0,
          scale: 1,
          pointerEvents: 'auto',
        });
      } else {
        // Outras features completamente invisíveis e desabilitadas
        gsap.set(feature, {
          opacity: 0,
          y: 0, // Todas na mesma posição (sobrepostas)
          scale: 1,
          pointerEvents: 'none',
        });
      }
    });

    // Criar timeline principal
    const masterTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top', // Quando o topo da seção atinge o topo da viewport
        end: `+=${scrollHeight}`, // Termina após scrollHeight pixels
        scrub: 0.5, // Sincronizar com scroll (0.5s para mais responsividade)
        pin: true, // Fixar a seção durante o scroll
        anticipatePin: 1,
        pinSpacing: true,
        markers: false, // Desativar marcadores de debug
        invalidateOnRefresh: true, // Recalcular em refresh
      },
    });

    // Animar cada feature individualmente - apenas uma totalmente visível por vez
    // Fluxo: Tópico → Fade out → Background preto → Fade in → Próximo tópico
    featureElements.forEach((feature, index) => {
      // Calcular progresso no timeline (0 a 1)
      // Gap maior para garantir período de background preto entre tópicos
      const gap = 0.2; // 20% de gap (período de background preto)
      const segmentSize = (1 - gap * (featureCount - 1)) / featureCount;
      
      // Calcular pontos de transição
      const progressStart = index * (segmentSize + gap); // Quando começa a aparecer (após gap)
      const progressVisible = progressStart + segmentSize * 0.4; // Quando está totalmente visível (40% do segmento)
      const progressFadeOut = progressStart + segmentSize * 0.6; // Quando começa a desaparecer (60% do segmento)
      const progressEnd = progressStart + segmentSize; // Quando desaparece completamente (100% do segmento, antes do gap)

      // FASE 1: Garantir que feature anterior desapareceu COMPLETAMENTE antes do gap
      if (index > 0) {
        const previousEnd = (index - 1) * (segmentSize + gap) + segmentSize;
        
        // Fade out completo da anterior - deve terminar ANTES do gap começar
        masterTimeline.to(
          featureElements[index - 1],
          {
            opacity: 0,
            pointerEvents: 'none',
            duration: 0.4,
            ease: 'power2.in',
          },
          previousEnd - 0.4 // Começa a desaparecer antes do fim
        );
        
        // Garantir invisível durante TODO o gap (background preto)
        masterTimeline.set(
          featureElements[index - 1],
          {
            opacity: 0,
            pointerEvents: 'none',
          },
          previousEnd // Início do gap
        );
        
        // Manter invisível durante todo o gap até esta começar
        masterTimeline.set(
          featureElements[index - 1],
          {
            opacity: 0,
            pointerEvents: 'none',
          },
          progressStart - 0.01 // Fim do gap, antes desta começar
        );
      }

      // FASE 2: Garantir que esta feature está invisível antes de começar (durante gap)
      masterTimeline.set(
        feature,
        {
          opacity: 0,
          pointerEvents: 'none',
        },
        progressStart - 0.01 // Durante o gap, antes de aparecer
      );

      // FASE 3: Fade in (entrada) - aparece APÓS o período de background preto
      masterTimeline.to(
        feature,
        {
          opacity: 1,
          y: 0,
          scale: 1,
          pointerEvents: 'auto',
          duration: 0.5,
          ease: 'power2.out',
        },
        progressStart
      )
        // Manter totalmente visível (plateau)
        .to(
          feature,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            pointerEvents: 'auto',
            duration: 0.2,
          },
          progressVisible
        )
        // FASE 4: Fade out (saída) - desaparece para mostrar background preto
        .to(
          feature,
          {
            opacity: 0,
            y: 0,
            scale: 1,
            pointerEvents: 'none',
            duration: 0.4,
            ease: 'power2.in',
          },
          progressFadeOut
        )
        // Garantir invisível no fim do segmento (antes do gap)
        .set(
          feature,
          {
            opacity: 0,
            pointerEvents: 'none',
          },
          progressEnd
        )
        // Manter invisível durante TODO o gap (background preto)
        .set(
          feature,
          {
            opacity: 0,
            pointerEvents: 'none',
          },
          progressStart + segmentSize + gap - 0.01 // Fim do gap
        );
    });

    // Cleanup function
    return () => {
      // Remover todos os ScrollTriggers relacionados a esta seção
      ScrollTrigger.getAll().forEach((trigger: any) => {
        if (trigger.trigger === section || trigger.vars?.trigger === section) {
          trigger.kill();
        }
      });
      
      // Limpar animações
      masterTimeline.kill();
    };
  };

  // Executar quando DOM estiver pronto e React renderizar
  // Aguardar mais tempo para garantir que React renderizou completamente
  const timeout = setTimeout(() => {
    // Tentar múltiplas vezes caso os elementos ainda não estejam prontos
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryInit = () => {
      const section = document.getElementById(sectionId);
      const container = section?.querySelector('.features-container');
      const items = container?.querySelectorAll('.feature-item');
      
      if (section && container && items && items.length > 0) {
        init();
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(tryInit, 200);
      } else {
        console.warn('Features section not ready after multiple attempts.');
      }
    };
    
    tryInit();
  }, 500);

  return () => {
    clearTimeout(timeout);
  };
}


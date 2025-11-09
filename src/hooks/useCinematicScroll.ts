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
    // Cada feature precisa de espaço para aparecer, ficar visível e desaparecer
    // Usamos viewport height multiplicado pelo número de features
    const scrollHeight = viewportHeight * featureCount * 1.5; // 1.5x para transições suaves

    // Configurar estado inicial: todas visíveis (remover animação que esconde)
    // Não vamos esconder as features, apenas animar a transição suave
    gsap.set(featureElements, {
      opacity: 1,
      y: 0,
    });

    // Criar timeline principal
    const masterTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top', // Quando o topo da seção atinge o topo da viewport
        end: `+=${scrollHeight}`, // Termina após scrollHeight pixels
        scrub: 1, // Sincronizar com scroll (1 segundo de delay para suavidade)
        pin: true, // Fixar a seção durante o scroll
        anticipatePin: 1,
        pinSpacing: true,
        markers: false, // Desativar marcadores de debug
      },
    });

    // Animar cada feature individualmente - efeito mais suave
    featureElements.forEach((feature, index) => {
      // Calcular progresso no timeline (0 a 1)
      const progressStart = index / featureCount; // Quando começa a aparecer
      const progressCenter = (index + 0.5) / featureCount; // Centro da animação
      const progressEnd = (index + 1) / featureCount; // Quando termina

      // Fade in suave (entrada)
      masterTimeline.fromTo(
        feature,
        {
          opacity: 0.3,
          y: 30,
          scale: 0.95,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.3,
          ease: 'power2.out',
        },
        progressStart
      )
        // Manter no centro (destaque)
        .to(
          feature,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.2,
          },
          progressCenter
        )
        // Fade out suave (saída) - mas não completamente invisível
        .to(
          feature,
          {
            opacity: 0.3,
            y: -30,
            scale: 0.95,
            duration: 0.3,
            ease: 'power2.in',
          },
          progressEnd
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


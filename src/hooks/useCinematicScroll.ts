import { useEffect } from 'react';

/**
 * Hook para implementar efeito de scroll horizontal usando GSAP + ScrollTrigger
 * 
 * Funcionalidade:
 * - Scroll horizontal através das features
 * - Fixa a seção durante o scroll (sticky/pin)
 * - Mostra uma feature por vez com transições suaves
 * - Detecta automaticamente quantos elementos .feature-item existem
 * - Calcula largura da animação baseado no número de features
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
 * Função que inicializa o scroll horizontal
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
    const viewportWidth = window.innerWidth;

    // Configurar layout horizontal
    // Container deve ter largura suficiente para todas as features lado a lado
    const containerWidth = viewportWidth * featureCount;
    gsap.set(featuresContainer, {
      width: `${containerWidth}px`,
      display: 'flex',
      flexDirection: 'row',
    });

    // Configurar estado inicial: features lado a lado
    featureElements.forEach((feature, index) => {
      gsap.set(feature, {
        x: index * viewportWidth, // Posicionar horizontalmente
        opacity: index === 0 ? 1 : 0, // Primeira visível, outras invisíveis
        width: `${viewportWidth}px`,
        flexShrink: 0,
        pointerEvents: index === 0 ? 'auto' : 'none',
      });
    });

    // Calcular scroll distance (vertical scroll = horizontal movement)
    const scrollDistance = viewportWidth * featureCount;

    // Criar animação horizontal
    const horizontalTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: `+=${scrollDistance}`,
        scrub: 1, // Sincronizar com scroll
        pin: true,
        anticipatePin: 1,
        pinSpacing: true,
        markers: false,
        invalidateOnRefresh: true,
      },
    });

    // Animar movimento horizontal - scroll vertical move container horizontalmente
    horizontalTimeline.to(
      featuresContainer,
      {
        x: -(featureCount - 1) * viewportWidth, // Mover até a última feature
        ease: 'none', // Movimento linear sincronizado com scroll
      },
      1 // Progresso completo (0 a 1)
    );

    // Animar fade de cada feature
    featureElements.forEach((feature, index) => {
      const progressStart = index / featureCount; // Quando começa a aparecer
      const progressCenter = (index + 0.5) / featureCount; // Quando está no centro
      const progressEnd = (index + 1) / featureCount; // Quando desaparece

      // Fade in quando entra no viewport
      horizontalTimeline.to(
        feature,
        {
          opacity: 1,
          pointerEvents: 'auto',
          duration: 0.2,
          ease: 'power2.out',
        },
        progressStart
      )
        // Manter visível no centro
        .to(
          feature,
          {
            opacity: 1,
            pointerEvents: 'auto',
            duration: 0.3,
          },
          progressCenter
        )
        // Fade out quando sai do viewport
        .to(
          feature,
          {
            opacity: 0,
            pointerEvents: 'none',
            duration: 0.2,
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
      horizontalTimeline.kill();
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


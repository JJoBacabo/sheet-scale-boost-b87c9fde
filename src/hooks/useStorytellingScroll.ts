import { useEffect } from 'react';

/**
 * Hook para implementar efeito de scroll storytelling/cinematográfico
 * 
 * Funcionalidade:
 * - Scroll vertical controla sequência de frases
 * - Cada frase aparece isolada no centro do ecrã
 * - Fade-in + translateY(40px → 0) na entrada
 * - Fade-out + translateY(0 → -40px) na saída
 * - Ecrã limpo entre frases
 * - Seção fixa durante scroll (pin)
 */
export const useStorytellingScroll = (sectionId: string) => {
  useEffect(() => {
    // Verificar se GSAP e ScrollTrigger estão disponíveis
    if (typeof window === 'undefined' || !(window as any).gsap || !(window as any).ScrollTrigger) {
      // Aguardar carregamento dos scripts
      const checkGSAP = setInterval(() => {
        if ((window as any).gsap && (window as any).ScrollTrigger) {
          clearInterval(checkGSAP);
          initStorytellingScroll(sectionId);
        }
      }, 100);

      // Timeout após 5 segundos
      setTimeout(() => {
        clearInterval(checkGSAP);
        if (!(window as any).gsap || !(window as any).ScrollTrigger) {
          console.warn('GSAP or ScrollTrigger not loaded. Storytelling scroll effect disabled.');
        }
      }, 5000);

      return () => clearInterval(checkGSAP);
    } else {
      // GSAP já está disponível, inicializar imediatamente
      return initStorytellingScroll(sectionId);
    }
  }, [sectionId]);
};

/**
 * Função que inicializa o scroll storytelling
 */
function initStorytellingScroll(sectionId: string) {
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

    // Encontrar todos os elementos de frase
    const phraseElements = Array.from(
      section.querySelectorAll('.storytelling-phrase')
    ) as HTMLElement[];

    if (phraseElements.length === 0) {
      console.warn('No storytelling phrases found.');
      return;
    }

    const phraseCount = phraseElements.length;
    const viewportHeight = window.innerHeight;
    
    // Calcular scroll distance: cada frase precisa de espaço suficiente
    // Cada frase ocupa ~100vh (entrada + visível + saída + gap)
    const scrollDistance = viewportHeight * phraseCount * 1.5; // 1.5x para dar mais espaço

    // Configurar estado inicial: todas invisíveis
    phraseElements.forEach((phrase, index) => {
      gsap.set(phrase, {
        opacity: 0,
        y: 40, // Começa 40px abaixo
        pointerEvents: 'none',
      });
    });

    // Criar timeline principal
    const masterTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: `+=${scrollDistance}`,
        scrub: 1, // Sincronizar com scroll (1 = suave)
        pin: true, // Fixar seção durante scroll
        anticipatePin: 1,
        pinSpacing: true,
        markers: false, // Mudar para true para debug
        invalidateOnRefresh: true,
      },
    });

    // Animar cada frase
    phraseElements.forEach((phrase, index) => {
      // Calcular progresso no timeline (0 a 1)
      // Cada frase ocupa uma parte igual do scroll total
      const segmentSize = 1 / phraseCount; // Tamanho de cada segmento (ex: 0.2 para 5 frases)
      const gap = 0.15; // Gap de 15% entre frases (ecrã limpo)
      const visibleSize = segmentSize - gap; // Tamanho visível da frase
      
      // Progresso no timeline
      const progressStart = index * segmentSize; // Início do segmento (ex: 0, 0.2, 0.4, 0.6, 0.8)
      const progressFadeInStart = progressStart + gap / 2; // Começa fade-in
      const progressVisible = progressStart + gap / 2 + visibleSize * 0.3; // Totalmente visível
      const progressFadeOutStart = progressStart + gap / 2 + visibleSize * 0.7; // Começa fade-out
      const progressEnd = progressStart + segmentSize; // Fim do segmento

      // Garantir invisível antes de começar
      masterTimeline.set(
        phrase,
        {
          opacity: 0,
          y: 40,
          pointerEvents: 'none',
        },
        progressStart
      );

      // Fade-in + translateY(40px → 0)
      masterTimeline.to(
        phrase,
        {
          opacity: 1,
          y: 0,
          duration: visibleSize * 0.3, // 30% do tamanho visível para fade-in
          ease: 'power2.out',
        },
        progressFadeInStart
      )
        // Manter totalmente visível no centro
        .to(
          phrase,
          {
            opacity: 1,
            y: 0,
            duration: visibleSize * 0.4, // 40% do tamanho visível mantém visível
          },
          progressVisible
        )
        // Fade-out + translateY(0 → -40px)
        .to(
          phrase,
          {
            opacity: 0,
            y: -40,
            duration: visibleSize * 0.3, // 30% do tamanho visível para fade-out
            ease: 'power2.in',
            pointerEvents: 'none',
          },
          progressFadeOutStart
        )
        // Garantir invisível durante gap (antes da próxima frase)
        .set(
          phrase,
          {
            opacity: 0,
            y: 40, // Reset para próxima animação
            pointerEvents: 'none',
          },
          progressEnd - 0.01
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

  // Executar quando DOM estiver pronto
  const timeout = setTimeout(() => {
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryInit = () => {
      const section = document.getElementById(sectionId);
      const phrases = section?.querySelectorAll('.storytelling-phrase');
      
      if (section && phrases && phrases.length > 0) {
        init();
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(tryInit, 200);
      } else {
        console.warn('Storytelling section not ready after multiple attempts.');
      }
    };
    
    tryInit();
  }, 500);

  return () => {
    clearTimeout(timeout);
  };
}


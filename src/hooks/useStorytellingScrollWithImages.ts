import { useEffect } from 'react';

/**
 * Hook para implementar efeito de scroll storytelling/cinematográfico com imagens
 * 
 * Funcionalidade:
 * - Scroll vertical controla sequência de tópicos
 * - Cada tópico ocupa 100vh
 * - Layout alternado: texto-imagem / imagem-texto
 * - Fade-in + translateY(40px → 0) na entrada
 * - Fade-out + translateY(0 → -40px) na saída
 * - Ecrã limpo entre tópicos
 * - Seção fixa durante scroll (pin)
 * - Detecta automaticamente quantos tópicos existem
 */
export const useStorytellingScrollWithImages = (sectionId: string) => {
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
 * Função que inicializa o scroll storytelling com imagens
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

    // Encontrar todos os elementos de tópico
    const topicElements = Array.from(
      section.querySelectorAll('.storytelling-topic')
    ) as HTMLElement[];

    if (topicElements.length === 0) {
      console.warn('No storytelling topics found.');
      return;
    }

    const topicCount = topicElements.length;
    const viewportHeight = window.innerHeight;
    
    // Calcular scroll distance: cada tópico ocupa 100vh
    // Scroll total = viewportHeight * topicCount (ex: 6 tópicos = 600vh)
    const scrollDistance = viewportHeight * topicCount;

    // Configurar estado inicial: todos invisíveis
    topicElements.forEach((topic, index) => {
      gsap.set(topic, {
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

    // Animar cada tópico
    topicElements.forEach((topic, index) => {
      // Calcular progresso no timeline (0 a 1)
      // Cada tópico ocupa uma parte igual do scroll total
      const segmentSize = 1 / topicCount; // Tamanho de cada segmento (ex: 0.166 para 6 tópicos)
      const gap = 0.1; // Gap de 10% entre tópicos (ecrã limpo)
      const visibleSize = segmentSize - gap; // Tamanho visível do tópico
      
      // Progresso no timeline
      const progressStart = index * segmentSize; // Início do segmento
      const progressFadeInStart = progressStart + gap / 2; // Começa fade-in
      const progressVisible = progressStart + gap / 2 + visibleSize * 0.3; // Totalmente visível
      const progressFadeOutStart = progressStart + gap / 2 + visibleSize * 0.7; // Começa fade-out
      const progressEnd = progressStart + segmentSize; // Fim do segmento

      // Garantir invisível antes de começar
      masterTimeline.set(
        topic,
        {
          opacity: 0,
          y: 40,
          pointerEvents: 'none',
        },
        progressStart
      );

      // Fade-in + translateY(40px → 0)
      masterTimeline.to(
        topic,
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
          topic,
          {
            opacity: 1,
            y: 0,
            duration: visibleSize * 0.4, // 40% do tamanho visível mantém visível
          },
          progressVisible
        )
        // Fade-out + translateY(0 → -40px)
        .to(
          topic,
          {
            opacity: 0,
            y: -40,
            duration: visibleSize * 0.3, // 30% do tamanho visível para fade-out
            ease: 'power2.in',
            pointerEvents: 'none',
          },
          progressFadeOutStart
        )
        // Garantir invisível durante gap (antes do próximo tópico)
        .set(
          topic,
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
      const topics = section?.querySelectorAll('.storytelling-topic');
      
      if (section && topics && topics.length > 0) {
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


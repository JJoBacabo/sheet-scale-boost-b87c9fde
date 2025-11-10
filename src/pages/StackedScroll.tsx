import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Background3D } from "@/components/ui/Background3D";

interface PanelData {
  id: string;
  title: string;
  description: string;
  buttonText: string;
  imagePosition: 'left' | 'right';
}

const panelsData: PanelData[] = [
  {
    id: 'automate',
    title: 'Automate. Simplify. Grow.',
    description: 'Manage operations faster with smart automation and real-time insights.',
    buttonText: 'Get Started',
    imagePosition: 'left'
  },
  {
    id: 'connect',
    title: 'Connect. Control. Scale.',
    description: 'Centralize tools, standardize workflows, keep everything in sync.',
    buttonText: 'Learn More',
    imagePosition: 'right'
  },
  {
    id: 'optimize',
    title: 'Optimize Efficiency.',
    description: 'Cut repetitive work. Focus on what drives revenue.',
    buttonText: 'Explore',
    imagePosition: 'left'
  },
  {
    id: 'reimagined',
    title: 'Your Workflow, Reimagined.',
    description: 'One place for data, actions and results.',
    buttonText: 'Start Now',
    imagePosition: 'right'
  }
];

const StackedScroll = () => {
  const [gsapLoaded, setGsapLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const stackRef = useRef<HTMLDivElement>(null);
  const stickyZoneRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const gsapRef = useRef<any>(null);
  const ScrollTriggerRef = useRef<any>(null);
  const scrollTriggersRef = useRef<any[]>([]);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 1024px)").matches);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load GSAP
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("gsap").then(gsapModule => {
        import("gsap/ScrollTrigger").then(ScrollTriggerModule => {
          const gsap = gsapModule.default;
          const ScrollTrigger = ScrollTriggerModule.default;
          gsap.registerPlugin(ScrollTrigger);
          gsapRef.current = gsap;
          ScrollTriggerRef.current = ScrollTrigger;
          setGsapLoaded(true);
        });
      });
    }
  }, []);

  // Setup GSAP animations
  useEffect(() => {
    if (!gsapLoaded || !gsapRef.current || !ScrollTriggerRef.current || !stackRef.current || !stickyZoneRef.current) return;

    const gsap = gsapRef.current;
    const ScrollTrigger = ScrollTriggerRef.current;
    let timeoutId: NodeJS.Timeout;
    let ctx: any;

    // Wait for DOM to be ready
    timeoutId = setTimeout(() => {
      ctx = gsap.context(() => {
        const panels = panelRefs.current.filter(Boolean) as HTMLElement[];
        if (panels.length === 0) return;

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (isMobile || prefersReducedMotion) {
          // Mobile/Reduced motion fallback: simple fade-up without pin
          panels.forEach((panel, index) => {
            const textRef = textRefs.current[index];
            const imageRef = imageRefs.current[index];
            
            if (!textRef || !imageRef) return;

            ScrollTrigger.create({
              trigger: panel,
              start: "top 80%",
              toggleActions: "play none none reverse",
              onEnter: () => {
                gsap.fromTo(textRef, 
                  { opacity: 0, y: 60 },
                  { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" }
                );
                gsap.fromTo(imageRef,
                  { opacity: 0, scale: 0.95 },
                  { opacity: 1, scale: 1, duration: 0.8, ease: "power3.out", delay: 0.2 }
                );
              }
            });
          });
        } else {
          // Desktop: Stacked scroll effect with single pinned wrapper
          
          // Set z-index for stacking order (first panel lowest, last highest)
          panels.forEach((panel, index) => {
            (panel as HTMLElement).style.zIndex = `${panels.length - index}`;
          });

          // Set initial state: first panel visible, others hidden/scaled
          panels.forEach((panel, i) => {
            const textRef = textRefs.current[i];
            const imageRef = imageRefs.current[i];

            if (i === 0) {
              // First panel: fully visible
              gsap.set(panel, { yPercent: 0, scale: 1, opacity: 1 });
              if (textRef) gsap.set(textRef, { y: 0, opacity: 1 });
              if (imageRef) gsap.set(imageRef, { y: 0, scale: 1, opacity: 1 });
            } else {
              // Other panels: start below, scaled, transparent
              gsap.set(panel, { yPercent: 20, scale: 0.96, opacity: 0 });
              if (textRef) gsap.set(textRef, { y: 60, opacity: 0 });
              if (imageRef) gsap.set(imageRef, { y: 30, scale: 0.95, opacity: 0 });
            }
          });

          // Create single timeline for stacked scroll
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: stackRef.current,
              start: "top top",
              end: () => `+=${panels.length * 120}%`,
              scrub: 1,
              pin: stickyZoneRef.current,
              pinSpacing: false,
              anticipatePin: 1
            }
          });

          // Staircase effect: each panel enters on top of the previous one
          panels.forEach((panel, i) => {
            const textRef = textRefs.current[i];
            const imageRef = imageRefs.current[i];

            if (i === 0) {
              // First panel: already visible, just ensure it stays
              return;
            }

            // Panel enters: comes to center (yPercent: 20 → 0), scales up, fades in
            tl.to(panel, {
              yPercent: 0,
              scale: 1,
              opacity: 1,
              duration: 1,
              ease: "power2.out"
            }, i);

            // Text parallax: enters slightly after panel starts
            if (textRef) {
              tl.to(textRef, {
                y: 0,
                opacity: 1,
                duration: 0.8,
                ease: "power3.out"
              }, i + 0.1);
            }

            // Image parallax: enters with slight delay for parallax effect
            if (imageRef) {
              tl.to(imageRef, {
                y: 0,
                opacity: 1,
                scale: 1,
                duration: 0.8,
                ease: "power3.out"
              }, i + 0.2);
            }

            // Previous panel: scales down and dims when new one enters
            if (i > 0 && panels[i - 1]) {
              tl.to(panels[i - 1], {
                scale: 0.92,
                opacity: 0.6,
                duration: 0.6,
                ease: "power2.out"
              }, i);
            }
          });

          scrollTriggersRef.current.push(tl.scrollTrigger);
        }

        ScrollTrigger.refresh();
      }, stackRef);

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (ctx) ctx?.revert();
        scrollTriggersRef.current.forEach(trigger => trigger?.kill());
        scrollTriggersRef.current = [];
      };
    }, 150);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (ctx) ctx?.revert();
      scrollTriggersRef.current.forEach(trigger => trigger?.kill());
      scrollTriggersRef.current = [];
    };
  }, [gsapLoaded, isMobile]);

  return (
    <div className="min-h-screen text-white overflow-x-hidden relative bg-[#0A0C14]">
      {/* Background 3D */}
      <Background3D />

      {/* Stacked Scroll Section */}
      <section
        id="stack"
        ref={stackRef}
        className="relative min-h-screen"
      >
        {/* Sticky Zone - Pinned Container */}
        <div
          ref={stickyZoneRef}
          className="sticky-zone relative w-full"
          style={{ height: '100vh', position: 'relative' }}
        >
          {/* Panels Container - All panels absolutely positioned and overlapping */}
          <div 
            className="relative w-full h-full flex items-center justify-center"
            style={{ position: 'relative', width: '100%', height: '100%' }}
          >
            {panelsData.map((panel, index) => {
              const isImageLeft = panel.imagePosition === 'left';

              return (
                <div
                  key={panel.id}
                  ref={(el) => (panelRefs.current[index] = el)}
                  className="panel absolute inset-0 w-full h-full flex items-center justify-center"
                  style={{
                    borderRadius: '24px',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100%',
                    height: '100%'
                  }}
                >
                  {/* Glass effect background for panel */}
                  <div
                    className="absolute inset-0 rounded-3xl backdrop-blur-md border border-[#7BBCFE]/20 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(10, 12, 20, 0.95) 0%, rgba(26, 31, 46, 0.90) 100%)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 0 1px rgba(123, 188, 254, 0.15)'
                    }}
                  />

                  {/* Content Container */}
                  <div className="relative z-10 container mx-auto max-w-7xl px-4 sm:px-6 w-full">
                    <div
                      className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full ${
                        isImageLeft ? '' : 'lg:grid-flow-dense'
                      }`}
                    >
                      {/* Image/Visual - Left or Right */}
                      <div
                        ref={(el) => (imageRefs.current[index] = el)}
                        className={`order-1 lg:order-none ${
                          isImageLeft ? '' : 'lg:col-start-2'
                        }`}
                      >
                        <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-[#7BBCFE]/10 to-[#B8A8FE]/10 p-1 backdrop-blur-sm border border-[#7BBCFE]/20">
                          <div className="aspect-video bg-gradient-to-br from-[#0A0C14] via-[#1a1f2e] to-[#0A0C14] rounded-2xl flex items-center justify-center relative overflow-hidden">
                            {/* Gradient overlay in bottom right corner */}
                            <div
                              className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-[#7BBCFE]/30 via-[#B8A8FE]/20 to-transparent opacity-60"
                              style={{ borderRadius: '0 0 24px 0' }}
                            />
                            <div className="relative z-10 text-center space-y-6 p-8">
                              <div className="w-32 h-32 mx-auto rounded-2xl bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] flex items-center justify-center shadow-2xl shadow-[#7BBCFE]/50">
                                <span className="text-5xl font-bold text-[#0A0C14]">
                                  {index + 1}
                                </span>
                              </div>
                              <div className="space-y-2">
                                <div className="w-16 h-1 mx-auto bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] rounded-full" />
                                <p className="text-white/40 text-xs font-medium uppercase tracking-wider">
                                  Visual Placeholder
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Text Content - Right or Left */}
                      <div
                        ref={(el) => (textRefs.current[index] = el)}
                        className={`order-2 lg:order-none space-y-10 ${
                          isImageLeft ? '' : 'lg:col-start-1 lg:row-start-1'
                        }`}
                      >
                        <div className="space-y-8">
                          <h2 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.1] tracking-tight">
                            <span className="bg-gradient-to-r from-white via-[#7BBCFE] to-[#B8A8FE] bg-clip-text text-transparent">
                              {panel.title.split('.')[0]}
                            </span>
                            {panel.title.includes('.') && (
                              <>
                                <span className="text-white">.</span>
                                <br className="hidden sm:block" />
                                <span className="bg-gradient-to-r from-[#7BBCFE] via-[#B8A8FE] to-white bg-clip-text text-transparent">
                                  {panel.title.split('.').slice(1).join('.')}
                                </span>
                              </>
                            )}
                          </h2>
                          <p className="text-lg sm:text-xl lg:text-2xl text-gray-400/90 leading-relaxed max-w-2xl font-light">
                            {panel.description}
                          </p>
                        </div>

                        {/* CTA Button */}
                        <div className="relative">
                          <Button
                            size="lg"
                            className="group bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] hover:from-[#7BBCFE]/90 hover:to-[#B8A8FE]/90 text-[#0A0C14] font-bold px-10 py-7 text-lg rounded-2xl shadow-2xl shadow-[#7BBCFE]/40 hover:shadow-[#7BBCFE]/60 transition-all duration-300 hover:scale-[1.02] border-0"
                          >
                            <span className="flex items-center">
                              {panel.buttonText}
                              <ArrowRight className="ml-3 w-5 h-5 transition-transform duration-300 group-hover:translate-x-2" />
                            </span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Spacer to allow scroll - positioned after sticky zone */}
        <div style={{ height: `${panelsData.length * 120}vh`, minHeight: `${panelsData.length * 120}vh` }} />
      </section>
    </div>
  );
};

export default StackedScroll;

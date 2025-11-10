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

          // Calculate scroll duration based on number of panels
          const scrollDuration = panels.length * 120; // 120% per panel
          
          // Create quick setters for performance (no animation overhead)
          const panelSetters = panels.map((panel) => ({
            yPercent: gsap.quickSetter(panel, "yPercent", "%"),
            scale: gsap.quickSetter(panel, "scale"),
            opacity: gsap.quickSetter(panel, "opacity"),
          }));
          
          const textSetters = textRefs.current.map((textRef) => 
            textRef ? {
              y: gsap.quickSetter(textRef, "y", "px"),
              opacity: gsap.quickSetter(textRef, "opacity"),
            } : null
          );
          
          const imageSetters = imageRefs.current.map((imageRef) => 
            imageRef ? {
              y: gsap.quickSetter(imageRef, "y", "px"),
              scale: gsap.quickSetter(imageRef, "scale"),
              opacity: gsap.quickSetter(imageRef, "opacity"),
            } : null
          );
          
          // Create ScrollTrigger that syncs perfectly with user scroll
          const trigger = ScrollTrigger.create({
            trigger: stackRef.current,
            start: "top top",
            end: `+=${scrollDuration}%`,
            scrub: 1, // Smooth scrubbing - syncs with scroll
            pin: stickyZoneRef.current,
            pinSpacing: true, // Allow spacing for scroll
            anticipatePin: 1,
            onUpdate: (self) => {
              const progress = self.progress; // 0 to 1
              const totalPanels = panels.length;
              
              // Calculate which panel should be active based on scroll progress
              // Divide progress into segments, one per panel
              const segmentSize = 1 / totalPanels;
              let activeIndex = Math.floor(progress / segmentSize);
              
              // Handle edge case: when progress is exactly 1, ensure last panel is active
              if (progress >= 1) {
                activeIndex = totalPanels - 1;
              }
              
              // Clamp activeIndex to valid range
              activeIndex = Math.min(activeIndex, totalPanels - 1);
              
              // Calculate progress within current panel segment (0 to 1)
              const segmentProgress = segmentSize > 0 
                ? (progress % segmentSize) / segmentSize 
                : 0;
              
              // Staircase effect: each panel stacks on top, creating step-like appearance
              // Panels that have appeared stay visible behind, creating the staircase
              panels.forEach((panel, i) => {
                const textSetter = textSetters[i];
                const imageSetter = imageSetters[i];
                const panelSetter = panelSetters[i];
                const panelElement = panel as HTMLElement;
                
                // Calculate how many steps behind this panel is from the active one
                const stepsBehind = activeIndex - i;
                
                if (i <= activeIndex) {
                  // This panel has already appeared or is currently appearing
                  // Calculate its position in the staircase
                  
                  if (i === activeIndex) {
                    // Currently active panel: coming to front
                    panelElement.style.zIndex = `${totalPanels + 50 + i}`;
                    
                    if (i === 0) {
                      // First panel: fully visible at center
                      panelSetter.yPercent(0);
                      panelSetter.scale(1);
                      panelSetter.opacity(1);
                      
                      if (textSetter) {
                        textSetter.y(0);
                        textSetter.opacity(1);
                      }
                      
                      if (imageSetter) {
                        imageSetter.y(0);
                        imageSetter.scale(1);
                        imageSetter.opacity(1);
                      }
                    } else {
                      // Other panels: animate entrance
                      const panelProgress = Math.min(segmentProgress * 1.3, 1);
                      
                      // Panel moves up and scales up as it enters
                      panelSetter.yPercent(30 * (1 - panelProgress));
                      panelSetter.scale(0.9 + (0.1 * panelProgress));
                      panelSetter.opacity(panelProgress);
                      
                      // Text and image enter with parallax
                      if (textSetter) {
                        const textStart = 0.2;
                        const textProgress = Math.max(0, Math.min((segmentProgress - textStart) / (1 - textStart), 1));
                        textSetter.y(80 * (1 - textProgress));
                        textSetter.opacity(textProgress);
                      }
                      
                      if (imageSetter) {
                        const imageStart = 0.25;
                        const imageProgress = Math.max(0, Math.min((segmentProgress - imageStart) / (1 - imageStart), 1));
                        imageSetter.y(40 * (1 - imageProgress));
                        imageSetter.scale(0.85 + (0.15 * imageProgress));
                        imageSetter.opacity(imageProgress);
                      }
                    }
                  } else {
                    // Previous panels: stay visible in staircase formation
                    // Each step goes down and gets smaller/transparent
                    const scaleReduction = stepsBehind * 0.1; // Scale reduction per step (10% per step)
                    const opacityReduction = stepsBehind * 0.3; // Opacity reduction per step (30% per step)
                    const yOffsetPercent = stepsBehind * 8; // Vertical offset in percentage (8% per step)
                    
                    // Position in staircase: offset down, scaled down, dimmed
                    // Higher z-index for panels that appeared more recently
                    panelElement.style.zIndex = `${totalPanels + 30 + (activeIndex - i)}`;
                    
                    // Panel position: offset down to create stair effect
                    // Each previous panel goes down more
                    panelSetter.yPercent(yOffsetPercent);
                    panelSetter.scale(Math.max(0.7, 1 - scaleReduction));
                    panelSetter.opacity(Math.max(0.35, 1 - opacityReduction));
                    
                    // Content stays relative to panel (no extra offset needed)
                    if (textSetter) {
                      textSetter.y(0); // Text stays centered in its panel
                      textSetter.opacity(Math.max(0.35, 1 - opacityReduction));
                    }
                    
                    if (imageSetter) {
                      imageSetter.y(0); // Image stays centered in its panel
                      imageSetter.scale(Math.max(0.7, 1 - scaleReduction));
                      imageSetter.opacity(Math.max(0.35, 1 - opacityReduction));
                    }
                    
                    // If a new panel is entering above this one, dim it slightly more
                    if (i === activeIndex - 1 && segmentProgress > 0.2) {
                      const dimProgress = Math.min((segmentProgress - 0.2) / 0.8, 1);
                      const extraScaleReduction = 0.08 * dimProgress;
                      const extraOpacityReduction = 0.2 * dimProgress;
                      
                      panelSetter.scale(Math.max(0.6, 1 - scaleReduction - extraScaleReduction));
                      panelSetter.opacity(Math.max(0.25, 1 - opacityReduction - extraOpacityReduction));
                      
                      if (textSetter) {
                        textSetter.opacity(Math.max(0.25, 1 - opacityReduction - extraOpacityReduction));
                      }
                      
                      if (imageSetter) {
                        imageSetter.scale(Math.max(0.6, 1 - scaleReduction - extraScaleReduction));
                        imageSetter.opacity(Math.max(0.25, 1 - opacityReduction - extraOpacityReduction));
                      }
                    }
                  }
                } else {
                  // Panels not yet reached: still hidden below
                  panelElement.style.zIndex = `${totalPanels - i}`;
                  panelSetter.yPercent(50);
                  panelSetter.scale(0.8);
                  panelSetter.opacity(0);
                  
                  if (textSetter) {
                    textSetter.y(100);
                    textSetter.opacity(0);
                  }
                  
                  if (imageSetter) {
                    imageSetter.y(50);
                    imageSetter.scale(0.8);
                    imageSetter.opacity(0);
                  }
                }
              });
            }
          });

          scrollTriggersRef.current.push(trigger);
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

        {/* Spacer to allow scroll - creates scroll space for pinned section */}
        <div 
          className="w-full"
          style={{ 
            height: `${panelsData.length * 120}vh`,
            minHeight: `${panelsData.length * 120}vh`
          }} 
        />
      </section>
    </div>
  );
};

export default StackedScroll;

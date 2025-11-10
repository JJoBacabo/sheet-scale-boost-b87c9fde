import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Background3D } from "@/components/ui/Background3D";

interface StackedSection {
  id: string;
  title: string;
  description: string;
  buttonText: string;
  imagePosition: 'left' | 'right';
}

const stackedSections: StackedSection[] = [
  {
    id: 'automate',
    title: 'Automate. Simplify. Grow.',
    description: 'Manage your operations faster with smart automation and real-time insights.',
    buttonText: 'Get Started',
    imagePosition: 'left'
  },
  {
    id: 'connect',
    title: 'Connect. Control. Scale.',
    description: 'Centralize all your tools and track results with precision.',
    buttonText: 'Learn More',
    imagePosition: 'right'
  },
  {
    id: 'optimize',
    title: 'Optimize Efficiency. Boost Performance.',
    description: 'Eliminate repetitive work and focus on what really drives growth.',
    buttonText: 'Explore',
    imagePosition: 'left'
  },
  {
    id: 'reimagined',
    title: 'Your Workflow, Reimagined.',
    description: 'Experience seamless automation designed for modern eCommerce.',
    buttonText: 'Start Now',
    imagePosition: 'right'
  }
];

const StackedScroll = () => {
  const [gsapLoaded, setGsapLoaded] = useState(false);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const gsapRef = useRef<any>(null);
  const ScrollTriggerRef = useRef<any>(null);
  const scrollTriggersRef = useRef<any[]>([]);

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

  // Setup ScrollTrigger animations for stacked scroll effect
  useEffect(() => {
    if (!gsapLoaded || !gsapRef.current || !ScrollTriggerRef.current) return;

    const gsap = gsapRef.current;
    const ScrollTrigger = ScrollTriggerRef.current;
    let timeoutId: NodeJS.Timeout;
    let ctx: any;

    // Wait a bit for DOM to be ready
    timeoutId = setTimeout(() => {
      ctx = gsap.context(() => {
        sectionRefs.current.forEach((section, index) => {
          if (!section) return;

          const imageRef = imageRefs.current[index];
          const textRef = textRefs.current[index];

          if (!imageRef || !textRef) return;

          // Set initial state - all sections start visible but scaled/positioned for stacking
          if (index === 0) {
            // First section: fully visible on top
            gsap.set(section, { zIndex: stackedSections.length });
            gsap.set(textRef, { y: 0, opacity: 1 });
            gsap.set(imageRef, { scale: 1, opacity: 1 });
          } else {
            // Other sections: start below, scaled down, but visible
            const offset = index * 30; // Stair step offset
            gsap.set(section, { zIndex: stackedSections.length - index });
            gsap.set(textRef, { y: offset, opacity: 0.6 - (index * 0.1) });
            gsap.set(imageRef, { scale: 0.9 - (index * 0.03), opacity: 0.6 - (index * 0.1), y: offset });
          }

          // Create ScrollTrigger for pinning and stacking effect
          const trigger = ScrollTrigger.create({
            trigger: section,
            start: "top top",
            end: "+=200%",
            pin: true,
            pinSpacing: true,
            scrub: 1,
            onUpdate: (self) => {
              const progress = self.progress;
              const sectionElement = section as HTMLElement;

              if (progress > 0.3) {
                // Section is becoming active
                if (index > 0) {
                  // Animate text: slide up and fade in
                  gsap.to(textRef, {
                    y: 30 * (1 - progress * 2),
                    opacity: Math.min(0.6 + (progress * 0.4), 1),
                    duration: 0.1,
                    ease: "none"
                  });

                  // Animate image: scale up and fade in (parallax effect)
                  const imageProgress = Math.min(progress * 1.3, 1);
                  gsap.to(imageRef, {
                    scale: 0.9 + (0.1 * imageProgress),
                    opacity: Math.min(0.6 + (0.4 * imageProgress), 1),
                    y: 30 * (1 - progress * 2),
                    duration: 0.1,
                    ease: "none"
                  });
                }

                // Bring this section to front when active
                if (progress > 0.5) {
                  sectionElement.style.zIndex = `${stackedSections.length + 10}`;
                }
              }

              // Dim previous sections
              for (let i = 0; i < index; i++) {
                const prevSection = sectionRefs.current[i];
                const prevImageRef = imageRefs.current[i];
                const prevTextRef = textRefs.current[i];
                if (prevSection && prevImageRef && prevTextRef) {
                  const prevSectionElement = prevSection as HTMLElement;
                  const dimAmount = Math.min(progress * 1.2, 1);
                  
                  // Previous sections go further back and get dimmer
                  prevSectionElement.style.zIndex = `${stackedSections.length - i - Math.floor(dimAmount * 5)}`;
                  
                  gsap.to(prevImageRef, {
                    scale: Math.max(0.75, 0.9 - (dimAmount * 0.15)),
                    opacity: Math.max(0.3, 0.6 - (dimAmount * 0.3)),
                    duration: 0.1,
                    ease: "none"
                  });
                  
                  gsap.to(prevTextRef, {
                    opacity: Math.max(0.3, 0.6 - (dimAmount * 0.3)),
                    duration: 0.1,
                    ease: "none"
                  });
                }
              }
            },
            onEnter: () => {
              // Section enters viewport
              const sectionElement = section as HTMLElement;
              sectionElement.style.zIndex = `${stackedSections.length + 5}`;
              
              if (index > 0) {
                gsap.to(textRef, {
                  y: 0,
                  opacity: 1,
                  duration: 0.8,
                  ease: "power3.out"
                });
                gsap.to(imageRef, {
                  scale: 1,
                  opacity: 1,
                  y: 0,
                  duration: 0.8,
                  ease: "power3.out"
                });
              }
            },
            onLeave: () => {
              // Section leaves - keep it visible but dimmed
              const sectionElement = section as HTMLElement;
              sectionElement.style.zIndex = `${stackedSections.length - index}`;
              
              gsap.to(textRef, {
                opacity: 0.5,
                duration: 0.5,
                ease: "power2.out"
              });
              gsap.to(imageRef, {
                scale: 0.85,
                opacity: 0.5,
                duration: 0.5,
                ease: "power2.out"
              });
            },
            onEnterBack: () => {
              // Scrolling back up
              const sectionElement = section as HTMLElement;
              sectionElement.style.zIndex = `${stackedSections.length + 5}`;
              
              gsap.to(textRef, {
                y: 0,
                opacity: 1,
                duration: 0.7,
                ease: "power3.out"
              });
              gsap.to(imageRef, {
                scale: 1,
                opacity: 1,
                y: 0,
                duration: 0.7,
                ease: "power3.out"
              });
            }
          });

          scrollTriggersRef.current.push(trigger);
        });

        // Refresh ScrollTrigger after setup
        ScrollTrigger.refresh();
      });

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (ctx) ctx?.revert();
        scrollTriggersRef.current.forEach(trigger => trigger?.kill());
        scrollTriggersRef.current = [];
      };
    }, 100);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (ctx) ctx?.revert();
      scrollTriggersRef.current.forEach(trigger => trigger?.kill());
      scrollTriggersRef.current = [];
    };
  }, [gsapLoaded]);

  return (
    <div className="min-h-screen text-white overflow-x-hidden relative bg-[#0A0C14]">
      {/* Background 3D */}
      <Background3D />

      {/* Stacked Scroll Sections */}
      {stackedSections.map((section, index) => {
        const isImageLeft = section.imagePosition === 'left';

        return (
          <section
            key={section.id}
            ref={(el) => (sectionRefs.current[index] = el)}
            className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-20 relative"
            style={{
              position: 'relative',
              willChange: 'transform, opacity'
            }}
          >
            <div className="container mx-auto max-w-7xl relative z-10">
              <div
                className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
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
                      {/* Animated gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[#7BBCFE]/20 via-transparent to-[#B8A8FE]/20 opacity-50" />
                      <div className="relative z-10 text-center space-y-6 p-8">
                        <div className="w-32 h-32 mx-auto rounded-2xl bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] flex items-center justify-center shadow-2xl shadow-[#7BBCFE]/50 transform transition-transform duration-300 hover:scale-110">
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
                        {section.title.split('.')[0]}
                      </span>
                      {section.title.includes('.') && (
                        <>
                          <span className="text-white">.</span>
                          <br className="hidden sm:block" />
                          <span className="bg-gradient-to-r from-[#7BBCFE] via-[#B8A8FE] to-white bg-clip-text text-transparent">
                            {section.title.split('.').slice(1).join('.')}
                          </span>
                        </>
                      )}
                    </h2>
                    <p className="text-lg sm:text-xl lg:text-2xl text-gray-400/90 leading-relaxed max-w-2xl font-light">
                      {section.description}
                    </p>
                  </div>

                  <Button
                    size="lg"
                    className="group bg-gradient-to-r from-[#7BBCFE] to-[#B8A8FE] hover:from-[#7BBCFE]/90 hover:to-[#B8A8FE]/90 text-[#0A0C14] font-bold px-10 py-7 text-lg rounded-2xl shadow-2xl shadow-[#7BBCFE]/40 hover:shadow-[#7BBCFE]/60 transition-all duration-300 hover:scale-[1.02] border-0"
                  >
                    <span className="flex items-center">
                      {section.buttonText}
                      <ArrowRight className="ml-3 w-5 h-5 transition-transform duration-300 group-hover:translate-x-2" />
                    </span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Subtle gradient overlay for depth - removed to allow stacking visibility */}
          </section>
        );
      })}
    </div>
  );
};

export default StackedScroll;


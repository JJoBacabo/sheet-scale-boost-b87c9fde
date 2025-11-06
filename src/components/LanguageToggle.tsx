import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";

const PTFlag = () => (
  <svg className="w-5 h-4 rounded-sm" viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg">
    <rect width="600" height="400" fill="#FF0000"/>
    <rect width="240" height="400" fill="#006600"/>
    <circle cx="240" cy="200" r="80" fill="#FFD700" stroke="#000" strokeWidth="3"/>
  </svg>
);

const GBFlag = () => (
  <svg className="w-5 h-4 rounded-sm" viewBox="0 0 60 30" xmlns="http://www.w3.org/2000/svg">
    <clipPath id="t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>
    <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
    <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4"/>
    <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
    <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
  </svg>
);

export const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();

  const flags = {
    pt: <PTFlag />,
    en: <GBFlag />
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="btn-glass h-10 px-4 gap-2"
          aria-label="Toggle language"
        >
          {flags[language]}
          <span className="text-sm font-semibold">{language.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[150px]">
        <DropdownMenuItem 
          onClick={() => setLanguage('pt')}
          className="cursor-pointer gap-2"
        >
          <PTFlag />
          <span>Português</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage('en')}
          className="cursor-pointer gap-2"
        >
          <GBFlag />
          <span>English</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

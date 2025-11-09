import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { PageLayout } from "@/components/PageLayout";
import { ArrowLeft, Construction } from "lucide-react";
import logo from "@/assets/logo.png";

export default function ProductResearch() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <PageLayout
      title={t('productResearch.title')}
      subtitle={t('productResearch.subtitle')}
    >
            <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
              <div className="w-full max-w-2xl">
                <Card className="glass-card rounded-3xl border-2 border-border/50 p-12">
                <div className="flex flex-col items-center text-center space-y-8">
                  {/* Logo with animation */}
                  <div className="relative">
                    <div className="w-32 h-32 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-glow logo-glow animate-pulse">
                      <img src={logo} alt="Sheet Tools" className="w-28 h-28 object-contain" />
                    </div>
                    <div className="absolute -top-2 -right-2">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg animate-bounce">
                        <Construction className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-3">
                    <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                      {t('productResearch.underDevelopment')}
                    </h1>
                    <div className="h-1 w-24 mx-auto rounded-full bg-gradient-primary" />
                  </div>

                  {/* Description */}
                  <div className="space-y-4 max-w-md">
                    <p className="text-xl font-semibold text-foreground">
                      {t('productResearch.comingSoon')}
                    </p>
                    <p className="text-muted-foreground">
                      {t('productResearch.description')}
                    </p>
                  </div>

                  {/* Feature Preview Badge */}
                  <div className="flex flex-wrap gap-3 justify-center">
                    <div className="glass-card px-4 py-2 rounded-xl border-2 border-primary/20">
                      <span className="text-sm font-medium">{t('productResearch.feature1')}</span>
                    </div>
                    <div className="glass-card px-4 py-2 rounded-xl border-2 border-primary/20">
                      <span className="text-sm font-medium">{t('productResearch.feature2')}</span>
                    </div>
                    <div className="glass-card px-4 py-2 rounded-xl border-2 border-primary/20">
                      <span className="text-sm font-medium">{t('productResearch.feature3')}</span>
                    </div>
                  </div>

                  {/* Back Button */}
                  <Button
                    onClick={() => navigate("/dashboard")}
                    className="btn-gradient h-12 px-8 font-medium text-base"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    {t('productResearch.backToDashboard')}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
    </PageLayout>
  );
}

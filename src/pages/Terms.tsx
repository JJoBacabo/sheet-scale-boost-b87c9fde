import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const Terms = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 text-white hover:text-primary"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          {t('common.back')}
        </Button>
        
        <h1 className="text-4xl font-bold mb-8">{t('footer.termsOfService')}</h1>
        
        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing and using this platform, you agree to comply with and be bound by the following terms and conditions of use.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">2. Service Description</h2>
            <p>
              This platform provides automation and management tools for Facebook Ads advertising campaigns, including campaign creation, analysis and optimization.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">3. User Account</h2>
            <p className="mb-2">
              To use the services, you must:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate and complete information during registration</li>
              <li>Maintain the security of your account and password</li>
              <li>Notify us immediately of any unauthorized use</li>
              <li>Be responsible for all activities performed on your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">4. Facebook Integration</h2>
            <p>
              By connecting your Facebook Ads account, you authorize the platform to access and manage advertising campaigns on your behalf. You retain full ownership and control over your Facebook accounts and data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">5. Acceptable Use</h2>
            <p className="mb-2">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the service for illegal or unauthorized activities</li>
              <li>Violate any applicable laws in your country or region</li>
              <li>Interfere with the security or operation of the platform</li>
              <li>Attempt to access accounts or data of other users</li>
              <li>Use the service to create or distribute misleading content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">6. Intellectual Property</h2>
            <p>
              All content, functionality and features of the platform are the exclusive property of the company and are protected by intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">7. Limitation of Liability</h2>
            <p>
              The platform is provided "as is". We do not guarantee that the service will be uninterrupted, secure or error-free. We are not responsible for any losses or damages resulting from the use of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">8. Payments and Refunds</h2>
            <p>
              Payment terms and refund policies will be clearly communicated at the time of subscription. We reserve the right to modify prices with prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">9. Termination</h2>
            <p>
              We may suspend or terminate your account if you violate these terms. You may terminate your account at any time through platform settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">10. Modifications to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of significant changes through the platform or by email.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">11. Applicable Law</h2>
            <p>
              These terms are governed by applicable laws, without prejudice to conflicts of legal provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">12. Contact</h2>
            <p>
              For questions about these terms, please contact us at info@sheet-tools.com
            </p>
          </section>

          <p className="text-sm text-gray-400 mt-8">
            Last updated: {new Date().toLocaleDateString('en-US')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Terms;

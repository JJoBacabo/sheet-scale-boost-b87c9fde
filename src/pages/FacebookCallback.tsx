import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { X, CheckCircle, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

const FacebookCallback = () => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for error in URL params
    const params = new URLSearchParams(window.location.search);
    const fbError = params.get('facebook_error');
    
    if (fbError) {
      setError(fbError);
      // Send error message to parent window
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ 
          type: 'facebook-oauth-error',
          error: fbError,
          timestamp: Date.now()
        }, window.location.origin);
      }
    } else {
      // Success - send success message to parent window
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ 
          type: 'facebook-oauth-success',
          timestamp: Date.now()
        }, window.location.origin);
      }
    }
  }, []);

  const handleClose = () => {
    if (window.opener && !window.opener.closed) {
      try {
        // Message already sent in useEffect
        window.close();
      } catch (e) {
        console.error('Failed to close window:', e);
        window.location.href = '/integrations';
      }
    } else {
      // If not a popup, redirect to integrations
      window.location.href = '/integrations';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-12" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Logo with glow */}
      <div className="relative">
        <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full" />
        <img 
          src={logo} 
          alt="Sheet Tools" 
          className="relative z-10 w-48 h-48 object-contain drop-shadow-2xl"
        />
      </div>
      
      {/* Text */}
      <div className="text-center space-y-4">
        {error ? (
          <>
            <div className="flex justify-center">
              <AlertCircle className="h-16 w-16 text-destructive" />
            </div>
            <h1 className="text-4xl font-bold text-white">Connection Failed</h1>
            <p className="text-xl text-slate-300">{error}</p>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h1 className="text-4xl font-bold text-white">Login Completed</h1>
            <p className="text-xl text-slate-300">Facebook Ads connected successfully!</p>
          </>
        )}
      </div>

      {/* Close button */}
      <Button 
        onClick={handleClose}
        className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg rounded-xl shadow-glow"
      >
        <X className="mr-2 h-5 w-5" />
        Close Window
      </Button>
    </div>
  );
};

export default FacebookCallback;

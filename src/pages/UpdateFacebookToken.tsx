import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const UpdateFacebookToken = () => {
  const [token, setToken] = useState("EAAVrzPYIQbsBP6kPkIkzSjpzP5uAoYpVuHJjTFBMAd1qZBgdLx535X26NJtEzhnJY98R8xKgZAVBjl7d0ywSag58MPjnai0rylLVdoEZBqZBMMdp5qi8DrBGSaZA3TRYxd15YxICYlmJOZCiGf9q1H4jySqif7u8afsqmcPcvpWt66GIOLTmYxk7LD4umq");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    if (!token.trim()) {
      toast.error("Please enter a token");
      return;
    }

    setIsUpdating(true);

    try {
      const { data, error } = await supabase.functions.invoke('update-facebook-token', {
        body: { token: token.trim() }
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Token updated successfully! Expires: " + new Date(data.expiresAt).toLocaleDateString());
      } else {
        throw new Error(data.error || 'Failed to update token');
      }
    } catch (error: any) {
      console.error('Error updating token:', error);
      toast.error(error.message || 'Failed to update token');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Update Facebook Token</CardTitle>
          <CardDescription>
            Update your Facebook Ads access token (valid for 60 days)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Facebook Access Token</label>
            <Input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your Facebook access token"
              className="font-mono text-sm"
            />
          </div>
          
          <Button 
            onClick={handleUpdate} 
            disabled={isUpdating}
            className="w-full"
          >
            {isUpdating ? "Updating..." : "Update Token"}
          </Button>

          <p className="text-sm text-muted-foreground">
            This will update the Facebook token in the integrations table and set expiration to 60 days from now.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpdateFacebookToken;

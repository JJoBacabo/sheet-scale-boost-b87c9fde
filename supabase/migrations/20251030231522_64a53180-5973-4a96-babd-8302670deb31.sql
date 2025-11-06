-- Add DELETE policy for admins on support_chats
CREATE POLICY "Admins can delete all chats"
ON public.support_chats
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
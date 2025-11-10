-- ============================================
-- AUDIT LOGS FOR SUPPORT TICKETS
-- ============================================

-- 1. Create function to log ticket creation
CREATE OR REPLACE FUNCTION log_ticket_created()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (
      user_id,
      event_type,
      event_data
    ) VALUES (
      NEW.user_id,
      'ticket_created',
      jsonb_build_object(
        'ticket_id', NEW.id,
        'category', NEW.category,
        'language', NEW.language,
        'status', NEW.status,
        'message_count', jsonb_array_length(NEW.messages)
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Create function to log ticket updates
CREATE OR REPLACE FUNCTION log_ticket_updated()
RETURNS TRIGGER AS $$
DECLARE
  status_changed BOOLEAN := FALSE;
  admin_assigned BOOLEAN := FALSE;
  message_count_changed BOOLEAN := FALSE;
  priority_changed BOOLEAN := FALSE;
  notes_changed BOOLEAN := FALSE;
  ticket_reopened BOOLEAN := FALSE;
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Check if status changed
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
      status_changed := TRUE;
      ticket_reopened := (OLD.status = 'resolved' AND NEW.status != 'resolved');
      
      INSERT INTO public.audit_logs (
        user_id,
        event_type,
        event_data,
        old_state,
        new_state
      ) VALUES (
        NEW.user_id,
        CASE 
          WHEN NEW.status = 'resolved' THEN 'ticket_resolved'
          WHEN ticket_reopened THEN 'ticket_reopened'
          ELSE 'ticket_updated'
        END,
        jsonb_build_object(
          'ticket_id', NEW.id,
          'previous_status', OLD.status,
          'new_status', NEW.status,
          'admin_id', NEW.admin_id,
          'resolved_at', NEW.resolved_at
        ),
        OLD.status,
        NEW.status
      );
    END IF;
    
    -- Check if admin was assigned (including reassignment)
    IF (OLD.admin_id IS DISTINCT FROM NEW.admin_id) THEN
      IF (OLD.admin_id IS NULL AND NEW.admin_id IS NOT NULL) THEN
        -- New assignment
        admin_assigned := TRUE;
        
        INSERT INTO public.audit_logs (
          user_id,
          event_type,
          event_data
        ) VALUES (
          NEW.user_id,
          'ticket_assigned',
          jsonb_build_object(
            'ticket_id', NEW.id,
            'admin_id', NEW.admin_id,
            'previous_admin_id', OLD.admin_id,
            'status', NEW.status
          )
        );
      ELSIF (OLD.admin_id IS NOT NULL AND NEW.admin_id IS NOT NULL AND OLD.admin_id != NEW.admin_id) THEN
        -- Reassignment
        INSERT INTO public.audit_logs (
          user_id,
          event_type,
          event_data
        ) VALUES (
          NEW.user_id,
          'ticket_reassigned',
          jsonb_build_object(
            'ticket_id', NEW.id,
            'previous_admin_id', OLD.admin_id,
            'new_admin_id', NEW.admin_id,
            'status', NEW.status
          )
        );
      END IF;
    END IF;
    
    -- Check if priority changed
    IF (OLD.priority IS DISTINCT FROM NEW.priority) THEN
      priority_changed := TRUE;
      
      INSERT INTO public.audit_logs (
        user_id,
        event_type,
        event_data
      ) VALUES (
        NEW.user_id,
        'ticket_priority_changed',
        jsonb_build_object(
          'ticket_id', NEW.id,
          'previous_priority', OLD.priority,
          'new_priority', NEW.priority,
          'status', NEW.status
        )
      );
    END IF;
    
    -- Check if notes changed
    IF (OLD.notes IS DISTINCT FROM NEW.notes) THEN
      notes_changed := TRUE;
      
      INSERT INTO public.audit_logs (
        user_id,
        event_type,
        event_data
      ) VALUES (
        NEW.user_id,
        'ticket_notes_updated',
        jsonb_build_object(
          'ticket_id', NEW.id,
          'notes_changed', TRUE,
          'has_notes', NEW.notes IS NOT NULL,
          'status', NEW.status
        )
      );
    END IF;
    
    -- Check if messages were added (log separately from status changes)
    IF (jsonb_array_length(NEW.messages) > jsonb_array_length(OLD.messages)) THEN
      INSERT INTO public.audit_logs (
        user_id,
        event_type,
        event_data
      ) VALUES (
        NEW.user_id,
        'ticket_message_added',
        jsonb_build_object(
          'ticket_id', NEW.id,
          'message_count', jsonb_array_length(NEW.messages),
          'previous_count', jsonb_array_length(OLD.messages)
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Create trigger for ticket creation
DROP TRIGGER IF EXISTS on_ticket_created ON public.support_chats;
CREATE TRIGGER on_ticket_created
  AFTER INSERT ON public.support_chats
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_created();

-- 4. Create trigger for ticket updates
DROP TRIGGER IF EXISTS on_ticket_updated ON public.support_chats;
CREATE TRIGGER on_ticket_updated
  AFTER UPDATE ON public.support_chats
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_updated();

-- 5. Create function to log ticket deletion
CREATE OR REPLACE FUNCTION log_ticket_deleted()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs (
      user_id,
      event_type,
      event_data
    ) VALUES (
      OLD.user_id,
      'ticket_deleted',
      jsonb_build_object(
        'ticket_id', OLD.id,
        'category', OLD.category,
        'language', OLD.language,
        'status', OLD.status,
        'message_count', jsonb_array_length(OLD.messages),
        'admin_id', OLD.admin_id,
        'deleted_at', now()
      )
    );
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Create trigger for ticket deletion
DROP TRIGGER IF EXISTS on_ticket_deleted ON public.support_chats;
CREATE TRIGGER on_ticket_deleted
  AFTER DELETE ON public.support_chats
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_deleted();

-- 7. Add index for ticket-related audit logs (including all ticket events)
CREATE INDEX IF NOT EXISTS idx_audit_logs_ticket_events 
ON public.audit_logs(event_type, created_at DESC) 
WHERE event_type IN (
  'ticket_created', 
  'ticket_updated', 
  'ticket_resolved', 
  'ticket_reopened',
  'ticket_assigned', 
  'ticket_reassigned',
  'ticket_message_added', 
  'ticket_deleted',
  'ticket_priority_changed',
  'ticket_notes_updated'
);


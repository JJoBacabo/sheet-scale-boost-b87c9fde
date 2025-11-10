-- ============================================
-- FIX AUDIT LOGS ISSUES
-- ============================================

-- 1. Melhorar função de delete para incluir mais informações
CREATE OR REPLACE FUNCTION log_ticket_deleted()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    -- Tentar obter o usuário atual que está deletando (se disponível via session)
    BEGIN
      current_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
      current_user_id := NULL;
    END;
    
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
        'message_count', COALESCE(jsonb_array_length(OLD.messages), 0),
        'admin_id', OLD.admin_id,
        'deleted_by', current_user_id, -- Tentar capturar quem deletou
        'deleted_at', now()
      )
    );
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Adicionar índice para melhorar performance de busca
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc 
ON public.audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
ON public.audit_logs(user_id) 
WHERE user_id IS NOT NULL;

-- 3. Adicionar função para verificar se log já existe (evitar duplicatas)
CREATE OR REPLACE FUNCTION audit_log_exists(
  p_user_id UUID,
  p_event_type TEXT,
  p_ticket_id TEXT,
  p_created_after TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.audit_logs
    WHERE user_id = p_user_id
      AND event_type = p_event_type
      AND event_data->>'ticket_id' = p_ticket_id
      AND created_at > p_created_after
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 4. Adicionar tratamento de erros melhorado na função de criação
CREATE OR REPLACE FUNCTION log_ticket_created()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    BEGIN
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
          'message_count', COALESCE(jsonb_array_length(NEW.messages), 0)
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log erro mas não falhar a inserção do ticket
      RAISE WARNING 'Failed to create audit log for ticket %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Melhorar função de update com tratamento de erros
CREATE OR REPLACE FUNCTION log_ticket_updated()
RETURNS TRIGGER AS $$
DECLARE
  status_changed BOOLEAN := FALSE;
  admin_assigned BOOLEAN := FALSE;
  priority_changed BOOLEAN := FALSE;
  notes_changed BOOLEAN := FALSE;
  ticket_reopened BOOLEAN := FALSE;
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Check if status changed
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log status change for ticket %: %', NEW.id, SQLERRM;
    END;
    
    -- Check if admin was assigned (including reassignment)
    BEGIN
      IF (OLD.admin_id IS DISTINCT FROM NEW.admin_id) THEN
        IF (OLD.admin_id IS NULL AND NEW.admin_id IS NOT NULL) THEN
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
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log admin assignment for ticket %: %', NEW.id, SQLERRM;
    END;
    
    -- Check if priority changed
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log priority change for ticket %: %', NEW.id, SQLERRM;
    END;
    
    -- Check if notes changed
    BEGIN
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
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log notes update for ticket %: %', NEW.id, SQLERRM;
    END;
    
    -- Check if messages were added (log separately from status changes)
    BEGIN
      IF (COALESCE(jsonb_array_length(NEW.messages), 0) > COALESCE(jsonb_array_length(OLD.messages), 0)) THEN
        INSERT INTO public.audit_logs (
          user_id,
          event_type,
          event_data
        ) VALUES (
          NEW.user_id,
          'ticket_message_added',
          jsonb_build_object(
            'ticket_id', NEW.id,
            'message_count', COALESCE(jsonb_array_length(NEW.messages), 0),
            'previous_count', COALESCE(jsonb_array_length(OLD.messages), 0)
          )
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to log message addition for ticket %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Recriar triggers para aplicar as melhorias
DROP TRIGGER IF EXISTS on_ticket_created ON public.support_chats;
CREATE TRIGGER on_ticket_created
  AFTER INSERT ON public.support_chats
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_created();

DROP TRIGGER IF EXISTS on_ticket_updated ON public.support_chats;
CREATE TRIGGER on_ticket_updated
  AFTER UPDATE ON public.support_chats
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_updated();

DROP TRIGGER IF EXISTS on_ticket_deleted ON public.support_chats;
CREATE TRIGGER on_ticket_deleted
  AFTER DELETE ON public.support_chats
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_deleted();


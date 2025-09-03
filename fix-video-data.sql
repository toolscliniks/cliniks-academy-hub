-- Script para corrigir dados de vídeo das aulas
-- Cliniks Academy - Correção de URLs de vídeo

-- 1. Identificar aulas com problemas
SELECT 
    id,
    title,
    video_url,
    video_type,
    external_video_id,
    external_video_platform,
    CASE 
        WHEN video_url LIKE '%.png' OR video_url LIKE '%.jpg' OR video_url LIKE '%.jpeg' THEN 'URL_IMAGEM'
        WHEN video_type = 'youtube' AND external_video_id IS NULL THEN 'YOUTUBE_SEM_ID'
        WHEN video_type = 'youtube' AND video_url LIKE '%storage%' THEN 'YOUTUBE_URL_STORAGE'
        ELSE 'OK'
    END as status_problema
FROM lessons
WHERE 
    video_url LIKE '%.png' 
    OR video_url LIKE '%.jpg' 
    OR video_url LIKE '%.jpeg'
    OR (video_type = 'youtube' AND external_video_id IS NULL)
    OR (video_type = 'youtube' AND video_url LIKE '%storage%')
ORDER BY created_at DESC;

-- 2. Corrigir aulas com URLs de imagem como vídeo
UPDATE lessons 
SET 
    video_url = NULL,
    updated_at = NOW()
WHERE 
    video_url LIKE '%.png' 
    OR video_url LIKE '%.jpg' 
    OR video_url LIKE '%.jpeg';

-- 3. Para aulas do YouTube, garantir que video_url seja NULL se temos external_video_id
UPDATE lessons 
SET 
    video_url = NULL,
    updated_at = NOW()
WHERE 
    video_type = 'youtube' 
    AND external_video_id IS NOT NULL 
    AND video_url IS NOT NULL;

-- 4. Corrigir external_video_platform para aulas do YouTube
UPDATE lessons 
SET 
    external_video_platform = 'youtube',
    updated_at = NOW()
WHERE 
    video_type = 'youtube' 
    AND external_video_platform IS NULL;

-- 5. Verificar aulas que ainda podem ter problemas
SELECT 
    id,
    title,
    video_url,
    video_type,
    external_video_id,
    external_video_platform,
    duration_minutes,
    is_free
FROM lessons
WHERE 
    (video_type = 'youtube' AND external_video_id IS NULL)
    OR (video_type = 'upload' AND video_url IS NULL)
    OR (video_type = 'vimeo' AND external_video_id IS NULL)
ORDER BY created_at DESC;

-- 6. Estatísticas após correção
SELECT 
    video_type,
    COUNT(*) as total_aulas,
    COUNT(CASE WHEN video_url IS NOT NULL THEN 1 END) as com_video_url,
    COUNT(CASE WHEN external_video_id IS NOT NULL THEN 1 END) as com_external_id,
    COUNT(CASE WHEN video_url IS NULL AND external_video_id IS NULL THEN 1 END) as sem_video
FROM lessons
GROUP BY video_type
ORDER BY video_type;

-- 7. Listar aulas por curso para verificação
SELECT 
    c.title as curso,
    m.title as modulo,
    l.title as aula,
    l.video_type,
    l.external_video_id,
    l.duration_minutes,
    l.is_free,
    CASE 
        WHEN l.video_type = 'youtube' AND l.external_video_id IS NOT NULL THEN 'OK'
        WHEN l.video_type = 'upload' AND l.video_url IS NOT NULL THEN 'OK'
        WHEN l.video_type = 'vimeo' AND l.external_video_id IS NOT NULL THEN 'OK'
        ELSE 'PROBLEMA'
    END as status
FROM lessons l
JOIN modules m ON l.module_id = m.id
JOIN courses c ON m.course_id = c.id
WHERE c.is_published = true
ORDER BY c.title, m.order_index, l.order_index;

-- 8. Função para validar URLs do YouTube (opcional)
CREATE OR REPLACE FUNCTION validate_youtube_id(video_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verificar se o ID tem 11 caracteres (padrão do YouTube)
    IF LENGTH(video_id) != 11 THEN
        RETURN FALSE;
    END IF;
    
    -- Verificar se contém apenas caracteres válidos
    IF video_id !~ '^[a-zA-Z0-9_-]+$' THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 9. Verificar IDs do YouTube inválidos
SELECT 
    id,
    title,
    external_video_id,
    validate_youtube_id(external_video_id) as id_valido
FROM lessons
WHERE 
    video_type = 'youtube' 
    AND external_video_id IS NOT NULL
    AND NOT validate_youtube_id(external_video_id);

-- 10. Comentários para documentar as correções
COMMENT ON COLUMN lessons.video_url IS 'URL do vídeo para uploads diretos. NULL para vídeos externos (YouTube/Vimeo)';
COMMENT ON COLUMN lessons.external_video_id IS 'ID do vídeo externo (YouTube: 11 chars, Vimeo: numérico)';
COMMENT ON COLUMN lessons.external_video_platform IS 'Plataforma do vídeo externo: youtube, vimeo';
COMMENT ON COLUMN lessons.video_type IS 'Tipo de vídeo: upload, youtube, vimeo';

-- 11. Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_lessons_video_type ON lessons(video_type);
CREATE INDEX IF NOT EXISTS idx_lessons_external_video_id ON lessons(external_video_id) WHERE external_video_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lessons_module_order ON lessons(module_id, order_index);

-- 12. Trigger para validar dados de vídeo ao inserir/atualizar
CREATE OR REPLACE FUNCTION validate_lesson_video_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar dados do YouTube
    IF NEW.video_type = 'youtube' THEN
        IF NEW.external_video_id IS NULL THEN
            RAISE EXCEPTION 'external_video_id é obrigatório para vídeos do YouTube';
        END IF;
        
        IF NOT validate_youtube_id(NEW.external_video_id) THEN
            RAISE EXCEPTION 'external_video_id inválido para YouTube: %', NEW.external_video_id;
        END IF;
        
        -- Para YouTube, video_url deve ser NULL
        NEW.video_url := NULL;
        NEW.external_video_platform := 'youtube';
    END IF;
    
    -- Validar dados de upload
    IF NEW.video_type = 'upload' THEN
        IF NEW.video_url IS NULL THEN
            RAISE EXCEPTION 'video_url é obrigatório para vídeos de upload';
        END IF;
        
        -- Para upload, external_video_id deve ser NULL
        NEW.external_video_id := NULL;
        NEW.external_video_platform := NULL;
    END IF;
    
    -- Validar dados do Vimeo
    IF NEW.video_type = 'vimeo' THEN
        IF NEW.external_video_id IS NULL THEN
            RAISE EXCEPTION 'external_video_id é obrigatório para vídeos do Vimeo';
        END IF;
        
        -- Para Vimeo, video_url deve ser NULL
        NEW.video_url := NULL;
        NEW.external_video_platform := 'vimeo';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger
DROP TRIGGER IF EXISTS validate_lesson_video_trigger ON lessons;
CREATE TRIGGER validate_lesson_video_trigger
    BEFORE INSERT OR UPDATE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION validate_lesson_video_data();

-- 13. Relatório final de status
SELECT 
    'CORREÇÃO CONCLUÍDA' as status,
    COUNT(*) as total_aulas,
    COUNT(CASE WHEN video_type = 'youtube' AND external_video_id IS NOT NULL THEN 1 END) as youtube_ok,
    COUNT(CASE WHEN video_type = 'upload' AND video_url IS NOT NULL THEN 1 END) as upload_ok,
    COUNT(CASE WHEN video_type = 'vimeo' AND external_video_id IS NOT NULL THEN 1 END) as vimeo_ok,
    COUNT(CASE 
        WHEN (video_type = 'youtube' AND external_video_id IS NULL)
          OR (video_type = 'upload' AND video_url IS NULL)
          OR (video_type = 'vimeo' AND external_video_id IS NULL)
        THEN 1 
    END) as com_problemas
FROM lessons;
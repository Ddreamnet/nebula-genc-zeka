
ALTER TABLE public.ai_generations DROP CONSTRAINT ai_generations_modality_check;
ALTER TABLE public.ai_generations ADD CONSTRAINT ai_generations_modality_check
  CHECK (modality = ANY (ARRAY['text'::text, 'image'::text, 'video'::text, 'audio'::text]));
;

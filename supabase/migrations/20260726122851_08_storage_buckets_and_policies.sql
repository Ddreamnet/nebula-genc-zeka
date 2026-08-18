
INSERT INTO storage.buckets (id, name, public) VALUES
  ('blog-media', 'blog-media', true),
  ('homework-files', 'homework-files', false),
  ('learning-resources', 'learning-resources', true),
  ('playground-outputs', 'playground-outputs', false);

CREATE POLICY "Admins can manage learning-resources" ON storage.objects AS PERMISSIVE FOR ALL TO authenticated USING (((bucket_id = 'learning-resources'::text) AND has_role(auth.uid(), 'admin'::app_role))) WITH CHECK (((bucket_id = 'learning-resources'::text) AND has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins can upload learning-resources" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'learning-resources'::text) AND has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Teachers can upload learning-resources" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'learning-resources'::text) AND has_role(auth.uid(), 'teacher'::app_role)));
CREATE POLICY admin_manage_blog_media ON storage.objects AS PERMISSIVE FOR ALL TO public USING (((bucket_id = 'blog-media'::text) AND has_role(auth.uid(), 'admin'::app_role))) WITH CHECK (((bucket_id = 'blog-media'::text) AND has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY involved_parties_manage_homework_files ON storage.objects AS PERMISSIVE FOR ALL TO public USING (((bucket_id = 'homework-files'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.teacher_id = auth.uid()) AND ((s.student_id)::text = (storage.foldername(objects.name))[1])))) OR has_role(auth.uid(), 'admin'::app_role)))) WITH CHECK (((bucket_id = 'homework-files'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.teacher_id = auth.uid()) AND ((s.student_id)::text = (storage.foldername(objects.name))[1])))) OR has_role(auth.uid(), 'admin'::app_role))));
CREATE POLICY "owner manage playground outputs" ON storage.objects AS PERMISSIVE FOR ALL TO public USING (((bucket_id = 'playground-outputs'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR has_role(auth.uid(), 'admin'::app_role)))) WITH CHECK (((bucket_id = 'playground-outputs'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY public_read_blog_media ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'blog-media'::text));
CREATE POLICY student_upload_own_homework_files ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'homework-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
CREATE POLICY teacher_upload_student_homework_files ON storage.objects AS PERMISSIVE FOR INSERT TO public WITH CHECK (((bucket_id = 'homework-files'::text) AND (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.teacher_id = auth.uid()) AND ((s.student_id)::text = (storage.foldername(objects.name))[1]))))));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;

CREATE EVENT TRIGGER rls_auto_enable_trigger ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.rls_auto_enable();
;

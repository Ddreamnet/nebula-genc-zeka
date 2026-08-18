
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_topic_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_reminder_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playground_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lesson_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_resource_completion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_full_access_admin_notifications ON public.admin_notifications AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin select all generations" ON public.ai_generations AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "select own generations" ON public.ai_generations AS PERMISSIVE FOR SELECT TO public USING ((user_id = auth.uid()));
CREATE POLICY admin_full_access_balance_events ON public.balance_events AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY teacher_view_own_balance_events ON public.balance_events AS PERMISSIVE FOR SELECT TO authenticated USING ((teacher_id = auth.uid()));
CREATE POLICY admin_full_access_blog_posts ON public.blog_posts AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY public_view_published_posts ON public.blog_posts AS PERMISSIVE FOR SELECT TO authenticated, anon USING ((status = 'published'::text));
CREATE POLICY admin_full_access_global_resources ON public.global_topic_resources AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY student_view_global_resources ON public.global_topic_resources AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM students s
  WHERE (s.student_id = auth.uid()))));
CREATE POLICY teacher_view_global_resources ON public.global_topic_resources AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM global_topics gt
  WHERE (gt.id = global_topic_resources.global_topic_id))));
CREATE POLICY admin_full_access_global_topics ON public.global_topics AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY student_view_global_topics ON public.global_topics AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM students s
  WHERE (s.student_id = auth.uid()))));
CREATE POLICY teacher_view_global_topics ON public.global_topics AS PERMISSIVE FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'teacher'::app_role) OR (teacher_id = auth.uid())));
CREATE POLICY admin_full_access_groups ON public.groups AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY student_view_own_group ON public.groups AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.group_id = groups.id) AND (s.student_id = auth.uid())))));
CREATE POLICY teacher_manage_own_groups ON public.groups AS PERMISSIVE FOR ALL TO authenticated USING ((teacher_id = auth.uid())) WITH CHECK ((teacher_id = auth.uid()));
CREATE POLICY admin_full_access_homework ON public.homework_submissions AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY student_create_own_homework ON public.homework_submissions AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.uid() = student_id));
CREATE POLICY student_view_own_homework ON public.homework_submissions AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = student_id));
CREATE POLICY teacher_create_homework_for_students ON public.homework_submissions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((teacher_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.teacher_id = auth.uid()) AND (s.student_id = homework_submissions.student_id))))));
CREATE POLICY teacher_view_student_homework ON public.homework_submissions AS PERMISSIVE FOR SELECT TO authenticated USING (((teacher_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.teacher_id = auth.uid()) AND (s.student_id = homework_submissions.student_id))))));
CREATE POLICY user_delete_own_uploaded_homework ON public.homework_submissions AS PERMISSIVE FOR DELETE TO public USING ((auth.uid() = uploaded_by_user_id));
CREATE POLICY user_update_own_uploaded_homework ON public.homework_submissions AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = uploaded_by_user_id)) WITH CHECK ((auth.uid() = uploaded_by_user_id));
CREATE POLICY admin_full_access_lesson_instances ON public.lesson_instances AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY student_view_own_lesson_instances ON public.lesson_instances AS PERMISSIVE FOR SELECT TO public USING ((student_id = auth.uid()));
CREATE POLICY teacher_manage_own_lesson_instances ON public.lesson_instances AS PERMISSIVE FOR ALL TO public USING ((teacher_id = auth.uid())) WITH CHECK ((teacher_id = auth.uid()));
CREATE POLICY admin_delete_notifications ON public.notifications AS PERMISSIVE FOR DELETE TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admin_view_all_notifications ON public.notifications AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY user_update_own_notifications ON public.notifications AS PERMISSIVE FOR UPDATE TO public USING ((auth.uid() = recipient_id)) WITH CHECK ((auth.uid() = recipient_id));
CREATE POLICY user_view_own_notifications ON public.notifications AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = recipient_id));
CREATE POLICY admin_full_access_payment_history ON public.payment_history AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY teacher_view_own_payment_history ON public.payment_history AS PERMISSIVE FOR SELECT TO authenticated USING ((teacher_id = auth.uid()));
CREATE POLICY "admin select all playground credits" ON public.playground_credits AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "select own balance" ON public.playground_credits AS PERMISSIVE FOR SELECT TO public USING ((user_id = auth.uid()));
CREATE POLICY admin_modify_all_profiles ON public.profiles AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admin_view_all_profiles ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY teachers_view_assigned_students ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.teacher_id = auth.uid()) AND (s.student_id = profiles.user_id)))));
CREATE POLICY users_view_own_profile ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
CREATE POLICY "Admin full access push_tokens" ON public.push_tokens AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users manage own tokens" ON public.push_tokens AS PERMISSIVE FOR ALL TO public USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY admin_full_access_resources ON public.resources AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY student_view_own_resources ON public.resources AS PERMISSIVE FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM topics
  WHERE ((topics.id = resources.topic_id) AND (topics.student_id = auth.uid())))));
CREATE POLICY teacher_view_student_resources ON public.resources AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (topics t
     JOIN students s ON ((s.student_id = t.student_id)))
  WHERE ((s.teacher_id = auth.uid()) AND (t.id = resources.topic_id)))));
CREATE POLICY admin_full_access_lesson_tracking ON public.student_lesson_tracking AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY student_view_own_tracking ON public.student_lesson_tracking AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = student_id));
CREATE POLICY teacher_manage_student_tracking ON public.student_lesson_tracking AS PERMISSIVE FOR ALL TO authenticated USING ((teacher_id = auth.uid())) WITH CHECK ((teacher_id = auth.uid()));
CREATE POLICY teacher_view_student_tracking ON public.student_lesson_tracking AS PERMISSIVE FOR SELECT TO authenticated USING ((teacher_id = auth.uid()));
CREATE POLICY admin_full_access_student_lessons ON public.student_lessons AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY student_view_own_lessons ON public.student_lessons AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = student_id));
CREATE POLICY teacher_manage_student_lessons ON public.student_lessons AS PERMISSIVE FOR ALL TO authenticated USING ((teacher_id = auth.uid())) WITH CHECK ((teacher_id = auth.uid()));
CREATE POLICY teacher_view_student_lessons ON public.student_lessons AS PERMISSIVE FOR SELECT TO authenticated USING ((teacher_id = auth.uid()));
CREATE POLICY admin_full_access_resource_completion ON public.student_resource_completion AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY student_view_own_completion ON public.student_resource_completion AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = student_id));
CREATE POLICY teacher_manage_student_completion ON public.student_resource_completion AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.teacher_id = auth.uid()) AND (s.student_id = student_resource_completion.student_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.teacher_id = auth.uid()) AND (s.student_id = student_resource_completion.student_id)))));
CREATE POLICY teacher_view_student_completion ON public.student_resource_completion AS PERMISSIVE FOR SELECT TO authenticated USING (teacher_owns_student(auth.uid(), student_id));
CREATE POLICY admin_full_access_students ON public.students AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY student_view_teacher_assignment ON public.students AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = student_id));
CREATE POLICY teacher_view_own_students ON public.students AS PERMISSIVE FOR SELECT TO authenticated USING ((teacher_id = auth.uid()));
CREATE POLICY admin_full_access_teacher_balance ON public.teacher_balance AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY teacher_view_own_balance ON public.teacher_balance AS PERMISSIVE FOR SELECT TO authenticated USING ((teacher_id = auth.uid()));
CREATE POLICY admin_full_access_topics ON public.topics AS PERMISSIVE FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY student_view_own_topics ON public.topics AS PERMISSIVE FOR SELECT TO public USING ((auth.uid() = student_id));
CREATE POLICY teacher_view_student_topics ON public.topics AS PERMISSIVE FOR SELECT TO authenticated USING (((teacher_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.teacher_id = auth.uid()) AND (s.student_id = topics.student_id))))));
CREATE POLICY admin_full_access_trial_lessons ON public.trial_lessons AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY teacher_delete_own_trial_lessons ON public.trial_lessons AS PERMISSIVE FOR DELETE TO authenticated USING ((teacher_id = auth.uid()));
CREATE POLICY teacher_insert_own_trial_lessons ON public.trial_lessons AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((teacher_id = auth.uid()));
CREATE POLICY teacher_update_own_trial_lessons ON public.trial_lessons AS PERMISSIVE FOR UPDATE TO authenticated USING ((teacher_id = auth.uid())) WITH CHECK ((teacher_id = auth.uid()));
CREATE POLICY teacher_view_own_trial_lessons ON public.trial_lessons AS PERMISSIVE FOR SELECT TO authenticated USING ((teacher_id = auth.uid()));
CREATE POLICY admin_manage_all_roles ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY admin_view_all_roles ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY users_view_own_roles ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()));
;

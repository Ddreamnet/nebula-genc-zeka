import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Generates `count` future lesson-instance dates from `startDate`, honoring
 * EVERY slot on a given day of week (a student can have multiple slots on
 * the same day, e.g. Mon 11:00 AND Mon 11:50 back-to-back) — scans day by
 * day and collects all matching slots per day, sorted by start time.
 */
function generateInstanceDates(
  slots: { day_of_week: number; start_time: string; end_time: string }[],
  count: number,
  startDate: Date
): { lessonDate: string; startTime: string; endTime: string }[] {
  const results: { lessonDate: string; startTime: string; endTime: string }[] = [];
  const sortedSlots = [...slots].sort(
    (a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
  );
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  for (let offset = 0; offset <= 90 && results.length < count; offset++) {
    const candidate = new Date(current);
    candidate.setDate(candidate.getDate() + offset);
    const dow = candidate.getDay();
    const matchingSlots = sortedSlots.filter((s) => s.day_of_week === dow);
    for (const slot of matchingSlots) {
      if (results.length >= count) break;
      const yyyy = candidate.getFullYear();
      const mm = String(candidate.getMonth() + 1).padStart(2, '0');
      const dd = String(candidate.getDate()).padStart(2, '0');
      results.push({
        lessonDate: `${yyyy}-${mm}-${dd}`,
        startTime: slot.start_time,
        endTime: slot.end_time,
      });
    }
  }

  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { email, name, password, teacherId, lessons } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user } } = await supabaseAdmin.auth.getUser(token)

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const { data: userRoles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (roleError || !userRoles) {
      return new Response(
        JSON.stringify({ error: 'Only admins can create student accounts' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role: 'student'
      }
    })

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // handle_new_user trigger creates the profile AND the 'student' user_roles
    // row itself (it reads user_metadata.role, set above) — do not insert it
    // again here, that would hit the unique(user_id, role) constraint.

    const { error: studentError } = await supabaseAdmin
      .from('students')
      .insert({
        student_id: authData.user.id,
        teacher_id: teacherId
      })

    if (studentError) {
      console.error('Student relationship error:', studentError)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: 'Failed to create student relationship' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (lessons && lessons.length > 0) {
      const lessonsToInsert = lessons.map((lesson: any) => ({
        student_id: authData.user.id,
        teacher_id: teacherId,
        day_of_week: lesson.day_of_week,
        start_time: lesson.start_time,
        end_time: lesson.end_time
      }))

      const { error: lessonsError } = await supabaseAdmin
        .from('student_lessons')
        .insert(lessonsToInsert)

      if (lessonsError) {
        console.error('Lessons error:', lessonsError)
      } else {
        const totalLessons = lessons.length * 4;
        const today = new Date();

        const instanceDates = generateInstanceDates(
          lessons.map((l: any) => ({
            day_of_week: l.day_of_week,
            start_time: l.start_time,
            end_time: l.end_time,
          })),
          totalLessons,
          today
        );

        if (instanceDates.length > 0) {
          const instanceRows = instanceDates.map((inst, idx) => ({
            student_id: authData.user.id,
            teacher_id: teacherId,
            lesson_number: idx + 1,
            lesson_date: inst.lessonDate,
            start_time: inst.startTime,
            end_time: inst.endTime,
            status: 'planned',
          }));

          const { error: instanceError } = await supabaseAdmin
            .from('lesson_instances')
            .insert(instanceRows);

          if (instanceError) {
            console.error('Instance generation error:', instanceError);
          } else {
            const { error: trackingError } = await supabaseAdmin
              .from('student_lesson_tracking')
              .insert({
                student_id: authData.user.id,
                teacher_id: teacherId,
                lessons_per_week: lessons.length,
              });

            if (trackingError) {
              console.error('Tracking record error:', trackingError);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authData.user.id,
        message: 'Student account created successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An unknown error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

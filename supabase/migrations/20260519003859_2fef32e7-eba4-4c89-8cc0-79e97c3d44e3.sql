ALTER TABLE public.results ADD COLUMN IF NOT EXISTS school text;

DROP FUNCTION IF EXISTS public.get_top10(uuid);
DROP FUNCTION IF EXISTS public.lookup_result(uuid, text);

CREATE OR REPLACE FUNCTION public.get_top10(_exam_id uuid)
 RETURNS TABLE(rank integer, student_name text, school text, marks numeric, grade text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT r.rank, r.student_name, r.school, r.marks, r.grade
  FROM public.results r
  JOIN public.exams e ON e.id = r.exam_id
  WHERE r.exam_id = _exam_id AND e.is_published = true
  ORDER BY r.rank ASC NULLS LAST, r.marks DESC
  LIMIT 10;
$$;

CREATE OR REPLACE FUNCTION public.lookup_result(_exam_id uuid, _index_number text)
 RETURNS TABLE(student_name text, school text, index_number text, exam_name text, subject text, marks numeric, grade text, rank integer, teacher_comment text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT r.student_name, r.school, r.index_number, e.exam_name, e.subject,
         r.marks, r.grade, r.rank, r.teacher_comment
  FROM public.results r
  JOIN public.exams e ON e.id = r.exam_id
  WHERE r.exam_id = _exam_id AND e.is_published = true
    AND lower(trim(r.index_number)) = lower(trim(_index_number))
  LIMIT 1;
$$;
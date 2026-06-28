import type { CaseStatus, StudentCase as Case } from "@/lib/backend-types";
import { hasRequiredProfileFields } from "@/lib/case-progress";

export function buildCaseProfilePayload(
  data: Case,
  options?: { markComplete?: boolean; forceStatus?: CaseStatus },
) {
  const required = hasRequiredProfileFields(data);
  let status = data.status;
  if (options?.forceStatus) {
    status = options.forceStatus;
  } else if (options?.markComplete && required) {
    status = "profile_complete";
  }

  return {
    student_name: data.student_name,
    student_english_name: data.student_english_name,
    date_of_birth: data.date_of_birth,
    gender: data.gender,
    current_grade: data.current_grade,
    current_school: data.current_school,
    current_country: data.current_country,
    current_city: data.current_city,
    hk_residency_status: data.hk_residency_status,
    passport_status: data.passport_status,
    desired_entry_grade: data.desired_entry_grade,
    desired_entry_year: data.desired_entry_year,
    current_academic_performance: data.current_academic_performance,
    strongest_subjects: data.strongest_subjects,
    weakest_subjects: data.weakest_subjects,
    english_level: data.english_level,
    chinese_level: data.chinese_level,
    current_curriculum: data.current_curriculum,
    desired_curriculum: data.desired_curriculum,
    preferred_school_type: data.preferred_school_type,
    preferred_location: data.preferred_location,
    budget_range: data.budget_range,
    commute_preference: data.commute_preference,
    school_shortlist: data.school_shortlist,
    extracurricular_activities: data.extracurricular_activities,
    awards: data.awards,
    career_interests: data.career_interests,
    parent_goals: data.parent_goals,
    learning_support_needs: data.learning_support_needs,
    parent_name: data.parent_name,
    parent_phone: data.parent_phone,
    status,
  };
}

import { useTranslation } from "react-i18next";
import type { StudentCase as Case } from "@/lib/backend-types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const PROFILE_SECTION_IDS = ["student", "academic", "preferences", "personal"] as const;
export type ProfileSectionId = (typeof PROFILE_SECTION_IDS)[number];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function arr(v: string[] | null) {
  return (v ?? []).join(", ");
}
function toArr(v: string): string[] {
  return v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function StudentSection({
  data,
  update,
}: {
  data: Case;
  update: (p: Partial<Case>) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("parent.fields.studentName")}>
        <Input
          value={data.student_name ?? ""}
          onChange={(e) => update({ student_name: e.target.value })}
        />
      </Field>
      <Field label={t("parent.fields.englishName")}>
        <Input
          value={data.student_english_name ?? ""}
          onChange={(e) => update({ student_english_name: e.target.value })}
        />
      </Field>
      <Field label={t("parent.fields.dob")}>
        <Input
          type="date"
          value={data.date_of_birth ?? ""}
          onChange={(e) => update({ date_of_birth: e.target.value })}
        />
      </Field>
      <Field label={t("parent.fields.gender")}>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={data.gender ?? ""}
          onChange={(e) => update({ gender: e.target.value })}
        >
          <option value="">{t("parent.fields.genderSelect")}</option>
          <option value="Male">{t("parent.genderMale")}</option>
          <option value="Female">{t("parent.genderFemale")}</option>
          <option value="Other">{t("parent.genderOther")}</option>
          <option value="Prefer not to say">{t("parent.genderPreferNot")}</option>
        </select>
      </Field>
      <Field label={t("parent.fields.currentGrade")}>
        <Input
          value={data.current_grade ?? ""}
          onChange={(e) => update({ current_grade: e.target.value })}
          placeholder="e.g. Grade 6"
        />
      </Field>
      <Field label={t("parent.fields.currentSchool")}>
        <Input
          value={data.current_school ?? ""}
          onChange={(e) => update({ current_school: e.target.value })}
        />
      </Field>
      <Field label={t("parent.fields.currentCountry")}>
        <Input
          value={data.current_country ?? ""}
          onChange={(e) => update({ current_country: e.target.value })}
        />
      </Field>
      <Field label={t("parent.fields.currentCity")}>
        <Input
          value={data.current_city ?? ""}
          onChange={(e) => update({ current_city: e.target.value })}
        />
      </Field>
      <Field label={t("parent.fields.hkResidency")}>
        <Input
          value={data.hk_residency_status ?? ""}
          onChange={(e) => update({ hk_residency_status: e.target.value })}
          placeholder="e.g. Permanent Resident, Dependant visa, None"
        />
      </Field>
      <Field label={t("parent.fields.passport")}>
        <Input
          value={data.passport_status ?? ""}
          onChange={(e) => update({ passport_status: e.target.value })}
        />
      </Field>
      <Field label={t("parent.fields.desiredGrade")}>
        <Input
          value={data.desired_entry_grade ?? ""}
          onChange={(e) => update({ desired_entry_grade: e.target.value })}
          placeholder="e.g. Year 7 / Form 1"
        />
      </Field>
      <Field label={t("parent.fields.desiredYear")}>
        <Input
          value={data.desired_entry_year ?? ""}
          onChange={(e) => update({ desired_entry_year: e.target.value })}
          placeholder="e.g. 2026"
        />
      </Field>
      <Field label={t("parent.fields.parentName")}>
        <Input
          value={data.parent_name ?? ""}
          onChange={(e) => update({ parent_name: e.target.value })}
        />
      </Field>
      <Field label={t("parent.fields.parentPhone")}>
        <Input
          value={data.parent_phone ?? ""}
          onChange={(e) => update({ parent_phone: e.target.value })}
        />
      </Field>
    </div>
  );
}

export function HkProfileChecklist({
  data,
  update,
}: {
  data: Case;
  update: (p: Partial<Case>) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("parent.fields.hkResidency")}>
        <Input
          value={data.hk_residency_status ?? ""}
          onChange={(e) => update({ hk_residency_status: e.target.value })}
          placeholder="e.g. Permanent Resident, Dependant visa, None"
        />
      </Field>
      <Field label={t("parent.fields.passport")}>
        <Input
          value={data.passport_status ?? ""}
          onChange={(e) => update({ passport_status: e.target.value })}
        />
      </Field>
      <Field label={t("parent.fields.englishLevel")}>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={data.english_level ?? ""}
          onChange={(e) => update({ english_level: e.target.value })}
        >
          <option value="">{t("parent.fields.genderSelect")}</option>
          <option value="Native / fluent">{t("parent.levelNative")}</option>
          <option value="Strong">{t("parent.levelStrong")}</option>
          <option value="Intermediate">{t("parent.levelIntermediate")}</option>
          <option value="Developing">{t("parent.levelDeveloping")}</option>
          <option value="Beginner">{t("parent.levelBeginner")}</option>
        </select>
      </Field>
      <Field label={t("parent.fields.chineseLevel")}>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={data.chinese_level ?? ""}
          onChange={(e) => update({ chinese_level: e.target.value })}
        >
          <option value="">{t("parent.fields.genderSelect")}</option>
          <option value="Native / fluent">{t("parent.levelNative")}</option>
          <option value="Strong">{t("parent.levelStrong")}</option>
          <option value="Intermediate">{t("parent.levelIntermediate")}</option>
          <option value="Developing">{t("parent.levelDeveloping")}</option>
          <option value="None">{t("parent.levelNone")}</option>
        </select>
      </Field>
      <Field label={t("parent.fields.desiredCurr")}>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={data.desired_curriculum ?? ""}
          onChange={(e) => update({ desired_curriculum: e.target.value })}
        >
          <option value="">{t("parent.fields.notDecided")}</option>
          <option value="IB">{t("parent.currIB")}</option>
          <option value="A-Level">{t("parent.currAL")}</option>
          <option value="DSE">{t("parent.currDSE")}</option>
          <option value="Bilingual IB">{t("parent.currBilingual")}</option>
        </select>
      </Field>
      <Field label={t("parent.fields.currentCurr")}>
        <Input
          value={data.current_curriculum ?? ""}
          onChange={(e) => update({ current_curriculum: e.target.value })}
          placeholder={t("parent.fields.currentCurrPh")}
        />
      </Field>
    </div>
  );
}

export function AcademicSection({
  data,
  update,
}: {
  data: Case;
  update: (p: Partial<Case>) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field label={t("parent.fields.academicPerf")}>
          <Textarea
            rows={3}
            value={data.current_academic_performance ?? ""}
            onChange={(e) => update({ current_academic_performance: e.target.value })}
            placeholder={t("parent.fields.academicPlaceholder")}
          />
        </Field>
      </div>
      <Field label={t("parent.fields.strongest")}>
        <Input
          value={arr(data.strongest_subjects)}
          onChange={(e) => update({ strongest_subjects: toArr(e.target.value) })}
          placeholder={t("parent.fields.commaSep")}
        />
      </Field>
      <Field label={t("parent.fields.weakest")}>
        <Input
          value={arr(data.weakest_subjects)}
          onChange={(e) => update({ weakest_subjects: toArr(e.target.value) })}
          placeholder={t("parent.fields.commaSep")}
        />
      </Field>
      <Field label={t("parent.fields.englishLevel")}>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={data.english_level ?? ""}
          onChange={(e) => update({ english_level: e.target.value })}
        >
          <option value="">{t("parent.fields.genderSelect")}</option>
          <option value="Native / fluent">{t("parent.levelNative")}</option>
          <option value="Strong">{t("parent.levelStrong")}</option>
          <option value="Intermediate">{t("parent.levelIntermediate")}</option>
          <option value="Developing">{t("parent.levelDeveloping")}</option>
          <option value="Beginner">{t("parent.levelBeginner")}</option>
        </select>
      </Field>
      <Field label={t("parent.fields.chineseLevel")}>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={data.chinese_level ?? ""}
          onChange={(e) => update({ chinese_level: e.target.value })}
        >
          <option value="">{t("parent.fields.genderSelect")}</option>
          <option value="Native / fluent">{t("parent.levelNative")}</option>
          <option value="Strong">{t("parent.levelStrong")}</option>
          <option value="Intermediate">{t("parent.levelIntermediate")}</option>
          <option value="Developing">{t("parent.levelDeveloping")}</option>
          <option value="None">{t("parent.levelNone")}</option>
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label={t("parent.fields.currentCurr")}>
          <Input
            value={data.current_curriculum ?? ""}
            onChange={(e) => update({ current_curriculum: e.target.value })}
            placeholder={t("parent.fields.currentCurrPh")}
          />
        </Field>
      </div>
    </div>
  );
}

export function PreferencesSection({
  data,
  update,
}: {
  data: Case;
  update: (p: Partial<Case>) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t("parent.fields.desiredCurr")}>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={data.desired_curriculum ?? ""}
          onChange={(e) => update({ desired_curriculum: e.target.value })}
        >
          <option value="">{t("parent.fields.notDecided")}</option>
          <option value="IB">{t("parent.currIB")}</option>
          <option value="A-Level">{t("parent.currAL")}</option>
          <option value="DSE">{t("parent.currDSE")}</option>
          <option value="Bilingual IB">{t("parent.currBilingual")}</option>
        </select>
      </Field>
      <Field label={t("parent.fields.prefSchoolType")}>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={data.preferred_school_type ?? ""}
          onChange={(e) => update({ preferred_school_type: e.target.value })}
        >
          <option value="">{t("parent.fields.notDecided")}</option>
          <option value="Local">{t("parent.schoolLocal")}</option>
          <option value="DSS">{t("parent.schoolDSS")}</option>
          <option value="International">{t("parent.schoolIntl")}</option>
          <option value="Bilingual">{t("parent.schoolBilingual")}</option>
        </select>
      </Field>
      <Field label={t("parent.fields.prefLocation")}>
        <Input
          value={data.preferred_location ?? ""}
          onChange={(e) => update({ preferred_location: e.target.value })}
          placeholder={t("parent.fields.prefLocationPh")}
        />
      </Field>
      <Field label={t("parent.fields.budget")}>
        <Input
          value={data.budget_range ?? ""}
          onChange={(e) => update({ budget_range: e.target.value })}
          placeholder={t("parent.fields.budgetPh")}
        />
      </Field>
      <Field label={t("parent.fields.commute")}>
        <Input
          value={data.commute_preference ?? ""}
          onChange={(e) => update({ commute_preference: e.target.value })}
          placeholder={t("parent.fields.commutePh")}
        />
      </Field>
      <Field label={t("parent.fields.shortlist")}>
        <Input
          value={arr(data.school_shortlist)}
          onChange={(e) => update({ school_shortlist: toArr(e.target.value) })}
          placeholder={t("parent.fields.commaSep")}
        />
      </Field>
    </div>
  );
}

export function PersonalSection({
  data,
  update,
}: {
  data: Case;
  update: (p: Partial<Case>) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4">
      <Field label={t("parent.fields.extracurricular")}>
        <Textarea
          rows={3}
          value={data.extracurricular_activities ?? ""}
          onChange={(e) => update({ extracurricular_activities: e.target.value })}
          placeholder={t("parent.fields.extracurricularPh")}
        />
      </Field>
      <Field label={t("parent.fields.awards")}>
        <Textarea
          rows={2}
          value={data.awards ?? ""}
          onChange={(e) => update({ awards: e.target.value })}
        />
      </Field>
      <Field label={t("parent.fields.career")}>
        <Textarea
          rows={2}
          value={data.career_interests ?? ""}
          onChange={(e) => update({ career_interests: e.target.value })}
        />
      </Field>
      <Field label={t("parent.fields.parentGoals")}>
        <Textarea
          rows={2}
          value={data.parent_goals ?? ""}
          onChange={(e) => update({ parent_goals: e.target.value })}
        />
      </Field>
      <Field label={t("parent.fields.learningSupport")}>
        <Textarea
          rows={2}
          value={data.learning_support_needs ?? ""}
          onChange={(e) => update({ learning_support_needs: e.target.value })}
          placeholder={t("parent.fields.learningSupportPh")}
        />
      </Field>
    </div>
  );
}

export function ProfileSectionTabs({
  section,
  setSection,
}: {
  section: ProfileSectionId;
  setSection: (id: ProfileSectionId) => void;
}) {
  const { t } = useTranslation();
  const label = (id: ProfileSectionId) => {
    if (id === "student") return t("parent.tabStudent");
    if (id === "academic") return t("parent.tabAcademic");
    if (id === "preferences") return t("parent.tabPreferences");
    return t("parent.tabPersonal");
  };

  return (
    <div className="flex gap-1 border-b border-border">
      {PROFILE_SECTION_IDS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => setSection(id)}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            section === id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label(id)}
          {section === id && (
            <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
          )}
        </button>
      ))}
    </div>
  );
}

export function ProfileSectionBody({
  section,
  data,
  update,
}: {
  section: ProfileSectionId;
  data: Case;
  update: (p: Partial<Case>) => void;
}) {
  if (section === "student") return <StudentSection data={data} update={update} />;
  if (section === "academic") return <AcademicSection data={data} update={update} />;
  if (section === "preferences") return <PreferencesSection data={data} update={update} />;
  return <PersonalSection data={data} update={update} />;
}

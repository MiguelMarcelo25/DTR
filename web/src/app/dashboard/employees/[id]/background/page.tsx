'use client';

import { useParams } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  TextField,
  DateField,
  TextareaField,
  SelectField,
  CheckboxField,
  type SelectOption,
} from '@/components/ui/form';
import { formatDate } from '@/lib/utils';
import { EmployeeTabs } from '@/features/employees/components/EmployeeTabs';
import { BackgroundSection } from '@/features/employees/components/BackgroundSection';
import * as api from '@/features/employees/api';
import {
  SKILL_LEVELS,
  emergencyContactSchema,
  dependentSchema,
  educationSchema,
  workExperienceSchema,
  skillSchema,
  trainingSchema,
  type EmergencyContactValues,
  type DependentValues,
  type EducationValues,
  type WorkExperienceValues,
  type SkillValues,
  type TrainingValues,
} from '@/schemas/employees.schema';

function dateInput(value: string | null | undefined): string {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}
function trimOrNull(v: string | undefined) {
  const t = v?.trim();
  return t ? t : null;
}
function numOrNull(v: string | undefined) {
  const t = v?.trim();
  return t ? Number(t) : null;
}

const skillLevelOptions: SelectOption[] = SKILL_LEVELS.map((l) => ({ label: l, value: l }));

export default function EmployeeBackgroundPage() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const canManage = hasRole('SUPER_ADMIN', 'ADMIN', 'HR');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="animate-fade-up">
        <PageHeader
          title="Background"
          description="Emergency contacts, dependents, education, experience, skills and trainings."
        />
        <EmployeeTabs employeeId={id} />
      </div>

      <div className="animate-fade-up space-y-6" style={{ animationDelay: '60ms' }}>
        {/* Emergency contacts */}
        <BackgroundSection<api.EmergencyContact, EmergencyContactValues>
          title="Emergency Contacts"
          queryKey={['employee', id, 'emergency-contacts']}
          canManage={canManage}
          schema={emergencyContactSchema}
          list={() => api.listEmergencyContacts(id)}
          create={(p) => api.createEmergencyContact(id, p)}
          update={(c, p) => api.updateEmergencyContact(id, c, p)}
          remove={(c) => api.deleteEmergencyContact(id, c)}
          renderItem={(c) => (
            <div>
              <p className="font-medium">
                {c.fullName} {c.isPrimary && <span className="text-xs text-primary">(Primary)</span>}
              </p>
              <p className="text-muted-foreground">
                {[c.relationship, c.contactNumber, c.address].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
          )}
          toForm={(c) => ({
            fullName: c?.fullName ?? '',
            relationship: c?.relationship ?? '',
            contactNumber: c?.contactNumber ?? '',
            address: c?.address ?? '',
            isPrimary: c?.isPrimary ?? false,
          })}
          toPayload={(v) => ({
            fullName: v.fullName.trim(),
            relationship: trimOrNull(v.relationship),
            contactNumber: trimOrNull(v.contactNumber),
            address: trimOrNull(v.address),
            isPrimary: v.isPrimary,
          })}
          renderFields={() => (
            <>
              <TextField name="fullName" label="Full name" required />
              <TextField name="relationship" label="Relationship" />
              <TextField name="contactNumber" label="Contact number" type="tel" />
              <TextField name="address" label="Address" />
              <CheckboxField name="isPrimary" label="Primary contact" />
            </>
          )}
        />

        {/* Dependents */}
        <BackgroundSection<api.Dependent, DependentValues>
          title="Dependents"
          queryKey={['employee', id, 'dependents']}
          canManage={canManage}
          schema={dependentSchema}
          list={() => api.listDependents(id)}
          create={(p) => api.createDependent(id, p)}
          update={(c, p) => api.updateDependent(id, c, p)}
          remove={(c) => api.deleteDependent(id, c)}
          renderItem={(d) => (
            <div>
              <p className="font-medium">
                {d.fullName}{' '}
                {d.isDependentForBenefits && <span className="text-xs text-primary">(Benefits)</span>}
              </p>
              <p className="text-muted-foreground">
                {[d.relationship, d.dateOfBirth ? formatDate(d.dateOfBirth) : null, d.contactNumber]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </p>
            </div>
          )}
          toForm={(d) => ({
            fullName: d?.fullName ?? '',
            relationship: d?.relationship ?? '',
            dateOfBirth: dateInput(d?.dateOfBirth),
            contactNumber: d?.contactNumber ?? '',
            isDependentForBenefits: d?.isDependentForBenefits ?? false,
          })}
          toPayload={(v) => ({
            fullName: v.fullName.trim(),
            relationship: trimOrNull(v.relationship),
            dateOfBirth: v.dateOfBirth ? v.dateOfBirth : null,
            contactNumber: trimOrNull(v.contactNumber),
            isDependentForBenefits: v.isDependentForBenefits,
          })}
          renderFields={() => (
            <>
              <TextField name="fullName" label="Full name" required />
              <TextField name="relationship" label="Relationship" />
              <DateField name="dateOfBirth" label="Date of birth" />
              <TextField name="contactNumber" label="Contact number" type="tel" />
              <CheckboxField name="isDependentForBenefits" label="Dependent for benefits" />
            </>
          )}
        />

        {/* Education */}
        <BackgroundSection<api.Education, EducationValues>
          title="Education"
          queryKey={['employee', id, 'education']}
          canManage={canManage}
          schema={educationSchema}
          list={() => api.listEducation(id)}
          create={(p) => api.createEducation(id, p)}
          update={(c, p) => api.updateEducation(id, c, p)}
          remove={(c) => api.deleteEducation(id, c)}
          renderItem={(e) => (
            <div>
              <p className="font-medium">{e.schoolName}</p>
              <p className="text-muted-foreground">
                {[e.degree, e.educationLevel, e.yearGraduated ? `Grad ${e.yearGraduated}` : null, e.honors]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </p>
            </div>
          )}
          toForm={(e) => ({
            schoolName: e?.schoolName ?? '',
            degree: e?.degree ?? '',
            educationLevel: e?.educationLevel ?? '',
            yearStarted: e?.yearStarted != null ? String(e.yearStarted) : '',
            yearGraduated: e?.yearGraduated != null ? String(e.yearGraduated) : '',
            honors: e?.honors ?? '',
          })}
          toPayload={(v) => ({
            schoolName: v.schoolName.trim(),
            degree: trimOrNull(v.degree),
            educationLevel: trimOrNull(v.educationLevel),
            yearStarted: numOrNull(v.yearStarted),
            yearGraduated: numOrNull(v.yearGraduated),
            honors: trimOrNull(v.honors),
          })}
          renderFields={() => (
            <>
              <TextField name="schoolName" label="School name" required />
              <TextField name="degree" label="Degree" />
              <TextField name="educationLevel" label="Education level" />
              <div className="grid grid-cols-2 gap-3">
                <TextField name="yearStarted" label="Year started" />
                <TextField name="yearGraduated" label="Year graduated" />
              </div>
              <TextField name="honors" label="Honors" />
            </>
          )}
        />

        {/* Work experience */}
        <BackgroundSection<api.WorkExperience, WorkExperienceValues>
          title="Work Experience"
          queryKey={['employee', id, 'work-experience']}
          canManage={canManage}
          schema={workExperienceSchema}
          list={() => api.listWorkExperience(id)}
          create={(p) => api.createWorkExperience(id, p)}
          update={(c, p) => api.updateWorkExperience(id, c, p)}
          remove={(c) => api.deleteWorkExperience(id, c)}
          renderItem={(w) => (
            <div>
              <p className="font-medium">
                {w.position ? `${w.position} · ` : ''}
                {w.companyName}
              </p>
              <p className="text-muted-foreground">
                {[
                  w.startDate ? formatDate(w.startDate) : null,
                  w.endDate ? formatDate(w.endDate) : 'Present',
                ]
                  .filter(Boolean)
                  .join(' – ') || '—'}
              </p>
            </div>
          )}
          toForm={(w) => ({
            companyName: w?.companyName ?? '',
            position: w?.position ?? '',
            startDate: dateInput(w?.startDate),
            endDate: dateInput(w?.endDate),
            reasonForLeaving: w?.reasonForLeaving ?? '',
            jobDescription: w?.jobDescription ?? '',
            referenceName: w?.referenceName ?? '',
            referenceContact: w?.referenceContact ?? '',
          })}
          toPayload={(v) => ({
            companyName: v.companyName.trim(),
            position: trimOrNull(v.position),
            startDate: v.startDate ? v.startDate : null,
            endDate: v.endDate ? v.endDate : null,
            reasonForLeaving: trimOrNull(v.reasonForLeaving),
            jobDescription: trimOrNull(v.jobDescription),
            referenceName: trimOrNull(v.referenceName),
            referenceContact: trimOrNull(v.referenceContact),
          })}
          renderFields={() => (
            <>
              <TextField name="companyName" label="Company name" required />
              <TextField name="position" label="Position" />
              <div className="grid grid-cols-2 gap-3">
                <DateField name="startDate" label="Start date" />
                <DateField name="endDate" label="End date" />
              </div>
              <TextField name="reasonForLeaving" label="Reason for leaving" />
              <TextareaField name="jobDescription" label="Job description" />
              <div className="grid grid-cols-2 gap-3">
                <TextField name="referenceName" label="Reference name" />
                <TextField name="referenceContact" label="Reference contact" />
              </div>
            </>
          )}
        />

        {/* Skills */}
        <BackgroundSection<api.Skill, SkillValues>
          title="Skills"
          queryKey={['employee', id, 'skills']}
          canManage={canManage}
          schema={skillSchema}
          list={() => api.listSkills(id)}
          create={(p) => api.createSkill(id, p)}
          update={(c, p) => api.updateSkill(id, c, p)}
          remove={(c) => api.deleteSkill(id, c)}
          renderItem={(sk) => (
            <div>
              <p className="font-medium">{sk.skillName}</p>
              <p className="text-muted-foreground">
                {[
                  sk.skillLevel,
                  sk.yearsOfExperience != null ? `${sk.yearsOfExperience} yr` : null,
                  sk.remarks,
                ]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </p>
            </div>
          )}
          toForm={(sk) => ({
            skillName: sk?.skillName ?? '',
            skillLevel: sk?.skillLevel ?? 'BEGINNER',
            yearsOfExperience: sk?.yearsOfExperience != null ? String(sk.yearsOfExperience) : '',
            remarks: sk?.remarks ?? '',
          })}
          toPayload={(v) => ({
            skillName: v.skillName.trim(),
            skillLevel: v.skillLevel,
            yearsOfExperience: numOrNull(v.yearsOfExperience),
            remarks: trimOrNull(v.remarks),
          })}
          renderFields={() => (
            <>
              <TextField name="skillName" label="Skill name" required />
              <SelectField name="skillLevel" label="Level" options={skillLevelOptions} />
              <TextField name="yearsOfExperience" label="Years of experience" />
              <TextareaField name="remarks" label="Remarks" />
            </>
          )}
        />

        {/* Trainings */}
        <BackgroundSection<api.Training, TrainingValues>
          title="Trainings"
          queryKey={['employee', id, 'trainings']}
          canManage={canManage}
          schema={trainingSchema}
          list={() => api.listTrainings(id)}
          create={(p) => api.createTraining(id, p)}
          update={(c, p) => api.updateTraining(id, c, p)}
          remove={(c) => api.deleteTraining(id, c)}
          renderItem={(t) => (
            <div>
              <p className="font-medium">{t.name}</p>
              <p className="text-muted-foreground">
                {[
                  t.provider,
                  t.dateCompleted ? formatDate(t.dateCompleted) : null,
                  t.expirationDate ? `Exp ${formatDate(t.expirationDate)}` : null,
                  t.certificateNumber,
                ]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </p>
            </div>
          )}
          toForm={(t) => ({
            name: t?.name ?? '',
            provider: t?.provider ?? '',
            dateCompleted: dateInput(t?.dateCompleted),
            expirationDate: dateInput(t?.expirationDate),
            certificateNumber: t?.certificateNumber ?? '',
          })}
          toPayload={(v) => ({
            name: v.name.trim(),
            provider: trimOrNull(v.provider),
            dateCompleted: v.dateCompleted ? v.dateCompleted : null,
            expirationDate: v.expirationDate ? v.expirationDate : null,
            certificateNumber: trimOrNull(v.certificateNumber),
          })}
          renderFields={() => (
            <>
              <TextField name="name" label="Training name" required />
              <TextField name="provider" label="Provider" />
              <div className="grid grid-cols-2 gap-3">
                <DateField name="dateCompleted" label="Date completed" />
                <DateField name="expirationDate" label="Expiration date" />
              </div>
              <TextField name="certificateNumber" label="Certificate number" />
            </>
          )}
        />
      </div>
    </div>
  );
}

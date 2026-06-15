'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { KeyRound, Pencil, Inbox } from 'lucide-react';
import { useMyEmployeeId } from '@/features/profile/useMyEmployeeId';
import { fetchEmployee, fetchProfile } from '@/features/profile/api';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { OverviewTab } from '@/features/profile/components/tabs/OverviewTab';
import { PersonalTab } from '@/features/profile/components/tabs/PersonalTab';
import { EmploymentTab } from '@/features/profile/components/tabs/EmploymentTab';
import { EmergencyContactsTab } from '@/features/profile/components/tabs/EmergencyContactsTab';
import { DependentsTab } from '@/features/profile/components/tabs/DependentsTab';
import { EducationTab } from '@/features/profile/components/tabs/EducationTab';
import { WorkExperienceTab } from '@/features/profile/components/tabs/WorkExperienceTab';
import { SkillsTab } from '@/features/profile/components/tabs/SkillsTab';
import { TrainingsTab } from '@/features/profile/components/tabs/TrainingsTab';
import { DocumentsTab } from '@/features/profile/components/tabs/DocumentsTab';
import { ActivityTab } from '@/features/profile/components/tabs/ActivityTab';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'personal', label: 'Personal' },
  { value: 'employment', label: 'Employment' },
  { value: 'emergency', label: 'Emergency Contacts' },
  { value: 'dependents', label: 'Dependents' },
  { value: 'education', label: 'Education' },
  { value: 'work', label: 'Work Experience' },
  { value: 'skills', label: 'Skills' },
  { value: 'trainings', label: 'Trainings' },
  { value: 'documents', label: 'Documents' },
  { value: 'activity', label: 'Activity' },
];

export default function ProfilePage() {
  const { employeeId, isLoading: idLoading, isError: idError } = useMyEmployeeId();

  const { data: employee, isLoading: empLoading } = useQuery({
    queryKey: ['profile', employeeId, 'employee'],
    queryFn: () => fetchEmployee(employeeId as string),
    enabled: !!employeeId,
  });

  const { data: profile, isLoading: profLoading } = useQuery({
    queryKey: ['profile', employeeId, 'profile'],
    queryFn: () => fetchProfile(employeeId as string),
    enabled: !!employeeId,
  });

  if (idLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="My Profile" description="Your personal and employment information." />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (idError || !employeeId) {
    return (
      <div>
        <PageHeader title="My Profile" />
        <EmptyState
          icon={Inbox}
          title="No employee record"
          description="Your account is not linked to an employee record. Please contact HR."
        />
      </div>
    );
  }

  const headerLoading = empLoading || profLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Your personal and employment information."
        action={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard/profile/change-password">
                <KeyRound className="h-4 w-4" />
                Change password
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/profile/edit">
                <Pencil className="h-4 w-4" />
                Edit profile
              </Link>
            </Button>
          </>
        }
      />

      {headerLoading ? (
        <Skeleton className="h-36 w-full" />
      ) : (
        <div className="animate-fade-up">
          <ProfileHeader employeeId={employeeId} employee={employee} profile={profile} />
        </div>
      )}

      <Tabs
        defaultValue="overview"
        className="animate-fade-up space-y-4"
        style={{ animationDelay: '60ms' }}
      >
        <div className="overflow-x-auto scrollbar-thin">
          <TabsList className="w-max">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview">
          <OverviewTab employee={employee} profile={profile} />
        </TabsContent>
        <TabsContent value="personal">
          <PersonalTab profile={profile} />
        </TabsContent>
        <TabsContent value="employment">
          <EmploymentTab employee={employee} profile={profile} />
        </TabsContent>
        <TabsContent value="emergency">
          <EmergencyContactsTab employeeId={employeeId} />
        </TabsContent>
        <TabsContent value="dependents">
          <DependentsTab employeeId={employeeId} />
        </TabsContent>
        <TabsContent value="education">
          <EducationTab employeeId={employeeId} />
        </TabsContent>
        <TabsContent value="work">
          <WorkExperienceTab employeeId={employeeId} />
        </TabsContent>
        <TabsContent value="skills">
          <SkillsTab employeeId={employeeId} />
        </TabsContent>
        <TabsContent value="trainings">
          <TrainingsTab employeeId={employeeId} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab employeeId={employeeId} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab employeeId={employeeId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

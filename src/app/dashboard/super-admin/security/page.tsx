import { PageHeader } from "@/components/page-header";
import { PaginationControls } from "@/components/pagination-controls";
import {
  DeviceList,
  DeviceManagementList,
  IncidentList,
  LoginActivityList,
  SecurityPolicyForm,
  SecurityTabs,
  SessionList,
  type SecurityTabKey,
} from "@/features/security";
import { countLoginActivities, listLoginActivities } from "@/repositories/login-activity.repository";
import { countSecurityIncidents, listSecurityIncidents } from "@/repositories/security-incident.repository";
import { getSecurityPolicy } from "@/repositories/security-policy.repository";
import { countDevices, listDevices } from "@/repositories/user-device.repository";
import { countSessions, listSessions } from "@/repositories/user-session.repository";
import type { SecurityIncidentStatus } from "@/types/security";

const PAGE_SIZE = 20;

// Every tab reads live, ever-changing state (who's logged in right now,
// what just failed) — never statically prerendered, same reasoning as
// every other admin data page.
export const dynamic = "force-dynamic";

interface SecurityPageProps {
  searchParams: Promise<{ tab?: string; status?: string; page?: string }>;
}

function isValidTab(value: string | undefined): value is SecurityTabKey {
  return (
    value === "devices" ||
    value === "sessions" ||
    value === "activities" ||
    value === "device-security" ||
    value === "policy" ||
    value === "incidents"
  );
}

export default async function SecurityPage({ searchParams }: SecurityPageProps) {
  const params = await searchParams;
  const tab: SecurityTabKey = isValidTab(params.tab) ? params.tab : "devices";
  const page = Math.max(1, Number(params.page) || 1);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Keamanan"
        description="Pantau akses akun, perangkat, sesi login, dan tangani insiden keamanan platform."
      />

      <SecurityTabs active={tab} />

      {tab === "devices" ? <ActiveDevicesTab page={page} /> : null}
      {tab === "sessions" ? <SessionsTab page={page} /> : null}
      {tab === "activities" ? <ActivitiesTab page={page} /> : null}
      {tab === "device-security" ? <DeviceSecurityTab page={page} /> : null}
      {tab === "policy" ? <PolicyTab /> : null}
      {tab === "incidents" ? <IncidentsTab status={params.status} page={page} /> : null}
    </div>
  );
}

async function ActiveDevicesTab({ page }: { page: number }) {
  const filter = { trustStatus: "TRUSTED" as const, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
  const [devices, total] = await Promise.all([listDevices(filter), countDevices(filter)]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <DeviceList devices={devices} />
      <PaginationControls
        page={page}
        totalPages={totalPages}
        buildHref={(targetPage) => buildHref("devices", targetPage)}
      />
    </div>
  );
}

async function DeviceSecurityTab({ page }: { page: number }) {
  const filter = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
  const [devices, total] = await Promise.all([listDevices(filter), countDevices(filter)]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <DeviceManagementList devices={devices} />
      <PaginationControls
        page={page}
        totalPages={totalPages}
        buildHref={(targetPage) => buildHref("device-security", targetPage)}
      />
    </div>
  );
}

async function SessionsTab({ page }: { page: number }) {
  const filter = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
  const [sessions, total] = await Promise.all([listSessions(filter), countSessions(filter)]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <SessionList sessions={sessions} />
      <PaginationControls
        page={page}
        totalPages={totalPages}
        buildHref={(targetPage) => buildHref("sessions", targetPage)}
      />
    </div>
  );
}

async function ActivitiesTab({ page }: { page: number }) {
  const filter = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
  const [activities, total] = await Promise.all([listLoginActivities(filter), countLoginActivities(filter)]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <LoginActivityList activities={activities} />
      <PaginationControls
        page={page}
        totalPages={totalPages}
        buildHref={(targetPage) => buildHref("activities", targetPage)}
      />
    </div>
  );
}

async function PolicyTab() {
  const policy = await getSecurityPolicy();
  return <SecurityPolicyForm policy={policy} />;
}

async function IncidentsTab({ status, page }: { status?: string; page: number }) {
  const filter = {
    status: (status as SecurityIncidentStatus | undefined) || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };
  const [incidents, total] = await Promise.all([listSecurityIncidents(filter), countSecurityIncidents(filter)]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <IncidentList incidents={incidents} />
      <PaginationControls
        page={page}
        totalPages={totalPages}
        buildHref={(targetPage) => {
          const query = new URLSearchParams();
          query.set("tab", "incidents");
          if (status) query.set("status", status);
          if (targetPage > 1) query.set("page", String(targetPage));
          return `/dashboard/super-admin/security?${query.toString()}`;
        }}
      />
    </div>
  );
}

function buildHref(tab: SecurityTabKey, targetPage: number): string {
  const query = new URLSearchParams();
  query.set("tab", tab);
  if (targetPage > 1) query.set("page", String(targetPage));
  return `/dashboard/super-admin/security?${query.toString()}`;
}

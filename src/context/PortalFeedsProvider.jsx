import { ActiveSessionsContext, useActiveSessions } from "../features/attendance/hooks/useActiveSessions";
import { AnnouncementAlertsContext, useAnnouncementAlerts } from "../features/updates/hooks/useAnnouncementAlerts";

export default function PortalFeedsProvider({
  mode = "student",
  sessionsPollIntervalMs = 5000,
  announcementsPollIntervalMs = 5000,
  enableAlerts = true,
  children,
}) {
  const sessionsState = useActiveSessions({
    mode,
    pollIntervalMs: sessionsPollIntervalMs,
    standalone: true,
  });

  const announcementsState = useAnnouncementAlerts({
    pollIntervalMs: announcementsPollIntervalMs,
    enableAlerts,
    standalone: true,
  });

  return (
    <ActiveSessionsContext.Provider value={sessionsState}>
      <AnnouncementAlertsContext.Provider value={announcementsState}>
        {children}
      </AnnouncementAlertsContext.Provider>
    </ActiveSessionsContext.Provider>
  );
}

import { useOnlineStatus } from "../sync/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="mb-4 rounded-lg bg-neutral-800 px-4 py-2 text-sm text-white">
      You're offline. Sales are saved on this device and will sync when you're
      back.
    </div>
  );
}

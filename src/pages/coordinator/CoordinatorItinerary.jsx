import { useEffect, useState } from "react";
import { itineraryApi } from "../../features/itinerary/api/itineraryApi";
import { useItinerary } from "../../features/itinerary/hooks/useItinerary";
import { useBusLocation } from "../../features/itinerary/hooks/useBusLocation";
import ItineraryView from "../../features/itinerary/components/ItineraryView";
import StopLiveActions from "../../features/itinerary/components/StopLiveActions";
import ShareLocationCard from "../../features/itinerary/components/ShareLocationCard";
import BusMarker from "../../features/itinerary/components/BusMarker";

export default function CoordinatorItinerary() {
  const [publishedList, setPublishedList] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    let active = true;
    itineraryApi
      .listPublished()
      .then((list) => {
        if (active && Array.isArray(list)) {
          setPublishedList(list);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const {
    data: itinerary,
    loading,
    error,
    refresh,
    isLive,
    isOffline,
    cachedAt,
  } = useItinerary(selectedId, { staffView: true });

  const {
    location: busLocation,
    status: busStatus,
    ageSeconds: busAgeSeconds,
  } = useBusLocation({
    itineraryId: itinerary?.id || null,
    enabled: Boolean(itinerary?.id),
  });

  return (
    <ItineraryView
      itinerary={itinerary}
      publishedList={publishedList}
      selectedItineraryId={selectedId}
      onSelectItinerary={(id) => setSelectedId(id)}
      loading={loading}
      error={error}
      onRetry={refresh}
      isLive={isLive}
      isOffline={isOffline}
      cachedAt={cachedAt}
      busLocation={busLocation}
      busStatus={busStatus}
      busAgeSeconds={busAgeSeconds}
      BusOverlayComponent={BusMarker}
      topSlot={itinerary?.id ? <ShareLocationCard itineraryId={itinerary.id} /> : null}
      showStaffNote={true}
      renderStaffActions={(stop) => (
        <StopLiveActions stop={stop} onChanged={refresh} />
      )}
      emptyMessage="No published itinerary yet. Ask an Admin to publish one in Itinerary Builder."
    />
  );
}

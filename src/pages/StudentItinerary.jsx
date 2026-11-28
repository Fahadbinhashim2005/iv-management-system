import { useEffect, useState } from "react";
import { itineraryApi } from "../features/itinerary/api/itineraryApi";
import { useItinerary } from "../features/itinerary/hooks/useItinerary";
import { useBusLocation } from "../features/itinerary/hooks/useBusLocation";
import ItineraryView from "../features/itinerary/components/ItineraryView";
import BusMarker from "../features/itinerary/components/BusMarker";

export default function StudentItinerary() {
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
  } = useItinerary(selectedId, { staffView: false });

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
      showStaffNote={false}
      emptyMessage="Itinerary not published yet"
    />
  );
}

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const CharityMap = ({
  venueCoordinates = [78.4744, 17.4123], // [lng, lat]
  venueName = "Celebration Venue",
  charities = [],
  selectedCharityId = null,
  onSelectCharity = () => {},
  height = "420px",
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const [venueLng, venueLat] = venueCoordinates;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize Leaflet map
    const map = L.map(mapContainerRef.current, {
      center: [venueLat, venueLng],
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Create custom Venue Icon
    const venueIcon = L.divIcon({
      className: "evora-venue-marker",
      html: `
        <div style="
          background: #0D1B2A;
          border: 2px solid #C9A13A;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          color: #C9A13A;
          font-size: 16px;
        ">
          📍
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -18],
    });

    // Venue Marker
    const venueMarker = L.marker([venueLat, venueLng], { icon: venueIcon }).addTo(map);
    venueMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 13px; line-height: 1.4;">
        <strong style="color: #0D1B2A; font-size: 14px;">📍 ${venueName}</strong>
        <p style="margin: 4px 0 0; color: #64748B;">Surplus Food Pickup Location</p>
      </div>
    `);

    // Add Charity Markers
    const bounds = L.latLngBounds([[venueLat, venueLng]]);

    charities.forEach((charity) => {
      const coords = charity.location?.coordinates || [78.4867, 17.3850];
      const cLng = coords[0];
      const cLat = coords[1];
      bounds.extend([cLat, cLng]);

      const isSelected = selectedCharityId === charity._id;
      const isTopPick = Boolean(charity.isTopPick);

      const markerColor = isTopPick ? "#C9A13A" : isSelected ? "#4A154B" : "#2563EB";
      const markerSymbol = isTopPick ? "⭐" : charity.type === "orphanage" ? "👶" : charity.type === "old-age home" ? "👴" : "🍲";

      const charityIcon = L.divIcon({
        className: `evora-charity-marker-${charity._id}`,
        html: `
          <div style="
            background: ${markerColor};
            border: 2px solid #FFFFFF;
            border-radius: 50%;
            width: ${isTopPick || isSelected ? "36px" : "28px"};
            height: ${isTopPick || isSelected ? "36px" : "28px"};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            font-size: ${isTopPick || isSelected ? "16px" : "13px"};
            cursor: pointer;
            transition: transform 0.2s;
            ${isTopPick ? "box-shadow: 0 0 12px #C9A13A;" : ""}
          ">
            ${markerSymbol}
          </div>
        `,
        iconSize: isTopPick || isSelected ? [36, 36] : [28, 28],
        iconAnchor: isTopPick || isSelected ? [18, 18] : [14, 14],
        popupAnchor: [0, -18],
      });

      const marker = L.marker([cLat, cLng], { icon: charityIcon }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; max-width: 240px;">
          ${isTopPick ? '<span style="background: #C9A13A; color: #FFF; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 4px;">⭐ AI Top Recommendation</span>' : ""}
          <strong style="color: #0D1B2A; display: block; font-size: 14px;">${charity.name}</strong>
          <span style="color: #4A154B; font-weight: 600; text-transform: uppercase; font-size: 11px;">${charity.type}</span>
          <p style="margin: 4px 0 2px; color: #475569;">📍 ${charity.address || ""}</p>
          <div style="margin-top: 6px; display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; color: #0D1B2A;">
            <span>🚗 ${charity.distanceKm !== undefined ? `${charity.distanceKm} km` : "Nearby"}</span>
            <span>👥 Cap: ${charity.capacityPerDay || 150}/day</span>
          </div>
          <button
            id="btn-select-${charity._id}"
            style="
              margin-top: 8px;
              width: 100%;
              background: #0D1B2A;
              color: #FFF;
              border: 1px solid #C9A13A;
              padding: 6px 10px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 600;
              cursor: pointer;
            "
          >
            ${isSelected ? "✓ Selected" : "Select for Donation"}
          </button>
        </div>
      `);

      marker.on("popupopen", () => {
        const btn = document.getElementById(`btn-select-${charity._id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectCharity(charity);
            map.closePopup();
          };
        }
      });

      marker.on("click", () => {
        onSelectCharity(charity);
      });

      markersRef.current.push(marker);
    });

    if (charities.length > 0) {
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 14 });
    }

    // Invalidate size to ensure map renders smoothly inside tabs/drawers
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [venueCoordinates, charities, selectedCharityId]);

  return (
    <div style={{ position: "relative", width: "100%", borderRadius: 14, overflow: "hidden", border: "1px solid #E2E8F0" }}>
      <div ref={mapContainerRef} style={{ width: "100%", height, background: "#E2E8F0" }} />
      
      {/* Map Legend Overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(4px)",
          border: "1px solid #CBD5E1",
          borderRadius: 8,
          padding: "8px 12px",
          fontSize: 11,
          fontWeight: 600,
          color: "#0F172A",
          display: "flex",
          gap: 12,
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          zIndex: 400,
          pointerEvents: "none",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span>📍</span> Venue
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ color: "#C9A13A" }}>⭐</span> Top AI Match
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ color: "#4A154B" }}>●</span> NGO / Shelter
        </span>
      </div>
    </div>
  );
};

export default CharityMap;

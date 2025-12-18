"use client";
import React, { useEffect, useMemo, useState } from "react";

interface SessionCreatorProps {
    mode: "current" | "future";
    location: { lat: number; lng: number };
    onCancel: () => void;
}

interface SessionFormState {
    locationName: string;
    startTime: string;
    endTime?: string;
}

export const SessionCreator: React.FC<SessionCreatorProps> = ({ mode, location, onCancel }) => {
    const [form, setForm] = useState<SessionFormState>({
        locationName: "",
        startTime: "",
        endTime: "",
    });
    const [isLoadingPlace, setIsLoadingPlace] = useState(false);
    const [placeError, setPlaceError] = useState<string | null>(null);

    const isFuture = mode === "future";

    const heading = useMemo(
        () => (isFuture ? "Create a future speaking session" : "Create a speaking session for now"),
        [isFuture]
    );

    useEffect(() => {
        const now = new Date();
        const tzOffsetMs = now.getTimezoneOffset() * 60000;
        const localISO = new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 16);

        setForm((prev) => ({
            ...prev,
            startTime: localISO,
        }));
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || !(window as any).google) {
            return;
        }

        try {
            const googleRef: typeof google = (window as any).google;
            if (!googleRef.maps?.places) {
                return;
            }

            setIsLoadingPlace(true);
            setPlaceError(null);

            const service = new googleRef.maps.places.PlacesService(document.createElement("div"));

            const request: google.maps.places.PlaceSearchRequest = {
                location: { lat: location.lat, lng: location.lng },
                radius: 50,
                type: "establishment",
            };

            service.nearbySearch(request, (results, status) => {
                setIsLoadingPlace(false);

                if (
                    status !== googleRef.maps.places.PlacesServiceStatus.OK ||
                    !results ||
                    results.length === 0
                ) {
                    setPlaceError("No nearby business found for this location.");
                    return;
                }

                // Prefer real businesses / points of interest over streets or routes
                const preferredTypes = new Set<string>(["establishment", "point_of_interest", "bar", "cafe", "restaurant", "store"]);
                const disallowedTypes = new Set<string>(["route", "street_address", "intersection", "premise"]);

                const bestMatch =
                    results.find((place) => {
                        if (!place.types || !place.name) return false;
                        const types = new Set(place.types);
                        // Exclude obvious non-business entries like routes
                        if ([...disallowedTypes].some((t) => types.has(t))) return false;
                        // Require at least one preferred type
                        return [...preferredTypes].some((t) => types.has(t));
                    }) || results[0];

                if (bestMatch && bestMatch.name) {
                    setForm((prev) => ({ ...prev, locationName: bestMatch.name! }));
                }
            });
        } catch (err) {
            console.error("Error fetching place information", err);
            setIsLoadingPlace(false);
            setPlaceError("Unable to look up business information.");
        }
    }, [location.lat, location.lng]);

    const handleChange = (field: keyof SessionFormState, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        console.log("Session created (draft)", {
            mode,
            location,
            locationName: form.locationName,
            startTime: form.startTime,
            endTime: form.endTime,
        });

        onCancel();
    };

    return (
        <div
            style={{
                borderRadius: 12,
                padding: 16,
                backgroundColor: "#ffffff",
                boxShadow: "0 2px 8px rgba(15,23,42,0.12)",
                maxWidth: 420,
            }}
        >
            <h3
                style={{
                    margin: 0,
                    marginBottom: 8,
                    fontSize: 16,
                    fontWeight: 600,
                }}
            >
                {heading}
            </h3>
            <p style={{ margin: 0, marginBottom: 12, fontSize: 13, color: "#4b5563" }}>
                Lat: {location.lat.toFixed(5)}, Lng: {location.lng.toFixed(5)}
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ fontSize: 13, color: "#111827" }}>
                    Location name
                    <input
                        type="text"
                        value={form.locationName}
                        onChange={(e) => handleChange("locationName", e.target.value)}
                        placeholder={isLoadingPlace ? "Looking up nearby business..." : "e.g. Cafe, park name"}
                        style={{
                            marginTop: 4,
                            padding: "6px 8px",
                            width: "100%",
                            borderRadius: 8,
                            border: "1px solid #d1d5db",
                            fontSize: 13,
                        }}
                    />
                </label>
                {placeError && (
                    <span style={{ fontSize: 12, color: "#b91c1c" }}>{placeError}</span>
                )}

                <label style={{ fontSize: 13, color: "#111827" }}>
                    Start time
                    <input
                        type="datetime-local"
                        value={form.startTime}
                        onChange={(e) => handleChange("startTime", e.target.value)}
                        style={{
                            marginTop: 4,
                            padding: "6px 8px",
                            width: "100%",
                            borderRadius: 8,
                            border: "1px solid #d1d5db",
                            fontSize: 13,
                        }}
                    />
                </label>

                <label style={{ fontSize: 13, color: "#111827" }}>
                    End time (optional)
                    <input
                        type="datetime-local"
                        value={form.endTime}
                        onChange={(e) => handleChange("endTime", e.target.value)}
                        style={{
                            marginTop: 4,
                            padding: "6px 8px",
                            width: "100%",
                            borderRadius: 8,
                            border: "1px solid #d1d5db",
                            fontSize: 13,
                        }}
                    />
                </label>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{
                            borderRadius: 999,
                            padding: "6px 12px",
                            border: "1px solid #d1d5db",
                            backgroundColor: "#ffffff",
                            fontSize: 13,
                            cursor: "pointer",
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        style={{
                            borderRadius: 999,
                            padding: "6px 12px",
                            border: "none",
                            backgroundColor: "#2563eb",
                            color: "#ffffff",
                            fontSize: 13,
                            cursor: "pointer",
                        }}
                    >
                        Save session
                    </button>
                </div>
            </form>
        </div>
    );
};

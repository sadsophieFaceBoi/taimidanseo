//this component will display a map along with markers for user locations
'use client';
import React, { useEffect, useState } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { useUserStore, waitForUserStoreReady } from 'taimidanseo/features/users/user-store';
import { SpeakingSession } from 'taimidanseo/features/language-sessions/speaking-session-models';
import {useSpeakingSessionStore} from 'taimidanseo/features/language-sessions/speaking-session-store';
import { User } from 'taimidanseo/features/users/user-models';
import { SessionCreator } from 'taimidanseo/features/language-sessions/components/speaking-session-creator-component';

const containerStyle = {
    width: '100%',
    height: '400px',
};  

const defaultCenter = {
    lat: 53.349805,
    lng: -6.26031,
};

type MapInteractionMode = 'none' | 'setLocation' | 'currentSession' | 'futureSession';

export const GoogleMapComponent: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationSetManually, setLocationSetManually] = useState(false);
    const [interactionMode, setInteractionMode] = useState<MapInteractionMode>('none');
    const [currentSessionLocation, setCurrentSessionLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [futureSessionLocation, setFutureSessionLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [sessionCreatorMode, setSessionCreatorMode] = useState<'current' | 'future' | null>(null);
    const currentUser = useUserStore((state) => state.currentUser);
    const activeSessions= useSpeakingSessionStore((state)=>state.nearbySpeakingSessions);
    
    //if the current user is loaded check their location and add a marker for them
    useEffect(() => {
        async function loadUser() {
            await waitForUserStoreReady();
        }
        loadUser();
    }, []);

    useEffect(() => {
        if (navigator.geolocation && !locationSetManually) {
            // Try without enableHighAccuracy first (better for laptops using Wi-Fi positioning)
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    setUserLocation({ lat: latitude, lng: longitude });
                    console.log('User location:', latitude, longitude, 'Accuracy:', accuracy, 'meters');
                },
                (error) => {
                    console.error('Error getting location:', error.message);
                    console.error('Error code:', error.code);
                    console.log('Click on the map to set your location manually');
                },
                {
                    enableHighAccuracy: false, // Better for laptops without GPS
                    timeout: 15000, // Give more time for Wi-Fi positioning
                    maximumAge: 0 // Don't use cached location
                }
            );
        }
    }, [locationSetManually]);

    const handleMapClick = (event: google.maps.MapMouseEvent) => {
        if (!event.latLng) return;

        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        if (interactionMode === 'setLocation') {
            setUserLocation({ lat, lng });
            setLocationSetManually(true);
            console.log('Location set manually:', lat, lng);
        } else if (interactionMode === 'currentSession') {
            setCurrentSessionLocation({ lat, lng });
            setSessionCreatorMode('current');
            console.log('Current session location selected:', lat, lng);
        } else if (interactionMode === 'futureSession') {
            setFutureSessionLocation({ lat, lng });
            setSessionCreatorMode('future');
            console.log('Future session location selected:', lat, lng);
        }
    };

    //display a google map with markers for active sessions
    return (
        <div style={{ width: '100%' }}>
            <div
                style={{
                    marginBottom: '12px',
                    display: 'flex',
                    justifyContent: 'flex-start',
                }}
            >
                <div
                    style={{
                        display: 'inline-flex',
                        gap: '8px',
                        padding: '6px 10px',
                        borderRadius: 999,
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        boxShadow: '0 2px 8px rgba(15,23,42,0.15)',
                        alignItems: 'center',
                    }}
                >
                <button
                    type="button"
                    onClick={() =>
                        setInteractionMode((prev) => (prev === 'setLocation' ? 'none' : 'setLocation'))
                    }
                    title="Set my location by clicking on the map"
                    style={{
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: 999,
                        padding: '6px 10px',
                        backgroundColor:
                            interactionMode === 'setLocation' ? '#2563eb' : 'transparent',
                        color: interactionMode === 'setLocation' ? '#ffffff' : '#0f172a',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 32,
                    }}
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
                        <path
                            d="M12 2V5M12 19V22M4 12H7M17 12H20"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={() =>
                        setInteractionMode((prev) => (prev === 'currentSession' ? 'none' : 'currentSession'))
                    }
                    title="Click on the map to place a current speaking session"
                    style={{
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: 999,
                        padding: '6px 10px',
                        backgroundColor:
                            interactionMode === 'currentSession' ? '#16a34a' : 'transparent',
                        color: interactionMode === 'currentSession' ? '#ffffff' : '#0f172a',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 32,
                    }}
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M5 20V6C5 4.89543 5.89543 4 7 4H17C18.1046 4 19 4.89543 19 6V20L15 17L12 19L9 17L5 20Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={() =>
                        setInteractionMode((prev) => (prev === 'futureSession' ? 'none' : 'futureSession'))
                    }
                    title="Click on the map to place a future speaking session"
                    style={{
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: 999,
                        padding: '6px 10px',
                        backgroundColor:
                            interactionMode === 'futureSession' ? '#f59e0b' : 'transparent',
                        color: interactionMode === 'futureSession' ? '#ffffff' : '#0f172a',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 32,
                    }}
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M12 8V12L15 15"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" />
                    </svg>
                </button>
                </div>
            </div>

            <LoadScript
                googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}
                libraries={['places']}
            >
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={userLocation || defaultCenter}
                    zoom={12}
                    onClick={handleMapClick}
                    options={{
                        streetViewControl: false,
                        mapTypeControl: false,
                    }}
                >
                {/* User's current location marker */}
                {userLocation && (
                    <Marker
                        position={userLocation}
                        title={locationSetManually ? 'Your Location (Set Manually)' : 'Your Location'}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: locationSetManually ? '#FF6B6B' : '#4285F4',
                            fillOpacity: 1,
                            strokeColor: '#FFFFFF',
                            strokeWeight: 2,
                        }}
                    />
                )}

                {/* New current session marker (draft) */}
                {currentSessionLocation && (
                    <Marker
                        position={currentSessionLocation}
                        title="New current speaking session"
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: '#34A853', // green
                            fillOpacity: 1,
                            strokeColor: '#FFFFFF',
                            strokeWeight: 2,
                        }}
                    />
                )}

                {/* New future session marker (draft) */}
                {futureSessionLocation && (
                    <Marker
                        position={futureSessionLocation}
                        title="New future speaking session"
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: '#FBBC05', // yellow/orange
                            fillOpacity: 1,
                            strokeColor: '#FFFFFF',
                            strokeWeight: 2,
                        }}
                    />
                )}

                {/* Active session markers */}
                {activeSessions.map((session) => (
                    <Marker
                        key={session.id}
                        position={{ lat: session.latitude, lng: session.longitude }}
                        title={session.locationName}
                    />
                ))}
                </GoogleMap>
            </LoadScript>

            {(() => {
                const draftLocation =
                    sessionCreatorMode === 'current'
                        ? currentSessionLocation
                        : sessionCreatorMode === 'future'
                        ? futureSessionLocation
                        : null;

                if (!sessionCreatorMode || !draftLocation) return null;

                return (
                    <div style={{ marginTop: '12px' }}>
                        <SessionCreator
                            mode={sessionCreatorMode}
                            location={draftLocation}
                            onCancel={() => setSessionCreatorMode(null)}
                        />
                    </div>
                );
            })()}
        </div>
    );
};
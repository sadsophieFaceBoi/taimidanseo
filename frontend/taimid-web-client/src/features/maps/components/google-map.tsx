//this component will display a map along with markers for user locations
'use client';
import React, { useEffect, useState } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrosshairs, faComments, faClock } from '@fortawesome/free-solid-svg-icons';
import { useUserStore, waitForUserStoreReady } from 'taimidanseo/features/users/user-store';
import { SpeakingSession } from 'taimidanseo/features/language-sessions/speaking-session-models';
import {useSpeakingSessionStore} from 'taimidanseo/features/language-sessions/speaking-session-store';
import { User } from 'taimidanseo/features/users/user-models';
import { SessionCreator } from 'taimidanseo/features/language-sessions/components/speaking-session-creator-component';

const containerStyle = {
    width: '100%',
    height: '40rem',
    borderRadius: '16px',
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
        <div className='w-full '>
            <div
                className=' flex justify-start'
              
            >
                <div
                    className='inline-flex gap-2  bg-white bg-opacity-90 shadow-md w-full items-center justify-center'
                  
                >
                <button
                    type="button"
                    onClick={() =>
                        setInteractionMode((prev) => (prev === 'setLocation' ? 'none' : 'setLocation'))
                    }
                    title="Set my location by clicking on the map"
                    className='bg-none border-0 cursor-pointer rounded-full p-2'
                    
                >
                    <FontAwesomeIcon icon={faCrosshairs} className="text-slate-900" />
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
                    <FontAwesomeIcon icon={faComments} />
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
                    <FontAwesomeIcon icon={faClock} />
                </button>
                </div>
            </div>

            <div className='p-2'>
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
                                url: '/icons/scairte-stones.svg',
                                scaledSize: new google.maps.Size(28, 28),
                                anchor: new google.maps.Point(14, 28),
                            }}
                        />
                    )}
                    {/* New current session marker (draft) */}
                    {currentSessionLocation && (
                        <Marker
                            position={currentSessionLocation}
                            title="New current speaking session"
                            icon={{
                                url: '/icons/scairte-stones.svg',
                                scaledSize: new google.maps.Size(40, 40),
                                anchor: new google.maps.Point(20, 40),
                            }}
                        />
                    )}
                    {/* New future session marker (draft) */}
                    {futureSessionLocation && (
                        <Marker
                            position={futureSessionLocation}
                            title="New future speaking session"
                            icon={{
                                url: '/icons/scairte-stones.svg',
                                scaledSize: new google.maps.Size(40, 40),
                                anchor: new google.maps.Point(20, 40),
                            }}
                        />
                    )}
                    {/* Active session markers */}
                    {activeSessions.map((session) => (
                        <Marker
                            key={session.id}
                            position={{ lat: session.latitude, lng: session.longitude }}
                            title={session.locationName}
                            icon={{
                                url: '/icons/scairte-stones.svg',
                                scaledSize: new google.maps.Size(40, 40),
                                anchor: new google.maps.Point(20, 40),
                            }}
                        />
                    ))}
                    </GoogleMap>
                </LoadScript>
            </div>

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
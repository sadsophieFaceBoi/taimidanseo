export interface User {
    id: string;
    name: string;
    //app allows anonymous users, anonymous users persist in their session only

    email?: string;
    // Optional fields for timestamps
    createdAt?: Date;
    updatedAt?: Date;
    //For security purposes, we log user IPs, this is a safe gaurd in case of malicious activity
    userIPs?: string[];
    fluencyLevel?: FluencyLevel;
    userLocation?: {
        latitude: number;
        longitude: number;
    };


}
export enum FluencyLevel {
    Beginner = 'Beginner',
    Intermediate = 'Intermediate',
    Advanced = 'Advanced',
    Fluent = 'Fluent',
    Native = 'Native',
}
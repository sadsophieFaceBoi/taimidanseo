//Users will log themselves in at a location, this could be a business such as a cafe or language school or a park. 
//Users marked active at a speaking session declare that they are there and willing to speak irish
//When a user leaves the location, the speaking session ends for them
import { User } from '../../users/user-models';
export interface SpeakingSession {
    id: string;
    //this is the location name where the session is happening, it could be a business name or park name
    locationName: string;
    latitude: number;
    longitude: number;
    startTime: Date;
    endTime?: Date;
    activeUserIds: string[];
}

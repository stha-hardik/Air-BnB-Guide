
export type PropertyType = 'Apartment' | 'House' | 'Cabin' | 'Studio' | 'Unique Stay' | 'Villa';
export type GuestType = 'Families' | 'Couples' | 'Solo' | 'Digital Nomads' | 'Business Travelers';
export type AreaType = 'Urban' | 'Suburban' | 'Remote/Rural' | 'Beachfront' | 'Mountain';

export interface VideoGuide {
  title: string;
  url: string;
}

export interface PropertyData {
  id: string;
  createdAt: number;
  driveLink?: string;
  propertyName: string;
  propertyType: PropertyType;
  location: string;
  hostName: string;
  hostImageUrl: string;
  heroImageUrl: string;
  additionalPhotos: string[];
  videoGuides: VideoGuide[];
  targetGuest: GuestType;
  checkInTime: string;
  checkOutTime: string;
  checkInMethod: string;
  wifiName: string;
  wifiPassword: string;
  emergencyPhone: string;
  propertyContact: string;
  houseRules: string[];
  parkingInfo: string;
  petPolicy: string;
  smokingPolicy: string;
  quietHours: string;
  checkoutTasks: string;
  areaType: AreaType;
  restaurants: string;
  activities: string;
  specialNotes: string;
  aiGeneratedContent?: string;
}

export const INITIAL_DATA: PropertyData = {
  id: '',
  createdAt: Date.now(),
  propertyName: '',
  propertyType: 'House',
  location: '',
  hostName: '',
  hostImageUrl: '',
  heroImageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800',
  additionalPhotos: [],
  videoGuides: [],
  targetGuest: 'Families',
  checkInTime: '15:00',
  checkOutTime: '11:00',
  checkInMethod: '',
  wifiName: '',
  wifiPassword: '',
  emergencyPhone: '',
  propertyContact: '',
  houseRules: [],
  parkingInfo: '',
  petPolicy: 'No pets allowed',
  smokingPolicy: 'No smoking',
  quietHours: '10 PM - 8 AM',
  checkoutTasks: 'Please turn off lights and lock the door.',
  areaType: 'Urban',
  restaurants: '',
  activities: '',
  specialNotes: ''
};

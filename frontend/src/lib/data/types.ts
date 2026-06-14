export type MealFilterCategory = "dietary-preferences" | "meal-ambiance";

export type MealFilter = {
  id: string;
  label: string;
  description: string;
  category: MealFilterCategory;
};

export type MealFilterGroup = {
  id: MealFilterCategory;
  title: string;
  subtitle: string;
  filters: MealFilter[];
};

export type MealEvent = {
  id: string;
  title: string;
  imageUrl?: string | null;
  city: string;
  locationLabel: string;
  locationLat?: number | null;
  locationLng?: number | null;
  hostId: string;
  date: string;
  dateLabel: string;
  detailDateLabel: string;
  timeLabel: string;
  host: string;
  variant: "default" | "veggie" | "nearby";
  filters: string[];
  houseRuleTags?: string[];
  houseRules?: string | null;
  pricePerPerson: number;
  currentParticipants: number;
  maxParticipants: number;
  participantProfileIds?: string[];
  menuSections: MealMenuSection[];
  dietaryPreferenceGroups?: MealDietaryPreferenceGroup[];
};

export type MealMenuSection = {
  title: string;
  items: string[];
};

export type MealDietaryPreferenceGroup = {
  title: string;
  items: string[];
};

export type HostReview = {
  id: string;
  author: string;
  authorPhotoUrl?: string | null;
  rating: number;
  dateLabel: string;
  comment: string;
  eventTitle: string;
};

export type HostProfile = {
  id: string;
  name: string;
  city: string;
  country?: string;
  districtLabel?: string;
  address?: string;
  quote: string;
  bio: string;
  photoUrl?: string | null;
  homePhotoUrl?: string | null;
  homePhotos: string[];
  reviewCount: number;
  rating: number;
  completedEvents: number;
  responseRate: number;
  reviews: HostReview[];
};

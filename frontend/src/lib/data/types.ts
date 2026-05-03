export type MealFilterCategory = "imperatifs" | "stricts" | "preferences" | "nutrition";

export type MealFilter = {
  id: string;
  label: string;
  description: string;
  category: MealFilterCategory;
};

export type MealFilterGroup = {
  id: MealFilterCategory;
  title: string;
  filters: MealFilter[];
};

export type MealEvent = {
  id: string;
  title: string;
  city: string;
  locationLabel: string;
  hostId: string;
  date: string;
  dateLabel: string;
  detailDateLabel: string;
  timeLabel: string;
  host: string;
  variant: "default" | "veggie" | "nearby";
  filters: string[];
  pricePerPerson: number;
  currentParticipants: number;
  maxParticipants: number;
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
  rating: number;
  dateLabel: string;
  comment: string;
  eventTitle: string;
};

export type HostProfile = {
  id: string;
  name: string;
  city: string;
  quote: string;
  bio: string;
  photoUrl?: string | null;
  homePhotos: string[];
  reviewCount: number;
  rating: number;
  completedEvents: number;
  responseRate: number;
  reviews: HostReview[];
};
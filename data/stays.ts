export type Stay = {
  slug: string;
  name: string;
  location: string;
  pricePerNight: number;
  coverImage: string;
  tag: string;
  galleryImages: string[];
  amenities: string[];
  food: "meals" | "breakfast" | "confirm";
  experiences: string[];
};

export const stays: Stay[] = [
  {
    slug: "coffee-grove-retreat",
    name: "The Coffee Grove Retreat",
    location: "Chikkamagaluru, Karnataka",
    pricePerNight: 3500,
    coverImage: "/images/coffee-grove/cover.jpeg",
    tag: "GUEST FAVOURITE",
    galleryImages: [
      "/images/coffee-grove/cover.jpeg",
      "/images/coffee-grove/room.jpeg",
      "/images/coffee-grove/interior.jpeg",
      "/images/coffee-grove/view.jpeg",
      "/images/coffee-grove/bathroom.jpeg",
      "/images/coffee-grove/exterior.jpeg",
      "/images/coffee-grove/exterior.jpeg",
    ],
    amenities: [
      "Wi-Fi",
      "Parking",
      "Hot water",
      "Attached bathroom",
      "Power backup",
    ],
    food: "meals",
    experiences: [
      "Nature walks",
      "Coffee plantation walks",
      "Campfire",
      "Local sightseeing assistance",
    ],
  },
  {
    slug: "misty-hills-hideaway",
    name: "Misty Hills Hideaway",
    location: "Sakleshpur, Karnataka",
    pricePerNight: 4200,
    coverImage: "/images/misty-hills/cover.jpeg",
    tag: "NATURE ESCAPE",
    galleryImages: [
      "/images/misty-hills/cover.jpeg",
      "/images/misty-hills/room.jpeg",
      "/images/misty-hills/interior.jpeg",
      "/images/misty-hills/view.jpeg",
      "/images/misty-hills/bathroom.jpeg",
    ],
    amenities: [
      "Wi-Fi",
      "Parking",
      "Hot water",
      "Attached bathroom",
      "Power backup",
    ],
    food: "confirm",
    experiences: [
      "Nature walks",
      "Coffee plantation walks",
      "Campfire",
      "Local sightseeing assistance",
    ],
  },
  {
    slug: "malnad-cottage",
    name: "The Malnad Cottage",
    location: "Western Ghats, Karnataka",
    pricePerNight: 2800,
    coverImage: "/images/malnad-cottage/cover.jpeg",
    tag: "PEACEFUL STAY",
    galleryImages: [
      "/images/malnad-cottage/cover.jpeg",
      "/images/malnad-cottage/room.jpeg",
      "/images/malnad-cottage/interior.jpeg",
      "/images/malnad-cottage/view.jpeg",
      "/images/malnad-cottage/bathroom.jpeg",
    ],
    amenities: [
      "Wi-Fi",
      "Parking",
      "Hot water",
      "Attached bathroom",
      "Power backup",
    ],
    food: "breakfast",
    experiences: ["Local sightseeing assistance"],
  },
];

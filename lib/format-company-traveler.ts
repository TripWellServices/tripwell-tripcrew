type TravelerRow = {
  id: string;
  firebaseId: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  photoURL: string | null;
  hometownCity: string | null;
  homeState: string | null;
  persona: string | null;
  planningStyle: string | null;
  dreamDestination: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { trips: number };
};

export function formatCompanyTraveler(traveler: TravelerRow) {
  const fullName = [traveler.firstName, traveler.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    id: traveler.id,
    firebaseId: traveler.firebaseId,
    email: traveler.email,
    firstName: traveler.firstName,
    lastName: traveler.lastName,
    fullName: fullName || null,
    photoURL: traveler.photoURL,
    hometownCity: traveler.hometownCity,
    homeState: traveler.homeState,
    persona: traveler.persona,
    planningStyle: traveler.planningStyle,
    dreamDestination: traveler.dreamDestination,
    createdAt: traveler.createdAt,
    updatedAt: traveler.updatedAt,
    tripCount: traveler._count?.trips ?? 0,
  };
}

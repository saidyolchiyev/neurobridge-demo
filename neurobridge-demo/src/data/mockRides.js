export const cities = {
  Bakı: [40.4093, 49.8671],
  Sumqayıt: [40.5855, 49.6317],
  Şamaxı: [40.6314, 48.6414],
  Qəbələ: [40.9814, 47.8458],
  Şəki: [41.1919, 47.1706],
  Gəncə: [40.6828, 46.3606],
};

export const routeStops = {
  "Bakı-Qəbələ": ["Bakı", "Şamaxı", "Qəbələ"],
  "Bakı-Şamaxı": ["Bakı", "Şamaxı"],
  "Bakı-Şəki": ["Bakı", "Şamaxı", "Qəbələ", "Şəki"],
  "Bakı-Gəncə": ["Bakı", "Gəncə"],
  "Sumqayıt-Bakı": ["Sumqayıt", "Bakı"],
  "Gəncə-Bakı": ["Gəncə", "Bakı"],
};

export const initialRides = [
  { id: "1", driver: "Elvin Məmmədov", rating: 4.8, reviews: 36, vehicle: "Hyundai Elantra", origin: "Bakı", destination: "Qəbələ", position: [40.43, 49.79], departure: "14:30", date: "2026-10-10", seats: 3, price: 15, route: routeStops["Bakı-Qəbələ"] },
  { id: "2", driver: "Rəşad Əliyev", rating: 4.9, reviews: 52, vehicle: "Toyota Prius", origin: "Bakı", destination: "Şamaxı", position: [40.46, 49.75], departure: "15:00", date: "2026-10-10", seats: 2, price: 10, route: routeStops["Bakı-Şamaxı"] },
  { id: "3", driver: "Aysel Həsənova", rating: 4.9, reviews: 28, vehicle: "Kia Sportage", origin: "Bakı", destination: "Şəki", position: [40.45, 49.81], departure: "16:00", date: "2026-10-10", seats: 3, price: 20, route: routeStops["Bakı-Şəki"] },
  { id: "4", driver: "Murad Quliyev", rating: 4.7, reviews: 19, vehicle: "Mercedes Vito", origin: "Sumqayıt", destination: "Bakı", position: [40.57, 49.66], departure: "13:45", date: "2026-10-10", seats: 6, price: 5, route: routeStops["Sumqayıt-Bakı"] },
  { id: "5", driver: "Nihat İsmayılov", rating: 4.8, reviews: 41, vehicle: "Toyota Corolla", origin: "Gəncə", destination: "Bakı", position: [40.69, 46.39], departure: "17:30", date: "2026-10-10", seats: 3, price: 18, route: routeStops["Gəncə-Bakı"] },
  { id: "6", driver: "Kamran Abbasov", rating: 4.9, reviews: 23, vehicle: "Skoda Superb", origin: "Bakı", destination: "Gəncə", position: [40.42, 49.82], departure: "09:00", date: "2026-10-11", seats: 2, price: 16, route: routeStops["Bakı-Gəncə"] },
];

export const demoBookings = [{ id: "booking-demo", rideId: "1", passenger: "Demo Sərnişin", status: "pending", createdAt: "2026-10-09T09:00:00.000Z" }];

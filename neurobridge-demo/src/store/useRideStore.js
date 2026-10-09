import { create } from "zustand";
import { persist } from "zustand/middleware";
import { demoBookings, initialRides } from "../data/mockRides";

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const useRideStore = create(persist((set, get) => ({
  rides: initialRides,
  bookings: demoBookings,
  user: null,
  unreadMessages: [],
  messages: [{ id: "m1", conversation: "booking-demo", sender: "Demo Sərnişin", text: "Salam, səfər üçün bir yer hələ boşdur?", time: "09:15" }],
  login: (email, role = "passenger", name, profile = {}) => {
    const user = { ...profile, email, role, name: name || (role === "driver" ? "Demo Sürücü" : "Demo Sərnişin") };
    set((state) => ({ user, ...(state.user?.email === email ? {} : { unreadMessages: [] }) })); return user;
  },
  logout: () => { localStorage.removeItem("yolyoldas-token"); set({ user: null, unreadMessages: [] }); },
  addUnreadMessage: (messageId) => set((state) => state.unreadMessages.includes(messageId) ? state : { unreadMessages: [...state.unreadMessages, messageId] }),
  markMessagesVisited: () => set({ unreadMessages: [] }),
  addRide: (ride) => {
    const created = { ...ride, id: ride.id || makeId(), driver: get().user?.name || ride.driver || "Demo Sürücü", ownerEmail: get().user?.email, position: ride.position, route: ride.route || [ride.origin, ride.destination] };
    set((state) => ({ rides: [created, ...state.rides] })); return created;
  },
  bookRide: (rideId) => {
    const state = get(); const ride = state.rides.find((item) => item.id === rideId);
    if (!ride || ride.seats < 1 || state.bookings.some((b) => b.rideId === rideId && b.status !== "rejected")) return null;
    const booking = { id: makeId(), rideId, passenger: state.user?.name || "Demo Sərnişin", passengerEmail: state.user?.email || "passenger@yolyoldas.demo", status: "pending", createdAt: new Date().toISOString() };
    set({ bookings: [...state.bookings, booking] }); return booking;
  },
  acceptBooking: (bookingId) => {
    const { bookings, rides } = get(); const booking = bookings.find((item) => item.id === bookingId);
    const ride = rides.find((item) => item.id === booking?.rideId);
    if (!booking || booking.status !== "pending" || !ride || ride.seats < 1) return false;
    set({ bookings: bookings.map((b) => b.id === bookingId ? { ...b, status: "accepted" } : b), rides: rides.map((r) => r.id === ride.id ? { ...r, seats: r.seats - 1 } : r) }); return true;
  },
  rejectBooking: (bookingId) => set((state) => ({ bookings: state.bookings.map((b) => b.id === bookingId && b.status === "pending" ? { ...b, status: "rejected" } : b) })),
  sendMessage: (text, conversation = "elvin") => set((state) => ({ messages: [...state.messages, { id: makeId(), conversation, sender: state.user?.name || "Demo Sərnişin", text, time: new Date().toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit" }) }] })),
  resetDemo: () => set({ rides: initialRides, bookings: demoBookings, user: null }),
}), { name: "yolyoldas-demo", version: 3, migrate: (state) => ({ ...state, rides: initialRides, bookings: demoBookings, unreadMessages: state.unreadMessages || [] }) }));

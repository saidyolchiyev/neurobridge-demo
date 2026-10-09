import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { Toaster } from "sonner";
import Navbar from "./components/Navbar";
import { useRideStore } from "./store/useRideStore";

const queryClient=new QueryClient({defaultOptions:{queries:{retry:1,refetchOnWindowFocus:false}}});
const Home=lazy(()=>import("./pages/Home.jsx"));
const FindRide=lazy(()=>import("./pages/FindRide.jsx"));
const RideDetails=lazy(()=>import("./pages/RideDetails.jsx"));
const CreateRide=lazy(()=>import("./pages/CreateRide.jsx"));
const Dashboard=lazy(()=>import("./pages/Dashboard.jsx"));
const Login=lazy(()=>import("./pages/Login.jsx"));
const Register=lazy(()=>import("./pages/Register.jsx"));
const Messages=lazy(()=>import("./pages/Messages.jsx"));
const Profile=lazy(()=>import("./pages/Profile.jsx"));

function Guard({ children, role }) { const user = useRideStore((s) => s.user); if (!user) return <Navigate to="/login" replace />; if (role && user.role !== role) return <Navigate to="/dashboard" replace />; return children; }

export default function App() {
  return <QueryClientProvider client={queryClient}><BrowserRouter><Navbar /><Suspense fallback={<main className="page-loading">Yüklənir…</main>}><Routes>
    <Route path="/" element={<Home />} /><Route path="/rides" element={<FindRide />} /><Route path="/rides/:id" element={<RideDetails />} />
    <Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} />
    <Route path="/rides/create" element={<Guard role="driver"><CreateRide /></Guard>} /><Route path="/dashboard" element={<Guard><Dashboard /></Guard>} />
    <Route path="/messages" element={<Guard><Messages /></Guard>} /><Route path="/profile" element={<Guard><Profile /></Guard>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense><Toaster position="top-right" richColors /></BrowserRouter></QueryClientProvider>;
}

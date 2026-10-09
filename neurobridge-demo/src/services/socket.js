import { io } from "socket.io-client";
let socket;
export function connectSocket() {
  const token=localStorage.getItem("yolyoldas-token");if(!token)return null;
  if(socket && socket.auth?.token !== token){socket.disconnect();socket=undefined;}
  if(!socket)socket=io(import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/,"" )||"http://localhost:4000",{auth:{token},autoConnect:true,reconnection:true});
  return socket;
}
export function disconnectSocket(){socket?.disconnect();socket=undefined;}

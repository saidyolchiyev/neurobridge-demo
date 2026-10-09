import { io } from "socket.io-client";
let socket;
export function connectSocket() {
  const token=localStorage.getItem("yolyoldas-token");if(!token)return null;
  if(socket && socket.auth?.token !== token){socket.disconnect();socket=undefined;}
  const configuredApiUrl = import.meta.env.VITE_API_BASE_URL;
  const socketUrl = configuredApiUrl?.startsWith("http")
    ? configuredApiUrl.replace(/\/api\/?$/, "")
    : import.meta.env.DEV ? "http://localhost:4000" : window.location.origin;
  if(!socket)socket=io(socketUrl,{auth:{token},autoConnect:true,reconnection:true});
  return socket;
}
export function disconnectSocket(){socket?.disconnect();socket=undefined;}

import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, MapPin, X, UserRound } from "lucide-react";
import { useRideStore } from "../store/useRideStore";
import { connectSocket, disconnectSocket } from "../services/socket";
import { mockMode } from "../services/api";

export default function Navbar() {
  const [open, setOpen] = useState(false); const user = useRideStore((s) => s.user); const location = useLocation();
  const unreadMessages = useRideStore((s) => s.unreadMessages); const addUnreadMessage = useRideStore((s) => s.addUnreadMessage); const markMessagesVisited = useRideStore((s) => s.markMessagesVisited);
  useEffect(() => { if (location.pathname === "/messages") markMessagesVisited(); }, [location.pathname, markMessagesVisited]);
  useEffect(() => {
    if (mockMode || !user) { disconnectSocket(); return; }
    const socket = connectSocket();
    const receiveUnread = (message) => { if (location.pathname !== "/messages") addUnreadMessage(message.id); };
    socket?.on("message:unread", receiveUnread);
    return () => socket?.off("message:unread", receiveUnread);
  }, [user?.id, location.pathname, addUnreadMessage]);
  const links = [["Səfərlər", "/rides"], ["Necə işləyir", "/#how"], ["Mesajlar", "/messages"]];
  return <header className="nav"><nav className="nav-inner">
    <Link to="/" className="brand"><span className="brand-icon"><MapPin size={20} /></span>YolYoldaş</Link>
    <div className={`nav-links ${open ? "nav-open" : ""}`}>{links.map(([label, href]) => <NavLink key={label} to={href} onClick={() => setOpen(false)}>{label}{href === "/messages" && unreadMessages.length > 0 && <span className="nav-unread-badge">{unreadMessages.length > 99 ? "99+" : unreadMessages.length}</span>}</NavLink>)}
      {user ? <><Link to="/dashboard" onClick={() => setOpen(false)}>İdarəetmə</Link><Link to="/profile" className="nav-user"><UserRound size={17} />{user.name}</Link></> : <Link to="/login" onClick={() => setOpen(false)}>Daxil ol</Link>}
      <Link className="button button-primary nav-cta" to="/rides/create" onClick={() => setOpen(false)}>Səfər paylaş <span>↗</span></Link>
    </div>
    <button aria-label={open ? "Menyunu bağla" : "Menyunu aç"} className="menu-toggle" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
  </nav></header>;
}

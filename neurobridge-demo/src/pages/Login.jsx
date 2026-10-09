import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowRight, LockKeyhole, Mail, MapPin } from "lucide-react";
import { loginRequest } from "../services/authService";
import { useRideStore } from "../store/useRideStore";

const loginSchema=z.object({email:z.string().email("Düzgün e-poçt ünvanı daxil edin."),password:z.string().min(4,"Şifrə ən azı 4 simvol olmalıdır.")});
export default function Login() {
  const [role,setRole]=useState("passenger");const [busy,setBusy]=useState(false);const login=useRideStore((s)=>s.login);const navigate=useNavigate();const [params]=useSearchParams();
  const {register,handleSubmit,formState:{errors}}=useForm({resolver:zodResolver(loginSchema),defaultValues:{email:"sernisin@yolyoldas.demo",password:"demo1234"}});
  const submit=async({email,password})=>{setBusy(true);try{const result=await loginRequest({email,password});login(email,(result.user?.role||role).toLowerCase(),result.user?.name,result.user);toast.success("Hesabınıza daxil oldunuz.");navigate(params.get("next")||"/dashboard")}catch(err){toast.error(err.message)}finally{setBusy(false)}};
  return <main className="auth-page"><div className="auth-aside"><Link to="/" className="brand"><span className="brand-icon"><MapPin size={20}/></span>YolYoldaş</Link><div><span className="auth-quote-mark">“</span><h2>Yaxşı səfər<br/>yaxşı yoldaşla<br/>başlayır.</h2><p>Eyni istiqamətə gedən insanları bir araya gətiririk.</p></div><small>DEMO MÜHİTİ · TƏQDİMAT VERSİYASI</small></div><div className="auth-content"><div className="auth-form-wrap"><div className="eyebrow">Yenidən xoş gördük</div><h1>Hesabına daxil ol</h1><p>Səfərlərini idarə etmək üçün məlumatlarını daxil et.</p><form onSubmit={handleSubmit(submit)}><label className="form-field"><span>E-poçt</span><div className="input-icon"><Mail size={17}/><input type="email" {...register("email")}/></div>{errors.email&&<small className="field-error">{errors.email.message}</small>}</label><label className="form-field"><span>Şifrə</span><div className="input-icon"><LockKeyhole size={17}/><input type="password" {...register("password")}/></div>{errors.password&&<small className="field-error">{errors.password.message}</small>}</label><label className="form-field"><span>Demo rolu</span><select className="plain-select" value={role} onChange={(e)=>setRole(e.target.value)}><option value="passenger">Sərnişin</option><option value="driver">Sürücü</option></select></label><div className="auth-demo-note">Demo üçün istənilən e-poçt və minimum 4 simvolluq şifrə işləyir.</div><button className="button button-primary button-lg auth-submit" disabled={busy}>{busy?"Daxil olunur…":"Daxil ol"}<ArrowRight size={17}/></button></form><div className="auth-bottom">Hesabın yoxdur? <Link to="/register">Qeydiyyatdan keç</Link></div><div className="auth-security">Demo autentifikasiyası · İstehsal üçün backend JWT tələb olunur</div></div></div></main>;
}

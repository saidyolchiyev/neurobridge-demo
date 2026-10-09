import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowRight, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { registerRequest } from "../services/authService";
import { useRideStore } from "../store/useRideStore";

const registerSchema=z.object({name:z.string().trim().min(2,"Ad və soyad ən azı 2 simvol olmalıdır.").max(80),email:z.string().email("Düzgün e-poçt ünvanı daxil edin."),phone:z.string().regex(/^[+0-9 ()-]{7,20}$/,"Telefon nömrəsini yoxlayın."),password:z.string().min(8,"Şifrə ən azı 8 simvol olmalıdır."),role:z.enum(["passenger","driver"])});
export default function Register() {
  const [busy,setBusy]=useState(false);const login=useRideStore((s)=>s.login);const navigate=useNavigate();
  const {register,handleSubmit,formState:{errors}}=useForm({resolver:zodResolver(registerSchema),defaultValues:{name:"",email:"",phone:"",password:"",role:"passenger"}});
  const submit=async(form)=>{setBusy(true);try{const result=await registerRequest(form);login(form.email,(result.user?.role||form.role).toLowerCase(),result.user?.name||form.name,{...result.user,phone:form.phone});toast.success("Demo hesabınız yaradıldı.");navigate("/dashboard")}catch(err){toast.error(err.message)}finally{setBusy(false)}};
  const error=(key)=>(errors[key]?<small className="field-error">{errors[key].message}</small>:null);
  return <main className="auth-page"><div className="auth-aside"><Link to="/" className="brand"><span className="brand-icon"><MapPin size={20}/></span>YolYoldaş</Link><div><span className="auth-quote-mark">✳</span><h2>Yollar<br/>bölüşdükcə<br/>yaxınlaşırıq.</h2><p>Yol yoldaşları icmasına qoşul və növbəti səfərini planlaşdır.</p></div><small>DEMO MÜHİTİ · TƏQDİMAT VERSİYASI</small></div><div className="auth-content"><div className="auth-form-wrap"><div className="eyebrow">İcmamıza qoşul</div><h1>Hesab yarat</h1><p>Səfər tapmaq və ya öz marşrutunu paylaşmaq üçün.</p><form onSubmit={handleSubmit(submit)}><label className="form-field"><span>Ad və soyad</span><div className="input-icon"><UserRound size={17}/><input {...register("name")} placeholder="Adınız Soyadınız"/></div>{error("name")}</label><label className="form-field"><span>E-poçt</span><div className="input-icon"><Mail size={17}/><input type="email" {...register("email")} placeholder="siz@numune.az"/></div>{error("email")}</label><label className="form-field"><span>Telefon</span><div className="input-icon"><Phone size={17}/><input type="tel" {...register("phone")} placeholder="+994 50 000 00 00"/></div>{error("phone")}</label><label className="form-field"><span>Şifrə</span><div className="input-icon"><input type="password" {...register("password")} placeholder="Ən azı 8 simvol"/></div>{error("password")}</label><label className="form-field"><span>Hesab növü</span><select className="plain-select" {...register("role")}><option value="passenger">Sərnişin</option><option value="driver">Sürücü</option></select></label><div className="auth-demo-note">Demo hesab məlumatları yalnız bu brauzerdə saxlanılır. İstehsal üçün server autentifikasiyası tələb olunur.</div><button disabled={busy} className="button button-primary button-lg auth-submit">{busy?"Hesab yaradılır…":"Qeydiyyatdan keç"}<ArrowRight size={17}/></button></form><div className="auth-bottom">Artıq hesabın var? <Link to="/login">Daxil ol</Link></div></div></div></main>;
}

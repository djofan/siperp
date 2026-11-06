import { ChangePassword } from "./ChangePassword";

export function AccountSettings(){
  return <section><header style={{marginBottom:24}}><h1 style={{fontSize:26,fontWeight:600}}>Pengaturan akun</h1><p style={{marginTop:8,opacity:.7}}>Kelola password dan keamanan akun Anda.</p></header><ChangePassword initiallyOpen theme="dark"/></section>;
}

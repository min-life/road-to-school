'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { enrollmentApi } from '@/lib/rfid-enrollment-api';
import type { IotDevice } from '@/lib/iot-api';
export function EnrollmentRecovery({devices,onUpdated}:{devices:IotDevice[];onUpdated:()=>void}){
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 const unresolved=devices.filter(d=>d.pendingSessionId&&(d.enrollmentState==='COMMITTING'||d.enrollmentState==='RECONCILING'));
 if(!unresolved.length)return null;
 return <div>{notice&&<p role="status">{notice}</p>}{unresolved.map(d=><Button key={d.deviceId} type="button" variant="outline" disabled={busy} onClick={async()=>{
  setBusy(true);setNotice('');try{await enrollmentApi.reconcile(d.pendingSessionId!);setNotice('Đã đối soát kết quả đăng ký.');onUpdated();}catch(e){setNotice(e instanceof Error?e.message:'Chưa thể đối soát');}finally{setBusy(false);}
 }}>Đối soát đăng ký · {d.deviceId}</Button>)}</div>;
}

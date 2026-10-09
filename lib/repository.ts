import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import type { Process, ExpertCapture, Clarification, Finding, Scan, ValidationTrial, TrialResult, ChangeRequest, TechnicianResponse } from './domain';
import { demoProcess, demoFindings } from './demo';
export interface Store { processes: Process[]; captures: ExpertCapture[]; clarifications: Clarification[]; findings: Finding[]; scans: Scan[]; trials: ValidationTrial[]; results: TrialResult[]; changes: ChangeRequest[]; responses: TechnicianResponse[] }
export interface Repository { read(): Promise<Store>; query<T>(fn:(store:Store)=>T|Promise<T>):Promise<T>; transact<T>(fn:(store:Store)=>T|Promise<T>):Promise<T> }
export const initialStore=():Store=>({processes:[structuredClone(demoProcess)],captures:[],clarifications:[],findings:structuredClone(demoFindings),scans:[],trials:[],results:[],changes:[],responses:[]});
const directory=process.env.GOOD_EXCEPTION_DATA_DIR || path.join(process.cwd(),'.demo-data');
class JsonRepository implements Repository {
 private queue:Promise<unknown>=Promise.resolve();
 async read():Promise<Store>{ try{return JSON.parse(await readFile(path.join(directory,'store.json'),'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return initialStore();throw e;} }
 query<T>(fn:(store:Store)=>T|Promise<T>):Promise<T>{ const task=this.queue.then(async()=>fn(await this.read()));this.queue=task.catch(()=>{});return task; }
 transact<T>(fn:(store:Store)=>T|Promise<T>):Promise<T>{ const task=this.queue.then(async()=>{ const store=await this.read(); const result=await fn(store);await mkdir(directory,{recursive:true}); const tmp=path.join(directory,'store.tmp');await writeFile(tmp,JSON.stringify(store,null,2));await rename(tmp,path.join(directory,'store.json'));return result;});this.queue=task.catch(()=>{});return task; }
}
const globalStore=globalThis as typeof globalThis & { goodExceptionRepository?: JsonRepository };
export const repository=globalStore.goodExceptionRepository??=new JsonRepository();

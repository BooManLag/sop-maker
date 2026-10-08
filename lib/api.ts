import { randomUUID } from 'node:crypto';
import { repository } from './repository';
import { DemoGeminiAdapter, EvidenceEngine, normalizeRecords, requiredSamplePerGroup } from './services';
import { baselineSteps, demoResponse } from './demo';
import type { ProcessStep } from './domain';
class ApiError extends Error {constructor(public status:number,message:string){super(message)}}
const need=(condition:unknown,message:string,status=400)=>{if(!condition)throw new ApiError(status,message)};
const text=(value:unknown,name:string)=>{need(typeof value==='string'&&value.trim().length>0&&value.length<10000,`${name} is required (maximum 10,000 characters).`);return (value as string).trim()};
export async function handleApi(method:string,segments:string[],body:Record<string,unknown>={}) {
 const [resource,id,action]=segments;
 return repository.transact(async s=>{
 if(method==='GET'&&resource==='workspace') return {processes:s.processes,findings:s.findings,trials:s.trials,changes:s.changes,demo:true};
 if(resource==='processes'){
 if(method==='POST'&&!id){const title=text(body.title,'Process name'); const pid=randomUUID();const process={id:pid,organizationId:'demo-org',title,equipment:text(body.equipment,'Equipment'),currentVersion:0,versions:[{id:randomUUID(),processId:pid,version:1,status:'draft' as const,title,steps:[],createdAt:new Date().toISOString()}]};s.processes.push(process);return process;}
 const p=s.processes.find(p=>p.id===id);need(p,'Process not found',404);if(!p)throw new Error();
 if(method==='GET'&&!action)return p;
 if(method==='POST'&&action==='captures'){need(['text','video','audio','document'].includes(String(body.kind)),'Invalid capture kind.');const capture={id:randomUUID(),processId:p.id,expertReference:text(body.expertReference,'Expert reference'),kind:body.kind as 'text'|'video'|'audio'|'document',text:typeof body.text==='string'?body.text:undefined,fileName:typeof body.fileName==='string'?body.fileName:undefined};s.captures.push(capture);return capture;}
 if(method==='POST'&&action==='analyze-capture'){const c=s.captures.find(c=>c.processId===id&&c.id===body.captureId);need(c,'Capture not found',404);need(body.sample===true||c?.kind==='text','Uploaded media processing is not connected. Use the sample or paste a walkthrough.',422);const adapter=new DemoGeminiAdapter();const steps=await adapter.extract(c?.text??'',body.sample===true);p.versions[0].steps=steps;const questions=await adapter.questions(steps);return {steps,questions,demo:true,notice:body.sample?'Sample extraction; Gemini is not connected.':'Rule-based text extraction; Gemini is not connected.'};}
 if(method==='POST'&&action==='clarifications'){const capture=s.captures.find(c=>c.id===body.captureId&&c.processId===id);need(capture,'Capture not found',404);const answer=text(body.answer,'Answer');const clarification={id:randomUUID(),captureId:capture!.id,stepId:String(body.stepId??'step-wait'),question:text(body.question,'Question'),answer};s.clarifications.push(clarification);return clarification;}
 if(method==='POST'&&action==='publish'){need(body.approved===true,'Explicit human approval is required.');need(p.currentVersion===0,'Baseline is already published.',409);const steps=body.steps as ProcessStep[];need(Array.isArray(steps)&&steps.length>0&&steps.length<=100,'Provide 1–100 reviewed steps.');steps.forEach(x=>need(x&&typeof x.action==='string'&&x.action.trim()&&typeof x.id==='string','Every step needs an action and ID.'));need(new Set(steps.map(x=>x.id)).size===steps.length,'Step IDs must be unique.');p.versions[0]={...p.versions[0],steps:steps.map((x,i)=>({...x,sequence:i+1})),status:'published',approvedBy:'demo-reviewer'};p.currentVersion=1;return p;}
 }
 if(resource==='scans'){
 if(method==='POST'&&!id){need(s.processes.some(p=>p.id===body.processId&&p.currentVersion>0),'Select a published baseline SOP.');need(body.demo===true||Array.isArray(body.rows),'Upload service records or choose the sample.');need(body.demo!==true||body.processId==='valve-replacement','The sample scenario is available only for the seeded Valve Replacement baseline.'); const scan={id:randomUUID(),processId:String(body.processId),demo:body.demo===true,records:body.demo===true?[]:normalizeRecords(body.rows as Record<string,unknown>[]),status:'uploaded' as const,findingIds:[]};s.scans.push(scan);return scan;}
 const scan=s.scans.find(x=>x.id===id);need(scan,'Scan not found',404);if(!scan)throw new Error();
 if(method==='POST'&&action==='readiness'){scan.readiness=scan.demo?{eligible:true,count:47219,categories:[{label:'Callback linkage',value:'Strong'},{label:'Technician history',value:'Strong'},{label:'Checklist coverage',value:'Good'},{label:'Free-text notes',value:'Limited'},{label:'Exact step sequence',value:'Unavailable'}],can:['Skipped checklist steps','Repeated checks recorded in checklists','Parts substitutions'],cannot:['Physical actions that were never recorded','Exact sequence for jobs with missing timestamps'],missing:[]}:new EvidenceEngine().readiness(scan.records);scan.status=scan.readiness.eligible?'ready':'uploaded';return scan.readiness;}
 if(method==='POST'&&action==='run'){need(scan.readiness?.eligible,'Not enough evidence to run a reliable scan.',422);if(!scan.demo) await new EvidenceEngine().analyze(scan.records);scan.status='complete';scan.findingIds=s.findings.filter(x=>x.processId===scan.processId).map(x=>x.id);return {id:scan.id,demo:true,funnel:[47219,23,9,4,2]};}
 if(method==='GET'&&action==='findings'){need(scan.status==='complete','Run the scan first.',409);return s.findings.filter(x=>scan.findingIds.includes(x.id));}
 }
 if(resource==='findings'){
 const f=s.findings.find(x=>x.id===id);need(f,'Finding not found',404);if(!f)throw new Error();
 if(method==='GET'&&!action)return f;
 if(method==='POST'&&action==='dismiss'){need(f.status!=='validated','A validated finding cannot be dismissed; archive through review.',409);f.status='dismissed';return f;}
 if(method==='POST'&&action==='request-explanation'){if(f.status==='candidate')f.status='investigate';const response={id:randomUUID(),findingId:f.id,...demoResponse};s.responses.push(response);return {...response,demo:true,notice:'Sample response. No message was sent to technicians.'};}
 }
 if(resource==='trials'){
 if(method==='POST'&&!id){const f=s.findings.find(f=>f.id===body.findingId);need(f&&f.grade==='strong'&&f.status!=='dismissed','A strong active finding is required.');const trial={id:randomUUID(),findingId:f!.id,equipment:text(body.equipment,'Equipment'),primaryOutcome:'30-day callback rate',testGroup:text(body.testGroup,'Eligible jobs'),control:'Current SOP',requiredPerGroup:requiredSamplePerGroup(),status:'running' as const,demo:true};s.trials.push(trial);f!.status='controlled_trial';return trial;}
 const t=s.trials.find(x=>x.id===id);need(t,'Trial not found',404);if(!t)throw new Error();
 if(method==='GET'&&!action)return {...t,result:s.results.find(x=>x.trialId===id)};
 if(method==='POST'&&action==='results'){need(body.sample===true,'Live trial ingestion is not connected. Load the labeled sample result.',422);const existing=s.results.find(x=>x.trialId===id);if(existing)return existing;const result={trialId:t.id,treatmentRate:4.4,controlRate:7,treatmentJobs:t.requiredPerGroup,controlJobs:t.requiredPerGroup,outcome:'validated' as const,demo:true};s.results.push(result);t.status='complete';s.findings.find(x=>x.id===t.findingId)!.status='validated';return result;}
 }
 if(resource==='change-requests'&&method==='POST'){
 if(id){const change=s.changes.find(x=>x.id===id);need(change,'Change request not found',404);if(!change)throw new Error();if(action==='submit'){need(change.status==='draft','Request already submitted.',409);change.proposedStep=text(body.proposedStep,'Proposed change');change.status='submitted';return change;}}
 else{const t=s.trials.find(x=>x.id===body.trialId);const result=s.results.find(x=>x.trialId===t?.id);need(t&&result?.outcome==='validated','A validated controlled trial is required.',409);const f=s.findings.find(x=>x.id===t!.findingId)!;const change={id:randomUUID(),processId:f.processId,findingId:f.id,trialId:t!.id,currentStep:f.standard,proposedStep:f.practice,rationale:demoResponse.reason,status:'draft' as const,demo:true};s.changes.push(change);return change;}
 }
 throw new ApiError(404,'Endpoint not found.');
 });
}
export { ApiError };

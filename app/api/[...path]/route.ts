import { NextRequest, NextResponse } from 'next/server';
import { handleApi, ApiError } from '@/lib/api';
export const runtime='nodejs';
async function route(request:NextRequest,context:{params:Promise<{path:string[]}>}){
 try{const {path}=await context.params;let body={};if(request.method==='POST'){const tooLarge=()=>NextResponse.json({error:'Upload is too large. Maximum request size is 5 MB.'},{status:413});if(Number(request.headers.get('content-length')??0)>5_000_000)return tooLarge();const raw=await request.text();if(Buffer.byteLength(raw)>5_000_000)return tooLarge();body=raw?JSON.parse(raw):{};}return NextResponse.json(await handleApi(request.method,path,body));}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Request failed.'},{status:e instanceof ApiError?e.status:400});}
}
export const GET=route; export const POST=route;

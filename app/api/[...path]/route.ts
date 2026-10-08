import { NextRequest, NextResponse } from 'next/server';
import { handleApi, ApiError } from '@/lib/api';
export const runtime='nodejs';
async function route(request:NextRequest,context:{params:Promise<{path:string[]}>}){
 try{const {path}=await context.params;let body={};if(request.method==='POST'){if(Number(request.headers.get('content-length')??0)>5_000_000)return NextResponse.json({error:'Upload is too large. Maximum request size is 5 MB.'},{status:413});body=await request.json();}return NextResponse.json(await handleApi(request.method,path,body));}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Request failed.'},{status:e instanceof ApiError?e.status:400});}
}
export const GET=route; export const POST=route;

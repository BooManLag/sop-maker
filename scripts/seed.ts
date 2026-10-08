import { repository, initialStore } from '../lib/repository';
async function seed(){if(process.argv.includes('--reset')) await repository.transact(store=>Object.assign(store,initialStore()));else await repository.transact(()=>{});console.log('Demo workspace prepared. Existing local work is preserved unless --reset is supplied.');}
seed().catch(e=>{console.error(e.message);process.exitCode=1;});

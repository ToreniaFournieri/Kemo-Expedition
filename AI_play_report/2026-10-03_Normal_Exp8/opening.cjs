const {Client}=require('./client.cjs');
(async()=>{
 const c=new Client();c.phase='opening-build';
 const builds=[
 [1,{mainClassId:'lord',subClassId:'lord'}],
 [6,{mainClassId:'guardian',subClassId:'guardian'}],
 [4,{racesAndGender:'ursan/male',mainClassId:'ninja',subClassId:'ranger',lineage:'abyssal_sea',predisposition:'precise'}],
 [2,{racesAndGender:'ursan/female',mainClassId:'ninja',subClassId:'ranger',lineage:'abyssal_sea',predisposition:'precise'}],
 [3,{mainClassId:'ninja',subClassId:'ranger',predisposition:'precise'}],
 ];
 for(const[id,build]of builds) await c.commit(`build/character/${id}/changeBuild`,{...build,simulation:false,confirmation:'yes'});
 await c.commit('build/party/1',{deityId:'precision',order:[6,1,4,2,3,5]});
 await c.commit('expedition/1/changeExpedition',{destinationMode:'fixed',destination:1,depthLimit:'all',difficultyOffset:0});
 const shop=JSON.parse(require('node:fs').readFileSync(__dirname+'/api-calls.jsonl','utf8').trim().split('\n').find(x=>JSON.parse(x).route==='read/base/shopItemsList')).output.data;
 await c.commit('base/purchaseShopItems',{lineupId:shop.current.lineupId,items:[{shopItemId:2},{shopItemId:3},{shopItemId:6}]});
 for(const id of [1,2,3,4,5,6])await c.commit(`build/character/${id}/removeAllEquipment`);
 console.log('Opening builds and pooled equipment ready.',c.state.calls);
})().catch(e=>{console.error(e.message);process.exitCode=1;});

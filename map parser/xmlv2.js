(()=>{
with (this) parsePropType=buildXmlParser({
    lib:"library-name",group:"group-name",name:"name",
    Ltexlst:["texture-name","_body"]
})
with (this) parsePropPtr=buildXmlParser({
    type:"prop-index",Ecolliders:"[]",
    lightmap:["lightmap","_body"],
    tex:["texture-index","+_body"],
    pos:["position","parseVec"],rot:[["rotation","rotation-z"],"parseVec"]
})
with (this) parseColBox=buildXmlParser({
    size:["size","parseVec"],
    pos:[["local-position","position"],"parseVec"],rot:[["local-angles","rotation"],"parseVec"]
})
with (this) parseColTri=buildXmlParser({
    v0:["v0","parseVec"],v1:["v1","parseVec"],v2:["v2","parseVec"],
    pos:[["local-position","position"],"parseVec"],rot:[["local-angles","rotation"],"parseVec"]
})
with (this) _parseSpawn=buildXmlParser({
    type:"type",team:"team",free:"free",
    pos:["position","parseVec"],rot:[["direction","rotation"],"parseVec"]
})
function parseSpawn(rt,map){
    const r=_parseSpawn(rt,map)
    if(r.type=="red"||r.type=="blue"){r.team=r.type;r.modes=["tdm","ctf"]}
    else if(r.type=="dom"){r.modes=["cp"]}
    else if(r.type=="dm"){r.modes=["dm"];r.team=null}
    else{throw "unknown xmlv1 spawn type: "+JSON.stringify(r)}
    delete r.type;map.spawns.push(r)
}
function parseBonusArea(rt,map){
    let res={name:rt.name,types:[],rot:[0,0,0]}
    let mi=[0,0,0],ma=[0,0,0]
    for(let e of rt._subtags){//ignore pos because it's just center of bounding box
        if(e._tag=="rotation"){res.rot=parseVec(e)}
        if(e._tag=="min"){mi=parseVec(e)}
        if(e._tag=="max"){ma=parseVec(e)}
        if(e._tag=="bonus-type"){res.types.push(e._body)}
    }
    res.pos=vmulfI(vadd(mi,ma),.5);res.size=vsubI(ma,mi)
    let a=abs(res.rot[2])%PI
    if(abs(a-PI/2)<.05){let tmp=res.size[0];res.size[0]=res.size[1];res.size[1]=tmp}
    map.bonuses.push(res)
}
with (this) parseFlag=buildXmlParser({Eteam:"rt._tag.split('-')[1]",Epos:"parseVec(rt)"})

global.mapImport["<"].v2=function parseV2(mapXml){//gets parsed xml from v1 function
    const res={tiles:[],bonuses:[],spawns:[],modes:{}}
    const tmps={box:[],rect:[],tri:[],propt:[]}
    const moi="map-object-index",primi="primitive-index"
    for(let e of mapXml._subtags){
        if(e._tag=="prop"){tmps.propt.push(parsePropType(e,res));continue}
        if(e._tag=="map-object"){
            e=parsePropPtr(e)
            let type=tmps.propt[e.type];delete e.type
            e.lib=type.lib;e.group=type.group;e.name=type.name
            e.tex=type.texlst[e.tex]
            res.tiles.push(e);continue
        }
        if(e._tag=="collision-box"){tmps.box.push(parseColBox(e));continue}
        if(e._tag=="collision-rect"){tmps.rect.push(parseColBox(e));continue}
        if(e._tag=="collision-triangle"){tmps.tri.push(parseColTri(e));continue}
        if(e._tag=="map-collision-box"){
            res.tiles[+e[moi]].colliders.push(tmps.box[+e[primi]]);continue}
        if(e._tag=="map-collision-rect"){
            res.tiles[+e[moi]].colliders.push(tmps.rect[+e[primi]]);continue}
        if(e._tag=="map-collision-triangle"){
            res.tiles[+e[moi]].colliders.push(tmps.tri[+e[primi]]);continue}
        if(e._tag=="spawn-point"){parseSpawn(e,res);continue}
        if(e._tag=="bonus-region"){parseBonusArea(e,res);continue}
        if(e._tag=="ctf-flags"){
            res.modes.ctf=[]
            for(let e2 of e._subtags){res.modes.ctf.push(parseFlag(e2,res))}
            continue
        }
        throw "xmlv2 unknown section: "+e._tag
    }
    for(let i=0;i<res.tiles.length;i++){
        if(res.tiles[i].colliders.length==0){delete res.tiles[i].colliders;continue}
        rebuildColliders(res.tiles[i].colliders)
    }
    return res
}
})()
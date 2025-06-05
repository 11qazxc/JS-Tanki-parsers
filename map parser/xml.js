(()=>{
global.parseVec=function parseVec(rt){
    let res=[0,0,0]
    if(rt.x!==undefined){res[0]=+rt.x}
    if(rt.y!==undefined){res[1]=+rt.y}
    if(rt.z!==undefined){res[2]=+rt.z}
    if(rt._subtags.length==0){
        if(rt._body.length&&
            (rt._tag.slice(0,8)=="rotation"||rt._tag=="direction")){res[2]=+rt._body}
    }else{for(let e of rt._subtags){res[e._tag=="x"?0:(e._tag=="y"?1:2)]=+e._body}}
    return res
}
with (this) parseProp=buildXmlParser({
    lib:"library-name",group:"group-name",name:"name",
    tex:["texture-name","_body"],
    pos:["position","parseVec"],rot:["rotation","parseVec"]
})
with (this) parseColBox=buildXmlParser({
    size:["size","parseVec"],pos:["position","parseVec"],rot:["rotation","parseVec"]
})
with (this) parseColTri=buildXmlParser({
    v0:["v0","parseVec"],v1:["v1","parseVec"],v2:["v2","parseVec"],
    pos:["position","parseVec"],rot:["rotation","parseVec"]
})
function parseColPlane(rt,map){//v1 collision plane uses width and length, not size
    let res={size:[0,0,0],pos:[0,0,0],rot:[0,0,0]}
    for(let e of rt._subtags){
        if(e._tag=="position"){res.pos=parseVec(e)}
        if(e._tag=="rotation"){res.rot=parseVec(e)}
        if(e._tag=="width"){res.size[0]=+e._body}
        if(e._tag=="length"){res.size[1]=+e._body}
    }
    return res
}
with (this) _parseSpawn=buildXmlParser({
    type:"type",team:"team",
    pos:["position","parseVec"],rot:["rotation","parseVec"]
})
function parseSpawn(rt,map){
    const r=_parseSpawn(rt,map)
    if(r.type=="red"||r.type=="blue"){r.team=r.type;r.modes=["tdm","ctf"]}
    else if(r.type=="dom"){r.modes=["cp"]}
    else if(r.type=="dm"){r.modes=["dm"];r.team=null}
    else{throw "unknown xmlv1 spawn type: "+JSON.stringify(r)}
    delete r.type;map.spawns.push(r)
}
with (this) parseFlag=buildXmlParser({Eteam:"rt._tag.split('-')[1]",Epos:"parseVec(rt)"})
with (this) parseCP=buildXmlParser({type:"name",Eteam:"null",pos:["position","parseVec"]})
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
function parseCol(rt,map){
    const tile={lib:"_",group:"_",name:"freeCol",colliders:[]};map.tiles.push(tile)
    const cl=tile.colliders
    for(let e of rt._subtags){
        if(e._tag=="collision-box"){cl.push(parseColBox(e));continue}
        if(e._tag=="collision-plane"){cl.push(parseColPlane(e));continue}
        if(e._tag=="collision-triangle"){cl.push(parseColTri(e));continue}
    }
    rebuildColliders(cl)
}
global.mapImport["<"]=function parseV1(mapXml){
    mapXml=mapXml.asciiSlice(0,mapXml.length);mapXml=parseXml(mapXml)
    while(mapXml._tag!="map"&&mapXml._tag!="tanks-map"){mapXml=mapXml._subtags[0]}
    if(mapXml.version&&mapXml.version[0]!=1){
        if(mapXml.version[0]==2&&mapImport["<"].v2){return mapImport["<"].v2(mapXml)}
        if(mapXml.version[0]==3&&mapImport["<"].v3){return mapImport["<"].v3(mapXml)}
        throw "map xml version "+mapXml.version
    }
    const res={tiles:[],bonuses:[],spawns:[],modes:{}}
    for(let e of mapXml._subtags){
        if(e._tag=="static-geometry"){
            for(let e2 of e._subtags){let r=parseProp(e2,res);r.colliders=[];res.tiles.push(r)}
            ;continue}
        if(e._tag=="collision-geometry"){parseCol(e,res);continue}
        if(e._tag=="spawn-points"){for(let e2 of e._subtags){parseSpawn(e2,res)};continue}
        if(e._tag=="bonus-regions"){for(let e2 of e._subtags){parseBonusArea(e2,res)};continue}
        if(e._tag=="ctf-flags"){
            res.modes.ctf=[]
            for(let e2 of e._subtags){res.modes.ctf.push(parseFlag(e2,res))}
            continue
        }
        if(e._tag=="dom-keypoints"){
            res.modes.cp=[]
            for(let e2 of e._subtags){res.modes.cp.push(parseCP(e2,res))}
            continue
        }
        throw "xmlv1 unknown section: "+e._tag
    }
    return res
}
require("./xmlv2.js")
require("./xmlv3.js")
})()
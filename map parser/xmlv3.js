(()=>{
with (this) parseCollider=buildXmlParser({
    v0:["v0","parseVecO"],v1:["v1","parseVecO"],v2:["v2","parseVecO"],
    size:["size","parseVec"],pos:["position","parseVec"],rot:["angles","parseVec"]
})
with (this) parsePropType=buildXmlParser({
    lib:"library-name",group:"group-name",name:"name",
    Ltexlst:["texture-name","_body"],
    Lcolliders:[["collision-box","collision-rect","collision-triangle"],"parseCollider"]
})
with (this) parseTile=buildXmlParser({
    propI:"prop-index",texI:["texture-index","+_body"],
    pos:["position","parseVec"],rot:[["angles","rotation","rotation-z"],"parseVec"]
})
function parseSpawn(rt,map){
    const r=_parseSpawn(rt,map)
    if(r.type=="red"||r.type=="blue"){r.team=r.type;r.modes=["tdm","ctf"]}
    else if(r.type=="dom"){r.modes=["cp"]}
    else if(r.type=="dm"){r.modes=["dm"];r.team=null}
    else{throw "unknown xmlv2 spawn type: "+JSON.stringify(r)}
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
global.mapImport["<"].v3=function parseV3(mapXml){
    while(mapXml._tag!="map"&&mapXml._tag!="tanks-map"){mapXml=mapXml._subtags[0]}
    const res={tiles:[],bonuses:[],spawns:[],modes:{}}
    const propTypes=[]
    for(let e of mapXml._subtags){
        if(e._tag=="prop"){e=parsePropType(e,res)
            //console.error(e)
            if(e.colliders){rebuildColliders(e.colliders)}
            propTypes.push(e);continue
        }
        if(e._tag=="mesh"||e._tag=="sprite"){e=parseTile(e)
            //console.error(e)
            const e2=propTypes[e.propI]
            const r={lib:e2.lib,group:e2.group,name:e2.name,rot:e.rot,pos:e.pos}
            if(e.texI){r.tex=e2.texlst[e.texI]}
            if(e2.colliders){r.colliders=e2.colliders}
            res.tiles.push(r)
            continue
        }
        if(e._tag=="spawn-point"){parseSpawn(e,res);continue}
        if(e._tag=="bonus-region"){parseBonusArea(e,res);continue}
        if(e._tag=="ctf-flags"){//FIXME whenever you'll have info
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
})()
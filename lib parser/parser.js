require("./tara.js")
require("./json.js")//first one will have higher priority
require("./xml.js")
global.parseLib=async function parseLib(s){
    for(let parser of libImport){
        try{let r=await parser(s)
            if(r){libcache[r._name]=r;return r}
        }catch{continue}
    }
    return undefined
}

global.timeLog={dl:0,parse:0,conv:0}
global.parseProplibModel=async function parseProplibModel(rt,obj){
//console.error("M",rt,obj)
    obj.colliders=[]
for(let i=0;i<obj.lods.length;i++){
let t0=performance.now()
    let fn=obj.lods[i],r=await getBuff(rt,fn);delete obj.lods[i]//makes it undefined
if(r.status!=200){console.error(r.url,r.status,"load",fn);continue}
timeLog.dl+=-(t0-(t0=performance.now()))
    let s=parseMesh(r)
    if(!s){console.error(r.url,r.status,"parser",fn);continue}
timeLog.parse+=-(t0-(t0=performance.now()))
    if(i==0){for(let m of s){const mn=m.name.toLowerCase()
        if(mn.startsWith("box")&&m.groups[0].F.length==12){obj.colliders.push(meshToBox(m));continue}
        if(mn.startsWith("plane")&&m.V.length==4){obj.colliders.push(meshToPlane(m));continue}
        if(mn.startsWith("tri")&&m.V.length==3){
            obj.colliders.push({v0:m.V[0],v1:m.V[1],v2:m.V[2]});continue}
        if(mn.startsWith("occl")){continue}//TODO?
        //console.warn("lib/xml/ln54: mesh",mn,m.V.length,"verts")
        obj.lods[i]=m
    }}else{for(let m of s){const mn=m.name.toLowerCase()
        if(mn.startsWith("box")&&m.groups[0].F.length==12){continue}
        if(mn.startsWith("plane")&&m.V.length==4){continue}
        if(mn.startsWith("tri")&&m.V.length==3){continue}
        if(mn.startsWith("occl")){continue}//TODO?
        //console.warn("lib/xml/ln54/2: mesh",mn,m.V.length,"verts")
        obj.lods[i]=m
    }}
timeLog.conv+=-(t0-(t0=performance.now()))
}
    rebuildColliders(obj.colliders)
timeLog.conv+=-(t0-(t0=performance.now()))
}
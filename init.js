try{window.global=window;global.env="web"}
catch{global.window=global;global.env="node"}
if(global.env=="node"){
    {
        let s=require("node:fs").readFileSync("./vec.js","utf-8")
        s=s.replaceAll(/\nfunction ([^()]*)\(/g,"\nglobal.$1=function $1(")
        eval(s)
        console.log(global.vaddI)
    }
}

global.stdT=function stdT(a){
    const cx=cos(a[0]),cy=cos(a[1]),cz=cos(a[2])
    const sx=sin(a[0]),sy=sin(a[1]),sz=sin(a[2])
    const sysx=sy*sx,sycx=sy*cx
    const T=[
    cz*cy,cz*sysx-sz*cx,cz*sycx+sz*sx,
    sz*cy,sz*sysx+cz*cx,sz*sycx-cz*sx,
      -sy,        cy*sx,        cy*cx
    ]
    return T
}
global.stdTQ=function stdTQ(q){//idk if it's correct
    const l=(q[0]*q[0]+q[1]*q[1]+q[2]*q[2]+q[3]*q[3])**.5
    if(l==0){return [1,0,0, 0,1,0, 0,0,1]}
    const x=q[0]/l,y=q[1]/l,z=q[2]/l,w=q[3]/l
    const T=[
      1-2*y*y-2*z*z,  2*x*y-2*z*w,  2*x*z+2*y*w,
        2*x*y+2*z*w,1-2*x*x-2*z*z,  2*y*z-2*x*w,
        2*x*z-2*y*w,  2*y*z+2*x*w,1-2*x*x-2*y*y,
    ]
    return T
}
global.stdTI=function stdTI(T){
    let res=[0,0,0]
    res[0]=atan2(T[7],T[8]);res[2]=atan2(T[3],T[0])
    res[1]=abs(sin(res[0]))<.01?Math.asin(-T[6]):atan2(-T[6],T[7]/sin(res[0]))
    //if(res[0]!=res[0]||res[1]!=res[1]||res[2]!=res[2]){console.error(T)}
    return res
}

global.meshImport={}
global.mapImport={};global.mapExport={}
global.libImport=[]
global.libcache={}
global.getBuff=async function(rt,path){
//console.error("buff",rt.toString(),path)
    if(path[0]=="/"){path=path.slice(1)}
    if(rt instanceof Array){
        console.error("getBuff:tara:",path)
        for(let f of rt){if(f.name==path){
            f.buff.status=200;f.buff.url="tara:"+f.name;return f.buff}}
        return {url:"tara:"+path,status:404}
    }
    if(rt.startsWith("http")||global.env=="web"){
        if(rt[rt.length-1]=="/"){rt=rt+path}else{rt=rt+"/"+path}
        try{
            const r=await fetch(rt)
            const res=new DataView(await r.arrayBuffer())
            res.status=r.status;res.url=rt
            console.error("getBuff:fetch:",path,r.status,res.byteLength)
            return res
        }catch(e){
            console.error("getBuff:fetch:",rt,e.message)
            return {url:rt,status:404}
        }
    }
    //node-only; because node's fetch can't load local files
    if(rt.startsWith("file://")){rt=rt.slice(7)}
    if(rt[rt.length-1]=="/"){rt=rt+path}else{rt=rt+"/"+path}
    try{
        const res=await require("node:fs/promises").readFile(rt)
        res.status=200;res.url=rt;return res
    }catch(e){console.error("getBuff:fs:",rt,e.message);return {url:rt,status:404}}
}
require("./cpe.js")//TODO do something for browser
require("./xml.js")
require("./tara.js")
require("./mesh parser/parser.js")
require("./lib parser/parser.js")
require("./map parser/parser.js")
require("./map export/export.js")
require("./meshgen.js")
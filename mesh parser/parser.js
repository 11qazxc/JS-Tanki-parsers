require("./a3d2.js")
require("./3ds.js")
global.parseMesh=function parseMesh(s){
    let keys=Object.keys(meshImport).sort((a,b)=>b.length-a.length)
    for(let k of keys){
        if(s.asciiSlice(0,k.length)==k){return meshImport[k](s)}
    }
    return []
}

global.meshToBox=function meshToBox(e){let V=e.V;
    for(let i=0;i<V.length;i++){for(let j=i+1;j<V.length;j++){
        if(V[i][0]==V[j][0]
         &&V[i][1]==V[j][1]
         &&V[i][2]==V[j][2]){V.splice(j,1);j--}
    }}
    V.sort((a,b)=>((a[2]-b[2])*1E+2+(a[1]-b[1]))*1E+2+(a[0]-b[0]))
    let p0=e.V[0],px=vsubI(V[1],p0),py=vsubI(V[2],p0),pz=vsubI(V[4],p0)
    const res={size:[vlen(px),vlen(py),vlen(pz)],pos:null,rot:null}
    vmulfI(px,1/res.size[0]);vmulfI(py,1/res.size[1]);vmulfI(pz,1/res.size[2])
    let T=[px[0],py[0],pz[0],px[1],py[1],pz[1],px[2],py[2],pz[2]]
    res.rot=stdTI(T)
    res.pos=vaddI(vmulfI(vT33(T,res.size),.5),p0)
    return res
}

global.meshToPlane=function meshToPlane(r){let V=r.V;
    V.sort((a,b)=>(a[0]-b[0])*1E+2+(a[1]-b[1])+(a[2]-b[2])*1E-2)
    const r2={size:[vdist(V[0],V[2]),vdist(V[0],V[1]),0],pos:[0,0,0],rot:null}
    vaddI(r2.pos,vmulfI(vaddI(vaddI(vadd(V[0],V[1]),V[2]),V[3]),1/4))
    const dx=vmulfI(vsub(V[2],V[0]),1/r2.size[0])
    const dy=vmulfI(vsub(V[1],V[0]),1/r2.size[1])
    let T=[dx[0],dy[0],NaN,
           dx[1],dy[1],NaN,
           dx[2],dy[2],(dx[2]**2+dy[2]**2)>1?0:(1-dx[2]**2-dy[2]**2)**.5]
    r2.rot=stdTI(T)
    return r2
}

global.rebuildColliders=function rebuildColliders(lst){
    let tris=[]
    for(let i=0;i<lst.length;i++){let e=lst[i]
        if(!e.v0){continue}
        let vl=[e.v0,e.v1,e.v2]
        let T=e.rot?stdT(e.rot):[1,0,0, 0,1,0, 0,0,1]
        let p=e.pos||[0,0,0]
        for(let i=0;i<3;i++){vl[i]=vaddI(vT33(T,vl[i]),p)}//clones verts because xmlv2 reuses colliders
        tris.push(vl)
        lst.splice(i,1);--i
    }
    if(tris.length==0){return}
    let V=[],F=[],M={V:V,groups:[{F:F}]}
    for(let i=0;i<tris.length;i++){
        let vl=tris[i],fl=[]
        for(let j=0;j<3;j++){let cv=vl[j]
            let f=-1
            for(let k=0;k<V.length;k++){if(vdist(V[k],cv)<1){f=k;break}}
            if(f==-1){f=V.length;V.push([...cv])}
            fl.push(f)
        }F.push(fl)
    }
    lst.push(M)
}
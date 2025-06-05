function meshTransform(td,m){
    const n=m[0].length
    let p=td.pos,r=td.rot,s=td.scale
    if(s&&(s[0]!=1||s[1]!=1||s[2]!=1)){for(let i=0;i<n;i++){vmulI(m[0][i],s)}}
    if(r&&(r[0]!=0||r[1]!=0||r[2]!=0)){let T=stdT(r)
        for(let i=0;i<n;i++){vT33(T,m[0][i],m[0][i])}
    }
    if(p&&(p[0]!=0||p[1]!=0||p[2]!=0)){for(let i=0;i<n;i++){vaddI(m[0][i],p)}}
    return m
}
function meshRect(e){
    const V=[[-.5*e.size[0],-.5*e.size[1],0],[-.5*e.size[0], .5*e.size[1],0],
             [ .5*e.size[0],-.5*e.size[1],0],[ .5*e.size[0], .5*e.size[1],0]]
    let res=[V,[[0,2,1],[1,2,3]]]
    return meshTransform(e,res)
}
function meshBox(e){if(e.size[2]==0){return meshRect(e)}
    const V=[],s=.5
    for(let i=0;i<8;i++){V.push(vmulI([i&1?-s:s,i&2?-s:s,i&4?-s:s],e.size))}
    const L=[[0,1,2],[2,1,3],[4,6,5],[5,6,7],//i&4
             [0,1,4],[4,1,5],[2,6,3],[3,6,7],//i&2
             [0,2,4],[4,2,6],[1,5,3],[3,5,7],//i&1
    ]
    let res=[V,L]
    return meshTransform(e,res)
}
function meshCol(e){if(e.size){return meshBox(e)}
    let M=[[],[]]
    for(let i=0;i<e.groups.length;i++){let fl=e.groups[i].F
        for(let j=0;j<fl.length;j++){M[1].push([...fl[j]])}
    }
    for(let i=0;i<e.V.length;i++){let cv=e.V[i];M[0].push([cv[0],cv[1],cv[2]])}
    return M
}
function meshColLst(lst){
    const V=[],L=[]
    for(let e of lst){let M=meshCol(e)
        for(let i=0;i<M[1].length;i++){
            let f=M[1][i];f[0]+=V.length;f[1]+=V.length;f[2]+=V.length
            L.push(f)
        }
        for(let i=0;i<M[0].length;i++){V.push(M[0][i])}
    }
    return [V,L]
}
global.meshTileC=function meshPropC(e){
    let col=e.colliders
    if(!col){
        let typ=libcache[e.lib]
        if(!typ){return [[],[]]}
        typ=typ[e.group][e.name]
        if(!typ){return [[],[]]}
        col=typ.colliders
    }
    let M=meshColLst(col)
    if(M[0].length==0){return M}
    meshTransform(e,M);for(let i=0;i<M[0].length;i++){vmulfI(M[0][i],.01)}
    return M
}
global.meshTileV=function meshPropV(e){
    let M=e.lods?e.lods[0]:undefined
    if(!e.lods){
        let typ=libcache[e.lib]
        if(!typ){return [[],[]]}
        typ=typ[e.group][e.name]
        if(!typ){return [[],[]]}
        M=typ.lods[0]
        if(!M){return [[],[]]}
    }
    if(!M||!M.V.length){return [[],[]]}
    let V=[],F=[]
    for(let i=0;i<M.groups.length;i++){let fl=M.groups[i].F
        for(let j=0;j<fl.length;j++){F.push(fl[j])}
    }
    for(let i=0;i<M.V.length;i++){V.push([...M.V[i]])}
    M=[V,F]
    meshTransform(e,M);for(let i=0;i<M[0].length;i++){vmulfI(M[0][i],.01)}
    return M
}
global.meshSpawn=function meshSpawn(e){
    const res=[[[-50,-100,-50],[50,-100,-50],[0,-100,50],[0,100,0]],
        [[0,1,2],[1,0,3],[2,1,3],[0,2,3]]
    ]
    meshTransform(e,res);for(let i=0;i<4;i++){vmulfI(res[0][i],.01)}
    return res
}
global.meshSpecial=function meshSpecial(e){
    if(e.scale){return meshBox(e)}
    const res=[[[-50,-50,0],[50,-50,0],[-50,50,0],[50,50,0],[0,0,500]],
        [[1,0,2],[1,2,3],[0,1,4],[1,3,4],[3,2,4],[2,0,4]]
    ]
    meshTransform(e,res);for(let i=0;i<res[0].length;i++){vmulfI(res[0][i],.01)}
    return res
}
global.meshBonus=function meshBonus(e){
    const res=meshBox(e);for(let i=0;i<res[0].length;i++){vmulfI(res[0][i],.01)}
    return res
}

global.logMesh=function logMesh(M){//[V,F]
    let r="";const V=M[0],F=M[1]
    for(let i=0;i<V.length;i++){r+=("v "+V[i][0]+" "+V[i][1]+" "+V[i][2]+"\n")}
    const vc=-V.length
    for(let i=0;i<F.length;i++){
        r+=("f "+(F[i][0]+vc)+" "+(F[i][1]+vc)+" "+(F[i][2]+vc)+"\n")
    }
    console.log(r.slice(0,-1))
}
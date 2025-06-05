//TX glTF
function readBuffers(s){
    i0=4//glTF
    i0+=4//version
    i0+=4//file size
    const buffs=[]
    while(i0<s.length){
        let l=s.readUint32LE(i0);i0+=4
        let fmt=s.asciiSlice(i0,i0+4);i0+=4
        let buff=(fmt=="JSON"?s.asciiSlice(i0,i0+l):s.slice(i0,i0+l));i0+=l
        buffs.push(buff)
    }
    return buffs
}

function clearName(s){
    s=s.split(" ")
    for(let i=0;i<s.length;i++){s[i]=s[i].split(".")}
    for(let i=0;i<s.length;i++){for(let j=0;j<s[i].length;j++){let cs=s[i][j]
        let d=true
        let k0=cs[0]=="("?1:0;let k1=cs[cs.length-1]==")"?cs.length-1:cs.length
        for(let k=k0;k<k1;k++){if(+cs[k]!=+cs[k]){d=false;break}}
        if(d){s[i].splice(j,1);j--}
    }if(s[i].length==0){s.splice(i,1);i--}}
    for(let i=0;i<s.length;i++){s[i]=s[i].join(".")}
    return s.join(" ").trim()
}

function buildTrees(s){
    s=readBuffers(s)
    const d=JSON.parse(s[0])
    delete d.asset//meta
    d.root=d.nodes[d.scenes[d.scene].nodes[0]];delete d.scene;delete d.scenes
    //second node of scene is camera
    d.buffers[0]=s[1]
    for(let i=0;i<d.nodes.length;i++){
        let cn=d.nodes[i]
        cn.name=clearName(cn.name)
        if(cn.children){for(let j=0;j<cn.children.length;j++){cn.children[j]=d.nodes[cn.children[j]]}}
        if(cn.mesh!==undefined){cn.mesh=d.meshes[cn.mesh]}
        if(cn.name.toLowerCase()=="spawn points"){d.spawnRoot=cn}
    }
    for(let c of d.root.children){d.root[c.name]=c}
    for(let i=0;i<d.bufferViews.length;i++){
        let cbv=d.bufferViews[i]
        cbv.buffer=d.buffers[cbv.buffer];cbv.byteOffset=cbv.byteOffset||0
        d.bufferViews[i]=cbv.buffer.slice(cbv.byteOffset,cbv.byteOffset+cbv.byteLength)
        if(cbv.byteStride){d.bufferViews[i].stride=cbv.byteStride}
    }
    for(let i=0;i<d.accessors.length;i++){
        let ca=d.accessors[i]
        ca.bufferView=d.bufferViews[ca.bufferView]
    }
    for(let i=0;i<d.images.length;i++){
        let ci=d.images[i]
        ci.bufferView=d.bufferViews[ci.bufferView]
    }
    for(let i=0;i<d.textures.length;i++){d.textures[i]=d.images[d.textures[i].source]}delete d.images;
    let nmat={}
    for(let i=0;i<d.materials.length;i++){
        let cm=d.materials[i],nm={}
        if(cm.pbrMetallicRoughness.baseColorTexture){
            nm.file={buffer:d.textures[cm.pbrMetallicRoughness.baseColorTexture.index]}
        }
        nm.name=cm.name
        nmat[nm.name]=nm
    }d.materials=nmat
    for(let i=0;i<d.meshes.length;i++){//!TODO textures
        let cm=d.meshes[i]
        const mattrs={NORMAL:"N",POSITION:"V",TEXCOORD_0:"UV",TEXCOORD_1:"UV2"}
        for(let j=0;j<cm.primitives.length;j++){
            let cp=cm.primitives[j]
            let np={F:d.accessors[cp.indices]}
            for(let k in cp.attributes){if(!mattrs[k]){continue}
                np[mattrs[k]]=d.accessors[cp.attributes[k]]
            }
            cm.primitives[j]=np
        }
    }
    return d
}

function parsePrim(d){
    const sized={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}
    const dtd={5123:"U16LE",5126:"FLE"}
    for(let k in d){
        let acc=d[k]
        const dt=acc.componentType;if(!dtd[dt]){throw "glTF dtype "+dt}
        const dts=dt==5123?2:4;const vlen=k=="F"?3:sized[acc.type]
        const vcnt=k=="F"?acc.count/3:acc.count
        let res=[],buf=acc.bufferView,
            stride=k=="F"?vlen*dts:(buf.stride||buf.stride),
            i0=acc.byteOffset||0
        for(let i=0;i<vcnt;i++){
            let sr=[]
            for(let j=0;j<vlen;j++){sr.push(dt==5123?buf.readUint16LE(i0+dts*j):buf.readFloatLE(i0+dts*j))}
            i0+=stride
            res.push(sr)
        }
        d[k]=res
    }
}

function buildPropMeshes(d){
    let _d=d;d=d.nodes;let res={}
    for(let i=0;i<d.length;i++){let c=d[i]
        if(!c.mesh){continue}
//if(res[c.name]){c.mesh=res[c.name];continue}
        //console.log(i,c.name,c.mesh.primitives.length)
        for(let p of c.mesh.primitives){parsePrim(p)}
        let p=c.mesh.primitives,ci=p[0].V.length
        res[c.name]=c.mesh=p[0]
        for(let j=1;j<p.length;j++){let cp=p[j]
            for(let k in cp){
                let ca=p[0][k],cb=cp[k]
                if(k=="F"){for(let cv of cb){cv[0]+=ci;cv[1]+=ci;cv[2]+=ci}}
                for(let cv of cb){ca.push(cv)}
            }
            ci+=cp.V.length
        }
    }
    _d.meshes=res
}

function buildCollider(node){
    if(!node.mesh){
        if(node.name!="Cube"){throw "gltf non-cube primitive: "+node.name}
        let res={}
        res.size=vmulf(node.scale||[1,1,1],100)
        res.pos=vmulf(node.translation||[0,0,0],100)
        res.rot=node.rotation?stdTI(stdTQ(node.rotation)):[0,0,0]
        return res
    }
    const V=[],F=[]
    const res={V:V,groups:[{F:F}]}
    let s=vmulf(node.size||[1,1,1],100)
    let r=node.rotation?stdTQ(node.rotation):[1,0,0, 0,1,0, 0,0,1]
    let t=vmulf(node.translation||[0,0,0],100)
    let m=node.mesh
    for(let v of m.V){
        let cv=vmul(v,s)
        V.push(vaddI(vT33(r,cv,cv),t))
    }
    for(let f of m.F){F.push([f[0],f[1],f[2]])}
    return res
}

function buildProps(d,res,T){
    res=res||{};T=T||[]
    if(d.nodes){
        let rt=d.root
        let ig=['name','children','WayPoints','Main Camera',
                'Directional Light','Light','MapDust',
                'CollIders','VisualCollisionRoot','MapSceneLoadedMarker']
        //'IgnoreVisualCollision' is used for decals
        for(let k in rt){if(ig.indexOf(k)!=-1){continue}
            buildProps(d.root[k].children,res)
        }
        return res
    }
    for(let n of d){
        let subs=[]
        n.T=T
        if(n.children){
            subs=n.children.filter(e=>(e.mesh||e.children)
                &&e.name.slice(-10)!="_Collision"&&e.name.slice(-8)!="Collider")
            let nT=[n.scale||[1,1,1],n.rotation||[0,0,0,1],n.translation||[0,0,0]]
            if(subs.length){buildProps(subs,res,[...T,nT])}
        }
        if(!n.mesh||res[n.name]){continue}
    console.error("prop",n.name)
        let colliders=n.children?n.children.filter(e=>subs.indexOf(e)==-1).map(buildCollider):[]
        let r={colliders:colliders,lods:[{V:n.mesh.V,groups:[{F:n.mesh.F}]}]}
        let rm=r.lods[0]
        if(n.mesh.UV){rm.UV=n.mesh.UV}if(n.mesh.UV2){rm.UV2=n.mesh.UV2}
        if(n.mesh.N){rm.groups[0].N=n.mesh.N}
        for(let i=0;i<rm.V.length;i++){rm.V[i]=vmulf(rm.V[i],100)}
        res[n.name]=r
    }
    return res
}

function transformStack(Ts){
    let s,r,t
    let T=[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]//[-1,0,0,0, 0,0,1,0, 0,1,0,0, 0,0,0,1]
        ,nT
    for(let _ of Ts){
        s=_[0],r=stdTQ(_[1]),t=_[2]
        nT=[1,0,0,t[0], 0,1,0,t[1], 0,0,1,t[2], 0,0,0,1]
        nT=T44Mul([r[0],r[1],r[2],0, r[3],r[4],r[5],0, r[6],r[7],r[8],0, 0,0,0,1],nT)
        nT=T44Mul([s[0],0,0,0, 0,s[1],0,0, 0,0,s[2],0, 0,0,0,1],nT)
        T=T44Mul(nT,T)
    }
    t=[T[3],T[7],T[11]]
    r=[T[0],T[1],T[2], T[4],T[5],T[6], T[8],T[9],T[10]]
    s=[vlen([r[0],r[1],r[2]]),vlen([r[3],r[4],r[5]]),vlen([r[6],r[7],r[8]])]
    r[0]/=s[0];r[1]/=s[0];r[2]/=s[0]
    r[3]/=s[1];r[4]/=s[1];r[5]/=s[1]
    r[6]/=s[2];r[7]/=s[2];r[8]/=s[2]
    vdivI(vT33(T33RInv(r),t,t),s)
    return [s,stdTI(r),t]
}

mapImport["glTF"]=function _qs(s){
    d=buildTrees(s)
    buildPropMeshes(d)
    
    let proplib=buildProps(d)
    let res={tiles:[],bonuses:[],spawns:[],modes:{}}
    const rTM=[-1,0,0, 0,0,1, 0,1,0]
    let spawnT=d.spawnRoot;
    spawnT=[spawnT.scale||[1,1,1],spawnT.rotation||[0,0,0,1],vmulfI(spawnT.translation||[0,0,0],-1)]
    for(let n of d.nodes){
        if(proplib[n.name]){//TODO incorrect transform Lushok-* and tubes
            if(!n.T){console.error("no T",n.name)}
            let r={lib:"_own",group:"null",name:n.name}
            let s=n.scale||[1,1,1],rot=n.rotation||[0,0,0,1],t=n.translation||[0,0,0]
            let T=[...n.T,[s,rot,t]]
            T=transformStack(T);r.scale=T[0];r.rot=T[1];r.pos=vmulfI(T[2],100)
            res.tiles.push(r);continue
        }
        if(n.name.startsWith("SpawnPoint")){
            let s=n.scale||[1,1,1],r=n.rotation||[0,0,0,1],t=n.translation||[0,0,0]
            let T=transformStack([spawnT,[s,r,t]]);vmulfI(T[2],100)
            let typ=n.name.slice(10).toLowerCase().split(" ")
            if(typ[0]=="red"||typ[0]=="blue"){let tmp=typ[1];typ[1]=typ[0];typ[0]=tmp}
            if(typ[0]=="dm"){
                res.spawns.push({types:["dm"],team:null,pos:T[2],rot:T[1]})
            }else if(typ[0]=="tdm"){
                res.spawns.push({types:["tdm"],team:typ[1],pos:T[2],rot:T[1]})
            }else{throw "glTF spawn type "+typ}
            continue
        }
        let rot=transformStack([[[1,1,1],n.rotation||[0,0,0,1],n.translation||[0,0,0]]]),
            pos=vmulfI(rot[2],100);rot=rot[1]
        if(n.name.startsWith("Flag ")){
            res.modes.ctf=res.modes.ctf||[]
            res.modes.ctf.push({team:n.name.split(" ")[1].toLowerCase(),pos:pos})
            continue
        }
        if(n.name.startsWith("BonusRegion ")){
            let typ=n.name.split(" ").slice(1).map(e=>e.toLowerCase())
            res.bonuses.push({pos:pos,rot:rot,
                size:vT33(rTM,(n.children&&n.children.length&&n.children[0].size)||[0,0,0])
                ,types:typ.map(e=>e.toLowerCase())})
            continue
        }
//console.error(n.name,n.children?n.children.length:undefined)
    }
    libcache._own={null:proplib}
    return res
}

/*
function findPath(name){
    let i=d.nodes.findIndex(e=>e.name==name)
    while(i!=-1&&d.nodes[i].name!="Map"){
        console.error(i,d.nodes[i].name);
        i=d.nodes.findIndex(e=>e.children&&e.children.indexOf(d.nodes[i])!=-1)
    }
}
*/
//!TODO A3D3, smooth group handling
//length doesn't seems correct, so pass object for results and return address
(()=>{
const a3d2ReadMaterial=buildParser("a3d2ReadMaterial",`magick_U32LE:4;U32LE:_
    U32LE:len
    {
        ASCIIZ:res.name
        FLE[3]:res.diffuse[]
        ASCIIZ:res.file
    }[len]:res[]
`)
const a3d2ReadMeshV=buildParser("a3d2ReadMeshV",`magick_U32LE:2;U32LE:_
    U32LE:nM
    {
        U32LE:nV
        U32LE:nB
        {
            U32LE:type=res.type:["","V","UV","N","UV2","CLR","N2"]
            {FLE[[3,3,4,2]["VNCU".indexOf(type[0])]]:res[]}[nV]:res.buff[]
        }[nB]:res[type]
        U32LE:nSub
        {
            U32LE:nF
            {U16LE[3]:res[]}[nF]:res.F[]
            {U32LE[nF]:res[]}:_
            U16LE:res.mat
        }[nSub]:res.subs[]
    }[nM]:res[]
`)
const a3d2ReadT=buildParser("a3d2ReadT",`magick_U32LE:3;U32LE:_
    U32LE:len
    {
        FLE[3]:res.pos[]
        FLE[4]:res.rot[]
        FLE[3]:res.scale[]
    }[len]:res[]
`)

const a3d2ReadObject=buildParser("a3d2ReadObject",`magick_U32LE:5;U32LE:_
    U32LE:len
    {
        ASCIIZ[1]:res[]
        U32LE[2]:res[]
    }[len]:res[]
`)

meshImport["A3D\0\2\0\0\0"]=function a3dRead(s){
    let res={transforms:[],meshes:[],objects:[],materials:[]}
    let i0=4;const version=s.readUint32LE(i0);i0+=4
    i0+=4;i0+=4;//root chunk
    while(i0<(s.length||s.byteLength)){
        const ct=s.readUint32LE(i0)
        if(ct==4){i0=a3d2ReadMaterial(s,i0,res.materials);continue}
        if(ct==2){i0=a3d2ReadMeshV(s,i0,res.meshes);continue}
        if(ct==3){i0=a3d2ReadT(s,i0,res.transforms);continue}
        if(ct==5){i0=a3d2ReadObject(s,i0,res.objects);continue}
        if(ct==0){i0+=4;continue}//some kind of padding?
        break
    }
    let r2=[]
    for(let i=0;i<res.objects.length;i++){let oi=res.objects[i]
        let T=res.transforms[oi[2]],cm=res.meshes[oi[1]]
        const s=T.scale,r=stdTQ(T.rot),t=T.pos
        let c={V:cm.V.buff,UV:cm.UV.buff,groups:[],name:oi[0]}
        for(let e of cm.subs){c.groups.push({F:e.F,tex:res.materials[e.mat]})}
        for(const v of c.V){vmulI(v,s);vT33(r,v,v);vaddI(v,t)}
        r2.push(c)
    }
    return r2
}
})()
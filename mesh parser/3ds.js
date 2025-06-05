(()=>{
function m3dsChunk(s,i0){
    const id=s.readUint16LE(i0);i0+=2
    const len=s.readUint32LE(i0);i0+=4
    return [id,len]
}
function m3dsParseColor(s,i0,type){
    type=type||s.readUint16LE(i0)
    i0+=6;
    if(type==0x0010){return [s.readFloatLE(i0),s.readFloatLE(i0+4),s.readFloatLE(i0+8)]}
    if(type==0x0011){return [s.readUint8(i0),s.readUint8(i0+1),s.readUint8(i0+2)]}
    
    //gamma-correction?
    if(type==0x0012){return [s.readUint8(i0),s.readUint8(i0+1),s.readUint8(i0+2)]}
    if(type==0x0013){return [s.readFloatLE(i0),s.readFloatLE(i0+4),s.readFloatLE(i0+8)]}
    
    if(type==0x0030){return s.readInt16LE(i0)}
    if(type==0x0031){return s.readFloatLE(i0)}
}
function m3dsGenPF(d){
    let s="const end=i0+len;let res={};i0+=6\n"
    let ls=""
    const fx={"U16":"s.readUint16LE(i0+6)","16":"s.readInt16LE(i0+6)",
        "16p":"s.readInt16LE(i0+6)/100","F":"s.readFloatLE(i0+6)",
        "CLR":"m3dsParseColor(s,i0+6)","ASCIIZ":"s.asciiSlice(i0+6,i0+cc[1]-1)",
        "FLAG":"true"
    }
    for(let k in d){
        let v=d[k]
        if((typeof v)=="string"){v=fx[v]||v;s+=`res["${k}"]=${v}\n`;continue}
        if(v[0] instanceof Array){v[0]=v[0].join('||cc[0]==')+''}else{v[0]=v[0]}
        v[1]=fx[v[1]]||v[1]
        if(k[0]=="L"){k=k.slice(1);s+=`res["${k}"]=[]\n`
            ls+=`    ${ls.length?"else if":"if"}(cc[0]==${v[0]}){res["${k}"].push(${v[1]})}\n`
        }else{ls+=`    ${ls.length?"else if":"if"}(cc[0]==${v[0]}){res["${k}"]=${v[1]}}\n`}
    }
    s=s+"while(i0<end){let cc=m3dsChunk(s,i0)\n"+ls+"\n"
            +"else{}//console.warn('3ds unknown chunk',cc[0].toString(16),cc[1])}\n"
        +"i0+=cc[1]}\nreturn res"
    return eval(`(function(s,i0,len){${s}})`)
}
const m3dsParseTex=m3dsGenPF({
    //strength:[0x0030,"16p"],flags:[0xA351,"U16"],blur:[0xA353,"F"],
    file:[0xA300,"ASCIIZ"],
})
const m3dsParseMat=m3dsGenPF({
    name:[0xA000,"ASCIIZ"],
    /*ambient:[0xA010,"CLR"],*//*diffuse:[0xA020,"CLR"],*///specular:[0xA030,"CLR"],
    //shininess:[0xA040,"m3dsParseColor(s,i0+6)/100"],transparency:[0xA050,"m3dsParseColor(s,i0+6)/100"],
    //wireSize:[0xA087,"F"],WIRE_ABS:[0xA08E,"FLAG"],
    //shadingMode:[0xA100,'["wire","flat","gouraud","phong","metal"][s.readUint16LE(i0+6)]'],
    file:[0xA200,"m3dsParseTex(s,i0,cc[1]).file"],//opacmap:[0xA210,"m3dsParseTex(s,i0,cc[1])"],
    //bumpmap:[0xA230,"m3dsParseTex(s,i0,cc[1])"]
})//shininessStr is removed because file had no use-flag
function m3dsParseMesh(s,i0,len){
    let end=i0+len,res={name:"",V:[],F:[],UV:[]};i0+=6
    res.name=""
    res.T=[0,0,0,0,0,0,0,0,0];res.pos=[0,0,0]
    while(s.readUint8(i0)!=0){res.name+=String.fromCharCode(s.readUint8(i0));i0++}i0++
    if(s.readUint16LE(i0)!=0x4100){return {}}end=i0+s.readUint32LE(i0+2);i0+=6
    while(i0<end){
        const cc=m3dsChunk(s,i0)
//console.error(cc[0].toString(16),cc[1])
        if(cc[0]==0x4110){const nv=s.readUint16LE(i0+6)
            for(let i=0;i<nv;i++){
                res.V.push([s.readFloatLE(i0+6+2+0+4*3*i),
                            s.readFloatLE(i0+6+2+4+4*3*i),
                            s.readFloatLE(i0+6+2+8+4*3*i)])
        }}
        else if(cc[0]==0x4120){const nf=s.readUint16LE(i0+6)
            for(let i=0;i<nf;i++){
                res.F.push([s.readUint16LE(i0+6+2+0+2*4*i),
                            s.readUint16LE(i0+6+2+2+2*4*i),
                            s.readUint16LE(i0+6+2+4+2*4*i)])//fourth is padding? or smooth group?
        }}
        else if(cc[0]==0x4130){console.error("4130")
            console.error(cc)
        }
        else if(cc[0]==0x4140){const nv=s.readUint16LE(i0+6)
            for(let i=0;i<nv;i++){
                res.UV.push([s.readFloatLE(i0+6+2+0+4*2*i),s.readFloatLE(i0+6+2+4+4*2*i)])
        }}
        else if(cc[0]==0x4160){
            for(let i=0;i<9;i++){res.T[i]=s.readFloatLE(i0+6+4*i)}
            for(let i=9;i<12;i++){res.pos[i-9]=s.readFloatLE(i0+6+4*i)}
        }else{console.warn("m3ds unknown chunk",cc[0].toString(16),cc[1])}
        i0+=cc[1]
    }
    return res
}
function m3dsParseChunk(s,i0,type,len,res){
    const end=i0+len
    if(type==0xAFFF){let r=m3dsParseMat(s,i0,len);res.materials[r.name]=r;return}
    if(type==0x4000){
        let r=m3dsParseMesh(s,i0,len)
//console.error("3ds 0x4000",r.name)
        vmulfI(r.pos,-1)
        //console.log(r.pos)
        if(!res.goff){res.goff=r.pos}
        res.meshes.push(r)
        return
    }
    if(type==0xb000){
        s=s.slice(i0,end)
        let ascs=s.asciiSlice(0,s.length||s.byteLength)
        for(let i=0;i<res.meshes.length;i++){let c=res.meshes[i]
            if(!c.name){continue}
            let n=c.name,ni=ascs.indexOf(n)
            if(ni==-1){continue}
            if(s.readUint16LE(ni-6)!=0xb010){continue}
            let ui=ni-6+s.readUint32LE(ni-4)
            let pvp=[s.readFloatLE(ui+6),s.readFloatLE(ui+6+4),s.readFloatLE(ui+6+8)]
            //console.log(i,pvp)
            c.pos=vmulfI(pvp,-1)
            if(i==0){while(true){ui+=s.readUint32LE(ui+2)
                let cc=s.readUint16LE(ui)
                if(cc==0xb021){
                    c.rot=[s.readFloatLE(ui+18),s.readFloatLE(ui+18+4),s.readFloatLE(ui+18+8)]
                    break
                }
                if(cc==0xb010||cc==0xb008||cc==0xb002){break}
            }}
        }
    }
}
meshImport["MM"]=function m3dsRead(s){
//4d4d is not file's magick but id of root chunk
    const res={meshes:[],materials:{}}
    let i0=16//2:signature;4:file length;10:version
    s=s.slice(i0);i0=6//,i0+m3dsChunk(s,i0)[1]);i0=6//2:signature;4:length
    s.length=(s.length||s.byteLength)
    while(i0+2<s.length){
        let cc=m3dsChunk(s,i0)
//console.error(cc[0].toString(16),cc[1])
        m3dsParseChunk(s,i0,cc[0],cc[1],res)
        i0+=cc[1]
    }
//console.error(res.V.length,res.F.length)
    if(res.meshes[0].rot){
        let T=stdT(res.meshes[0].rot)
        vT33(T,res.meshes[0].pos,res.meshes[0].pos)
        vT33(T,res.goff,res.goff)
        for(let m of res.meshes.slice(1)){
            vT33(T,m.pos,m.pos)
            let cT=stdT(m.rot||[0,0,0])
            m.rot=stdTI(T33Mul(T,cT,cT))
        }
    }
    for(let m of res.meshes){vaddI(m.pos,res.goff)}
    for(let m of res.meshes){//console.log(m.pos,m.rot)
        const T=stdT(m.rot)
        for(let i=0;i<m.V.length;i++){vaddI(vT33(T,m.V[i],m.V[i]),m.pos)}
    }
    const materials=Object.values(res.materials).filter(e=>e.file)
    const meshNames=res.meshes.map(e=>e.name.toLowerCase())
    const materials2=materials.filter(e=>{
        let n=e.file.toLowerCase();n=n.slice(0,(n.indexOf(".")+1||n.length+1)-1)
        return meshNames.indexOf(n)!=-1
    })
    //no material chunk in mesh
    const tex=materials2[0]||materials[0];tex.file=tex.file.toLowerCase();delete tex.name
    const r2=[]
    for(let m of res.meshes){r2.push({V:m.V,UV:m.UV,groups:[{F:m.F,tex:tex}],name:m.name})}
    return r2
}
})()
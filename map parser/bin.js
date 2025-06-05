(()=>{
//0x70:texture
const parseAtlas=buildParser("parseAtlas",`
    U8:n
    {   U32BE:h
        TOVIASCII:res.file
        U32BE:_
        TOVI:n{
            U32BE[1]:res.size[]
            TOVIASCII:res.lib;TOVIASCII:res.name
            U32BE[1]:res.size[]
            U32BE[2]:res.offset[]
        }[n]:res.texlst[]
        U32BE:w
    }[n]:res[]
`)
//batches 93a;fb0
//res.numbers:.split(";").map(e=>+e)
//that's really really bad way to store a piece of ℕ
const parseBatch=buildParser("parseBatch",`
    U8:n
    {   U32BE:res.wtf1
        TOVIASCII:res.name
        FBE[3]:res.V[]
        TOVIASCII:res.numbers
    }[n]:res[]
`)
//box collider is just a guess from float values 0xcef;21e9
const parseBoxes=buildParser("parseBoxes",`
    TOVI:n
    {   FBE[3]:res.pos[]
        FBE[3]:res.rot[]
        FBE[3]:res.size[]
    }[n]:res[]
`)
//14d0;2a5a quads?
const parseQuads=buildParser("parseQuads",`
    TOVI:n
    {   DBE[1]:res.size[]
        FBE[3]:res.pos[]
        FBE[3]:res.rot[]
        DBE[1]:res.size[]
    }[n]:res[]
`)
//maybe tris 3b92
const parseTris=buildParser("parseTris",`
    TOVI:n
    {   DBE:why_the_fuck_does_triangle_have_double_precision_length_that_isnt_used_at_all
        FBE[3]:res.pos[]
        FBE[3]:res.rot[]
        FBE[3]:res.v0[];FBE[3]:res.v1[];FBE[3]:res.v2[]
    }[n]:res[]
`)
function shaderList(s,i0,res){//0x62e4;0x1a83e
    let n=s.readUint32BE(i0);i0+=4
    for(let i=0;i<n;i++){let l
        let r={}
        r.id=s.readUint32BE(i0);i0+=4
        l=s[i0];i0++;r.prop=s.asciiSlice(i0,i0+l);i0+=l
        i0+=1
        l=s[i0];i0++;r.shader=s.asciiSlice(i0,i0+l);i0+=l
        i0+=1
        r.tex=[];while(s[i0]!=0){
            l=s[i0];i0++;r.tex.push(s.asciiSlice(i0,i0+l));i0+=l
        }i0++
        let n2=s.readUint16BE(i0);i0+=2;r.args={}
        for(let j=0;j<n2;j++){
            let r2=[]
            l=s[i0];i0++;let name=s.asciiSlice(i0,i0+l);i0+=l
            for(let k=0;k<4;k++){r2.push(s.readFloatBE(i0));i0+=4}
            r.args[name]=r2
        }
        res.push(r)
    }
    return i0
}
//669f,1c230 spawns? not drops
const parseSpawns=buildParser("parseSpawns",`
    TOVI:n
    {   FBE[3]:res.pos[]
        FBE[3]:res.rot[]
        U32BE:res.type
    }[n]:res[]
`)
//0x6c34,0x1C7E1:tiles
const parseTiles=buildParser("parseTiles",`
    TOVI:n
    {   TOVIASCII:res.group
        U32BE:res.A;TOVIASCII:res.lib
        U32BE:res.tex;TOVIASCII:res.name
        FBE[3]:res.pos[]
        FBE[3]:res.rot[]
    }[n]:res[]
`)

mapImport.bin=function readBin(s){
    let res={tiles:[],bonuses:[],spawns:[],modes:{},atlases:[]}
    let i0=8//header
    while(s.readUint8(i0)==0){i0++}while(s.readUint8(i0)!=0){i0++}i0--
//console.error("atlas",i0.toString(16))
    const atlas=[];i0=parseAtlas(s,i0,atlas)
    for(let i=0;i<atlas.length;i++){let ca=atlas[i]
        let cf={name:ca.file}
        for(let j=0;j<ca.texlst.length;j++){let ct=ca.texlst[j]
            ct.file=cf;res.atlases.push(ct)
        }
    }
//console.error("batch",i0.toString(16))
    const batch=[];i0=parseBatch(s,i0,batch)
//console.error("boxes",i0.toString(16))
    const colls=[]
    i0=parseBoxes(s,i0,colls)
//console.error("quads",i0.toString(16))
    const quads=[];i0=parseQuads(s,i0,quads)
    for(let q of quads){q.size=[q.size[1],q.size[0],0];colls.push(q)}
//console.error("tris",i0.toString(16))
    i0=parseTris(s,i0,colls)
    rebuildColliders(colls)
    res.tiles.push({lib:"_",group:"_",name:"freeCol",colliders:colls})
//console.error("shaders",i0.toString(16))
    const shaders=[];i0=shaderList(s,i0,shaders)
//console.error("spawns",i0.toString(16))
    i0=parseSpawns(s,i0,res.spawns)
    for(let i=0;i<res.spawns.length;i++){let type=res.spawns[i].type
        let r=res.spawns[i]={pos:res.spawns[i].pos,rot:res.spawns[i].rot}
             if(type==0){r.team= "red";r.modes=["tdm","ctf"]}
        else if(type==1){r.team="blue";r.modes=["tdm","ctf"]}
        else if(type==2){r.team=  null;r.modes=["dm"]}
        else if(type==4){r.team= "red";r.modes=["cp"]}
        else if(type==5){r.team="blue";r.modes=["cp"]}
        else{throw "unknown bin spawn type: "+JSON.stringify(type)}
    }
//console.error("props",i0.toString(16))
    parseTiles(s,i0,res.tiles)
    for(let i of res.tiles.slice(1)){i.colliders=[]}
    //assuming all colliders are stored in _
//console.error(res)
    return res
}
})()
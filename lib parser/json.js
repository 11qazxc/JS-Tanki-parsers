(()=>{
function parseProplibMeshJSON(e){
    const r={name:e.name,lods:[],imgs:{}};e=e.mesh
    for(let e2 of e.textures){
        r.imgs[e2.diffuseMap]={file:e2.diffuseMap}
    }
    r.lods[0]=e.file
    for(let e2 of e.lods){r.lods[e2.level]=e2.file}
    return r
}
function parseProplibJSON(rt,s){s=JSON.parse(s)
    const r={_root_dir:rt,_name:s.name}
    for(let e of s.groups){
        const sr={_name:e.name}
        for(let p of e.props){
            if(!p.mesh){continue}//TODO sprites
            let prop=parseProplibMeshJSON(p)
            sr[prop.name]=prop;delete prop.name
        }
        r[sr._name]=sr;delete sr._name
    }
    return r
}

//https://github.com/github/docs/issues/8031
//but async doesn't changes much if ratelimit is per-hour
async function proplibMeta(rt){
//console.error(rt,"json")
    let libxml=await getBuff(rt,"/library.json")
    if(libxml.status!=200){return undefined}
    res=parseProplibJSON(rt,libxml.asciiSlice())
    //async
    let promises=[]
    for(let grp in res){if(grp[0]=="_"){continue}const g=res[grp]
        for(let mesh in g){promises.push(parseProplibModel(res._root_dir,g[mesh]))}
    }
    await Promise.allSettled(promises)
    
    return res
}
libImport.push(proplibMeta)
})()
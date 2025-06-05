(()=>{
function parseProplibImgs(rt,s){s=parseXml(s)
    while(s._tag!="images"){s=s._subtags[0]}
    const res={}
    for(let e of s._subtags){
        const r={file:e["new-name"]}
        if(e.alpha){r.alpha={file:e.alpha}}
        res[e.name]=r
    }
    return res
}
function parseProplibMeshXml(e,imgd){
    if(e._subtags.length!=1||e._subtags[0]._tag!="mesh"){return}//TODO sprites
    let r={name:e.name,lods:[e._subtags[0].file.toLowerCase()],imgs:{}}
    for(let e2 of e._subtags[0]._subtags){
        r.imgs[e2.name]=imgd[e2.name]||{file:e2["diffuse-map"]}
    }
    return r
}
function parseProplibXml(rt,s,imgd){s=parseXml(s)
    while(s._tag!="library"){s=s._subtags[0]}
    const r={_root_dir:rt,_name:s.name}
    for(let e of s._subtags){
        const sr={_name:e.name}
        for(let e2 of e._subtags){
            let prop=parseProplibMeshXml(e2,imgd)
            if(!prop){continue}
            sr[prop.name]=prop;delete prop.name
        }
        r[sr._name]=sr;delete sr._name
    }
    return r
}

//https://github.com/github/docs/issues/8031
//but async doesn't changes much if ratelimit is per-hour
async function proplibMeta(rt){
    let imgs
    try{imgs=await getBuff(rt,"/images.xml");
        if(imgs.status==200){imgs=parseProplibImgs(rt,imgs.asciiSlice())}
        else{imgs={}}
//console.log(imgs)
    }catch(e){console.error(e);imgs={}}
    let libxml=await getBuff(rt,"/library.xml"),res
//console.error(rt,"xml")
    if(libxml.status==200){res=parseProplibXml(rt,libxml.asciiSlice(),imgs)}
    else{return undefined}
    let promises=[]
    for(let grp in res){if(grp[0]=="_"){continue}const g=res[grp]
        for(let mesh in g){promises.push(parseProplibModel(res._root_dir,g[mesh]))}
    }
    await Promise.allSettled(promises)
    
    return res
}
libImport.push(proplibMeta)
})()
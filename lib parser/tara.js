(()=>{
async function proplibMeta(rt){
    let libxml={status:404}
    try{libxml=await getBuff(rt,"/library.tara")}catch{}
    if(libxml.status!=200){try{libxml=await getBuff(rt,"")}catch{}}
    if(libxml.status!=200){return undefined}
    libxml=unpackTara(libxml)
    return await global.parseLib(libxml)//just call parser again with tara as lib's root
}
libImport.push(proplibMeta)
})()
require("./bin.js");
require("./xml.js");
//require("./gltf.js")//TODO
global.parseMap=function parseMap(s){
    let keys=Object.keys(mapImport).sort((a,b)=>b.length-a.length)
    for(let k of keys){
        if(s.asciiSlice(0,k.length)==k){return mapImport[k](s)}
    }
    return mapImport.bin(s)//no magic in bin files
}
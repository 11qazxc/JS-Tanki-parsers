
function printDict(d){
    if(d===undefined){return "undefined"}
    if((typeof d)!="object"){return d.toString()}
    if(d instanceof Array){return "[Array "+d.length.toString()+"]"}
    let s="{";for(let k in d){s+=k+":"+printDict(d[k])+","}return s+"}"
}

require("./init.js")
let t0=performance.now()

let _d
{
    const fs=require("node:fs")
    console.error(process.argv[2])
    _d=parseMap(fs.readFileSync(process.argv[2]))
    console.error("map load:",(-(t0-(t0=performance.now())))|0,"ms")
    console.error(printDict(_d))
}

function getProplibPath(lib){
//    const git="https://raw.githubusercontent.com/MapMakersAndProgrammers/tanki-prop-libraries/refs/heads/main/flash"
//    const htgit="https://raw.githubusercontent.com/MapMakersAndProgrammers/tanki-prop-libraries/refs/heads/main/html5"
    const git="https://github.com/MapMakersAndProgrammers/tanki-prop-libraries/raw/refs/heads/main/flash/new"
    const htgit="https://github.com/MapMakersAndProgrammers/tanki-prop-libraries/raw/refs/heads/main/html5"
    return git+"/"+lib.toLowerCase().replaceAll(" ","_")
    return htgit+"/"+lib
}
;(async function(){

{
    //async loading
    let loadPromises={}
    for(let e of _d.tiles){
        if(e.lib!="_"&&!loadPromises[e.lib]){loadPromises[e.lib]=parseLib(getProplibPath(e.lib))}
    }
    await Promise.all(Object.values(loadPromises))
    console.error(timeLog)
    console.error("lib load:",(-(t0-(t0=performance.now())))|0,"ms")
    //console.error(libcache)
}

console.log("o spawns")
for(let e of _d.spawns){logMesh(meshSpawn(e))}

for(let k in _d.modes){
    console.log("o specials_"+k)
    for(let e of _d.modes[k]){logMesh(meshSpecial(e))}
}

console.log("o bonuses")
for(let e of _d.bonuses){logMesh(meshBonus(e))}
console.error("gizmo store:",(-(t0-(t0=performance.now())))|0,"ms")

console.log("o freeColls")
for(let e of _d.tiles){if(e.lib!="_"){continue};logMesh(meshTileC(e))}
console.error("fc store:",(-(t0-(t0=performance.now())))|0,"ms")

const nolib={}
console.log("o colls")
for(let e of _d.tiles){
    if(e.lib=="_"){continue};
    const p=e.lib+"/"+e.group+"/"+e.name
    nolib[p]=abs(nolib[p]||0)+1
    if(!libcache[e.lib]||!libcache[e.lib][e.group]||!libcache[e.lib][e.group][e.name]){nolib[p]=-abs(nolib[p])}
    logMesh(meshTileC(e))
}
console.error(nolib)
console.error("coll store:",(-(t0-(t0=performance.now())))|0,"ms")

console.log("o vis")
for(let e of _d.tiles){ /*console.log("o vis_"+e.name);*/ logMesh(meshTileV(e))}
console.error("vis store:",(-(t0-(t0=performance.now())))|0,"ms")
})()
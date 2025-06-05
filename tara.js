(()=>{
require("./cpe.js")
global.taraHeader=buildParser("taraHeader",`
    U32BE:n
    {
        L16BEASCII:res.name
        U32BE:res.length
    }[n]:res[]
`)
global.unpackTara=function unpackTara(s){
    const head=[];let i0=taraHeader(s,0,head)
    for(let f of head){f.buff=s.slice(i0,i0+=f.length)}
    return head
}
})()
function xmlvec(v){
    return (v[0]==0?"":"<x>"+v[0].s()+"</x>")
          +(v[1]==0?"":"<y>"+v[1].s()+"</y>")
          +(v[2]==0?"":"<z>"+v[2].s()+"</z>")
}
function static(map){
    let s="<static-geometry>\n"
    for(let p of map.tiles){if(p.lib=="_"){continue}
    s+=`<prop library-name="${p.lib}" group-name="${p.group}" name="${p.name}">`
    if(p.rot&&(p.rot[0]!=0||p.rot[1]!=0||p.rot[2]!=0)){s+=`  <rotation>${xmlvec(p.rot)}</rotation>`}
    if(p.tex&&(typeof p.tex)=="string"){s+=`<texture-name>${p.tex}</texture-name>`}
    if(p.pos&&(p.pos[0]!=0||p.pos[1]!=0||p.pos[2]!=0)){s+=`  <position>${xmlvec(p.pos)}</position>`}
    s+=`</prop>`
    }
    s+="</static-geometry>"
    return s
}
function xmlbox(b,pos,rot){//TODO scale, it's not guaranteed that it'l keep angles
    let s="";const sc=b.size
    if(sc[0]==0&&sc[1]==0&&sc[2]==0){return ""}
    rot=stdT(rot);const r=stdTI(T33Mul(rot,stdT(b.rot)))
    const p=vaddI(vT33(rot,b.pos),pos)
    let pr=""
    if(p[0]!=0||p[1]!=0||p[2]!=0){pr+=`<position>${xmlvec(p)}</position>`}
    if(r[0]!=0||r[1]!=0||r[2]!=0){pr+=`<rotation>${xmlvec(r)}</rotation>`}
    if(s[2]==0){
        s+=`<collision-plane><width>${s[0]}</width><length>${s[1]}</length>\n`
        s+=pr+`\n</collision-plane>`
    }else{
        s+=`<collision-box><size>${xmlvec(s)}</size>\n`
        s+=pr+`\n</collision-box>`
    }
    return s
}
function xmlmesh(m,scale,pos,rot){
    const V=m.V,F=m.groups[0].F
    const T=stdT(rot)
    let s=""
    for(let f of F){
        const v0=vaddI(vmulI(vT33(T,V[f[0]]),scale),pos)
        const v1=vaddI(vmulI(vT33(T,V[f[1]]),scale),pos)
        const v2=vaddI(vmulI(vT33(T,V[f[2]]),scale),pos)
        s+="<collision-triangle>\n"
        s+=`<v0>${xmlvec(v0)}</v0>\n`
        s+=`<v1>${xmlvec(v1)}</v1>\n`
        s+=`<v2>${xmlvec(v2)}</v2>\n`
        //<rotation></rotation>
        //<position></position>
        s+="</collision-triangle>\n"
    }
    return ""
}
function coll(map){
    let s="<collision-geometry>\n"
    for(let p of map.tiles){
        let cl=p.colliders
        if(!cl){if(!(cl=libcache[p.lib])||!(cl=cl[p.group])||!(cl=cl[p.name])||!(cl=cl.colliders)){continue}}
        for(let c of cl){
            if(c.size){s+=xmlbox(c,p.pos||[0,0,0],p.rot||[0,0,0])+"\n"//TODO scale
            }else{s+=xmlmesh(c,p.scale||[1,1,1],p.pos||[0,0,0],p.rot||[0,0,0])}
    }}
    s+="</collision-geometry>"
    return s
}
global.mapExport.xmlv1=function(map){
    let s='<map version="1.0">\n'
    s+=static(map)+"\n"
    s+=coll(map)+"\n"//TODO
    s+='</map>'
    return s
}
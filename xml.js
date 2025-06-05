function deXml(s){
    return s.replaceAll("&quot;",'"').replaceAll("&lt;","<")
            .replaceAll("&gt;",">").replaceAll("&amp;","&")
}
function parseXmlAttrs(s,curr,start,end){
    let ss=s.slice(start,end).replaceAll("'",'"').split('"')
    if(ss.length>2){ss.length--}//last quote leaves empty string at the end
    for(let i=0;i<ss.length;i+=2){
        let k=ss[i].trim();
        if(k.i(" ")==-1){curr[k.slice(0,-1)]=deXml(ss[i+1]);continue}
        k=k.split(" ")
        curr[k[k.length-1].slice(0,-1)]=deXml(ss[i+1])
        for(let j=0;j<k.length-1;j++){curr[k[j]]=null}
    }
}
global.parseXml=function parseXml(s){
    const root={_parent:null,_tag:"_root",_subtags:[],_body:""}
    let curr=root
    let start=0,end=0
    while(true){
        start=s.i("<",start)+1;if(start==0){break}
        const bodypart=s.slice(end+1,start-1)
        if(!bodypart.isWS()){curr._body+=bodypart}
        end=s.i(">",start)
        if(s[start]=="/"){curr=curr._parent;start=end;continue}
        let ws=s.slice(0,end).i(" ",start)
        //since most tags are short and useless like <x>123</x>
        //it'll fail in most cases, and to make it fail faster
        //it's limited to not check entire string
        //this line (and actually this entire file)
        //assumes that slice doesn't copies string
        const tagname=s.slice(start,ws==-1||ws>end?end:ws)
        if(tagname=="!--"){curr._body+=s.slice(start-1,end+1);start=end;continue}
        let n={_parent:curr,_tag:tagname,_subtags:[],_body:""}
        curr._subtags.push(n);curr=n
        if(ws!=-1&&ws<end){parseXmlAttrs(s,curr,ws+1,end)}
        if(s[end-1]=="/"){
            if(curr._tag[curr._tag.length-1]=="/"){curr._tag=curr._tag.slice(0,-1)}
            curr=curr._parent}
        start=end;
    }
    return root
}

global.buildXmlParser=function buildXmlParser(d){
    let s="let res={}\n"
    let ls=""
    let fx={"_body":"e._body","+_body":"+e._body"}
    for(let k in d){
        let v=d[k]
        if((typeof v)=="string"){
            if(k[0]=="E"){k=k.slice(1);s+=`res["${k}"]=${v}\n`
            }else{s+=`res["${k}"]=rt["${v}"]\n`}
            continue
        }
        if(v[0] instanceof Array){v[0]='"'+v[0].join('"||e._tag=="')+'"'}
        else{v[0]='"'+v[0]+'"'}
        if(v[1]=="parseVec"){s+=`res["${k}"]=[0,0,0]\n`}
        else if(v[1]=="parseVecO"){v[1]="parseVec"}
        if(k[0]=="L"){k=k.slice(1);s+=`res["${k}"]=[]\n`
            ls+=`    if(e._tag==${v[0]}){res["${k}"].push(${fx[v[1]]||v[1]+"(e)"});continue}\n`
        }else{ls+=`    if(e._tag==${v[0]}){res["${k}"]=${fx[v[1]]||v[1]+"(e)"};continue}\n`}
    }
    s=s+"for(let e of rt._subtags){\n"+ls+"}\nreturn res"
    return Function("rt","map",s)
}
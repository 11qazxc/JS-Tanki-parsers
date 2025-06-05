/*
primitive type:(S|U)(16|32)(LE|BE)|(S|U)8|(D|F)(LE|BE)|TOVI|ASCIIZ|(L32LE|TOVI)ASCII
type:primitive type
    |{kv[;kv]*}
    |magick_(F|((U|S)(8|16|32)))(LE|BE):const
        //won't parse if magicks type read from current position isn't equal to const
    |align:nbytes//adds padding if position%nbytes isn't zero
kv:(type:name
  |type[len]:name[key]//for dicts, name[res.key]=res
  |type[len]:name[]//for arrays, name.push(res)
  )[:map]//name=map[res]
if i understood correctly TO varint is like varint
but second byte is used as-is so it's no longer than two bytes
0x03 is 0x03
0x8003 is 0x03
0x808003 is 0x80
*/

function parseTypedef(s){
    let i0=0;s=s.replaceAll(/ |\t/g,"").replaceAll("\n",";")
    let res=[],stack=[res]
    while(true){
        let i1=s.i("{",i0),i2=s.i("}",i0),i3=s.i(";",i0)
        i1=i1==-1?s.length+2:i1;i2=i2==-1?s.length+2:i2;i3=i3==-1?s.length+2:i3;
        let ni=min(i1,i2,i3)
        if(ni==i0){ni++}
        let cs=s.slice(i0,ni);
        let cd=stack[stack.length-1]
        if(cs==";"){}
        else if(cs=="{"){stack.push([])}
        else if(cs=="}"){}else if(s[i0-1]=="}"){
            let r=[cd]
            cs=cs.split(":")
            if(cs[0].indexOf("[")!=-1){r[1]=cs[0].slice(1,-1)}else{r[1]=undefined}
            if(cs[1].indexOf("[")!=-1){
                let _=cs[1].slice(0,-1).split("[");r[2]=_[0];r[3]=_[1]
            }else{r[2]=cs[1];r[3]=undefined}
            stack.length--;stack[stack.length-1].push(r)
        }else{
            let r=[];cs=cs.split(":")
            let cs0i=cs[0].indexOf("["),cs1i=cs[1].indexOf("[")
            if(cs0i!=-1){r[0]=cs[0].slice(0,cs0i);r[1]=cs[0].slice(cs0i+1,-1)}
            else{r[0]=cs[0];r[1]=undefined}
            if(cs1i!=-1){r[2]=cs[1].slice(0,cs1i);r[3]=cs[1].slice(cs1i+1,-1)}
            else{r[2]=cs[1];r[3]=undefined}
            if(cs[2]){r[4]=cs[2]}
            cd.push(r)
        }
        if(ni>=s.length){break}
        i0=ni
    }
    return res
}

function buildParserS(d,rec,fname){
    const spl={
        "U32LE":"_res_=s.readUint32LE(i0);i0+=4","U32BE":"_res_=s.readUint32BE(i0);i0+=4",
        "S32LE":"_res_=s.readInt32LE(i0);i0+=4","S32BE":"_res_=s.readInt32BE(i0);i0+=4",
        "U16LE":"_res_=s.readUint16LE(i0);i0+=2","U16BE":"_res_=s.readUint16BE(i0);i0+=2",
        "S16LE":"_res_=s.readInt16LE(i0);i0+=2","S16BE":"_res_=s.readInt16BE(i0);i0+=2",
        "S8":"_res_=s.readInt8(i0);i0+=1","U8":"_res_=s.readUint8(i0);i0+=1",
        "FLE":"_res_=s.readFloatLE(i0);i0+=4","FBE":"_res_=s.readFloatBE(i0);i0+=4",
        "DLE":"_res_=s.readDoubleLE(i0);i0+=8","DBE":"_res_=s.readDoubleBE(i0);i0+=8",
        "ASCIIZ":'_res_="";while(s.readUint8(i0)!=0){_res_+=String.fromCharCode(s.readUint8(i0));i0++}i0++',
        "L32LEASCII":'_=s.readUint32LE(i0);i0+=4;\n_res_=s.asciiSlice(i0,i0+=_)',
        "L16BEASCII":'_=s.readUint16BE(i0);i0+=2;\n_res_=s.asciiSlice(i0,i0+=_)',
        "TOVI":'_=s.readUint8(i0);i0++;if(_&0x80){_=((_&0x7f)<<8)|s.readUint8(i0);i0++}_res_=_;',
        "TOVIASCII":'_=s.readUint8(i0);i0++;if(_&0x80){_=((_&0x7f)<<8)|s.readUint8(i0);i0++}'+
            '\n_res_=s.asciiSlice(i0,i0+=_)',
    }
    const spll={
        "U32LE":"i0+=4","U32BE":"i0+=4","S32LE":"i0+=4","S32BE":"i0+=4",
        "U16LE":"i0+=2","U16BE":"i0+=2","S16LE":"i0+=2","S16BE":"i0+=2",
        "S8":"i0+=1","U8":"i0+=1",
        "FLE":"i0+=4","FBE":"i0+=4",
        "ASCIIZ":'while(s[i0]!=0){i0++}i0++',
        "L32LEASCII":'i0+=4+s.readUint32LE(i0)',
    }
    let dvl=["res","_","ci"],dvr=[],arrRes=false
    //0:type,1:type length,2:var,3:var.key
    for(let e of d){
        let cv=e[2]
        if((typeof e[0])=="string"&&(e[0]=="align"||e[0].startsWith("magick_"))){continue}
        if(cv.indexOf(".")!=-1){//res.a=b or res.a[]=b[]
            cv=cv.slice(cv.indexOf(".")+1)
            if(dvr.indexOf(cv)!=-1){continue}
            dvr.push(cv+":"+(e[1]?(e[3]?"{}":"[]"):"undefined"))
        }else if(cv=="res"&&e[3]){}//res[b.c]=b
        else if(cv=="res"&&!e[3]){arrRes=true}//res[] push(b)
        else if(dvl.indexOf(cv)==-1){dvl.push(e[1]?cv+"=[]":cv)}//local a=b or a[] push(b)
    }
    //console.error(fname,dvl,dvr)
    let s=(!rec?"{s.length=(s.length||s.byteLength);let stack=[];let ":"do{let ")
    s+=dvl.slice(1).join(",")+";\n"
    s+=(!rec?"let res=resarg||"+(arrRes?"[]":"{}"):"let res="+(arrRes?"[]":"{}"))+"\n"
    s+=(dvr.length?dvr.filter(e=>e.length).map(_=>`res.${_.split(":").join("=")}`).join(";"):"")+"\n"
    for(let e of d){
        let ss=""
        if(e[0]=="align"){ss="i0+=(i0%"+e[2]+")?("+e[2]+"-(i0%"+e[2]+")):0"}
        else if((typeof e[0])!="string"){
            if(e[1]){
                ss+="for(let i=0;i<"+e[1]+";i++){\n"
                    ss+="_=stack.length;ci=i0;"
                    ss+=buildParserS(e[0],true)
                    ss+="if(_!=stack.length){_=stack[stack.length-1];stack.length--;"
                        if(e[3]){ss+=e[2]+"[_."+e[3]+"]=_"}
                        else{ss+=e[2]+".push(_)"}
                    ss+="}else{i0=ci}\n"
                ss+="}\n"
            }else{
                ss+="_=stack.length;ci=i0;"
                ss+=buildParserS(e[0],true)
                ss+="if(_!=stack.length){"
                    ss+=e[2]+"=stack[stack.length-1];stack.length--"
                ss+="}else{i0=ci}\n"
            }
        }else{
            let p=spl[e[0]]||""
            if(e[1]){
                ss+="for(let i=0;i<"+e[1]+";i++){"
                    ss+=p.replaceAll("_res_","_")+";"
                    ss+=e[2]+(e[4]?".push("+e[4]+"[_]);":".push(_);")
                ss+="}\n"
            }else if(e[0].startsWith("magick_")){
                p=spl[e[0].slice(7)]
                ss+=p.replaceAll("_res_","_")+";"
                ss+="if(_!="+e[2]+"){"+(!rec?"return":"break")+"}\n"
            }else if(e[2]=="_"){ss+=(spll[e[0]]||p)+";"}
            else if(e[4]){ss+=p.replaceAll("_res_","_")+";"+e[2]+"="+e[4]+"[_];\n"}
            else{ss+=p.replaceAll("_res_",e[2])+";\n"}
        }
        s+=ss
    }
    s+=!rec?"return i0\n}":"stack.push(res);break\n}while(0)"
    return s
}

global.buildParser=function buildParser(fname,s){
    const f=buildParserS(parseTypedef(s),false,fname)
    return eval("(function "+fname+"(s,i0,resarg)"+f+")")
}

//compatibility layer because it was originally written for node's Buffer
DataView.prototype.slice=function(i0,i1){
    return new DataView(this.buffer,i0+this.byteOffset,i1?i1-i0:undefined)
}
DataView.prototype.asciiSlice=function(i0,i1){i0=i0||0;i1=i1||this.byteLength;
    let r=""
    for(let i=i0;i<i1;i++){
        r+=String.fromCharCode(this.readUint8(i))
    }
    return r
}
for(let i of ["Uint16","Uint32","Int16","Int32"]){
    eval(`DataView.prototype.read${i}LE=function(i){return this.get${i}(i,true)}`)
    eval(`DataView.prototype.read${i}BE=function(i){return this.get${i}(i,false)}`)
}
DataView.prototype.readFloatLE=function(i){return this.getFloat32(i,true)}
DataView.prototype.readFloatBE=function(i){return this.getFloat32(i,false)}
DataView.prototype.readInt8=function(i){return this.getInt8(i)}
DataView.prototype.readUint8=function(i){return this.getUint8(i)}
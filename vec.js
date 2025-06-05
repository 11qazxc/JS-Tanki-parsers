"min,max,floor,ceil,round,abs,cos,sin,tan,atan2,PI".split(",").map(e=>global[e]=Math[e])
const TAU=PI*2
const FLT_MAX=1.7976931348623157E+308
const FLT_MIN=1/FLT_MAX/(1<<62)
const maxvec=[FLT_MAX,FLT_MAX,FLT_MAX]
const minvec=[-FLT_MAX,-FLT_MAX,-FLT_MAX]
function perfNow(){return performance.now()}
//wrapper, because bound function needs to allocate RAM in FF
global.sleep=function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
Number.prototype.s=function(){return this.toFixed(2)}
Array.prototype.s=function(){return "["+this.map(e=>e.s()).join(",")+"]"}
String.prototype.i=String.prototype.indexOf
String.prototype.isWS=function(){
    for(let i=0;i<this.length;i++){if(this[i]!=" "&&this[i]!="\n"&&this[i]!="\t"){return false}}
    return true
}
//standard vector stuff;
//rotation order here is yaw,pitch,roll
//because originally it was supposed to work with airplanes
//see init.js for tanki matrices
function genvfx(op,name){
    f1="return [";f2="";f3=""
    if(op.length==1){for(let i=0;i<3;i++){
        f1+=`a[${i}]${op}b[${i}],`
        f2+=`a[${i}]${op}=b[${i}];`
        f3+=`r[${i}]=a[${i}]${op}b[${i}];`
    }}else{for(let i=0;i<3;i++){
        f1+=`${op}(a[${i}],b[${i}]),`
        f2+=`a[${i}]=${op}(a[${i}],b[${i}]);`
        f3+=`r[${i}]=${op}(a[${i}],b[${i}]);`
    }}
    f1+="]";f2+="return a";f3+="return r"
    f1=eval(`(global.${name}=function ${name}(a,b){${f1}})`)
    f2=eval(`(global.${name}I=function ${name}I(a,b){${f2}})`)
    f3=eval(`(global.${name}R=function ${name}R(a,b,r){${f3}})`)
    return [f1,f2,f3]
}

const [vmax,vmaxI,vmaxR]=genvfx("max","vmax")
const [vmin,vminI,vminR]=genvfx("min","vmin")
const [vadd,vaddI,vaddR]=genvfx("+","vadd")
const [vsub,vsubI,vsubR]=genvfx("-","vsub")
const [vmul,vmulI,vmulR]=genvfx("*","vmul")
const [vdiv,vdivI,vdivR]=genvfx("/","vdiv")
function vmulf(a,b){return [a[0]*b,a[1]*b,a[2]*b]}
function vmulfI(a,b){a[0]*=b;a[1]*=b;a[2]*=b;return a}
function vmulfR(a,b,r){r[0]=a[0]*b;r[1]=a[1]*b;r[2]=a[2]*b;return r}
function vdot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function vcross(a,b){
    const ax=a[0],bx=b[0],ay=a[1],by=b[1],az=a[2],bz=b[2]
    return [ay*bz-az*by,
            az*bx-ax*bz,
            ax*by-ay*bx]
}
function vcrossI(a,b){
    const ax=a[0],bx=b[0],ay=a[1],by=b[1],az=a[2],bz=b[2]
    a[0]=ay*bz-az*by
    a[1]=az*bx-ax*bz
    a[2]=ax*by-ay*bx
    return a
}
function vcrossR(a,b,r){
    const ax=a[0],bx=b[0],ay=a[1],by=b[1],az=a[2],bz=b[2]
    r[0]=ay*bz-az*by
    r[1]=az*bx-ax*bz
    r[2]=ax*by-ay*bx
    return r
}
function vproj(a,b){
    const ax=a[0],bx=b[0],ay=a[1],by=b[1],az=a[2],bz=b[2]
    return (ax*bx+ay*by+az*bz)/((bx*bx+by*by+bz*bz)**.5)
}
function vilerp(a,b){
    const ax=a[0],bx=b[0],ay=a[1],by=b[1],az=a[2],bz=b[2]
    return (ax*bx+ay*by+az*bz)/(bx*bx+by*by+bz*bz)
}
function vlen(a){
    const ax=a[0],ay=a[1],az=a[2]
    return (ax*ax+ay*ay+az*az)**.5
}
function vdist(a,b){
    const ax=a[0],bx=b[0],ay=a[1],by=b[1],az=a[2],bz=b[2]
    const dx=ax-bx,dy=ay-by,dz=az-bz
    return (dx*dx+dy*dy+dz*dz)**.5
}
function vdistsqr(a,b){
    const ax=a[0],bx=b[0],ay=a[1],by=b[1],az=a[2],bz=b[2]
    return max(abs(ax-bx),max(abs(ay-by),abs(az-bz)))
}


function vT33(M,v,res){//float[9]
    const x=v[0],y=v[1],z=v[2]
    if(!res){res=[0.0,0.0,0.0]}//i hope compiller will optimize it
    res[0]=x*M[0]+y*M[1]+z*M[2]
    res[1]=x*M[3]+y*M[4]+z*M[5]
    res[2]=x*M[6]+y*M[7]+z*M[8]
    return res
}
function vT44(M,v,w,res){//float[16]
    const x=v[0],y=v[1],z=v[2]
    if(!res){res=[0.0,0.0,0.0]}
    if(w===undefined||w===null){w=1}
    const s=x*M[12]+y*M[13]+z*M[14]+w*M[15]
    res[0]=(x*M[0]+y*M[1]+z*M[2]+w*M[3])/s
    res[1]=(x*M[4]+y*M[5]+z*M[6]+w*M[7])/s
    res[2]=(x*M[8]+y*M[9]+z*M[10]+w*M[11])/s
    return res
}
function T33Mul(M1,M2,res){
    if(!res){res=[0,0,0, 0,0,0, 0,0,0]}
    const j=M2[0],k=M2[1],l=M2[2],
          m=M2[3],n=M2[4],o=M2[5],
          p=M2[6],q=M2[7],r=M2[8]
    for(let i=0;i<3;i++){
        const a=M1[0+3*i],b=M1[1+3*i],c=M1[2+3*i]
        res[0+3*i]=a*j+b*m+c*p
        res[1+3*i]=a*k+b*n+c*q
        res[2+3*i]=a*l+b*o+c*r
    }
    return res
}
const _vtmpm=[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
const _vtmpm2=[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]
function T4433Mul(M1,M2,res){
    if(!res){res=[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]}
    const M3=_vtmpm
    for(let i=0;i<3;i++){
        M3[i*4+0]=M2[i*3+0];M3[i*4+1]=M2[i*3+1];M3[i*4+2]=M2[i*3+2];M3[i*4+3]=0
    }M3[12]=M3[13]=M3[14]=0;M3[15]=1
    return T44Mul(M1,M3,res)
}
function T44Mul(M1,M2,res){
    if(!res){res=[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0]}
    if(res==M1){for(let i=0;i<16;i++){_vtmpm[i]=M1[i]}M1=_vtmpm}
    if(res==M2){for(let i=0;i<16;i++){_vtmpm2[i]=M2[i]}M2=_vtmpm2}
    for(let i=0;i<4;i++){
        const a=M1[0+4*i],b=M1[1+4*i],c=M1[2+4*i],d=M1[3+4*i]
        res[0+4*i]=a*M2[0]+b*M2[4]+c*M2[ 8]+d*M2[12]
        res[1+4*i]=a*M2[1]+b*M2[5]+c*M2[ 9]+d*M2[13]
        res[2+4*i]=a*M2[2]+b*M2[6]+c*M2[10]+d*M2[14]
        res[3+4*i]=a*M2[3]+b*M2[7]+c*M2[11]+d*M2[15]
    }
    return res
}
function T33Transpose(M,r){if(!r){r=[0,0,0, 0,0,0, 0,0,0]}
    if(r==M){for(let i=0;i<9;i++){_vtmpm[i]=M[i]}M=_vtmpm}
    r[0]=M[0];r[1]=M[3];r[2]=M[6]
    r[3]=M[1];r[4]=M[4];r[5]=M[7]
    r[6]=M[2];r[7]=M[5];r[8]=M[8]
    return r
}
function T44Transpose(M,r){if(!r){r=[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,]}
    if(r==M){for(let i=0;i<16;i++){_vtmpm[i]=M[i]}M=_vtmpm}
    r[ 0]=M[0];r[ 1]=M[4];r[ 2]=M[ 8];r[ 3]=M[12]
    r[ 4]=M[1];r[ 5]=M[5];r[ 6]=M[ 9];r[ 7]=M[13]
    r[ 8]=M[2];r[ 9]=M[6];r[10]=M[10];r[11]=M[14]
    r[12]=M[3];r[13]=M[7];r[14]=M[11];r[15]=M[15]
    return r
}
function T33Inv(M,res){
    const a=M[0],b=M[1],c=M[2],
          d=M[3],e=M[4],f=M[5],
          g=M[6],h=M[7],i=M[8]
    const det=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g)
    if(!res){res=[0.,0.,0.,0.,0.,0.,0.,0.,0.]}
    res[0]=e*i-f*h;res[1]=c*h-b*i;res[2]=b*f-c*e
    res[3]=f*g-d*i;res[4]=a*i-c*g;res[5]=c*d-a*f
    res[6]=d*h-e*g;res[7]=b*g-a*h;res[8]=a*e-b*d
    res[0]/=det;res[1]/=det;res[2]/=det
    res[3]/=det;res[4]/=det;res[5]/=det
    res[6]/=det;res[7]/=det;res[8]/=det
    return res
}
function T33RInv(M,res){
    const a=M[0],b=M[1],c=M[2],
          d=M[3],e=M[4],f=M[5],
          g=M[6],h=M[7],i=M[8]
    if(!res){res=[0.,0.,0.,0.,0.,0.,0.,0.,0.]}
    res[0]=e*i-f*h;res[1]=c*h-b*i;res[2]=b*f-c*e
    res[3]=f*g-d*i;res[4]=a*i-c*g;res[5]=c*d-a*f
    res[6]=d*h-e*g;res[7]=b*g-a*h;res[8]=a*e-b*d
    return res
}
function T33Rot(a,res){
    const cx=cos(a[0]),cy=cos(a[1]),cz=cos(a[2])
    const sx=sin(a[0]),sy=sin(a[1]),sz=sin(a[2])
    if(!res){res=[0,0,0, 0,0,0, 0,0,0]}
    const sxsy=sx*sy,cysx=cy*sx
    res[0]=cy*cz-sxsy*sz;res[1]=-cx*sz;res[2]=cz*sy+cysx*sz
    res[3]=cy*sz+sxsy*cz;res[4]= cx*cz;res[5]=sz*sy-cysx*cz
    res[6]=-cx*sy;res[7]=sx;res[8]=cx*cy
    return res
}
/*
     _                   _      _     
 ___| |_ _ __ _   _  ___| |_   (_)___ 
/ __| __| '__| | | |/ __| __|  | / __|
\__ \ |_| |  | |_| | (__| |_ _ | \__ \
|___/\__|_|   \__,_|\___|\__(_)/ |___/
                             |__/     

By: Lucas Teske
https://github.com/racerxdl/struct.js
For licensing read LICENSE at github

*/
var Struct = { "version" : 0.1, "showerrors":true, "shownotice" : true };

/*  Enums   */
Struct.LittleEndian = 0;
Struct.BigEndian = 1;

/*  Shift consts    */
Struct.b56  = Math.pow(2,56);
Struct.b48  = Math.pow(2,48);
Struct.b40  = Math.pow(2,40);
Struct.b32  = Math.pow(2,32);
Struct.b24  = Math.pow(2,24);
Struct.b16  = Math.pow(2,16);
Struct.b8   = Math.pow(2,8);
Struct.b4   = Math.pow(2,4);

Struct.b    = {}

for(var i=0;i<64;i++)   {
    Struct.b[i] = Math.pow(2,i);
}

/*  This is a hack, because sometimes charCodeAt answer a two byte data */
String.prototype.GetByteAt = function(index)    {
    return (this.charCodeAt(index) & 0xFF);
};

/*  Main unpack function */
Struct.unpack = function(mode, string)  {
    var retval = [],
        strpos = 0,
        modepos = 0,
        strlen = string.length,
        modelen = mode.length,
        endianess;
        
    if(modelen == 0)   {    
        Struct.error("Invalid mode");
        return undefined;
    }
    switch(mode[0])   {
        case ">":
        case "!":   endianess = Struct.BigEndian; modepos += 1; break;
        
        case "@": 
        case "=":   Struct.notice("Assuming native = littleendian"); modepos += 1;
        default:    endianess = Struct.LittleEndian;
    }
    data = [0,0];
    while(modepos < modelen) {
        switch(mode[modepos]) {
            case "c": data[0] = string[strpos]; data[1] = 1; break;
            case "b": data = Struct.unpackchar(string, endianess, strpos, true); break;
            case "B": data = Struct.unpackchar(string, endianess, strpos, false); break;
            case "?": data = Struct.unpackbool(string, endianess, strpos); break;
            case "h": data = Struct.unpackshort(string,endianess, strpos, true); break;
            case "H": data = Struct.unpackshort(string,endianess, strpos, false); break;
            case "i": data = Struct.unpackint(string,endianess, strpos, true); break;
            case "I": data = Struct.unpackint(string,endianess, strpos, false); break;
            case "l": data = Struct.unpackint(string,endianess, strpos, true); break;
            case "L": data = Struct.unpackint(string,endianess, strpos, false); break;
            case "q": data = Struct.unpacklonglong(string, endianess, strpos, true); break;
            case "Q": data = Struct.unpacklonglong(string, endianess, strpos, false); break;
            case "f": data = Struct.unpackfloat(string,endianess,strpos); break;
            case "d": data = Struct.unpackdouble(string,endianess, strpos); break;
            case "s": 
            case "p": data = Struct.unpackstring(string, strpos); break
            case "P": data = Struct.unpackint(string,endianess, strpos, false); break;
            case "x": data = [undefined, 1]; break;
            default : Struct.error("Invalid char at "+modepos+" : \""+mode[modepos]+"\""); retval = undefined; break;
        }
        if(data[0] !== undefined)
            retval.push(data[0]);
        strpos += data[1];
        modepos += 1;
    }
    
    return retval;
}

/*  Unpack String   */
Struct.unpackstring     = function(string, start)   {
    var outstring = "", i = start;
    while(true) {
        if(string.GetByteAt(i) == 0)
            break;
        outstring += string[i];
        ++i;
    }
    return outstring;
};

/*  Unpack Double   */
Struct.unpackdouble     = function(string, endianess, start, signed)  {
    var bytes = (endianess==Struct.LittleEndian) ?
                [ string.GetByteAt(start+7),string.GetByteAt(start+6),string.GetByteAt(start+5),string.GetByteAt(start+4),string.GetByteAt(start+3),string.GetByteAt(start+2),string.GetByteAt(start+1),string.GetByteAt(start+0) ] :
                [ string.GetByteAt(start+0),string.GetByteAt(start+1),string.GetByteAt(start+2),string.GetByteAt(start+3),string.GetByteAt(start+4),string.GetByteAt(start+5),string.GetByteAt(start+6),string.GetByteAt(start+7) ],
    sign = ((bytes[0] & 0x80) >> 7) > 0            
    a = ((bytes[0] << 24) + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3]) >>> 0,
    b = ((bytes[4] << 24) + (bytes[5] << 16) + (bytes[6] << 8) + bytes[7]) >>> 0,
    e = (a >> 52 - 32 & 0x7ff) - 1023,
    data = (a & 0xfffff | 0x100000) * 1.0/ Math.pow(2,52-32) * Math.pow(2, e) +  b * 1.0 / Math.pow(2, 52) * Math.pow(2, e);
    return [ (sign) ? -data : data, 8 ];
};

/*  Unpack float */
Struct.unpackfloat     = function(string, endianess, start, signed)  {
    var bytes = (endianess==Struct.LittleEndian) ?
                [ string.GetByteAt(start+3),string.GetByteAt(start+2),string.GetByteAt(start+1),string.GetByteAt(start+0) ] :
                [ string.GetByteAt(start+0),string.GetByteAt(start+1),string.GetByteAt(start+2),string.GetByteAt(start+3) ],
        sign = ((bytes[0] & 0x80) >> 7) > 0,
        a = ((bytes[0] << 24) + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3]) >>> 0,
        data = (a & 0x7fffff | 0x800000) * 1.0 / Math.pow(2,23) * Math.pow(2,  ((a>>23 & 0xff) - 127))
    return [ (sign) ? -data : data, 4 ];
};

/*  Unpack Signed/Unsigned Long Long    */
Struct.unpacklonglong  = function(string, endianess, start, signed)  {
    var retval =    (endianess==Struct.LittleEndian) ?
                    ( string.GetByteAt(7+start) * Struct.b56 ) + ( string.GetByteAt(6+start) * Struct.b48 ) + ( string.GetByteAt(5+start) * Struct.b40 ) + ( string.GetByteAt(4+start) * Struct.b32 ) + ( string.GetByteAt(3+start) * Struct.b24 ) + ( string.GetByteAt(2+start) * Struct.b16 ) + ( string.GetByteAt(1+start) * Struct.b8 ) + ( string.GetByteAt(0+start) ) :
                    ( string.GetByteAt(0+start) * Struct.b56 ) + ( string.GetByteAt(1+start) * Struct.b48 ) + ( string.GetByteAt(2+start) * Struct.b40 ) + ( string.GetByteAt(3+start) * Struct.b32 ) + ( string.GetByteAt(4+start) * Struct.b24 ) + ( string.GetByteAt(5+start) * Struct.b16 ) + ( string.GetByteAt(6+start) * Struct.b8 ) + ( string.GetByteAt(7+start));
    retval = (signed & retval > 0x7FFFFFFFFFFFFFFF ) ? -( 0xFFFFFFFFFFFFFFFF - retval + 1 ) : retval ;
    return [retval, 8];
};
Struct.unpackint  = function(string, endianess, start, signed)  {
    var retval =    (endianess==Struct.LittleEndian) ?
                    ( string.GetByteAt(3+start) * Struct.b24 ) + ( string.GetByteAt(2+start) * Struct.b16 ) + ( string.GetByteAt(1+start) * Struct.b8 ) + ( string.GetByteAt(0+start) ) :
                    ( string.GetByteAt(0+start) * Struct.b24 ) + ( string.GetByteAt(1+start) * Struct.b16 ) + ( string.GetByteAt(2+start) * Struct.b8 ) + ( string.GetByteAt(3+start) );
    retval = (signed && retval > 0x7FFFFFFF) ? -( 0xFFFFFFFF - retval + 1 ) : retval ;
    return [retval, 4];
};

/*  Unpack signed/unsigned short */
Struct.unpackshort = function(string, endianess, start, signed) {
    var retval =    (endianess==Struct.LittleEndian) ?
                    ( string.GetByteAt(1+start) * Struct.b8 ) + ( string.GetByteAt(0+start) ) :
                    ( string.GetByteAt(2+start) * Struct.b8 ) + ( string.GetByteAt(3+start) );
    retval = (signed & retval > 0x7FFF) ? -( 0xFFFF - retval + 1 ) : retval;
    return [retval, 2];
}

/*  Unpack signed/unsigned char as int  */
Struct.unpackchar = function(string, endianess, start, signed)  {
    var retval =    string.GetByteAt(start);
    retval = (signed & retval > 0x7F) ? - ( 0xFF - retval + 1 ) : retval;    
    return [ retval , 1 ]
};

/*  Unpack boolean  */
Struct.unpackbool = function(string, endianess, strpos) {
    return [ string.GetByteAt(strpos) > 0, 1 ];
};

Struct.pack = function(mode, data)  {
    // TODO: Like the Struct.unpack, this will handle the mode and call individual packings
};

Struct.packfloat = function(float, endianess)   {
/*
    A python algorithm, its crap I know. (Lucas)
    x = 12.375

    inteiro = int(x)
    decimal = x - inteiro
    sign = 1 if (x < 0) else 0

    bina = []

    mant = decimal * 2
    while mant != 0:
        if mant >= 1:
            mant -= 1
            bina.append(1)
        else:
            bina.append(0)
        mant *= 2

    binfloat = "%s.%s" %(bin(inteiro)[2:],("".join([ str(x) for x in bina ])))
    exp = binfloat.find(".") - 1 + 127
    s = len(binfloat.replace(".","")[1:])
    binfloat = int(binfloat.replace(".","")[1:],2)


    flt = (sign << 31) + (exp << 23) + (binfloat << (23-s))
    print hex(flt) 
    
*/
};

/*  This function is for calling when the Struct parser encounter a error */
Struct.error = function(msg)    {
    if(Struct.showerror)    
        console.error("Struct: "+msg);
};

/*  This function is for notice the developer about a tip, or deprecated stuff */
Struct.notice = function(msg)   {
    if(Struct.shownotice)
        console.log("Struct: "+msg);
};

struct = Struct;

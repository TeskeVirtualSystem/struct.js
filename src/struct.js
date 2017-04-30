/**
 * Created by Lucas Teske on 30/04/17.
 */

// Some auxiliary functions

String.prototype.GetByteAt = function(index)    {
  return (this.charCodeAt(index) & 0xFF);
};

String.prototype.AsUint8ArrayBuffer = function()  {
  const buf = new ArrayBuffer(this.length);
  const bufView = new Uint8Array(buf);
  for (let i=0, strLen=this.length; i<strLen; i++) {
    bufView[i] = this.charCodeAt(i) & 0xFF;
  }
  return buf;
};

if(!ArrayBuffer.prototype.slice) {
  ArrayBuffer.prototype.slice = function(start,end)   {
    const arr = new ArrayBuffer(end-start);
    const uchar = new Uint8Array(this);
    const uchar2 = new Uint8Array(arr);
    let c = 0;
    for(let i=start;i<end;i++)  {
      uchar2[c] = uchar[i];
      c++;
    }
    return arr;
  };
}

export default class Struct {

  //
  // Constants
  //

  static VERSION = 0.9;
  static showErrors = true;
  static showNotice = true;

  static b56  = Math.pow(2,56);
  static b48  = Math.pow(2,48);
  static b40  = Math.pow(2,40);
  static b32  = Math.pow(2,32);
  static b24  = Math.pow(2,24);
  static b16  = Math.pow(2,16);
  static b8   = Math.pow(2,8);
  static b4   = Math.pow(2,4);

  static b = {};

  static LittleEndian = 0;
  static BigEndian = 1;

  //
  // Methods
  //

  static unpack(mode, string) {
    let retval = [],
      strpos = 0,
      modepos = 0,
      modelen = mode.length,
      endianess;

    if(!(string instanceof DataView) && !(string instanceof ArrayBuffer))    {
      Struct.notice('From Struct.js version 0.2, its recomended to use DataView or ArrayBuffer as input. Converting String to Dataview');
      string = new DataView(string.AsUint8ArrayBuffer());
    }else if(string instanceof ArrayBuffer)
      string = new DataView(string);

    if(modelen === 0)   {
      Struct.error("Invalid mode");
      return undefined;
    }
    switch(mode[0])   {
      case ">":
      case "!":   endianess = Struct.BigEndian; modepos += 1; break;

      case "@":
      case "=":   Struct.notice("Assuming native = littleendian"); modepos += 1; endianess = Struct.LittleEndian; break;
      default:    endianess = Struct.LittleEndian;
    }
    let data = [undefined,0];
    while(modepos < modelen) {
      switch(mode[modepos]) {
        case "c": data[0] = String.fromCharCode(string.getUint8(strpos)); data[1] = 1; break;
        case "b": data = Struct._unpackChar(string, endianess, strpos, true); break;
        case "B": data = Struct._unpackChar(string, endianess, strpos, false); break;
        case "?": data = Struct._unpackBool(string, endianess, strpos); break;
        case "h": data = Struct._unpackShort(string,endianess, strpos, true); break;
        case "H": data = Struct._unpackShort(string,endianess, strpos, false); break;
        case "i": data = Struct._unpackInt(string,endianess, strpos, true); break;
        case "I": data = Struct._unpackInt(string,endianess, strpos, false); break;
        case "l": data = Struct._unpackInt(string,endianess, strpos, true); break;
        case "L": data = Struct._unpackInt(string,endianess, strpos, false); break;
        case "q": data = Struct._unpackLonglong(string, endianess, strpos, true); break;
        case "Q": data = Struct._unpackLonglong(string, endianess, strpos, false); break;
        case "f": data = Struct._unpackFloat(string,endianess,strpos); break;
        case "d": data = Struct._unpackDouble(string,endianess, strpos); break;
        case "s":
        case "p": data = Struct._unpackString(string, strpos); break;
        case "P": data = Struct._unpackInt(string,endianess, strpos, false); break;
        case "x": data = [undefined, 1]; break;
        default : Struct.error(`Invalid char at ${modepos} : "${mode[modepos]}"`); retval = undefined; break;
      }
      if(data[0] !== undefined)
        retval.push(data[0]);
      strpos += data[1];
      modepos += 1;
    }

    return retval;
  }

  static String2ArrayBuffer = function(str)   {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i=0, strLen=str.length; i<strLen; i++) {
      bufView[i] = str.charCodeAt(i) & 0xFF;
    }
    return buf;
  };

  /*  Unpack String   */
  static _unpackString(string, start)   {
    let outstring = "", i = start;
    while(true) {
      if(string.getUint8(i) === 0) {
        break;
      }
      outstring += String.fromCharCode(string.getUint8(i));
      ++i;
    }
    return outstring;
  };

  /*  Unpack Double   */
  static _unpackDouble(string, endianess, start)  {
    return [ string.getFloat64(start, endianess===Struct.LittleEndian), 8 ];
  };

  /*  Unpack float */
  static _unpackFloat(string, endianess, start)  {
    return [ string.getFloat32(start, endianess===Struct.LittleEndian) , 4 ];
  };

  /*  Unpack Signed/Unsigned Long Long    */
  static _unpackLonglong(string, endianess, start, signed)  {
    //TODO: Port to DataView
    let retval = (endianess===Struct.LittleEndian) ?
      ( string.GetByteAt(7+start) * Struct.b56 ) + ( string.GetByteAt(6+start) * Struct.b48 ) + ( string.GetByteAt(5+start) * Struct.b40 ) + ( string.GetByteAt(4+start) * Struct.b32 ) + ( string.GetByteAt(3+start) * Struct.b24 ) + ( string.GetByteAt(2+start) * Struct.b16 ) + ( string.GetByteAt(1+start) * Struct.b8 ) + ( string.GetByteAt(0+start) ) :
      ( string.GetByteAt(0+start) * Struct.b56 ) + ( string.GetByteAt(1+start) * Struct.b48 ) + ( string.GetByteAt(2+start) * Struct.b40 ) + ( string.GetByteAt(3+start) * Struct.b32 ) + ( string.GetByteAt(4+start) * Struct.b24 ) + ( string.GetByteAt(5+start) * Struct.b16 ) + ( string.GetByteAt(6+start) * Struct.b8 ) + ( string.GetByteAt(7+start));
    retval = (signed & retval > 0x7FFFFFFFFFFFFFFF ) ? -( 0xFFFFFFFFFFFFFFFF - retval + 1 ) : retval ;
    return [retval, 8];
  };

  static _unpackInt(string, endianess, start, signed)  {
    return [(signed)?string.getInt32(start, endianess===Struct.LittleEndian):string.getUint32(start, endianess===Struct.LittleEndian), 4];
  };

  /*  Unpack signed/unsigned short */
  static _unpackShort(string, endianess, start, signed) {
    return [(signed)?string.getInt16(start, endianess===Struct.LittleEndian):string.getUint16(start, endianess===Struct.LittleEndian), 2];
  };

  /*  Unpack signed/unsigned char as int  */
  static _unpackChar(string, _, start, signed)  {
    return [ (signed)?string.getInt8(start):string.getUint8(start) , 1 ]
  };

  /*  Unpack boolean  */
  static _unpackBool(string, _, start) {
    return [ string.getUint8(start) > 0, 1 ];
  };

  static error(msg)    {
    if (Struct.showErrors) {
      console.error(`Struct: ${msg}`);
    }
  };

  static notice(msg)   {
    if(Struct.showNotice) {
      console.log(`Struct: ${msg}`);
    }
  };
};

for (let i=0;i<64;i++)   {
  Struct.b[i] = Math.pow(2,i);
}